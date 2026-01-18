'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { CameraCapture } from '@/components/import';
import { TaxReturnOCRResultView } from '@/components/import/TaxReturnOCRResultView';
import { CameraResult } from '@/hooks/useCamera';
import { TaxReturnOCRResult } from '@/lib/import/document-types';

type Step = 'capture' | 'processing' | 'review' | 'complete';

export default function TaxReturnImportPage() {
    const [step, setStep] = useState<Step>('capture');
    const [capturedImage, setCapturedImage] = useState<CameraResult | null>(null);
    const [ocrResult, setOcrResult] = useState<TaxReturnOCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 撮影完了時
    const handleCapture = useCallback(async (result: CameraResult) => {
        setCapturedImage(result);
        setStep('processing');
        setError(null);

        try {
            // OCR API 呼び出し
            const formData = new FormData();
            formData.append('image', result.blob);
            formData.append('documentType', 'tax_return');

            const response = await fetch('/api/import/ocr', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('OCR処理に失敗しました');
            }

            const data: TaxReturnOCRResult = await response.json();
            setOcrResult(data);
            setStep('review');
        } catch (err) {
            console.error('OCR Error:', err);
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setOcrResult({
                success: false,
                fiscalYear: null,
                filingType: null,
                businessIncome: null,
                salaryIncome: null,
                deductions: {},
                taxableIncome: null,
                totalTax: null,
                confidence: 0,
                error: '確定申告書の読み取りに失敗しました',
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

    // 保存処理
    const handleConfirm = useCallback(async (data: TaxReturnOCRResult) => {
        setIsSaving(true);
        try {
            // TODO: Firestore に保存
            // 現時点ではローカルストレージに保存
            const taxReturnData = {
                id: crypto.randomUUID(),
                type: 'tax_return',
                fiscalYear: data.fiscalYear,
                filingType: data.filingType,
                businessIncome: data.businessIncome,
                salaryIncome: data.salaryIncome,
                deductions: data.deductions,
                taxableIncome: data.taxableIncome,
                totalTax: data.totalTax,
                imageUrl: capturedImage?.dataUrl,
                importedAt: new Date().toISOString(),
            };

            const existingData = localStorage.getItem('importedTaxReturns');
            const existing = existingData ? JSON.parse(existingData) : [];
            localStorage.setItem('importedTaxReturns', JSON.stringify([...existing, taxReturnData]));

            // 控除情報を取引データとしても保存（オプション）
            const deductionEntries = Object.entries(data.deductions || {});
            if (deductionEntries.length > 0) {
                const deductionTransactions = deductionEntries.map(([type, amount]) => ({
                    id: crypto.randomUUID(),
                    date: `${data.fiscalYear}-12-31`,
                    amount: -(amount || 0),
                    description: `${type}控除（${data.fiscalYear}年分）`,
                    category: 'tax',
                    source: 'ocr_tax_return' as const,
                    importedAt: new Date().toISOString(),
                }));

                const existingTx = localStorage.getItem('importedTransactions');
                const existingTxData = existingTx ? JSON.parse(existingTx) : [];
                localStorage.setItem('importedTransactions', JSON.stringify([...existingTxData, ...deductionTransactions]));
            }

            setStep('complete');
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    }, [capturedImage]);

    // 撮影画面
    if (step === 'capture') {
        return (
            <CameraCapture
                onCapture={handleCapture}
                onCancel={() => window.history.back()}
                title="確定申告書撮影"
                instructions="確定申告書の控除欄が見えるように撮影してください"
            />
        );
    }

    // 処理中画面
    if (step === 'processing') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 mx-auto animate-spin" />
                    <p className="mt-4 text-gray-600 font-medium">読み取り中...</p>
                    <p className="mt-2 text-sm text-gray-500">AIが確定申告書の内容を解析しています</p>
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
                        <h2 className="mt-6 text-xl font-bold text-gray-900">確定申告書を保存しました</h2>
                        <p className="mt-2 text-gray-600">控除情報が記録されました</p>

                        <div className="mt-8 space-y-3">
                            <button
                                onClick={handleCancel}
                                className="block w-full py-3 px-4 bg-orange-500 text-white rounded-xl font-medium"
                            >
                                続けて撮影
                            </button>
                            <Link
                                href="/summary"
                                className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium"
                            >
                                サマリーを確認
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
                    <TaxReturnOCRResultView
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
