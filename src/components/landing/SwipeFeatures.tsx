'use client';

import { CheckCircle, Edit3, HelpCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

const swipeActions = [
  {
    direction: '右',
    arrow: '→',
    action: '承認',
    description: 'AI判定OKをそのまま承認',
    icon: CheckCircle,
    color: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  {
    direction: '左',
    arrow: '←',
    action: '修正',
    description: 'カテゴリを変更・修正',
    icon: Edit3,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    direction: '上',
    arrow: '↑',
    action: '保留',
    description: '後で確認・税理士に相談',
    icon: HelpCircle,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  {
    direction: '下',
    arrow: '↓',
    action: '除外',
    description: '私的支出として除外',
    icon: XCircle,
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
];

const sampleTransactions = [
  { amount: '¥12,800', merchant: 'Amazon.co.jp', date: '2024/03/15', category: '消耗品費', confidence: '85%' },
  { amount: '¥5,400', merchant: 'スターバックス', date: '2024/03/14', category: '会議費', confidence: '92%' },
  { amount: '¥89,000', merchant: 'ビックカメラ', date: '2024/03/13', category: '工具器具備品', confidence: '78%' },
  { amount: '¥3,200', merchant: 'セブンイレブン', date: '2024/03/12', category: '消耗品費', confidence: '88%' },
  { amount: '¥45,000', merchant: 'JR東日本', date: '2024/03/11', category: '旅費交通費', confidence: '95%' },
];

export function SwipeFeatures() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeAction, setSwipeAction] = useState<string | null>(null);

  const handleSwipe = (direction: string) => {
    setSwipeAction(direction);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % sampleTransactions.length);
      setSwipeAction(null);
    }, 300);
  };

  const currentTransaction = sampleTransactions[currentIndex];

  return (
    <section id="features" className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            4方向スワイプで簡単仕分け
          </h2>
          <p className="text-xl text-gray-600">
            直感的な操作で経費を分類。数百件の取引もあっという間に処理できます。
          </p>
        </div>

        {/* Interactive Demo Card */}
        <div className="mb-16 max-w-2xl mx-auto">
          <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl">
            {/* Direction Indicators */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-amber-600 opacity-50 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">保留</span>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -left-16 text-blue-600 opacity-50 flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              <span className="text-sm font-medium">修正</span>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-16 text-emerald-600 opacity-50 flex items-center gap-2">
              <span className="text-sm font-medium">承認</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-red-600 opacity-50 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span className="text-sm font-medium">除外</span>
            </div>

            {/* Swipeable Card */}
            <SwipeCard
              transaction={currentTransaction}
              onSwipe={handleSwipe}
              swipeAction={swipeAction}
            />

            <div className="text-center text-sm text-gray-500 mt-6">
              カードをドラッグまたはスワイプしてください
            </div>

            <div className="text-center text-xs text-gray-400 mt-2">
              {currentIndex + 1} / {sampleTransactions.length}
            </div>
          </div>
        </div>

        {/* Action Descriptions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {swipeActions.map((action) => (
            <div
              key={action.direction}
              className={`${action.bgColor} p-8 rounded-2xl border-2 border-transparent hover:border-gray-300 transition-all group hover:scale-105`}
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${action.color} rounded-xl mb-6 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-8 h-8 text-white" />
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">{action.arrow}</span>
                <span className={`text-2xl font-bold ${action.textColor}`}>{action.action}</span>
              </div>

              <p className="text-gray-600 leading-relaxed">
                {action.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SwipeCard({
  transaction,
  onSwipe,
  swipeAction
}: {
  transaction: typeof sampleTransactions[0];
  onSwipe: (direction: string) => void;
  swipeAction: string | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateZ = useTransform(x, [-100, 100], [-5, 5]);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;

    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        onSwipe('right');
      } else {
        onSwipe('left');
      }
    } else if (Math.abs(info.offset.y) > threshold) {
      if (info.offset.y < 0) {
        onSwipe('up');
      } else {
        onSwipe('down');
      }
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotateX, rotateZ, opacity }}
      animate={swipeAction ? {
        x: swipeAction === 'right' ? 300 : swipeAction === 'left' ? -300 : 0,
        y: swipeAction === 'up' ? -300 : swipeAction === 'down' ? 300 : 0,
        opacity: 0
      } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white p-6 rounded-xl shadow-xl cursor-grab active:cursor-grabbing"
    >
      <div className="text-3xl font-bold text-gray-900 mb-2">{transaction.amount}</div>
      <div className="text-gray-600 mb-1">{transaction.merchant}</div>
      <div className="text-sm text-gray-500 mb-4">{transaction.date}</div>

      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm text-blue-700 font-medium mb-1">
          AI判定: {transaction.category}
        </div>
        <div className="text-xs text-blue-600">信頼度: {transaction.confidence}</div>
      </div>
    </motion.div>
  );
}
