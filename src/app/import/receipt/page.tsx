'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Camera,
    ImageIcon,
    Loader2,
    CheckCircle,
    AlertCircle,
    Edit3,
    RotateCcw,
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { ReceiptOCRResult } from '@/lib/import/document-types';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveReceiptTransaction } from '@/lib/transaction-service';
import { getApiUrl } from '@/lib/api-config';

type Step = 'capture' | 'processing' | 'review' | 'complete';

export default function ReceiptCapturePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { capturePhoto, isCapturing, error: cameraError } = useCamera();

    const [step, setStep] = useState<Step>('capture');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<ReceiptOCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 編集用の状態
    const [editedMerchant, setEditedMerchant] = useState('');
    const [editedDate, setEditedDate] = useState('');
    const [editedAmount, setEditedAmount] = useState('');
    const [editedCategory, setEditedCategory] = useState<ExpenseCategory | ''>('');

    const handleCapture = async (source: 'camera' | 'gallery') => {
        const result = await capturePhoto(source);
        if (!result) return;

        setCapturedImage(result.dataUrl);
        setStep('processing');
        await processOCR(result.dataUrl);
    };

    const processOCR = async (imageDataUrl: string) => {
        setIsProcessing(true);
        setError(null);

        try {
            // Base64部分を抽出
            const base64 = imageDataUrl.split(',')[1];

            // OCR API を呼び出し
            const response = await fetch(getApiUrl('/api/import/ocr'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    documentType: 'receipt',
                }),
            });

            if (!response.ok) {
                throw new Error('OCR処理に失敗しました');
            }

            const result: ReceiptOCRResult = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'レシートを読み取れませんでした');
            }

            setOcrResult(result);

            // 編集用状態を初期化
            setEditedMerchant(result.merchant || '');
            setEditedDate(result.date || '');
            setEditedAmount(result.totalAmount?.toString() || '');
            setEditedCategory(result.suggestedCategory || '');

            setStep('review');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setStep('capture');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setOcrResult(null);
        setError(null);
        setStep('capture');
    };

    const handleSave = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        setIsProcessing(true);

        try {
            // Firestoreに保存
            await saveReceiptTransaction(
                user.uid,
                {
                    merchant: editedMerchant || null,
                    date: editedDate || null,
                    totalAmount: editedAmount ? parseInt(editedAmount) : null,
                    suggestedCategory: editedCategory || null,
                },
                capturedImage || undefined
            );

            setStep('complete');
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleComplete = () => {
        router.push('/swipe');
    };

    const handleAddAnother = () => {
        setCapturedImage(null);
        setOcrResult(null);
        setError(null);
        setStep('capture');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link
                        href="/import"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        レシート撮影
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* エラー表示 */}
                {(error || cameraError) && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error || cameraError}</p>
                    </div>
                )}

                {/* Step 1: 撮影/選択 */}
                {step === 'capture' && (
                    <div>
                        <p className="text-sm text-gray-500 mb-6 text-center">
                            レシートを撮影するか、保存済みの画像を選択してください
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleCapture('camera')}
                                disabled={isCapturing}
                                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-blue-600" />
                                </div>
                                <span className="font-medium text-gray-700">カメラで撮影</span>
                            </button>

                            <button
                                onClick={() => handleCapture('gallery')}
                                disabled={isCapturing}
                                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-emerald-600" />
                                </div>
                                <span className="font-medium text-gray-700">写真を選択</span>
                            </button>
                        </div>

                        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <h4 className="font-medium text-blue-800 mb-2">撮影のコツ</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• レシート全体が写るようにしてください</li>
                                <li>• 明るい場所で撮影すると読み取り精度が上がります</li>
                                <li>• シワや折り目を伸ばしてから撮影してください</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: OCR処理中 */}
                {step === 'processing' && (
                    <div className="text-center py-12">
                        {capturedImage && (
                            <div className="mb-6">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={capturedImage}
                                    alt="撮影したレシート"
                                    className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                                />
                            </div>
                        )}
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">レシートを解析中...</p>
                        <p className="text-sm text-gray-500 mt-1">
                            AIが店舗名・日付・金額を読み取っています
                        </p>
                    </div>
                )}

                {/* Step 3: 確認・編集 */}
                {step === 'review' && ocrResult && (
                    <div>
                        {/* 画像プレビュー */}
                        {capturedImage && (
                            <div className="mb-6 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={capturedImage}
                                    alt="撮影したレシート"
                                    className="w-full max-h-48 object-contain rounded-xl bg-gray-100"
                                />
                                <button
                                    onClick={handleRetake}
                                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg shadow-sm hover:bg-white transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                        )}

                        {/* 信頼度表示 */}
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-sm text-gray-500">読み取り精度:</span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${
                                        ocrResult.confidence >= 80
                                            ? 'bg-emerald-500'
                                            : ocrResult.confidence >= 50
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                    }`}
                                    style={{ width: `${ocrResult.confidence}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                                {ocrResult.confidence}%
                            </span>
                        </div>

                        {/* 編集フォーム */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    店舗名
                                </label>
                                <input
                                    type="text"
                                    value={editedMerchant}
                                    onChange={(e) => setEditedMerchant(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="店舗名を入力"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    日付
                                </label>
                                <input
                                    type="date"
                                    value={editedDate}
                                    onChange={(e) => setEditedDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    金額
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                        value={editedAmount}
                                        onChange={(e) => setEditedAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    カテゴリ
                                </label>
                                <select
                                    value={editedCategory}
                                    onChange={(e) =>
                                        setEditedCategory(e.target.value as ExpenseCategory)
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">選択してください</option>
                                    {EXPENSE_CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nameJa}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={handleSave}
                                disabled={
                                    isProcessing || !editedMerchant || !editedDate || !editedAmount
                                }
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-5 h-5" />
                                )}
                                取引に追加
                            </button>

                            <button
                                onClick={handleRetake}
                                className="w-full py-3 text-gray-600 hover:text-gray-800"
                            >
                                撮り直す
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: 完了 */}
                {step === 'complete' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">追加しました</h2>
                        <p className="text-gray-500 mb-8">
                            レシートの取引を追加しました。
                            <br />
                            続けて撮影するか、仕分けを始めましょう。
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleAddAnother}
                                className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors"
                            >
                                続けて撮影する
                            </button>

                            <button
                                onClick={handleComplete}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                仕分けを始める
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
