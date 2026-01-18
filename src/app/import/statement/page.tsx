'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { CameraCapture } from '@/components/import';
import { BankStatementOCRResultView } from '@/components/import/BankStatementOCRResultView';
import { CameraResult } from '@/hooks/useCamera';
import { BankStatementOCRResult } from '@/lib/import/document-types';
import { useAuth } from '@/contexts/AuthContext';
import { saveBankStatementTransactions } from '@/lib/transaction-service';
import { getApiUrl } from '@/lib/api-config';

type Step = 'capture' | 'processing' | 'review' | 'complete';

export default function StatementImportPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>('capture');
    const [capturedImage, setCapturedImage] = useState<CameraResult | null>(null);
    const [ocrResult, setOcrResult] = useState<BankStatementOCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    // 未ログインの場合はログインページへ
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <p className="text-gray-600 mb-6">通帳をインポートするにはログインしてください</p>
                    <Link
                        href="/auth/login"
                        className="inline-block py-3 px-6 bg-purple-500 text-white rounded-xl font-medium"
                    >
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    // 撮影完了時
    const handleCapture = useCallback(async (result: CameraResult) => {
        setCapturedImage(result);
        setStep('processing');
        setError(null);

        try {
            // OCR API 呼び出し
            const formData = new FormData();
            formData.append('image', result.blob);
            formData.append('documentType', 'bank_statement');

            const response = await fetch(getApiUrl('/api/import/ocr'), {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('OCR処理に失敗しました');
            }

            const data: BankStatementOCRResult = await response.json();
            setOcrResult(data);
            setStep('review');
        } catch (err) {
            console.error('OCR Error:', err);
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setOcrResult({
                success: false,
                bankName: null,
                transactions: [],
                confidence: 0,
                error: '通帳の読み取りに失敗しました',
            });
            setStep('review');
        }
    }, []);

    // キャンセル/撮り直し
    const handleCancel = useCallback(() => {
        setCapturedImage(null);
        setOcrResult(null);
        setError(null);
        setStep('capture');
    }, []);

    // 保存処理（Firestoreに保存）
    const handleConfirm = useCallback(async (data: BankStatementOCRResult) => {
        if (!user) return;

        setIsSaving(true);
        try {
            // Firestoreに保存
            const savedIds = await saveBankStatementTransactions(
                user.uid,
                data.transactions || [],
                data.bankName,
                data.accountNumber,
                capturedImage?.dataUrl
            );

            setSavedCount(savedIds.length);
            setStep('complete');
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    }, [user, capturedImage]);

    // 撮影画面
    if (step === 'capture') {
        return (
            <CameraCapture
                onCapture={handleCapture}
                onCancel={() => window.history.back()}
                title="通帳撮影"
                instructions="通帳の明細ページが全体が見えるように撮影してください"
            />
        );
    }

    // 処理中画面
    if (step === 'processing') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-500 mx-auto animate-spin" />
                    <p className="mt-4 text-gray-600 font-medium">読み取り中...</p>
                    <p className="mt-2 text-sm text-gray-500">AIが通帳の明細を解析しています</p>
                </div>
            </div>
        );
    }

    // 完了画面
    if (step === 'complete') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white border-b border-gray-200">
                    <div className="max-w-lg mx-auto px-4 py-4">
                        <h1 className="text-xl font-bold text-gray-900 text-center">保存完了</h1>
                    </div>
                </header>
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="mt-6 text-xl font-bold text-gray-900">通帳明細を保存しました</h2>
                        <p className="mt-2 text-gray-600">{savedCount}件の取引データが追加されました</p>
                        <p className="mt-1 text-sm text-gray-500">他のデバイスからも確認できます</p>

                        <div className="mt-8 space-y-3">
                            <button
                                onClick={handleCancel}
                                className="block w-full py-3 px-4 bg-purple-500 text-white rounded-xl font-medium"
                            >
                                続けて撮影
                            </button>
                            <Link
                                href="/swipe"
                                className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium"
                            >
                                分類を開始
                            </Link>
                            <Link
                                href="/import"
                                className="block w-full py-3 px-4 text-gray-500 font-medium"
                            >
                                インポートメニューへ戻る
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // レビュー画面
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
                    <button onClick={handleCancel} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">読み取り結果</h1>
                </div>
            </header>
            <main className="flex-1 max-w-lg mx-auto w-full bg-white">
                {ocrResult && capturedImage && (
                    <BankStatementOCRResultView
                        result={ocrResult}
                        imageUrl={capturedImage.dataUrl}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        isLoading={isSaving}
                    />
                )}
            </main>
        </div>
    );
}
