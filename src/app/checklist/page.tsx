'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ClipboardCheck,
    CheckCircle2,
    Circle,
    AlertTriangle,
    ChevronRight,
    Loader2,
    Calendar,
    Package,
    Landmark,
    FileText,
    Calculator,
    Receipt,
    Briefcase,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessProfile } from '@/lib/business-profile-service';
import { getLoans, getLoanRepayments } from '@/lib/loan-service';
import { getInventoryRecord, isInventoryComplete } from '@/lib/inventory-service';
import { getTransactions } from '@/lib/transaction-service';

interface ChecklistItem {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    link: string;
    icon: React.ReactNode;
    priority: 'high' | 'medium' | 'low';
    category: 'required' | 'recommended' | 'optional';
}

export default function ChecklistPage() {
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    const [isLoading, setIsLoading] = useState(true);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

    // データ読み込み
    useEffect(() => {
        if (user) {
            loadChecklistData();
        }
    }, [user]);

    const loadChecklistData = async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            // 並行でデータを取得
            const [profile, loans, repayments, inventory, transactions] = await Promise.all([
                getBusinessProfile(user.uid, fiscalYear).catch(() => null),
                getLoans(user.uid, fiscalYear).catch(() => []),
                getLoanRepayments(user.uid, fiscalYear).catch(() => []),
                getInventoryRecord(user.uid, fiscalYear).catch(() => null),
                getTransactions(user.uid, fiscalYear).catch(() => []),
            ]);

            // チェックリストを構築
            const items: ChecklistItem[] = [];

            // 1. プロフィール設定
            items.push({
                id: 'profile',
                title: '事業プロフィール設定',
                description: '事業形態・申告種別・按分設定の確認',
                completed: !!profile?.onboardingCompleted,
                link: '/profile',
                icon: <Briefcase className="w-5 h-5" />,
                priority: 'high',
                category: 'required',
            });

            // 2. 取引の仕分け
            const pendingTransactions = transactions.filter(t => t.status === 'pending');
            items.push({
                id: 'transactions',
                title: '取引の仕分け',
                description: pendingTransactions.length > 0
                    ? `${pendingTransactions.length}件の未処理取引があります`
                    : 'すべての取引が仕分け済みです',
                completed: pendingTransactions.length === 0,
                link: '/swipe',
                icon: <Receipt className="w-5 h-5" />,
                priority: 'high',
                category: 'required',
            });

            // 3. 棚卸資産（小売業・飲食店向け）
            const needsInventory = profile?.businessCategory &&
                ['小売業', '飲食業', '卸売業', '酒屋', 'バー', 'アパレル'].some(
                    cat => profile.businessCategory?.includes(cat)
                );

            if (needsInventory || currentMonth >= 10) { // 11月以降は全員に表示
                items.push({
                    id: 'inventory',
                    title: '期末棚卸',
                    description: isInventoryComplete(inventory)
                        ? '棚卸入力が完了しています'
                        : '年末に実地棚卸を行い、在庫金額を入力してください',
                    completed: isInventoryComplete(inventory),
                    link: '/inventory',
                    icon: <Package className="w-5 h-5" />,
                    priority: currentMonth >= 11 ? 'high' : 'medium',
                    category: needsInventory ? 'required' : 'recommended',
                });
            }

            // 4. 借入金の返済記録
            if (loans.length > 0) {
                const hasCurrentYearRepayments = repayments.length > 0;
                items.push({
                    id: 'loans',
                    title: '借入金返済の記録',
                    description: hasCurrentYearRepayments
                        ? `${repayments.length}件の返済記録があります`
                        : '返済記録を入力すると、利息を経費計上できます',
                    completed: hasCurrentYearRepayments,
                    link: '/loans',
                    icon: <Landmark className="w-5 h-5" />,
                    priority: 'medium',
                    category: 'recommended',
                });
            }

            // 5. 源泉徴収の確認
            const hasWithholding = (profile?.withholdingTaxEntries?.length || 0) > 0 ||
                (profile?.withholdingTax || 0) > 0;
            items.push({
                id: 'withholding',
                title: '源泉徴収税額の入力',
                description: hasWithholding
                    ? '源泉徴収税額が入力されています'
                    : '支払調書が届いたら入力してください',
                completed: hasWithholding,
                link: '/profile',
                icon: <Calculator className="w-5 h-5" />,
                priority: currentMonth >= 0 && currentMonth <= 2 ? 'high' : 'low',
                category: 'recommended',
            });

            // 6. 控除の入力
            items.push({
                id: 'deductions',
                title: '各種控除の入力',
                description: '社会保険料・生命保険料・配偶者・扶養控除など',
                completed: false, // 控除の完了状態を判定する場合は追加実装が必要
                link: '/deductions',
                icon: <FileText className="w-5 h-5" />,
                priority: currentMonth >= 0 && currentMonth <= 2 ? 'high' : 'medium',
                category: 'required',
            });

            // 7. 集計・申告書確認
            items.push({
                id: 'summary',
                title: '集計・申告書の確認',
                description: '確定申告書の内容を確認してください',
                completed: false,
                link: '/summary',
                icon: <ClipboardCheck className="w-5 h-5" />,
                priority: currentMonth >= 1 && currentMonth <= 2 ? 'high' : 'low',
                category: 'required',
            });

            setChecklistItems(items);
        } catch (error) {
            console.error('Error loading checklist data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const completedCount = checklistItems.filter(item => item.completed).length;
    const totalCount = checklistItems.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // カテゴリ別にグループ化
    const requiredItems = checklistItems.filter(item => item.category === 'required');
    const recommendedItems = checklistItems.filter(item => item.category === 'recommended');
    const optionalItems = checklistItems.filter(item => item.category === 'optional');

    // 確定申告期間かどうか
    const isFilingSeason = currentMonth >= 1 && currentMonth <= 2; // 2月〜3月
    const isYearEnd = currentMonth >= 10; // 11月以降

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
                        年末・確定申告チェックリスト
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* ローディング */}
                {isLoading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">読み込み中...</p>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* 期間バナー */}
                        {isFilingSeason && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-red-600" />
                                    <div>
                                        <p className="font-medium text-red-800">
                                            確定申告期間中です
                                        </p>
                                        <p className="text-sm text-red-600">
                                            申告期限: 3月15日
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isYearEnd && !isFilingSeason && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                    <div>
                                        <p className="font-medium text-amber-800">
                                            年末の準備を始めましょう
                                        </p>
                                        <p className="text-sm text-amber-600">
                                            棚卸・経費の最終確認をお忘れなく
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 進捗 */}
                        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    進捗状況
                                </span>
                                <span className="text-sm text-gray-500">
                                    {completedCount} / {totalCount} 完了
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-2">
                                {progressPercent}%
                            </p>
                        </div>

                        {/* 必須項目 */}
                        {requiredItems.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    必須項目
                                </h2>
                                <div className="space-y-2">
                                    {requiredItems.map((item) => (
                                        <ChecklistItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 推奨項目 */}
                        {recommendedItems.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    推奨項目
                                </h2>
                                <div className="space-y-2">
                                    {recommendedItems.map((item) => (
                                        <ChecklistItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* オプション項目 */}
                        {optionalItems.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    オプション
                                </h2>
                                <div className="space-y-2">
                                    {optionalItems.map((item) => (
                                        <ChecklistItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ヘルプ */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-800">
                                <strong>確定申告について</strong>
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                                事業所得がある方は、毎年2月16日〜3月15日の間に確定申告が必要です。
                                早めに準備を進めておくと、申告期限直前に慌てずに済みます。
                            </p>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

function ChecklistItemCard({ item }: { item: ChecklistItem }) {
    return (
        <Link
            href={item.link}
            className={`block p-4 rounded-xl border transition-all ${
                item.completed
                    ? 'bg-green-50 border-green-200'
                    : item.priority === 'high'
                    ? 'bg-white border-red-200 hover:border-red-300'
                    : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
        >
            <div className="flex items-center gap-3">
                {item.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                    <Circle className={`w-6 h-6 flex-shrink-0 ${
                        item.priority === 'high' ? 'text-red-400' : 'text-gray-300'
                    }`} />
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                    <span className={item.completed ? 'text-green-600' : 'text-gray-600'}>
                        {item.icon}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                        item.completed ? 'text-green-800' : 'text-gray-800'
                    }`}>
                        {item.title}
                    </p>
                    <p className={`text-sm truncate ${
                        item.completed ? 'text-green-600' : 'text-gray-500'
                    }`}>
                        {item.description}
                    </p>
                </div>
                <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                    item.completed ? 'text-green-400' : 'text-gray-400'
                }`} />
            </div>
        </Link>
    );
}
