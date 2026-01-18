'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Camera,
    ImageIcon,
    Loader2,
    CheckCircle,
    AlertCircle,
    RotateCcw,
    Plus,
    Trash2,
    Package,
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/api-config';
import { savePurchaseEntry, getPurchaseEntries, deletePurchaseEntry, ITEM_CATEGORY_LABELS } from '@/lib/purchase-service';
import { PurchaseInvoiceOCRResult, PurchaseItem, PurchaseEntry } from '@/lib/types';

type Step = 'capture' | 'processing' | 'review' | 'complete';

export default function PurchaseOCRPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { capturePhoto, isCapturing, error: cameraError } = useCamera();

    const [step, setStep] = useState<Step>('capture');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<PurchaseInvoiceOCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 編集用の状態
    const [editedSupplier, setEditedSupplier] = useState('');
    const [editedInvoiceNumber, setEditedInvoiceNumber] = useState('');
    const [editedDate, setEditedDate] = useState('');
    const [editedItems, setEditedItems] = useState<PurchaseItem[]>([]);
    const [editedTotalAmount, setEditedTotalAmount] = useState('');
    const [notes, setNotes] = useState('');

    // 履歴
    const [recentEntries, setRecentEntries] = useState<PurchaseEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // 履歴取得
    useEffect(() => {
        if (user) {
            loadRecentEntries();
        }
    }, [user]);

    const loadRecentEntries = async () => {
        if (!user) return;
        try {
            const entries = await getPurchaseEntries(user.uid);
            setRecentEntries(entries.slice(0, 5));
        } catch (err) {
            console.error('Failed to load entries:', err);
        }
    };

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
                    documentType: 'purchase_invoice',
                }),
            });

            if (!response.ok) {
                throw new Error('OCR処理に失敗しました');
            }

            const result: PurchaseInvoiceOCRResult = await response.json();

            if (!result.success) {
                throw new Error(result.error || '仕入れ伝票を読み取れませんでした');
            }

            setOcrResult(result);

            // 編集用状態を初期化
            setEditedSupplier(result.supplierName || '');
            setEditedInvoiceNumber(result.invoiceNumber || '');
            setEditedDate(result.date || new Date().toISOString().split('T')[0]);
            setEditedItems(result.items || []);
            setEditedTotalAmount(result.totalAmount?.toString() || '');

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

    const handleAddItem = () => {
        setEditedItems([
            ...editedItems,
            { name: '', category: 'other', quantity: 1, unit: '', unitPrice: 0, price: 0 },
        ]);
    };

    const handleUpdateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
        const newItems = [...editedItems];
        newItems[index] = { ...newItems[index], [field]: value };

        // 単価と数量から金額を自動計算
        if (field === 'quantity' || field === 'unitPrice') {
            const qty = field === 'quantity' ? Number(value) : newItems[index].quantity || 0;
            const unitPrice = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice || 0;
            newItems[index].price = qty * unitPrice;
        }

        setEditedItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setEditedItems(editedItems.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return editedItems.reduce((sum, item) => sum + (item.price || 0), 0);
    };

    const handleSave = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        if (!editedSupplier.trim()) {
            setError('仕入先を入力してください');
            return;
        }

        const totalAmount = parseFloat(editedTotalAmount) || calculateTotal();
        if (totalAmount <= 0) {
            setError('金額を入力してください');
            return;
        }

        setIsProcessing(true);

        try {
            const fiscalYear = new Date(editedDate).getFullYear();

            await savePurchaseEntry(user.uid, {
                fiscalYear,
                supplierName: editedSupplier.trim(),
                invoiceNumber: editedInvoiceNumber.trim() || undefined,
                date: editedDate,
                items: editedItems.filter(item => item.name && item.price > 0),
                totalAmount,
                receiptImage: capturedImage || undefined,
                notes: notes.trim() || undefined,
            });

            setStep('complete');
            await loadRecentEntries();
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddAnother = () => {
        setCapturedImage(null);
        setOcrResult(null);
        setEditedSupplier('');
        setEditedInvoiceNumber('');
        setEditedDate(new Date().toISOString().split('T')[0]);
        setEditedItems([]);
        setEditedTotalAmount('');
        setNotes('');
        setError(null);
        setStep('capture');
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('この仕入れデータを削除しますか？')) return;

        try {
            await deletePurchaseEntry(entryId);
            await loadRecentEntries();
        } catch (err) {
            console.error('Delete Error:', err);
            setError('削除に失敗しました');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-orange-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link
                        href="/restaurant"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        仕入れ伝票撮影
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
                            仕入れ伝票や納品書を撮影してください
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleCapture('camera')}
                                disabled={isCapturing}
                                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-orange-600" />
                                </div>
                                <span className="font-medium text-gray-700">カメラで撮影</span>
                            </button>

                            <button
                                onClick={() => handleCapture('gallery')}
                                disabled={isCapturing}
                                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-amber-600" />
                                </div>
                                <span className="font-medium text-gray-700">写真を選択</span>
                            </button>
                        </div>

                        <div className="mt-8 p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <h4 className="font-medium text-orange-800 mb-2">撮影のコツ</h4>
                            <ul className="text-sm text-orange-700 space-y-1">
                                <li>• 伝票全体が写るようにしてください</li>
                                <li>• 仕入先名、日付、品目、金額が見えるように</li>
                                <li>• 手書きの伝票も読み取れます</li>
                            </ul>
                        </div>

                        {/* 履歴セクション */}
                        {recentEntries.length > 0 && (
                            <div className="mt-8">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    <Package className="w-4 h-4" />
                                    最近の仕入れ ({recentEntries.length}件)
                                </button>

                                {showHistory && (
                                    <div className="mt-3 space-y-2">
                                        {recentEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-800">
                                                        {entry.supplierName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {entry.date} ・ {entry.items.length}品目
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-orange-600">
                                                        {formatCurrency(entry.totalAmount)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
                                    alt="撮影した伝票"
                                    className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                                />
                            </div>
                        )}
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">伝票を解析中...</p>
                        <p className="text-sm text-gray-500 mt-1">
                            AIが仕入先・品目・金額を読み取っています
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
                                    alt="撮影した伝票"
                                    className="w-full max-h-32 object-contain rounded-xl bg-gray-100"
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

                        {/* 基本情報 */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        仕入先 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editedSupplier}
                                        onChange={(e) => setEditedSupplier(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="○○青果店"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        伝票番号
                                    </label>
                                    <input
                                        type="text"
                                        value={editedInvoiceNumber}
                                        onChange={(e) => setEditedInvoiceNumber(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="任意"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            {/* 品目一覧 */}
                            <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-medium text-gray-700">品目</p>
                                    <button
                                        onClick={handleAddItem}
                                        className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        追加
                                    </button>
                                </div>

                                {editedItems.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">
                                        品目がありません
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {editedItems.map((item, index) => (
                                            <div
                                                key={index}
                                                className="bg-gray-50 rounded-lg p-3 space-y-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) =>
                                                            handleUpdateItem(index, 'name', e.target.value)
                                                        }
                                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                        placeholder="品目名"
                                                    />
                                                    <select
                                                        value={item.category || 'other'}
                                                        onChange={(e) =>
                                                            handleUpdateItem(index, 'category', e.target.value)
                                                        }
                                                        className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    >
                                                        {Object.entries(ITEM_CATEGORY_LABELS).map(
                                                            ([value, label]) => (
                                                                <option key={value} value={value}>
                                                                    {label}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                    <button
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity || ''}
                                                        onChange={(e) =>
                                                            handleUpdateItem(
                                                                index,
                                                                'quantity',
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                        placeholder="数量"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.unit || ''}
                                                        onChange={(e) =>
                                                            handleUpdateItem(index, 'unit', e.target.value)
                                                        }
                                                        className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                        placeholder="単位"
                                                    />
                                                    <span className="text-gray-400">×</span>
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice || ''}
                                                        onChange={(e) =>
                                                            handleUpdateItem(
                                                                index,
                                                                'unitPrice',
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                        placeholder="単価"
                                                    />
                                                    <span className="text-gray-400">=</span>
                                                    <span className="font-medium text-gray-800">
                                                        ¥{item.price?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 合計金額 */}
                            <div className="pt-2 border-t border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    合計金額
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                        value={editedTotalAmount}
                                        onChange={(e) => setEditedTotalAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder={calculateTotal().toString()}
                                    />
                                </div>
                                {editedItems.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        品目合計: {formatCurrency(calculateTotal())}
                                    </p>
                                )}
                            </div>

                            {/* 備考 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    備考
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    rows={2}
                                    placeholder="メモがあれば入力"
                                />
                            </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !editedSupplier}
                                className="w-full py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-5 h-5" />
                                )}
                                仕入れを保存
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
                        <h2 className="text-xl font-bold text-gray-800 mb-2">保存しました</h2>
                        <p className="text-gray-500 mb-8">
                            仕入れデータを保存しました。
                            <br />
                            経費として自動登録されています。
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleAddAnother}
                                className="w-full py-3 bg-white border-2 border-orange-600 text-orange-600 font-medium rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Camera className="w-5 h-5" />
                                続けて撮影する
                            </button>

                            <Link
                                href="/restaurant"
                                className="block w-full py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-colors text-center"
                            >
                                メニューに戻る
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
