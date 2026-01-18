'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    TrendingUp,
    Loader2,
    CheckCircle,
    AlertCircle,
    Plus,
    Trash2,
    Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    saveSalesEntry,
    getSalesEntries,
    deleteSalesEntry,
    getMonthlySalesTotal,
    PAYMENT_METHOD_LABELS,
} from '@/lib/sales-service';
import { SalesEntry, PaymentMethod } from '@/lib/types';

type Step = 'form' | 'saving' | 'complete';

export default function SalesPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [step, setStep] = useState<Step>('form');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // フォーム状態
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [customerCount, setCustomerCount] = useState('');
    const [notes, setNotes] = useState('');

    // 履歴・統計
    const [recentEntries, setRecentEntries] = useState<SalesEntry[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<{
        total: number;
        count: number;
        customerCount: number;
    } | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // データ取得
    useEffect(() => {
        if (user) {
            loadRecentEntries();
            loadMonthlyStats();
        }
    }, [user, date]);

    const loadRecentEntries = async () => {
        if (!user) return;
        try {
            const entries = await getSalesEntries(user.uid);
            setRecentEntries(entries.slice(0, 7)); // 直近7日分
        } catch (err) {
            console.error('Failed to load entries:', err);
        }
    };

    const loadMonthlyStats = async () => {
        if (!user) return;
        try {
            const yearMonth = date.slice(0, 7);
            const stats = await getMonthlySalesTotal(user.uid, yearMonth);
            setMonthlyStats(stats);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const handleSave = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) {
            setError('売上金額を入力してください');
            return;
        }

        setIsSaving(true);
        setError(null);
        setStep('saving');

        try {
            const fiscalYear = new Date(date).getFullYear();

            await saveSalesEntry(user.uid, {
                fiscalYear,
                date,
                amount: amountNum,
                paymentMethod,
                customerCount: customerCount ? parseInt(customerCount) : undefined,
                notes: notes.trim() || undefined,
            });

            setStep('complete');
            await loadRecentEntries();
            await loadMonthlyStats();
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
            setStep('form');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAnother = () => {
        // 日付は維持、他はリセット
        setAmount('');
        setCustomerCount('');
        setNotes('');
        setError(null);
        setStep('form');
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('この売上データを削除しますか？')) return;

        try {
            await deleteSalesEntry(entryId);
            await loadRecentEntries();
            await loadMonthlyStats();
        } catch (err) {
            console.error('Delete Error:', err);
            setError('削除に失敗しました');
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50">
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
                        売上入力
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* 月間サマリー */}
                {monthlyStats && (
                    <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
                        <p className="text-sm opacity-80 mb-1">
                            {date.slice(0, 7).replace('-', '年')}月の売上
                        </p>
                        <p className="text-3xl font-bold">
                            {formatCurrency(monthlyStats.total)}
                        </p>
                        <div className="mt-2 flex gap-4 text-sm opacity-80">
                            <span>{monthlyStats.count}件</span>
                            {monthlyStats.customerCount > 0 && (
                                <span>{monthlyStats.customerCount}名来店</span>
                            )}
                        </div>
                    </div>
                )}

                {/* エラー表示 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Step 1: 入力フォーム */}
                {step === 'form' && (
                    <div>
                        {/* 入力フォーム */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            {/* 日付 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    日付
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* 売上金額 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    売上金額 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* 支払方法 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    支払方法
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                                        (method) => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                                    paymentMethod === method
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                                        : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                                }`}
                                            >
                                                {PAYMENT_METHOD_LABELS[method]}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* 客数 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    客数（任意）
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={customerCount}
                                        onChange={(e) => setCustomerCount(e.target.value)}
                                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                                        名
                                    </span>
                                </div>
                            </div>

                            {/* 備考 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    備考
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    rows={2}
                                    placeholder="メモがあれば入力"
                                />
                            </div>
                        </div>

                        {/* 保存ボタン */}
                        <div className="mt-6">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !amount || parseFloat(amount) <= 0}
                                className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                売上を保存
                            </button>
                        </div>

                        {/* 履歴セクション */}
                        {recentEntries.length > 0 && (
                            <div className="mt-8">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    最近の売上 ({recentEntries.length}件)
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
                                                        {formatDate(entry.date)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {PAYMENT_METHOD_LABELS[entry.paymentMethod]}
                                                        {entry.customerCount
                                                            ? ` ・ ${entry.customerCount}名`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-emerald-600">
                                                        {formatCurrency(entry.amount)}
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

                {/* Step 2: 保存中 */}
                {step === 'saving' && (
                    <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">保存中...</p>
                    </div>
                )}

                {/* Step 3: 完了 */}
                {step === 'complete' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">保存しました</h2>
                        <p className="text-gray-500 mb-8">
                            売上データを保存しました。
                            <br />
                            収入として自動登録されています。
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleAddAnother}
                                className="w-full py-3 bg-white border-2 border-emerald-600 text-emerald-600 font-medium rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                続けて入力する
                            </button>

                            <Link
                                href="/restaurant"
                                className="block w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors text-center"
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
