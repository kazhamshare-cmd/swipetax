'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Package,
    Plus,
    Trash2,
    Loader2,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    Calculator,
    Edit2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessProfile } from '@/lib/business-profile-service';
import {
    InventoryRecord,
    InventoryBreakdown,
    InventoryStatus,
    INVENTORY_CATEGORIES,
    saveInventoryRecord,
    getInventoryRecord,
    calculateCostOfGoodsSold,
    calculateGrossProfit,
    isInventoryComplete,
    getInventoryWarning,
    estimateClosingInventory,
    generateInventoryId,
} from '@/lib/inventory-service';

type ViewMode = 'view' | 'edit' | 'saving';

export default function InventoryPage() {
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [viewMode, setViewMode] = useState<ViewMode>('view');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // データ
    const [inventoryRecord, setInventoryRecord] = useState<InventoryRecord | null>(null);
    const [businessCategory, setBusinessCategory] = useState<string>('小売業');
    const [warning, setWarning] = useState<string | null>(null);

    // 仕入高（取引データから取得 - 簡易版では手入力）
    const [yearlyPurchases, setYearlyPurchases] = useState<number>(0);
    const [yearlyRevenue, setYearlyRevenue] = useState<number>(0);

    // フォーム
    const [openingInventory, setOpeningInventory] = useState('');
    const [closingInventory, setClosingInventory] = useState('');
    const [inventoryDate, setInventoryDate] = useState(
        `${fiscalYear}-12-31`
    );
    const [status, setStatus] = useState<InventoryStatus>('pending');
    const [notes, setNotes] = useState('');
    const [breakdown, setBreakdown] = useState<InventoryBreakdown[]>([]);

    // 計算結果
    const [costOfGoodsSold, setCostOfGoodsSold] = useState<number>(0);
    const [grossProfit, setGrossProfit] = useState<number>(0);

    // データ読み込み
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    // 自動計算
    useEffect(() => {
        const opening = parseFloat(openingInventory) || 0;
        const closing = parseFloat(closingInventory) || 0;

        if (opening > 0 || closing > 0 || yearlyPurchases > 0) {
            const cogs = calculateCostOfGoodsSold(opening, yearlyPurchases, closing);
            const profit = calculateGrossProfit(yearlyRevenue, cogs);
            setCostOfGoodsSold(cogs);
            setGrossProfit(profit);
        }
    }, [openingInventory, closingInventory, yearlyPurchases, yearlyRevenue]);

    const loadData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [record, profile] = await Promise.all([
                getInventoryRecord(user.uid, fiscalYear),
                getBusinessProfile(user.uid, fiscalYear),
            ]);

            if (record) {
                setInventoryRecord(record);
                setOpeningInventory(String(record.openingInventory || 0));
                setClosingInventory(String(record.closingInventory || ''));
                setInventoryDate(record.inventoryDate || `${fiscalYear}-12-31`);
                setStatus(record.status);
                setNotes(record.notes || '');
                setBreakdown(record.breakdown || []);
            }

            if (profile?.businessCategory) {
                setBusinessCategory(profile.businessCategory);
            }

            // 期首棚卸高は前年の期末棚卸高から引き継ぐ
            if (!record && profile?.openingBalance?.inventory) {
                setOpeningInventory(String(profile.openingBalance.inventory));
            }

            // 警告チェック
            const warningMsg = getInventoryWarning(record, new Date());
            setWarning(warningMsg);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('データの読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        setIsSaving(true);
        setError(null);
        setViewMode('saving');

        try {
            const opening = parseFloat(openingInventory) || 0;
            const closing = parseFloat(closingInventory) || undefined;

            await saveInventoryRecord({
                id: inventoryRecord?.id || generateInventoryId(),
                userId: user.uid,
                fiscalYear,
                openingInventory: opening,
                closingInventory: closing,
                status,
                inventoryDate: status !== 'pending' ? inventoryDate : undefined,
                breakdown: breakdown.length > 0 ? breakdown : undefined,
                notes: notes.trim() || undefined,
            });

            await loadData();
            setSuccessMessage('棚卸データを保存しました');
            setViewMode('view');
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
            setViewMode('edit');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEstimate = () => {
        // 概算値を計算（売上原価率70%として）
        const opening = parseFloat(openingInventory) || 0;
        const estimated = estimateClosingInventory(opening, yearlyPurchases, 0.7);
        setClosingInventory(String(Math.round(estimated)));
        setStatus('estimated');
    };

    const handleAddBreakdownItem = () => {
        const categories = INVENTORY_CATEGORIES[businessCategory] || INVENTORY_CATEGORIES['小売業'];
        setBreakdown([
            ...breakdown,
            {
                category: categories[0] || 'その他',
                amount: 0,
            },
        ]);
    };

    const handleUpdateBreakdownItem = (
        index: number,
        field: keyof InventoryBreakdown,
        value: string | number
    ) => {
        const updated = [...breakdown];
        updated[index] = { ...updated[index], [field]: value };
        setBreakdown(updated);
    };

    const handleRemoveBreakdownItem = (index: number) => {
        setBreakdown(breakdown.filter((_, i) => i !== index));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };

    const totalBreakdown = breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 成功メッセージを自動で消す
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const categories = INVENTORY_CATEGORIES[businessCategory] || INVENTORY_CATEGORIES['小売業'];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        棚卸資産管理
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* エラー表示 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* 成功メッセージ */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                )}

                {/* 警告表示 */}
                {warning && viewMode === 'view' && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">{warning}</p>
                    </div>
                )}

                {/* ローディング */}
                {isLoading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">読み込み中...</p>
                    </div>
                )}

                {/* 保存中 */}
                {viewMode === 'saving' && (
                    <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">保存中...</p>
                    </div>
                )}

                {/* 表示モード */}
                {viewMode === 'view' && !isLoading && (
                    <>
                        {/* ステータス */}
                        <div className="mb-6">
                            {inventoryRecord?.status === 'completed' ? (
                                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    棚卸完了
                                </div>
                            ) : inventoryRecord?.status === 'estimated' ? (
                                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2">
                                    <Calculator className="w-4 h-4" />
                                    概算入力済み
                                </div>
                            ) : (
                                <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    未入力
                                </div>
                            )}
                        </div>

                        {/* サマリーカード */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                            <h2 className="text-sm font-medium text-gray-500 mb-4">
                                {fiscalYear}年の棚卸状況
                            </h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">期首棚卸高</span>
                                    <span className="font-medium text-gray-800">
                                        {inventoryRecord?.openingInventory
                                            ? formatCurrency(inventoryRecord.openingInventory)
                                            : '未入力'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">期末棚卸高</span>
                                    <span className={`font-medium ${
                                        inventoryRecord?.closingInventory !== undefined
                                            ? 'text-gray-800'
                                            : 'text-amber-600'
                                    }`}>
                                        {inventoryRecord?.closingInventory !== undefined
                                            ? formatCurrency(inventoryRecord.closingInventory)
                                            : '要入力'}
                                    </span>
                                </div>

                                {inventoryRecord?.inventoryDate && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">棚卸実施日</span>
                                        <span className="text-gray-600">
                                            {inventoryRecord.inventoryDate}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 計算結果表示 */}
                            {inventoryRecord?.closingInventory !== undefined && yearlyPurchases > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">売上原価</span>
                                        <span className="font-medium text-gray-800">
                                            {formatCurrency(costOfGoodsSold)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        売上原価 = 期首棚卸高 + 仕入高 - 期末棚卸高
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 内訳 */}
                        {inventoryRecord?.breakdown && inventoryRecord.breakdown.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">
                                    内訳
                                </h3>
                                <div className="space-y-2">
                                    {inventoryRecord.breakdown.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-center text-sm"
                                        >
                                            <span className="text-gray-600">{item.category}</span>
                                            <span className="text-gray-800">
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* アクションボタン */}
                        <button
                            onClick={() => setViewMode('edit')}
                            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Edit2 className="w-5 h-5" />
                            {inventoryRecord ? '棚卸データを編集' : '棚卸データを入力'}
                        </button>

                        {/* 説明 */}
                        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-800">
                                <strong>棚卸について</strong>
                                <br />
                                確定申告では、期末時点での在庫（棚卸資産）の金額が必要です。
                                年末に実地棚卸を行い、商品の在庫金額を確定してください。
                            </p>
                            <p className="text-sm text-blue-800 mt-2">
                                <strong>計算式:</strong>
                                <br />
                                売上原価 = 期首棚卸高 + 仕入高 - 期末棚卸高
                            </p>
                        </div>
                    </>
                )}

                {/* 編集モード */}
                {viewMode === 'edit' && !isLoading && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-800">
                                棚卸データを入力
                            </h2>
                            <button
                                onClick={() => {
                                    setViewMode('view');
                                    setError(null);
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                キャンセル
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            {/* 期首棚卸高 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    期首棚卸高（{fiscalYear}年1月1日時点）
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={openingInventory}
                                        onChange={(e) => setOpeningInventory(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="前年末の在庫金額"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    前年の期末棚卸高を入力（初年度は0円）
                                </p>
                            </div>

                            {/* 期末棚卸高 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    期末棚卸高（{fiscalYear}年12月31日時点）
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={closingInventory}
                                        onChange={(e) => {
                                            setClosingInventory(e.target.value);
                                            if (e.target.value) {
                                                setStatus('completed');
                                            }
                                        }}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="実地棚卸の結果を入力"
                                    />
                                </div>
                            </div>

                            {/* 概算ボタン */}
                            {!closingInventory && yearlyPurchases > 0 && (
                                <button
                                    onClick={handleEstimate}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Calculator className="w-4 h-4" />
                                    概算値を自動計算する
                                </button>
                            )}

                            {/* 棚卸実施日 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    棚卸実施日
                                </label>
                                <input
                                    type="date"
                                    value={inventoryDate}
                                    onChange={(e) => setInventoryDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* ステータス */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    入力状態
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStatus('completed')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                            status === 'completed'
                                                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}
                                    >
                                        確定
                                    </button>
                                    <button
                                        onClick={() => setStatus('estimated')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                            status === 'estimated'
                                                ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}
                                    >
                                        概算
                                    </button>
                                    <button
                                        onClick={() => setStatus('pending')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                            status === 'pending'
                                                ? 'bg-gray-200 text-gray-800 border-2 border-gray-400'
                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}
                                    >
                                        未確定
                                    </button>
                                </div>
                            </div>

                            {/* 内訳 */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-700">
                                        内訳（任意）
                                    </label>
                                    <button
                                        onClick={handleAddBreakdownItem}
                                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        項目を追加
                                    </button>
                                </div>

                                {breakdown.length > 0 && (
                                    <div className="space-y-3">
                                        {breakdown.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2"
                                            >
                                                <select
                                                    value={item.category}
                                                    onChange={(e) =>
                                                        handleUpdateBreakdownItem(
                                                            index,
                                                            'category',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    {categories.map((cat) => (
                                                        <option key={cat} value={cat}>
                                                            {cat}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                                        ¥
                                                    </span>
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        value={item.amount || ''}
                                                        onChange={(e) =>
                                                            handleUpdateBreakdownItem(
                                                                index,
                                                                'amount',
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="金額"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveBreakdownItem(index)}
                                                    className="p-2 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* 内訳合計 */}
                                        <div className="flex justify-between items-center pt-2 text-sm">
                                            <span className="text-gray-500">内訳合計</span>
                                            <span className="font-medium text-gray-800">
                                                {formatCurrency(totalBreakdown)}
                                            </span>
                                        </div>
                                    </div>
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="メモがあれば入力"
                                />
                            </div>
                        </div>

                        {/* 計算プレビュー */}
                        {(openingInventory || closingInventory) && (
                            <div className="mt-4 bg-blue-50 rounded-xl border border-blue-100 p-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    売上原価の計算（参考）
                                </p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">期首棚卸高</span>
                                        <span>{formatCurrency(parseFloat(openingInventory) || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">+ 仕入高</span>
                                        <span>{formatCurrency(yearlyPurchases)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">- 期末棚卸高</span>
                                        <span>{formatCurrency(parseFloat(closingInventory) || 0)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-blue-200 font-medium">
                                        <span className="text-gray-700">= 売上原価</span>
                                        <span className="text-blue-600">
                                            {formatCurrency(costOfGoodsSold)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 保存ボタン */}
                        <div className="mt-6">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                保存する
                            </button>
                        </div>

                        <p className="mt-4 text-sm text-gray-500 text-center">
                            後から修正することもできます
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
