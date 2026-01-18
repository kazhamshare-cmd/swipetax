'use client';

import { useState, useCallback } from 'react';
import { Check, X, Edit3, Loader2 } from 'lucide-react';
import { TaxReturnOCRResult } from '@/lib/import/document-types';
import { DeductionType, FilingType } from '@/lib/types';

interface TaxReturnOCRResultViewProps {
    result: TaxReturnOCRResult;
    imageUrl: string;
    onConfirm: (data: TaxReturnOCRResult) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

// 控除タイプ表示名
const DEDUCTION_LABELS: Record<DeductionType, string> = {
    medical: '医療費控除',
    social_insurance: '社会保険料控除',
    life_insurance: '生命保険料控除',
    earthquake_insurance: '地震保険料控除',
    donation: '寄附金控除',
    mortgage: '住宅ローン控除',
    spouse: '配偶者控除',
    dependent: '扶養控除',
    basic: '基礎控除',
};

// 申告タイプ表示名
const FILING_TYPE_LABELS: Record<FilingType, string> = {
    white: '白色申告',
    blue_simple: '青色申告（簡易）',
    blue_regular: '青色申告（正規）',
    blue_etax: '青色申告（e-Tax）',
};

export function TaxReturnOCRResultView({
    result,
    imageUrl,
    onConfirm,
    onCancel,
    isLoading = false,
}: TaxReturnOCRResultViewProps) {
    const [editedData, setEditedData] = useState<TaxReturnOCRResult>(result);
    const [isEditing, setIsEditing] = useState(false);

    const handleFieldChange = useCallback((field: keyof TaxReturnOCRResult, value: any) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleDeductionChange = useCallback((type: DeductionType, value: number) => {
        setEditedData(prev => ({
            ...prev,
            deductions: {
                ...prev.deductions,
                [type]: value,
            },
        }));
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
                <p className="text-gray-600 mb-6">{result.error || '確定申告書の内容を認識できませんでした'}</p>
                <button
                    onClick={onCancel}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                    撮り直す
                </button>
            </div>
        );
    }

    // 控除合計を計算
    const totalDeductions = Object.values(editedData.deductions || {}).reduce(
        (sum, amount) => sum + (amount || 0),
        0
    );

    // 控除のエントリーを配列化
    const deductionEntries = Object.entries(editedData.deductions || {}) as [DeductionType, number][];

    return (
        <div className="flex flex-col h-full">
            {/* 画像プレビュー */}
            <div className="h-32 bg-gray-100 overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Tax Return"
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

                {/* 基本情報 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">年度</label>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedData.fiscalYear || ''}
                                onChange={(e) => handleFieldChange('fiscalYear', Number(e.target.value))}
                                className="w-full p-2 border border-gray-200 rounded-lg"
                            />
                        ) : (
                            <p className="font-medium text-gray-900">{editedData.fiscalYear}年</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">申告区分</label>
                        {isEditing ? (
                            <select
                                value={editedData.filingType || 'white'}
                                onChange={(e) => handleFieldChange('filingType', e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg"
                            >
                                {Object.entries(FILING_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="font-medium text-gray-900">
                                {FILING_TYPE_LABELS[editedData.filingType || 'white']}
                            </p>
                        )}
                    </div>
                </div>

                {/* 収入・所得 */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">事業所得</span>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedData.businessIncome || 0}
                                onChange={(e) => handleFieldChange('businessIncome', Number(e.target.value))}
                                className="w-32 p-2 border border-gray-200 rounded-lg text-right"
                            />
                        ) : (
                            <span className="font-bold text-gray-900">
                                ¥{(editedData.businessIncome || 0).toLocaleString()}
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">給与所得</span>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedData.salaryIncome || 0}
                                onChange={(e) => handleFieldChange('salaryIncome', Number(e.target.value))}
                                className="w-32 p-2 border border-gray-200 rounded-lg text-right"
                            />
                        ) : (
                            <span className="font-bold text-gray-900">
                                ¥{(editedData.salaryIncome || 0).toLocaleString()}
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                        <span className="text-gray-600">課税所得</span>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedData.taxableIncome || 0}
                                onChange={(e) => handleFieldChange('taxableIncome', Number(e.target.value))}
                                className="w-32 p-2 border border-gray-200 rounded-lg text-right"
                            />
                        ) : (
                            <span className="font-bold text-gray-900">
                                ¥{(editedData.taxableIncome || 0).toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>

                {/* 控除一覧 */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-2">控除項目</h4>
                    <div className="space-y-2">
                        {deductionEntries.length > 0 ? (
                            deductionEntries.map(([type, amount]) => (
                                <div
                                    key={type}
                                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                                >
                                    <span className="text-gray-700">
                                        {DEDUCTION_LABELS[type] || type}
                                    </span>
                                    <div className="ml-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={amount || 0}
                                                onChange={(e) => handleDeductionChange(type, Number(e.target.value))}
                                                className="w-28 p-1 border border-gray-200 rounded text-right text-sm"
                                            />
                                        ) : (
                                            <span className="font-medium text-orange-700">
                                                ¥{(amount || 0).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">
                                控除項目が見つかりませんでした
                            </p>
                        )}
                    </div>
                    {deductionEntries.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                            <span className="font-medium text-gray-700">控除合計</span>
                            <span className="font-bold text-orange-600">
                                ¥{totalDeductions.toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* 税額情報 */}
                {editedData.totalTax !== null && editedData.totalTax !== undefined && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-700">納税額</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={editedData.totalTax || 0}
                                    onChange={(e) => handleFieldChange('totalTax', Number(e.target.value))}
                                    className="w-32 p-2 border border-gray-200 rounded-lg text-right"
                                />
                            ) : (
                                <span className="font-bold text-blue-900 text-lg">
                                    ¥{(editedData.totalTax || 0).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* 信頼度 */}
                {editedData.confidence > 0 && (
                    <div className="p-3 bg-gray-100 rounded-lg">
                        <p className="text-sm text-gray-600">
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
                    className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
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
