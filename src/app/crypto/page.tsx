'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Plus,
    Trash2,
    Check,
    HelpCircle,
    TrendingUp,
    TrendingDown,
    Bitcoin,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Gift,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    CryptoEntry,
    CryptoTransactionType,
    CryptoCurrency,
    CRYPTO_CURRENCY_INFO,
    CRYPTO_TRANSACTION_TYPE_INFO,
} from '@/lib/types';
import {
    saveCryptoEntry,
    getCryptoEntries,
    deleteCryptoEntry,
    calculateTotalCryptoGain,
    needsCryptoFiling,
    CRYPTO_EXCHANGES,
    getCurrencyDisplayName,
} from '@/lib/crypto-service';

export default function CryptoPage() {
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // 取引一覧
    const [entries, setEntries] = useState<CryptoEntry[]>([]);

    // フォームデータ
    const [formData, setFormData] = useState({
        transactionType: 'buy' as CryptoTransactionType,
        date: new Date().toISOString().split('T')[0],
        exchange: 'bitflyer',
        currency: 'BTC' as CryptoCurrency,
        customCurrencyName: '',
        quantity: '',
        pricePerUnit: '',
        totalAmount: '',
        fee: '',
        notes: '',
    });

    // 自動計算モード（数量×単価で合計を計算）
    const [autoCalculate, setAutoCalculate] = useState(true);

    // データ読み込み
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const cryptoEntries = await getCryptoEntries(user.uid, fiscalYear);
                setEntries(cryptoEntries);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, fiscalYear]);

    // 損益計算
    const gainResult = useMemo(() => {
        return calculateTotalCryptoGain(entries);
    }, [entries]);

    // 確定申告要否判定
    const filingResult = useMemo(() => {
        return needsCryptoFiling(gainResult.totalGain);
    }, [gainResult]);

    // 数量と単価から合計を自動計算
    useEffect(() => {
        if (autoCalculate) {
            const qty = parseFloat(formData.quantity) || 0;
            const price = parseFloat(formData.pricePerUnit.replace(/,/g, '')) || 0;
            const total = Math.round(qty * price);
            if (total > 0) {
                setFormData(prev => ({
                    ...prev,
                    totalAmount: total.toLocaleString(),
                }));
            }
        }
    }, [formData.quantity, formData.pricePerUnit, autoCalculate]);

    // フォームリセット
    const resetForm = () => {
        setFormData({
            transactionType: 'buy',
            date: new Date().toISOString().split('T')[0],
            exchange: 'bitflyer',
            currency: 'BTC',
            customCurrencyName: '',
            quantity: '',
            pricePerUnit: '',
            totalAmount: '',
            fee: '',
            notes: '',
        });
    };

    // 取引追加
    const handleSubmit = async () => {
        if (!user) return;

        const quantity = parseFloat(formData.quantity) || 0;
        const totalAmount = parseInt(formData.totalAmount.replace(/,/g, '')) || 0;

        if (quantity <= 0 || totalAmount <= 0) {
            setError('数量と金額を入力してください');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const pricePerUnit = parseInt(formData.pricePerUnit.replace(/,/g, '')) || Math.round(totalAmount / quantity);
            const fee = parseInt(formData.fee.replace(/,/g, '')) || 0;

            await saveCryptoEntry(user.uid, {
                fiscalYear,
                transactionType: formData.transactionType,
                date: formData.date,
                exchange: formData.exchange,
                currency: formData.currency,
                customCurrencyName: formData.currency === 'OTHER' ? formData.customCurrencyName : undefined,
                quantity,
                pricePerUnit,
                totalAmount,
                fee: fee > 0 ? fee : undefined,
                notes: formData.notes.trim() || undefined,
            });

            // リロード
            const updatedEntries = await getCryptoEntries(user.uid, fiscalYear);
            setEntries(updatedEntries);
            resetForm();
            setSuccess('取引を登録しました');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving crypto entry:', err);
            setError('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    // 取引削除
    const handleDelete = async (id: string) => {
        if (!user) return;

        try {
            await deleteCryptoEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Error deleting entry:', err);
            setError('削除に失敗しました');
        }
    };

    // 金額フォーマット
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP').format(amount);
    };

    // 取引種別アイコン
    const getTransactionIcon = (type: CryptoTransactionType) => {
        switch (type) {
            case 'buy': return <ArrowDownRight className="w-4 h-4 text-blue-500" />;
            case 'sell': return <ArrowUpRight className="w-4 h-4 text-red-500" />;
            case 'exchange': return <RefreshCw className="w-4 h-4 text-purple-500" />;
            case 'receive': return <Gift className="w-4 h-4 text-green-500" />;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <Link href="/auth/login" className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium">
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-orange-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        仮想通貨（暗号資産）
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">読み込み中...</p>
                    </div>
                ) : (
                    <>
                        {/* エラー・成功メッセージ */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <span className="text-sm text-red-700">{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span className="text-sm text-emerald-700">{success}</span>
                            </div>
                        )}

                        {/* 損益サマリー */}
                        <div className={`mb-4 p-4 rounded-xl border-2 ${
                            gainResult.totalGain >= 0
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                                : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3 mb-3">
                                <Bitcoin className={`w-8 h-8 ${gainResult.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                                <div>
                                    <p className="text-sm text-gray-600">今年の実現損益（税金計算対象）</p>
                                    <p className={`text-2xl font-bold ${gainResult.totalGain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {gainResult.totalGain >= 0 ? '+' : ''}{formatCurrency(gainResult.totalGain)}円
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="p-2 bg-white/50 rounded-lg">
                                    <span className="text-gray-500">購入総額</span>
                                    <p className="font-medium text-gray-800">{formatCurrency(gainResult.totalBought)}円</p>
                                </div>
                                <div className="p-2 bg-white/50 rounded-lg">
                                    <span className="text-gray-500">売却総額</span>
                                    <p className="font-medium text-gray-800">{formatCurrency(gainResult.totalSold)}円</p>
                                </div>
                            </div>
                        </div>

                        {/* 確定申告要否 */}
                        {gainResult.totalGain > 0 && (
                            <div className={`mb-4 p-4 rounded-xl ${
                                filingResult.required
                                    ? 'bg-amber-50 border border-amber-200'
                                    : 'bg-blue-50 border border-blue-200'
                            }`}>
                                <div className="flex items-start gap-3">
                                    {filingResult.required ? (
                                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h3 className={`font-medium ${filingResult.required ? 'text-amber-800' : 'text-blue-800'}`}>
                                            {filingResult.required ? '確定申告が必要です' : '確定申告は不要です'}
                                        </h3>
                                        <p className={`text-sm mt-1 ${filingResult.required ? 'text-amber-700' : 'text-blue-700'}`}>
                                            {filingResult.reason}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 入力フォーム */}
                        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
                            <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" />
                                取引を追加
                            </h3>

                            <div className="space-y-4">
                                {/* 取引種別 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">取引種別</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['buy', 'sell', 'exchange', 'receive'] as CryptoTransactionType[]).map((type) => {
                                            const info = CRYPTO_TRANSACTION_TYPE_INFO[type];
                                            const isSelected = formData.transactionType === type;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setFormData(prev => ({ ...prev, transactionType: type }))}
                                                    className={`p-2 rounded-lg text-center text-sm transition-colors ${
                                                        isSelected
                                                            ? 'bg-orange-500 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {info.nameJa}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 日付 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">取引日</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>

                                {/* 取引所 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">取引所</label>
                                    <select
                                        value={formData.exchange}
                                        onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        style={{ fontSize: '16px' }}
                                    >
                                        {CRYPTO_EXCHANGES.map((ex) => (
                                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 通貨 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">通貨</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as CryptoCurrency }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        style={{ fontSize: '16px' }}
                                    >
                                        {(Object.keys(CRYPTO_CURRENCY_INFO) as CryptoCurrency[]).map((currency) => (
                                            <option key={currency} value={currency}>
                                                {CRYPTO_CURRENCY_INFO[currency].nameJa} ({currency})
                                            </option>
                                        ))}
                                    </select>
                                    {formData.currency === 'OTHER' && (
                                        <input
                                            type="text"
                                            value={formData.customCurrencyName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customCurrencyName: e.target.value }))}
                                            placeholder="通貨名（例：SHIB）"
                                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            style={{ fontSize: '16px' }}
                                        />
                                    )}
                                </div>

                                {/* 数量 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">数量</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                        placeholder="0.1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>

                                {/* 単価 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">単価（円）</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.pricePerUnit}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    pricePerUnit: val ? parseInt(val).toLocaleString() : '',
                                                }));
                                            }}
                                            placeholder="10,000,000"
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>

                                {/* 合計金額 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        合計金額（円）
                                        <span className="text-xs text-gray-400 ml-2">
                                            {autoCalculate ? '自動計算' : '手入力'}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.totalAmount}
                                            onChange={(e) => {
                                                setAutoCalculate(false);
                                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    totalAmount: val ? parseInt(val).toLocaleString() : '',
                                                }));
                                            }}
                                            placeholder="1,000,000"
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right bg-orange-50"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>

                                {/* 手数料（任意） */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">手数料（任意）</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.fee}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    fee: val ? parseInt(val).toLocaleString() : '',
                                                }));
                                            }}
                                            placeholder="0"
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>

                                {/* 追加ボタン */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="w-full py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            追加
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ヘルプ */}
                        <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <div className="flex items-start gap-2">
                                <HelpCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-orange-800 mb-1">仮想通貨の税金について</h4>
                                    <ul className="text-sm text-orange-700 space-y-1">
                                        <li>・売却や交換で得た利益は「雑所得」として課税</li>
                                        <li>・給与所得者は雑所得20万円以下なら申告不要</li>
                                        <li>・保有しているだけ（含み益）は課税されません</li>
                                        <li>・総平均法で取得単価を計算しています</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 通貨別損益 */}
                        {gainResult.gainsByCurrency.length > 0 && (
                            <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
                                <h3 className="font-medium text-gray-800 mb-3">通貨別損益</h3>
                                <div className="space-y-2">
                                    {gainResult.gainsByCurrency.map((gain, idx) => (
                                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-800">
                                                    {getCurrencyDisplayName(gain.currency, gain.customCurrencyName)}
                                                </span>
                                                <span className={`font-bold ${gain.realizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {gain.realizedGain >= 0 ? '+' : ''}{formatCurrency(gain.realizedGain)}円
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                平均取得単価: ¥{formatCurrency(gain.averageCost)} /
                                                売却: {gain.totalQuantitySold.toFixed(8)} /
                                                保有: {gain.unrealizedQuantity.toFixed(8)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 取引履歴 */}
                        {entries.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-medium text-gray-700 mb-2">取引履歴</h3>
                                {entries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getTransactionIcon(entry.transactionType)}
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {CRYPTO_TRANSACTION_TYPE_INFO[entry.transactionType].nameJa}
                                                    {' '}
                                                    {getCurrencyDisplayName(entry.currency, entry.customCurrencyName)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {entry.date} / {entry.quantity.toFixed(8)} × ¥{formatCurrency(entry.pricePerUnit)}
                                                </div>
                                                <div className={`font-bold ${
                                                    entry.transactionType === 'buy' || entry.transactionType === 'receive'
                                                        ? 'text-blue-600' : 'text-red-600'
                                                }`}>
                                                    {entry.transactionType === 'buy' || entry.transactionType === 'receive' ? '-' : '+'}
                                                    ¥{formatCurrency(entry.totalAmount)}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 確定申告へのリンク */}
                        <div className="mt-6 space-y-3">
                            <Link
                                href="/filing-check"
                                className="block p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-800">確定申告が必要かチェック</div>
                                        <div className="text-sm text-gray-500">全ての所得を含めて判定</div>
                                    </div>
                                    <div className="text-orange-600">→</div>
                                </div>
                            </Link>
                            <Link
                                href="/summary"
                                className="block p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-800">確定申告書プレビュー</div>
                                        <div className="text-sm text-gray-500">申告書の内容を確認</div>
                                    </div>
                                    <div className="text-orange-600">→</div>
                                </div>
                            </Link>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
