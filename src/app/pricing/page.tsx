'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Check,
    Sparkles,
    Shield,
    Zap,
    Clock,
    Loader2,
    AlertCircle,
    X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

function PricingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const {
        isSubscribed,
        isTrialActive,
        trialDaysLeft,
        hasAccess,
        startCheckout,
        openCustomerPortal,
        monthlyPrice,
        trialDays,
    } = useSubscription();

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cancelled = searchParams.get('cancelled') === 'true';

    const handleSubscribe = async () => {
        if (!user) {
            router.push('/auth/login?redirect=/pricing');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            await startCheckout();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setIsProcessing(false);
        }
    };

    const handleManageSubscription = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            await openCustomerPortal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setIsProcessing(false);
        }
    };

    const features = [
        { icon: <Zap className="w-5 h-5" />, text: '無制限の取引仕分け' },
        { icon: <Sparkles className="w-5 h-5" />, text: 'AI自動カテゴリ判定' },
        { icon: <Shield className="w-5 h-5" />, text: 'レシートOCR読取' },
        { icon: <Check className="w-5 h-5" />, text: '確定申告書出力' },
        { icon: <Check className="w-5 h-5" />, text: '各種控除計算' },
        { icon: <Check className="w-5 h-5" />, text: '棚卸・借入金管理' },
    ];

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

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
                        料金プラン
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-8">
                {/* キャンセル通知 */}
                {cancelled && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-800 font-medium">購入がキャンセルされました</p>
                            <p className="text-amber-600 text-sm mt-1">
                                いつでも再度お申し込みいただけます
                            </p>
                        </div>
                    </div>
                )}

                {/* 現在のステータス */}
                {isSubscribed && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 text-green-800">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">プロプランご利用中</span>
                        </div>
                        <p className="text-green-600 text-sm mt-1">
                            すべての機能をご利用いただけます
                        </p>
                        <button
                            onClick={handleManageSubscription}
                            disabled={isProcessing}
                            className="mt-3 text-sm text-green-700 underline hover:no-underline"
                        >
                            {isProcessing ? '読み込み中...' : 'サブスクリプションを管理'}
                        </button>
                    </div>
                )}

                {isTrialActive && !isSubscribed && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-800">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">無料トライアル中</span>
                        </div>
                        <p className="text-blue-600 text-sm mt-1">
                            残り{trialDaysLeft}日間無料でご利用いただけます
                        </p>
                    </div>
                )}

                {/* 料金カード */}
                <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-lg overflow-hidden">
                    {/* ヘッダー */}
                    <div className="bg-blue-500 text-white p-6 text-center">
                        <div className="inline-flex items-center gap-1 bg-blue-400 px-3 py-1 rounded-full text-sm mb-3">
                            <Sparkles className="w-4 h-4" />
                            <span>{trialDays}日間無料</span>
                        </div>
                        <h2 className="text-2xl font-bold">SwipeTax Pro</h2>
                        <p className="text-blue-100 mt-1">確定申告をもっとカンタンに</p>
                    </div>

                    {/* 価格 */}
                    <div className="p-6 text-center border-b border-gray-100">
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-gray-900">
                                ¥{monthlyPrice.toLocaleString()}
                            </span>
                            <span className="text-gray-500">/月</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {trialDays}日間の無料トライアル後に課金開始
                        </p>
                    </div>

                    {/* 機能リスト */}
                    <div className="p-6">
                        <ul className="space-y-3">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        {feature.icon}
                                    </div>
                                    <span className="text-gray-700">{feature.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTAボタン */}
                    <div className="p-6 pt-0">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                <X className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {!isSubscribed && (
                            <button
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        処理中...
                                    </>
                                ) : (
                                    <>
                                        {hasAccess ? 'プロプランに申し込む' : '無料で始める'}
                                    </>
                                )}
                            </button>
                        )}

                        {isSubscribed && (
                            <button
                                onClick={handleManageSubscription}
                                disabled={isProcessing}
                                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isProcessing ? '読み込み中...' : 'サブスクリプションを管理'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 補足情報 */}
                <div className="mt-8 space-y-4 text-sm text-gray-500">
                    <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                            お支払いはStripeで安全に処理されます。
                            クレジットカード情報は当社サーバーに保存されません。
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                            {trialDays}日間の無料トライアル期間中はいつでもキャンセル可能です。
                            課金開始前にメールでお知らせします。
                        </p>
                    </div>
                </div>

                {/* FAQ */}
                <div className="mt-8">
                    <h3 className="font-bold text-gray-800 mb-4">よくある質問</h3>
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="font-medium text-gray-800">いつでも解約できますか？</p>
                            <p className="text-sm text-gray-600 mt-1">
                                はい、いつでも解約可能です。解約後も期間終了まではご利用いただけます。
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="font-medium text-gray-800">支払い方法は？</p>
                            <p className="text-sm text-gray-600 mt-1">
                                クレジットカード（Visa, Mastercard, JCB, AMEX）に対応しています。
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="font-medium text-gray-800">PCでも使えますか？</p>
                            <p className="text-sm text-gray-600 mt-1">
                                はい、PC・スマートフォン・タブレットすべてでご利用いただけます。
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            }
        >
            <PricingContent />
        </Suspense>
    );
}
