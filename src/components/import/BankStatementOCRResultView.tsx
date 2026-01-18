'use client';

import { useState, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { BankStatementOCRResult } from '@/lib/import/document-types';
import { EXPENSE_CATEGORIES } from '@/lib/types';

interface BankStatementOCRResultViewProps {
    result: BankStatementOCRResult;
    imageUrl: string;
    onConfirm: (data: BankStatementOCRResult) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function BankStatementOCRResultView({
    result,
    imageUrl,
    onConfirm,
    onCancel,
    isLoading = false,
}: BankStatementOCRResultViewProps) {
    const [editedData, setEditedData] = useState<BankStatementOCRResult>(result);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
        new Set(result.transactions?.map((_, i) => i) || [])
    );

    const handleToggleSelect = useCallback((index: number) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    const handleTransactionChange = useCallback((index: number, field: string, value: any) => {
        setEditedData(prev => ({
            ...prev,
            transactions: prev.transactions.map((tx, i) =>
                i === index ? { ...tx, [field]: value } : tx
            ),
        }));
    }, []);

    const handleConfirm = useCallback(() => {
        const filteredData = {
            ...editedData,
            transactions: editedData.transactions.filter((_, i) => selectedIndices.has(i)),
        };
        onConfirm(filteredData);
    }, [editedData, selectedIndices, onConfirm]);

    if (!result.success) {
        return (
            <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">読み取りに失敗しました</h3>
                <p className="text-gray-600 mb-6">{result.error || '通帳の内容を認識できませんでした'}</p>
                <button
                    onClick={onCancel}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                    撮り直す
                </button>
            </div>
        );
    }

    const transactions = editedData.transactions || [];
    const selectedCount = selectedIndices.size;
    const totalAmount = transactions
        .filter((_, i) => selectedIndices.has(i))
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return (
        <div className="flex flex-col h-full">
            {/* 画像プレビュー */}
            <div className="h-32 bg-gray-100 overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Bank Statement"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* サマリー */}
            <div className="p-4 bg-purple-50 border-b border-purple-100">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-purple-600">
                            {editedData.bankName || '銀行名不明'}
                        </p>
                        <p className="text-lg font-bold text-purple-900">
                            {selectedCount}件選択中 / {transactions.length}件
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">合計金額</p>
                        <p className="text-lg font-bold text-gray-900">
                            ¥{totalAmount.toLocaleString()}
                        </p>
                    </div>
                </div>
                {editedData.confidence > 0 && (
                    <p className="text-xs text-purple-500 mt-2">
                        読み取り精度: {editedData.confidence}%
                    </p>
                )}
            </div>

            {/* 取引リスト */}
            <div className="flex-1 overflow-y-auto">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        取引明細が見つかりませんでした
                    </div>
                ) : (
                    transactions.map((tx, index) => (
                        <div
                            key={index}
                            className={`p-4 border-b border-gray-100 ${
                                selectedIndices.has(index) ? 'bg-white' : 'bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedIndices.has(index)}
                                    onChange={() => handleToggleSelect(index)}
                                    className="mt-1 w-5 h-5 rounded border-gray-300"
                                />
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="text"
                                        value={tx.description}
                                        onChange={(e) => handleTransactionChange(index, 'description', e.target.value)}
                                        className="w-full font-medium text-gray-900 bg-transparent border-0 p-0 focus:ring-0"
                                        placeholder="取引内容"
                                    />
                                    <input
                                        type="date"
                                        value={tx.date}
                                        onChange={(e) => handleTransactionChange(index, 'date', e.target.value)}
                                        className="text-sm text-gray-500 bg-transparent border-0 p-0 focus:ring-0 mt-1"
                                    />
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${tx.isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.isDeposit ? '+' : '-'}¥{Math.abs(tx.amount).toLocaleString()}
                                    </p>
                                    {tx.balance !== undefined && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            残高: ¥{tx.balance.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
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
                    disabled={isLoading || selectedCount === 0}
                    className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            {selectedCount}件を保存
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
