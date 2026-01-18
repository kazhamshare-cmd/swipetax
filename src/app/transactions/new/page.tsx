'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Loader2,
    TrendingUp,
    TrendingDown,
    Check,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { saveTransaction } from '@/lib/transaction-service';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/lib/types';

type TransactionType = 'expense' | 'income';

export default function NewTransactionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [type, setType] = useState<TransactionType>('expense');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ExpenseCategory | null>(null);
    const [note, setNote] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const formatCurrency = (value: string) => {
        const num = parseInt(value.replace(/,/g, '')) || 0;
        return new Intl.NumberFormat('ja-JP').format(num);
    };

    const handleSubmit = async () => {
        if (!user) return;

        // Validation
        if (!amount || parseInt(amount.replace(/,/g, '')) === 0) {
            setError('金額を入力してください');
            return;
        }
        if (!merchant.trim()) {
            setError('取引先名を入力してください');
            return;
        }
        if (type === 'expense' && !category) {
            setError('経費カテゴリを選択してください');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const amountValue = parseInt(amount.replace(/,/g, ''));
            // Income is negative, expense is positive
            const finalAmount = type === 'income' ? -amountValue : amountValue;

            await saveTransaction(user.uid, {
                fiscalYear,
                date,
                amount: finalAmount,
                merchant: merchant.trim(),
                description: description.trim() || undefined,
                status: 'approved', // Manual entries are automatically approved
                category: type === 'expense' ? category! : undefined,
                userNote: note.trim() || undefined,
                source: 'manual',
            });

            setSuccess(true);

            // Redirect after a short delay
            setTimeout(() => {
                router.push('/transactions');
            }, 1500);
        } catch (err) {
            console.error('Error saving transaction:', err);
            setError('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleAddAnother = async () => {
        if (!user) return;

        // Validation
        if (!amount || parseInt(amount.replace(/,/g, '')) === 0) {
            setError('金額を入力してください');
            return;
        }
        if (!merchant.trim()) {
            setError('取引先名を入力してください');
            return;
        }
        if (type === 'expense' && !category) {
            setError('経費カテゴリを選択してください');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const amountValue = parseInt(amount.replace(/,/g, ''));
            const finalAmount = type === 'income' ? -amountValue : amountValue;

            await saveTransaction(user.uid, {
                fiscalYear,
                date,
                amount: finalAmount,
                merchant: merchant.trim(),
                description: description.trim() || undefined,
                status: 'approved',
                category: type === 'expense' ? category! : undefined,
                userNote: note.trim() || undefined,
                source: 'manual',
            });

            // Reset form for next entry (keep date and type)
            setAmount('');
            setMerchant('');
            setDescription('');
            setCategory(null);
            setNote('');
            setSuccess(true);

            // Hide success message after a moment
            setTimeout(() => {
                setSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Error saving transaction:', err);
            setError('保存に失敗しました');
        } finally {
            setSaving(false);
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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/transactions" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        取引を追加
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-800 font-medium">保存しました</span>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-700">{error}</span>
                    </div>
                )}

                {/* Transaction Type Toggle */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        取引種別
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setType('expense')}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                                type === 'expense'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <TrendingDown className="w-5 h-5" />
                            経費（支出）
                        </button>
                        <button
                            onClick={() => setType('income')}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                                type === 'income'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <TrendingUp className="w-5 h-5" />
                            売上（収入）
                        </button>
                    </div>
                </div>

                {/* Date */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        日付 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Amount */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        金額 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                            ¥
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={amount ? formatCurrency(amount) : ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                setAmount(val);
                            }}
                            placeholder="0"
                            className="w-full pl-10 pr-4 py-3 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                        />
                    </div>
                </div>

                {/* Merchant */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {type === 'income' ? '支払元（取引先）' : '支払先'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder={type === 'income' ? '例：株式会社○○、ココナラ' : '例：Amazon、スターバックス'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Description */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        摘要・内容
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={type === 'income' ? '例：Webサイト制作代金' : '例：打ち合わせ用コーヒー'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Category (Expense only) */}
                {type === 'expense' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            経費カテゴリ <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {EXPENSE_CATEGORIES.map((cat) => {
                                const isSelected = category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id)}
                                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-xl">{cat.emoji}</span>
                                        <div className="text-xs font-medium text-gray-700 mt-1 truncate">
                                            {cat.nameJa}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Note */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        メモ
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="備考があれば入力"
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                保存して戻る
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleAddAnother}
                        disabled={saving}
                        className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        保存して続けて入力
                    </button>
                </div>

                {/* Tips */}
                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="font-medium text-amber-800 mb-2">入力のヒント</h4>
                    <ul className="text-sm text-amber-700 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>
                                <strong>経費</strong>：事業に関連する支出を入力
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>
                                <strong>売上</strong>：顧客からの入金を入力
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>
                                源泉徴収・ココナラ・ファクタリングなど詳しい入力方法は
                                <Link href="/help/income-patterns" className="text-blue-600 underline ml-1">
                                    売上パターン別ガイド
                                </Link>
                                を参照
                            </span>
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
