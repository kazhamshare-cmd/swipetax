'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Check,
    X,
    HelpCircle,
    Clock,
    Filter,
    Search,
    Edit3,
    Trash2,
    ChevronRight,
    Train,
    Phone,
    Users,
    Package,
    BookOpen,
    Megaphone,
    Briefcase,
    Home,
    Zap,
    CreditCard,
    Shield,
    TrendingDown,
    MoreHorizontal,
    Plus,
    Calendar,
    ChevronDown,
    RotateCcw,
    ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getTransactions,
    updateTransaction,
    deleteTransaction,
} from '@/lib/transaction-service';
import {
    Transaction,
    TransactionStatus,
    ExpenseCategory,
    EXPENSE_CATEGORIES,
} from '@/lib/types';

// ステータス設定
const STATUS_CONFIG: Record<TransactionStatus, { label: string; labelLong: string; color: string; bgColor: string; icon: React.ElementType; description: string }> = {
    pending: { label: '未処理', labelLong: '未処理', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Clock, description: 'まだ仕分けされていません' },
    approved: { label: '経費', labelLong: '経費として承認', color: 'text-green-600', bgColor: 'bg-green-100', icon: Check, description: '経費として計上されます' },
    modified: { label: '修正済', labelLong: '修正済み', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Edit3, description: '手動で修正されました' },
    held: { label: '保留', labelLong: '保留中', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: HelpCircle, description: '後で確認が必要です' },
    excluded: { label: '私的', labelLong: '私的支出（経費対象外）', color: 'text-red-600', bgColor: 'bg-red-100', icon: X, description: '経費として計上されません' },
};

// カテゴリアイコンマッピング
const CATEGORY_ICONS: Record<ExpenseCategory, React.ElementType> = {
    travel: Train,
    communication: Phone,
    entertainment: Users,
    supplies: Package,
    books: BookOpen,
    advertising: Megaphone,
    outsourcing: Briefcase,
    rent: Home,
    utilities: Zap,
    fees: CreditCard,
    insurance: Shield,
    depreciation: TrendingDown,
    miscellaneous: MoreHorizontal,
};

type FilterType = 'all' | TransactionStatus;

export default function TransactionsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<Transaction | null>(null);
    const [saving, setSaving] = useState(false);

    // 拡張フィルター
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');

    const fiscalYear = new Date().getFullYear();

    // フィルターがアクティブかどうか
    const hasActiveFilters = dateFrom || dateTo || categoryFilter !== 'all';

    // データ読み込み
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const txs = await getTransactions(user.uid, fiscalYear);
                setTransactions(txs);
            } catch (err) {
                console.error('Error loading transactions:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, fiscalYear]);

    // フィルター・検索適用
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            // ステータスフィルター
            if (filter !== 'all' && tx.status !== filter) return false;

            // 検索フィルター
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchMerchant = tx.merchant?.toLowerCase().includes(query);
                const matchDesc = tx.description?.toLowerCase().includes(query);
                const matchAmount = tx.amount.toString().includes(query);
                if (!matchMerchant && !matchDesc && !matchAmount) return false;
            }

            // 日付フィルター（開始日）
            if (dateFrom && tx.date < dateFrom) return false;

            // 日付フィルター（終了日）
            if (dateTo && tx.date > dateTo) return false;

            // カテゴリフィルター
            if (categoryFilter !== 'all') {
                const txCategory = tx.category || tx.aiCategory;
                if (txCategory !== categoryFilter) return false;
            }

            return true;
        });
    }, [transactions, filter, searchQuery, dateFrom, dateTo, categoryFilter]);

    // フィルターをリセット
    const resetFilters = () => {
        setDateFrom('');
        setDateTo('');
        setCategoryFilter('all');
        setSearchQuery('');
        setFilter('all');
    };

    // ステータス別カウント
    const statusCounts = useMemo(() => {
        const counts: Record<FilterType, number> = {
            all: transactions.length,
            pending: 0,
            approved: 0,
            modified: 0,
            held: 0,
            excluded: 0,
        };
        transactions.forEach(tx => {
            counts[tx.status]++;
        });
        return counts;
    }, [transactions]);

    // 取引更新
    const handleUpdateTransaction = async (updates: Partial<Transaction>) => {
        if (!editingTransaction) return;

        setSaving(true);
        try {
            await updateTransaction(editingTransaction.id, updates);
            setTransactions(prev =>
                prev.map(tx =>
                    tx.id === editingTransaction.id
                        ? { ...tx, ...updates, updatedAt: Date.now() }
                        : tx
                )
            );
            setEditingTransaction(null);
        } catch (err) {
            console.error('Error updating transaction:', err);
            setError('更新に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    // 取引削除
    const handleDeleteTransaction = async () => {
        if (!showDeleteConfirm) return;

        setSaving(true);
        try {
            await deleteTransaction(showDeleteConfirm.id);
            setTransactions(prev => prev.filter(tx => tx.id !== showDeleteConfirm.id));
            setShowDeleteConfirm(null);
        } catch (err) {
            console.error('Error deleting transaction:', err);
            setError('削除に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.abs(amount));
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <Link
                        href="/auth/login"
                        className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium"
                    >
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        取引一覧
                    </h1>
                    <Link href="/transactions/new" className="p-2 -mr-2 rounded-full hover:bg-gray-100">
                        <Plus className="w-5 h-5 text-blue-600" />
                    </Link>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-4">
                {/* 年度表示 */}
                <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {fiscalYear}年度
                    </span>
                </div>

                {/* 検索・フィルター */}
                <div className="mb-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="店舗名・金額で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-3 rounded-xl border flex items-center gap-2 transition-colors ${
                                hasActiveFilters
                                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="w-5 h-5" />
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* 拡張フィルターパネル */}
                    {showFilters && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                            {/* 期間フィルター */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    期間で絞り込み
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <span className="text-gray-400">〜</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* カテゴリフィルター */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    カテゴリで絞り込み
                                </label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">すべてのカテゴリ</option>
                                    {EXPENSE_CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.emoji} {cat.nameJa}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* フィルターリセット */}
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    フィルターをリセット
                                </button>
                            )}
                        </div>
                    )}

                    {/* アクティブフィルター表示 */}
                    {hasActiveFilters && !showFilters && (
                        <div className="flex flex-wrap gap-2">
                            {dateFrom && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                                    {dateFrom}〜
                                    <button onClick={() => setDateFrom('')} className="hover:text-blue-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {dateTo && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                                    〜{dateTo}
                                    <button onClick={() => setDateTo('')} className="hover:text-blue-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {categoryFilter !== 'all' && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                                    {EXPENSE_CATEGORIES.find(c => c.id === categoryFilter)?.nameJa}
                                    <button onClick={() => setCategoryFilter('all')} className="hover:text-blue-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* フィルタータブ */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
                    {(['all', 'pending', 'held', 'approved', 'modified', 'excluded'] as FilterType[]).map((f) => {
                        const isAll = f === 'all';
                        const config = isAll ? null : STATUS_CONFIG[f];
                        const label = isAll ? 'すべて' : config?.label;
                        const count = statusCounts[f];
                        const isActive = filter === f;

                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {!isAll && config && (
                                    <config.icon className="w-4 h-4" />
                                )}
                                {label}
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                    isActive ? 'bg-white/20' : 'bg-gray-100'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto">
                            <X className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">読み込み中...</p>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">
                            {searchQuery ? '検索結果がありません' : '取引がありません'}
                        </p>
                        {filter !== 'all' && (
                            <button
                                onClick={() => setFilter('all')}
                                className="text-sm text-blue-600 font-medium"
                            >
                                すべての取引を表示
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredTransactions.map((tx) => {
                            const statusConfig = STATUS_CONFIG[tx.status];
                            const StatusIcon = statusConfig.icon;
                            const category = tx.category || tx.aiCategory;
                            const categoryInfo = category ? EXPENSE_CATEGORIES.find(c => c.id === category) : null;
                            const CategoryIcon = category ? CATEGORY_ICONS[category] : MoreHorizontal;
                            const isIncome = tx.amount < 0;

                            return (
                                <div
                                    key={tx.id}
                                    onClick={() => setEditingTransaction(tx)}
                                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                                >
                                    <div className="flex items-start gap-3">
                                        {/* カテゴリアイコン */}
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: categoryInfo ? `${categoryInfo.color}20` : '#f3f4f6' }}
                                        >
                                            <CategoryIcon
                                                className="w-5 h-5"
                                                style={{ color: categoryInfo?.color || '#9ca3af' }}
                                            />
                                        </div>

                                        {/* 取引情報 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-800 truncate">
                                                    {tx.merchant || '不明'}
                                                </span>
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span>{tx.date}</span>
                                                {categoryInfo && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{categoryInfo.nameJa}</span>
                                                    </>
                                                )}
                                            </div>
                                            {tx.description && (
                                                <p className="text-xs text-gray-400 mt-1 truncate">
                                                    {tx.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* 金額 */}
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-gray-800'}`}>
                                                {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                                            </p>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* スワイプ仕分けへのリンク */}
                {statusCounts.pending > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-blue-800">
                                    未処理の取引が {statusCounts.pending} 件あります
                                </p>
                                <p className="text-sm text-blue-600">
                                    スワイプで仕分けしましょう
                                </p>
                            </div>
                            <Link
                                href="/swipe"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm"
                            >
                                仕分けする
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            {/* 編集モーダル */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                    <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">取引を編集</h3>
                            <button
                                onClick={() => setEditingTransaction(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[70vh]">
                            {/* 取引サマリー */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-2xl font-bold text-gray-900 mb-1">
                                    {formatCurrency(editingTransaction.amount)}
                                </p>
                                <p className="font-medium text-gray-700">{editingTransaction.merchant}</p>
                                <p className="text-sm text-gray-500">{editingTransaction.date}</p>
                            </div>

                            {/* ステータス選択 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    この取引は...
                                </label>

                                {/* 私的⇔経費の切り替えを強調 */}
                                {(editingTransaction.status === 'excluded' || editingTransaction.status === 'approved') && (
                                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                        <ArrowRightLeft className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-700">
                                            {editingTransaction.status === 'excluded'
                                                ? '現在「私的支出」です。経費として計上したい場合は「経費」を選択してください。'
                                                : '現在「経費」です。私的支出として除外したい場合は「私的支出」を選択してください。'
                                            }
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    {(['approved', 'excluded', 'held', 'pending'] as TransactionStatus[]).map((status) => {
                                        const config = STATUS_CONFIG[status];
                                        const isSelected = editingTransaction.status === status;
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => setEditingTransaction({
                                                    ...editingTransaction,
                                                    status,
                                                })}
                                                className={`p-3 rounded-lg border-2 flex flex-col items-start gap-1 transition-colors ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <config.icon className={`w-5 h-5 ${config.color}`} />
                                                    <span className="font-medium text-gray-800">{config.labelLong}</span>
                                                </div>
                                                <span className="text-xs text-gray-500">{config.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* カテゴリ選択 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    カテゴリ
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                    {EXPENSE_CATEGORIES.map((category) => {
                                        const Icon = CATEGORY_ICONS[category.id];
                                        const currentCategory = editingTransaction.category || editingTransaction.aiCategory;
                                        const isSelected = currentCategory === category.id;
                                        return (
                                            <button
                                                key={category.id}
                                                onClick={() => setEditingTransaction({
                                                    ...editingTransaction,
                                                    category: category.id,
                                                })}
                                                className={`p-3 rounded-lg border-2 flex items-center gap-2 text-left transition-colors ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: `${category.color}20` }}
                                                >
                                                    <Icon className="w-4 h-4" style={{ color: category.color }} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{category.nameJa}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* アクションボタン */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleUpdateTransaction({
                                        status: editingTransaction.status,
                                        category: editingTransaction.category,
                                    })}
                                    disabled={saving}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    保存
                                </button>

                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(editingTransaction);
                                    }}
                                    className="w-full py-3 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-50"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    削除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 削除確認モーダル */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-gray-900 text-lg mb-2">取引を削除</h3>
                        <p className="text-gray-600 mb-4">
                            「{showDeleteConfirm.merchant}」の取引を削除しますか？
                            この操作は取り消せません。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDeleteTransaction}
                                disabled={saving}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    '削除'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
