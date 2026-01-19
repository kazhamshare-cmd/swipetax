'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { getBusinessProfile } from '@/lib/business-profile-service';
import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Loader2,
  Camera,
  Receipt,
  Building2,
  Upload,
  Clock,
  TrendingUp,
  AlertCircle,
  Settings,
  LogOut,
  List,
  Calculator,
  FileSpreadsheet,
  PenSquare,
  Bitcoin,
  Briefcase,
  Users,
  Store,
  Coins,
  Landmark,
  Package,
  ClipboardCheck,
} from 'lucide-react';
import { getPendingTransactionCount, getTransactions } from '@/lib/transaction-service';
import { Transaction, EXPENSE_CATEGORIES } from '@/lib/types';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getLoans } from '@/lib/loan-service';
import { getInventoryRecord, isInventoryComplete, getInventoryWarning } from '@/lib/inventory-service';

// デモ用の取引データ
const DEMO_TRANSACTIONS = [
  { amount: 12800, merchant: 'Amazon.co.jp', date: '2024/03/15', category: '消耗品費', confidence: 85 },
  { amount: 3500, merchant: 'スターバックス', date: '2024/03/14', category: '会議費', confidence: 72 },
  { amount: 28000, merchant: '東京電力', date: '2024/03/10', category: '水道光熱費', confidence: 95 },
  { amount: 1200, merchant: 'コンビニ', date: '2024/03/09', category: '消耗品費', confidence: 60 },
  { amount: 5400, merchant: 'タクシー', date: '2024/03/08', category: '旅費交通費', confidence: 90 },
];

// インタラクティブなスワイプデモコンポーネント
function InteractiveSwipeDemo({ t }: { t: (key: string) => string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeResult, setSwipeResult] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const currentTransaction = DEMO_TRANSACTIONS[currentIndex % DEMO_TRANSACTIONS.length];

  const SWIPE_THRESHOLD = 80;

  const getSwipeDirection = useCallback(() => {
    const absX = Math.abs(position.x);
    const absY = Math.abs(position.y);

    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) return null;

    if (absX > absY) {
      return position.x > 0 ? 'right' : 'left';
    } else {
      return position.y > 0 ? 'down' : 'up';
    }
  }, [position]);

  const handleSwipeComplete = useCallback((direction: string) => {
    setIsAnimating(true);

    const results: Record<string, { message: string; color: string; exitX: number; exitY: number }> = {
      right: { message: '✓ 経費として承認！', color: 'text-green-600', exitX: 500, exitY: 0 },
      left: { message: '✏️ カテゴリを修正', color: 'text-blue-600', exitX: -500, exitY: 0 },
      up: { message: '⏸️ 保留にしました', color: 'text-amber-600', exitX: 0, exitY: -500 },
      down: { message: '🚫 私的支出として除外', color: 'text-red-600', exitX: 0, exitY: 500 },
    };

    const result = results[direction];
    setPosition({ x: result.exitX, y: result.exitY });
    setSwipeResult(`${result.message}`);

    setTimeout(() => {
      setPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
      setIsAnimating(false);
      setTimeout(() => setSwipeResult(null), 1500);
    }, 300);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isAnimating) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isAnimating) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    setPosition({ x: deltaX, y: deltaY });
  };

  const handlePointerUp = () => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    const direction = getSwipeDirection();
    if (direction) {
      handleSwipeComplete(direction);
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  // スワイプ方向に応じた色
  const getCardStyle = () => {
    const direction = getSwipeDirection();
    let bgColor = 'bg-white';
    let borderColor = 'border-gray-100';
    let rotation = position.x * 0.05;

    if (direction === 'right') {
      bgColor = 'bg-green-50';
      borderColor = 'border-green-300';
    } else if (direction === 'left') {
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-300';
    } else if (direction === 'up') {
      bgColor = 'bg-amber-50';
      borderColor = 'border-amber-300';
    } else if (direction === 'down') {
      bgColor = 'bg-red-50';
      borderColor = 'border-red-300';
    }

    return {
      transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
      transition: isDragging ? 'none' : 'all 0.3s ease-out',
      className: `${bgColor} ${borderColor}`,
    };
  };

  const cardStyle = getCardStyle();
  const direction = getSwipeDirection();

  return (
    <div className="max-w-md mx-auto mb-16">
      {/* 結果表示 */}
      <div className="h-8 mb-2 text-center">
        {swipeResult && (
          <p className="text-lg font-bold animate-bounce">{swipeResult}</p>
        )}
        {!swipeResult && (
          <p className="text-sm text-gray-500">カードをドラッグして試してみてください</p>
        )}
      </div>

      <div className="relative">
        {/* Direction Labels */}
        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm transition-all ${direction === 'up' ? 'text-amber-600 scale-125 font-bold' : 'text-amber-600/60'}`}>
          <ChevronUp className="w-4 h-4" />
          <span>{t('landing.swipeUp')}</span>
        </div>
        <div className={`absolute top-1/2 -left-4 -translate-y-1/2 -translate-x-full flex items-center gap-2 text-sm transition-all ${direction === 'left' ? 'text-blue-600 scale-125 font-bold' : 'text-blue-600/60'}`}>
          <ChevronLeft className="w-4 h-4" />
          <span>{t('landing.swipeLeft')}</span>
        </div>
        <div className={`absolute top-1/2 -right-4 translate-x-full -translate-y-1/2 flex items-center gap-2 text-sm transition-all ${direction === 'right' ? 'text-green-600 scale-125 font-bold' : 'text-green-600/60'}`}>
          <span>{t('landing.swipeRight')}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
        <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm transition-all ${direction === 'down' ? 'text-red-600 scale-125 font-bold' : 'text-red-600/60'}`}>
          <ChevronDown className="w-4 h-4" />
          <span>{t('landing.swipeDown')}</span>
        </div>

        {/* Demo Card */}
        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ transform: cardStyle.transform, transition: cardStyle.transition }}
          className={`${cardStyle.className} rounded-2xl shadow-xl p-6 border-2 cursor-grab active:cursor-grabbing select-none touch-none`}
        >
          <div className="text-center pointer-events-none">
            <p className="text-3xl font-bold text-gray-900 mb-2">
              ¥{currentTransaction.amount.toLocaleString()}
            </p>
            <p className="text-lg text-gray-700 mb-1">{currentTransaction.merchant}</p>
            <p className="text-sm text-gray-500 mb-4">{currentTransaction.date}</p>
            <div className="bg-blue-50/80 rounded-lg p-3">
              <p className="text-sm text-blue-600 font-medium">AI判定: {currentTransaction.category}</p>
              <p className="text-xs text-blue-500">信頼度: {currentTransaction.confidence}%</p>
            </div>
          </div>

          {/* スワイプ方向インジケーター */}
          {direction && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`text-4xl ${
                direction === 'right' ? 'text-green-500' :
                direction === 'left' ? 'text-blue-500' :
                direction === 'up' ? 'text-amber-500' : 'text-red-500'
              }`}>
                {direction === 'right' && '✓'}
                {direction === 'left' && '✏️'}
                {direction === 'up' && '⏸️'}
                {direction === 'down' && '🚫'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* カード枚数 */}
      <div className="mt-10 text-center">
        <p className="text-xs text-gray-400">
          デモ取引 {(currentIndex % DEMO_TRANSACTIONS.length) + 1} / {DEMO_TRANSACTIONS.length}
        </p>
      </div>
    </div>
  );
}

export default function HomeClient() {
  const t = useTranslations();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { hasAccess, isSubscribed, trialDaysLeft, isTrialActive, startCheckout } = useSubscription();

  // Dashboard state
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Business management state
  const [hasLoans, setHasLoans] = useState(false);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  const [inventoryComplete, setInventoryComplete] = useState(false);

  // Check onboarding status
  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const fiscalYear = new Date().getFullYear();
        const profile = await getBusinessProfile(user.uid, fiscalYear);

        // If no profile or onboarding not completed, redirect to onboarding
        if (!profile || !profile.onboardingCompleted) {
          router.push('/onboarding');
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user, router]);

  // Load dashboard data
  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        setLoadingStats(true);
        const fiscalYear = new Date().getFullYear();

        // Get pending count
        const pending = await getPendingTransactionCount(user.uid);
        setPendingCount(pending);

        // Get all transactions for stats
        const allTx = await getTransactions(user.uid, fiscalYear);

        // Recent 5 transactions
        setRecentTransactions(allTx.slice(0, 5));

        // Calculate monthly totals (current month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let expenses = 0;
        let income = 0;

        allTx.forEach(tx => {
          const txDate = new Date(tx.date);
          if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.amount < 0) {
              income += Math.abs(tx.amount);
            } else {
              expenses += tx.amount;
            }
          }
        });

        setMonthlyExpenses(expenses);
        setMonthlyIncome(income);

        // Load loans and inventory status
        try {
          const loans = await getLoans(user.uid, fiscalYear);
          setHasLoans(loans.length > 0);
        } catch {
          // Ignore errors - feature may not be used
        }

        try {
          const inventory = await getInventoryRecord(user.uid, fiscalYear);
          setInventoryComplete(isInventoryComplete(inventory));
          setInventoryWarning(getInventoryWarning(inventory, new Date()));
        } catch {
          // Ignore errors - feature may not be used
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  // Loading state
  if (authLoading || (user && checkingOnboarding)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Logged in user - show dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-600">SwipeTax</h1>
            <div className="flex items-center gap-1">
              <Link
                href="/settings"
                className="p-2.5 hover:bg-gray-100 rounded-lg"
                aria-label="設定"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </Link>
              <button
                onClick={() => signOut()}
                className="p-2.5 hover:bg-gray-100 rounded-lg"
                aria-label="ログアウト"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          {/* Welcome & Stats */}
          <div className="mb-6">
            <p className="text-gray-500 text-sm mb-1">
              {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('home.welcome')}
            </h2>

            {/* Stats Cards */}
            {loadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Pending Count */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-500">未処理</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingCount}<span className="text-sm font-normal text-gray-500 ml-1">件</span>
                  </p>
                </div>

                {/* Monthly Expenses */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-500">今月の経費</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(monthlyExpenses)}
                  </p>
                </div>
              </div>
            )}

            {/* Alert for pending transactions */}
            {pendingCount > 0 && (
              <Link
                href="/swipe"
                className="block mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {pendingCount}件の取引が未処理です
                      </p>
                      <p className="text-sm text-amber-600">
                        スワイプで仕分けしましょう
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </div>
              </Link>
            )}
          </div>

          {/* Subscription Banner */}
          {!isSubscribed && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              {isTrialActive ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-800">
                      無料トライアル中
                    </p>
                    <p className="text-sm text-blue-600">
                      残り {trialDaysLeft} 日
                    </p>
                  </div>
                  <Link
                    href="/pricing"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    プランを見る
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-800">
                      トライアル期間が終了しました
                    </p>
                    <p className="text-sm text-blue-600">
                      プランを選択して続けましょう
                    </p>
                  </div>
                  <Link
                    href="/pricing"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    購入する
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions - Data Import */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              データ取り込み
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Receipt Scanning */}
              {hasAccess ? (
                <Link
                  href="/import/receipt"
                  className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                    <Receipt className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">レシート</span>
                  <span className="text-xs text-gray-500">撮影</span>
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-60 hover:opacity-80 transition-all"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mb-2">
                    <Receipt className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">レシート</span>
                  <span className="text-xs text-blue-500">Pro限定</span>
                </Link>
              )}

              {/* Bank Statement Scanning */}
              {hasAccess ? (
                <Link
                  href="/import/statement"
                  className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-2">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">銀行明細</span>
                  <span className="text-xs text-gray-500">撮影</span>
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-60 hover:opacity-80 transition-all"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mb-2">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">銀行明細</span>
                  <span className="text-xs text-blue-500">Pro限定</span>
                </Link>
              )}

              {/* CSV Import - Free */}
              <Link
                href="/import/csv"
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                  <FileSpreadsheet className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-800">CSV</span>
                <span className="text-xs text-gray-500">読み込み</span>
              </Link>
            </div>

            {/* Manual Input Link */}
            <Link
              href="/transactions/new"
              className="mt-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 flex items-center gap-3 transition-all"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <PenSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-800">手入力で取引を追加</span>
                <span className="text-xs text-gray-500 block">経費・売上を直接入力</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

          </div>

          {/* Main Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              メインメニュー
            </h3>
            <div className="space-y-2">
              <Link
                href="/swipe"
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">スワイプ仕分け</h4>
                  <p className="text-sm text-blue-100">経費をサクサク分類</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60" />
              </Link>

              <Link
                href="/transactions"
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <List className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">取引一覧</h4>
                  <p className="text-sm text-gray-500">仕分け済み・保留を確認・編集</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>

              <Link
                href="/deductions"
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">控除入力</h4>
                  <p className="text-sm text-gray-500">社会保険料・配偶者・扶養など</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>

              <Link
                href="/summary"
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">集計・申告書</h4>
                  <p className="text-sm text-gray-500">確定申告書の確認・出力</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Year-end Checklist Banner */}
          {new Date().getMonth() >= 10 && ( // 11月以降に表示
            <Link
              href="/checklist"
              className="block mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5" />
                  <div>
                    <p className="font-medium">
                      年末・確定申告チェックリスト
                    </p>
                    <p className="text-sm text-indigo-100">
                      準備状況を確認しましょう
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60" />
              </div>
            </Link>
          )}

          {/* Inventory Warning */}
          {inventoryWarning && (
            <Link
              href="/inventory"
              className="block mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">
                      棚卸入力のお知らせ
                    </p>
                    <p className="text-sm text-amber-600">
                      {inventoryWarning}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </div>
            </Link>
          )}

          {/* Business Management */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                ビジネス管理
              </h3>
              <span className="text-xs text-gray-400">必要に応じて</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/loans"
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                aria-label="借入金管理"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-2">
                  <Landmark className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-gray-800">借入金</span>
                <span className="text-xs text-gray-500">
                  {hasLoans ? '管理中' : '借入がある方'}
                </span>
              </Link>

              <Link
                href="/inventory"
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                aria-label="棚卸資産管理"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                  inventoryComplete ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Package className={`w-6 h-6 ${
                    inventoryComplete ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-800">棚卸資産</span>
                <span className={`text-xs ${
                  inventoryComplete ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {inventoryComplete ? '入力済み' : '在庫がある方'}
                </span>
              </Link>

              <Link
                href="/profile"
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                aria-label="事業設定"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-2">
                  <Briefcase className="w-6 h-6 text-slate-600" />
                </div>
                <span className="text-sm font-medium text-gray-800">事業設定</span>
                <span className="text-xs text-gray-500">按分・源泉徴収</span>
              </Link>

              <Link
                href="/restaurant"
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                aria-label="飲食店向け機能"
              >
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-2">
                  <Store className="w-6 h-6 text-rose-600" />
                </div>
                <span className="text-sm font-medium text-gray-800">飲食店</span>
                <span className="text-xs text-gray-500">売上・給与・仕入</span>
              </Link>
            </div>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  最近の取引
                </h3>
                <Link href="/transactions" className="text-sm text-blue-600 font-medium">
                  すべて見る
                </Link>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {recentTransactions.map((tx) => {
                  const category = EXPENSE_CATEGORIES.find(c => c.id === (tx.category || tx.aiCategory));
                  const isIncome = tx.amount < 0;

                  return (
                    <div key={tx.id} className="p-4 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category ? `${category.color}20` : '#f3f4f6' }}
                      >
                        <span className="text-lg">
                          {category?.emoji || '📝'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{tx.merchant}</p>
                        <p className="text-xs text-gray-500">{tx.date}</p>
                      </div>
                      <p className={`font-semibold ${isIncome ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {isIncome ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Landing page for non-logged in users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            SwipeTax
          </h1>
          <p className="text-xl md:text-2xl text-blue-600 font-medium mb-4">
            {t('landing.tagline')}
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('landing.description')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/auth/signup"
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {t('landing.getStarted')}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            ログイン
          </Link>
        </div>

        {/* Interactive Swipe Demo Card */}
        <InteractiveSwipeDemo t={t} />

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: '📸', title: 'レシート撮影', desc: 'スマホで撮るだけで自動読取' },
            { icon: '👆', title: 'スワイプ仕分け', desc: '左右にスワイプで経費分類' },
            { icon: '🤖', title: 'AI自動判定', desc: 'カテゴリを自動で推定' },
            { icon: '📄', title: '申告書作成', desc: '確定申告書を自動生成' },
          ].map((feature, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* New Features Highlight */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            新機能
          </h2>
          <p className="text-center text-gray-500 mb-8">
            さまざまな働き方・収入に対応
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 仮想通貨 */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Bitcoin className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">仮想通貨の確定申告</h3>
              <p className="text-sm text-gray-600 mb-3">
                ビットコイン・イーサリアムなどの売却益を自動計算。総平均法で損益を算出し、20万円ルールの判定も。
              </p>
              <div className="text-xs text-orange-600 font-medium">
                サラリーマンの副業にも対応
              </div>
            </div>

            {/* 年金受給者 */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Coins className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">年金受給者サポート</h3>
              <p className="text-sm text-gray-600 mb-3">
                公的年金等控除を自動計算。65歳以上の判定、年金＋アルバイトの複合収入にも対応。
              </p>
              <div className="text-xs text-emerald-600 font-medium">
                確定申告が必要かどうか自動判定
              </div>
            </div>

            {/* 飲食店 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">飲食店向け機能</h3>
              <p className="text-sm text-gray-600 mb-3">
                日次売上入力、給与計算、仕入れ伝票OCR。小規模飲食店の経理をまとめてサポート。
              </p>
              <div className="text-xs text-blue-600 font-medium">
                老夫婦経営のお店にも最適
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            使い方はかんたん3ステップ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'データを取り込む', desc: 'レシート撮影・銀行明細撮影・CSV読込' },
              { step: '2', title: 'スワイプで仕分け', desc: 'AIが提案するカテゴリを確認して仕分け' },
              { step: '3', title: '申告書を出力', desc: '確定申告書を自動作成してPDF出力' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real User Examples - Personas */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            こんな方が使っています
          </h2>
          <p className="text-center text-gray-500 mb-8">
            実際のユーザー例をご紹介
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ペルソナ1: サラリーマン＋仮想通貨 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
                  👨‍💼
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">田中さん（32歳）</h3>
                  <p className="text-sm text-gray-500">IT企業勤務・副業で仮想通貨投資</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">
                  「会社員だけど、ビットコインで30万円の利益が出た。20万円超えてるから確定申告が必要って分かったのはSwipeTaxのおかげ。総平均法の計算も自動でやってくれて助かった。」
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  仮想通貨
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  給与所得者
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  20万円ルール判定
                </span>
              </div>
            </div>

            {/* ペルソナ2: 年金＋パート */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
                  👵
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">山田さん（68歳）</h3>
                  <p className="text-sm text-gray-500">年金受給者・パートで月8万円</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">
                  「年金と少しのパート収入があって、確定申告が必要か分からなかった。SwipeTaxで入力したら、年金400万円以下・他の所得20万円以下だから申告不要って教えてくれた。」
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  年金受給者
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  パート収入
                </span>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  申告要否判定
                </span>
              </div>
            </div>

            {/* ペルソナ3: 飲食店老夫婦 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                  🍜
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">佐藤さんご夫婦（70代）</h3>
                  <p className="text-sm text-gray-500">中華料理屋・夫婦2人で経営</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">
                  「毎日の売上を入力するだけで経理が終わる。仕入れの伝票も写真を撮れば読み取ってくれる。アルバイトの給料計算も簡単。パソコンが苦手な私たちでも使えた。」
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  飲食店
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  売上管理
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  仕入れOCR
                </span>
              </div>
            </div>

            {/* ペルソナ4: フリーランスデザイナー */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                  👩‍🎨
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">鈴木さん（28歳）</h3>
                  <p className="text-sm text-gray-500">フリーランスWebデザイナー</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">
                  「クレジットカードの明細をCSVでインポートして、スワイプで仕分けするだけ。AIがカテゴリを提案してくれるから、経費の分類が楽。青色申告の65万円控除もちゃんと計算してくれる。」
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  フリーランス
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  青色申告
                </span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  AI仕分け
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Web Free Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-16 border border-green-100">
          <div className="text-center">
            <h3 className="text-xl font-bold text-green-800 mb-4">
              無料で始められます
            </h3>
            <div className="flex flex-col gap-2 mb-6">
              {[
                'アカウント登録無料',
                '基本機能は完全無料',
                'クレジットカード不要',
              ].map((point, i) => (
                <div key={i} className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              無料で登録
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm py-8 border-t border-gray-200">
          <p>© 2026 SwipeTax</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="https://b19.co.jp/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">プライバシーポリシー</a>
            <a href="https://b19.co.jp/terms/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">利用規約</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
