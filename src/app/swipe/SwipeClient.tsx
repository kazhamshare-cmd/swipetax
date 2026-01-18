'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useDevice } from '@/hooks/useDevice';
import {
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Loader2,
  Sparkles,
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
  FileText,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Transaction,
  TransactionStatus,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
} from '@/lib/types';
import {
  getPendingTransactions,
  updateTransaction,
} from '@/lib/transaction-service';

// アイコンマッピング
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

type SwipeAction = 'approve' | 'modify' | 'hold' | 'exclude';

const TUTORIAL_STORAGE_KEY = 'swipetax_swipe_tutorial_shown';

export default function SwipeClient() {
  const t = useTranslations();
  const device = useDevice();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeAction | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if tutorial has been shown before
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tutorialShown = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!tutorialShown) {
        setShowTutorial(true);
      }
    }
  }, []);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
  }, []);

  // Motion values for card movement
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  // 未処理取引をFirestoreから読み込み（ページネーション対応）
  useEffect(() => {
    if (!user) return;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        const result = await getPendingTransactions(user.uid, 50);
        setTransactions(result.transactions);
        if (result.transactions.length === 0) {
          setIsFinished(true);
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user]);

  const currentTransaction = transactions[currentIndex];

  // Haptic feedback helper
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch {
      // Haptics not available (web browser)
    }
  }, []);

  // Determine swipe direction from coordinates
  const getSwipeAction = useCallback((dx: number, dy: number): SwipeAction | null => {
    const threshold = 60;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < threshold && absY < threshold) return null;

    // 横方向が優勢
    if (absX > absY) {
      return dx > 0 ? 'approve' : 'modify';
    }
    // 縦方向が優勢
    return dy < 0 ? 'hold' : 'exclude';
  }, []);

  // Handle transaction action
  const handleAction = useCallback(async (action: SwipeAction, newCategory?: ExpenseCategory) => {
    if (!currentTransaction || !user) return;

    let newStatus: TransactionStatus;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'modify':
        newStatus = 'modified';
        break;
      case 'hold':
        newStatus = 'held';
        break;
      case 'exclude':
        newStatus = 'excluded';
        break;
    }

    // Firestoreに保存（バックグラウンド）
    setSavingCount(prev => prev + 1);
    try {
      await updateTransaction(currentTransaction.id, {
        status: newStatus,
        category: newCategory || currentTransaction.aiCategory,
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
    } finally {
      setSavingCount(prev => prev - 1);
    }

    // Update local state
    const updatedTransactions = [...transactions];
    updatedTransactions[currentIndex] = {
      ...currentTransaction,
      status: newStatus,
      category: newCategory || currentTransaction.aiCategory,
      updatedAt: Date.now(),
    };
    setTransactions(updatedTransactions);

    // Move to next
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      x.set(0);
      y.set(0);
    } else {
      setIsFinished(true);
    }
  }, [currentTransaction, currentIndex, transactions, x, y, user]);

  // Drag event handlers
  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isAnimatingOut) return;
    setSwipeDirection(getSwipeAction(info.offset.x, info.offset.y));
  }, [isAnimatingOut, getSwipeAction]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isAnimatingOut) return;

    const { offset, velocity } = info;
    const action = getSwipeAction(offset.x, offset.y);
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    if (action && (Math.abs(offset.x) > 100 || Math.abs(offset.y) > 100 || speed > 500)) {
      setIsAnimatingOut(true);
      triggerHaptic(ImpactStyle.Medium);

      if (action === 'modify') {
        // Show category modal for left swipe
        setSelectedTransaction(currentTransaction);
        setShowCategoryModal(true);
        x.set(0);
        y.set(0);
        setSwipeDirection(null);
        setIsAnimatingOut(false);
      } else {
        setTimeout(() => {
          handleAction(action);
          setSwipeDirection(null);
          setIsAnimatingOut(false);
        }, 300);
      }
    } else {
      setSwipeDirection(null);
    }
  }, [isAnimatingOut, getSwipeAction, triggerHaptic, handleAction, currentTransaction, x, y]);

  // Category selection handler
  const handleCategorySelect = (category: ExpenseCategory) => {
    handleAction('modify', category);
    setShowCategoryModal(false);
    setSelectedTransaction(null);
  };

  // Get swipe indicator styles
  const getIndicatorStyle = (direction: SwipeAction) => {
    if (swipeDirection !== direction) return 'opacity-30';
    switch (direction) {
      case 'approve': return 'opacity-100 scale-110 text-green-500';
      case 'modify': return 'opacity-100 scale-110 text-blue-500';
      case 'hold': return 'opacity-100 scale-110 text-amber-500';
      case 'exclude': return 'opacity-100 scale-110 text-red-500';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(Math.abs(amount));
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  // ログイン必要
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No transactions state
  if (transactions.length === 0 && !isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            仕分けする取引がありません
          </h2>
          <p className="text-gray-600 mb-6">
            まずはCSVファイルやレシートをインポートしてください
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/import"
              className="py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              データをインポート
            </Link>
            <Link
              href="/"
              className="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Finished state
  if (isFinished) {
    const approved = transactions.filter(t => t.status === 'approved').length;
    const modified = transactions.filter(t => t.status === 'modified').length;
    const held = transactions.filter(t => t.status === 'held').length;
    const excluded = transactions.filter(t => t.status === 'excluded').length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('swipe.complete')}
          </h2>
          <p className="text-gray-600 mb-6">
            {transactions.length > 0 ? t('swipe.completeDesc') : '仕分けする取引がありません'}
          </p>

          {transactions.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">{approved}</p>
                <p className="text-sm text-green-700">承認</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-600">{modified}</p>
                <p className="text-sm text-blue-700">修正</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-600">{held}</p>
                <p className="text-sm text-amber-700">保留</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-600">{excluded}</p>
                <p className="text-sm text-red-700">除外</p>
              </div>
            </div>
          )}

          {savingCount > 0 && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              ホームへ
            </Link>
            <Link
              href="/summary"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              集計を見る
            </Link>
          </div>

          {held > 0 && (
            <Link
              href="/transactions?filter=held"
              className="mt-4 block text-sm text-amber-600 font-medium"
            >
              保留中の取引を確認する ({held}件)
            </Link>
          )}
        </div>
      </div>
    );
  }

  const CategoryIcon = currentTransaction?.aiCategory
    ? CATEGORY_ICONS[currentTransaction.aiCategory]
    : MoreHorizontal;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">{t('swipe.title')}</h1>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {transactions.length}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex) / transactions.length) * 100}%` }}
          />
        </div>

        {/* Saving indicator */}
        {savingCount > 0 && (
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            保存中...
          </div>
        )}

        {/* Swipe Indicators */}
        <div className="relative mb-4">
          {/* Top - Hold */}
          <div className={`absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 transition-all ${getIndicatorStyle('hold')}`}>
            <ChevronUp className="w-4 h-4" />
            <span className="text-xs font-medium">保留</span>
          </div>

          {/* Left - Modify */}
          <div className={`absolute top-1/2 -left-2 -translate-y-1/2 flex items-center gap-1 transition-all ${getIndicatorStyle('modify')}`}>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-medium">修正</span>
          </div>

          {/* Right - Approve */}
          <div className={`absolute top-1/2 -right-2 -translate-y-1/2 flex items-center gap-1 transition-all ${getIndicatorStyle('approve')}`}>
            <span className="text-xs font-medium">OK</span>
            <ChevronRight className="w-4 h-4" />
          </div>

          {/* Bottom - Exclude */}
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 transition-all ${getIndicatorStyle('exclude')}`}>
            <ChevronDown className="w-4 h-4" />
            <span className="text-xs font-medium">除外</span>
          </div>

          {/* Card */}
          {currentTransaction && (
            <motion.div
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.7}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              style={{ x, y, rotate, opacity }}
              className="bg-white rounded-2xl shadow-xl p-6 cursor-grab active:cursor-grabbing mx-8 my-8"
            >
              {/* Amount */}
              <div className="text-center mb-4">
                <p className={`text-4xl font-bold ${currentTransaction.amount < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {currentTransaction.amount < 0 ? '+' : ''}{formatCurrency(currentTransaction.amount)}
                </p>
                {currentTransaction.amount < 0 && (
                  <span className="text-sm text-emerald-600 font-medium">収入</span>
                )}
              </div>

              {/* Merchant & Date */}
              <div className="text-center mb-4">
                <p className="text-lg font-medium text-gray-800">
                  {currentTransaction.merchant}
                </p>
                <p className="text-sm text-gray-500">
                  {currentTransaction.date}
                </p>
                {currentTransaction.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {currentTransaction.description}
                  </p>
                )}
              </div>

              {/* AI Judgment */}
              {currentTransaction.aiCategory && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      {t('swipe.aiJudgment')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CategoryIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {EXPENSE_CATEGORIES.find(c => c.id === currentTransaction.aiCategory)?.nameJa || '不明'}
                      </p>
                      {currentTransaction.aiConfidence && (
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(currentTransaction.aiConfidence)}`}>
                          {t('swipe.confidence')}: {currentTransaction.aiConfidence}%
                        </div>
                      )}
                    </div>
                  </div>

                  {currentTransaction.aiReasoning && (
                    <p className="text-xs text-blue-700">
                      {currentTransaction.aiReasoning}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2 mt-8">
          <button
            onClick={() => {
              setSelectedTransaction(currentTransaction);
              setShowCategoryModal(true);
            }}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-xs font-medium">修正</span>
          </button>

          <button
            onClick={() => handleAction('hold')}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
          >
            <HelpCircle className="w-6 h-6" />
            <span className="text-xs font-medium">保留</span>
          </button>

          <button
            onClick={() => handleAction('exclude')}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <X className="w-6 h-6" />
            <span className="text-xs font-medium">除外</span>
          </button>

          <button
            onClick={() => handleAction('approve')}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          >
            <Check className="w-6 h-6" />
            <span className="text-xs font-medium">OK</span>
          </button>
        </div>
      </div>

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {t('swipe.selectCategory')}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedTransaction(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.id];
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {category.nameJa}
                        </p>
                        <p className="text-xs text-gray-500">
                          {category.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swipe Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3" />
              <h2 className="text-xl font-bold mb-1">スワイプで仕分け</h2>
              <p className="text-sm text-blue-100">カードをスワイプして取引を分類</p>
            </div>

            {/* Instructions */}
            <div className="p-4">
              <div className="space-y-4">
                {/* Right Swipe */}
                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-xl">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">右スワイプ → OK</p>
                    <p className="text-xs text-green-600">AIの判定を承認する</p>
                  </div>
                </div>

                {/* Left Swipe */}
                <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ChevronLeft className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">左スワイプ → 修正</p>
                    <p className="text-xs text-blue-600">カテゴリを自分で選び直す</p>
                  </div>
                </div>

                {/* Up Swipe */}
                <div className="flex items-center gap-4 p-3 bg-amber-50 rounded-xl">
                  <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ChevronUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">上スワイプ → 保留</p>
                    <p className="text-xs text-amber-600">後で確認したい取引</p>
                  </div>
                </div>

                {/* Down Swipe */}
                <div className="flex items-center gap-4 p-3 bg-red-50 rounded-xl">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <ChevronDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-800">下スワイプ → 除外</p>
                    <p className="text-xs text-red-600">経費対象外の取引</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={dismissTutorial}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                始める
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                画面下のボタンからも操作できます
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
