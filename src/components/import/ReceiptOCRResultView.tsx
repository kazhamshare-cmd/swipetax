'use client';

import { useState, useCallback } from 'react';
import { Check, X, Edit3, Loader2 } from 'lucide-react';
import { ReceiptOCRResult } from '@/lib/import/document-types';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/lib/types';

interface ReceiptOCRResultViewProps {
    result: ReceiptOCRResult;
    imageUrl: string;
    onConfirm: (data: ReceiptOCRResult) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

// カテゴリ表示名（EXPENSE_CATEGORIESから生成）
const CATEGORY_LABELS: Record<ExpenseCategory, string> = EXPENSE_CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat.id]: cat.nameJa }),
    {} as Record<ExpenseCategory, string>
);

export function ReceiptOCRResultView({
    result,
    imageUrl,
    onConfirm,
    onCancel,
    isLoading = false,
}: ReceiptOCRResultViewProps) {
    const [editedData, setEditedData] = useState<ReceiptOCRResult>(result);
    const [isEditing, setIsEditing] = useState(false);

    const handleFieldChange = useCallback((field: keyof ReceiptOCRResult, value: any) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleConfirm = useCallback(() => {
        onConfirm(editedData);
    }, [editedData, onConfirm]);

    if (!result.success) {
        return (
            <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">読み取りに失敗しました</h3>
                <p className="text-gray-600 mb-6">{result.error || 'レシートの内容を認識できませんでした'}</p>
                <button
                    onClick={onCancel}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                    撮り直す
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* 画像プレビュー */}
            <div className="h-48 bg-gray-100 overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* OCR結果 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">読み取り結果</h3>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-1 text-sm text-blue-500"
                    >
                        <Edit3 className="w-4 h-4" />
                        {isEditing ? '完了' : '編集'}
                    </button>
                </div>

                {/* 店舗名 */}
                <div>
                    <label className="block text-sm text-gray-500 mb-1">店舗名</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedData.merchant || ''}
                            onChange={(e) => handleFieldChange('merchant', e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-lg"
                        />
                    ) : (
                        <p className="font-medium text-gray-900">{editedData.merchant || '不明'}</p>
                    )}
                </div>

                {/* 日付 */}
                <div>
                    <label className="block text-sm text-gray-500 mb-1">日付</label>
                    {isEditing ? (
                        <input
                            type="date"
                            value={editedData.date || ''}
                            onChange={(e) => handleFieldChange('date', e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-lg"
                        />
                    ) : (
                        <p className="font-medium text-gray-900">{editedData.date || '不明'}</p>
                    )}
                </div>

                {/* 金額 */}
                <div>
                    <label className="block text-sm text-gray-500 mb-1">金額</label>
                    {isEditing ? (
                        <input
                            type="number"
                            value={editedData.totalAmount || 0}
                            onChange={(e) => handleFieldChange('totalAmount', Number(e.target.value))}
                            className="w-full p-3 border border-gray-200 rounded-lg"
                        />
                    ) : (
                        <p className="text-xl font-bold text-gray-900">
                            ¥{(editedData.totalAmount || 0).toLocaleString()}
                        </p>
                    )}
                </div>

                {/* 消費税 */}
                {editedData.taxAmount !== undefined && editedData.taxAmount !== null && (
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">消費税</label>
                        <p className="font-medium text-gray-900">
                            ¥{editedData.taxAmount.toLocaleString()}
                        </p>
                    </div>
                )}

                {/* カテゴリ */}
                <div>
                    <label className="block text-sm text-gray-500 mb-1">カテゴリ</label>
                    <select
                        value={editedData.suggestedCategory || 'miscellaneous'}
                        onChange={(e) => handleFieldChange('suggestedCategory', e.target.value as ExpenseCategory)}
                        className="w-full p-3 border border-gray-200 rounded-lg"
                    >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* 明細 */}
                {editedData.items && editedData.items.length > 0 && (
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">明細</label>
                        <div className="space-y-2">
                            {editedData.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="text-gray-700">{item.name}</span>
                                    <span className="font-medium">¥{item.price.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 信頼度 */}
                {editedData.confidence > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                            読み取り精度: {editedData.confidence}%
                        </p>
                    </div>
                )}
            </div>

            {/* アクションボタン */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                    撮り直す
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            保存
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
