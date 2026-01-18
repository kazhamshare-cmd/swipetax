'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Crown, Cloud, Sparkles, RefreshCw, Loader2, Settings, ExternalLink, Receipt, FileText, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslations } from 'next-intl';

const getPremiumFeatures = (t: ReturnType<typeof useTranslations>) => [
    {
        icon: Cloud,
        title: 'クラウド同期',
        description: '複数デバイスでデータを共有',
    },
    {
        icon: Receipt,
        title: 'レシートOCR無制限',
        description: 'レシート撮影で自動読み取り',
    },
    {
        icon: FileText,
        title: 'e-Tax連携',
        description: '電子申告用XMLを出力',
    },
    {
        icon: Calculator,
        title: '税理士相談',
        description: 'チャットで税理士に相談可能',
    },
];

export default function SubscriptionPage() {
    const t = useTranslations();
    const router = useRouter();
    const { user } = useAuth();
    const {
        isSubscribed,
        isLoading,
        expirationDate,
        willRenew,
        productId,
        isNative,
        showPaywall,
        showCustomerCenter,
        restore,
    } = useSubscription();

    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

    const handleShowPaywall = async () => {
        const purchased = await showPaywall();
        if (purchased) {
            // Subscription was purchased, UI will update automatically
        }
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        setRestoreMessage(null);

        const result = await restore();

        if (result.success) {
            if (result.isActive) {
                setRestoreMessage('購入情報を復元しました');
            } else {
                setRestoreMessage('復元可能な購入が見つかりませんでした');
            }
        } else {
            setRestoreMessage('復元に失敗しました');
        }

        setIsRestoring(false);
    };

    const handleManageSubscription = async () => {
        await showCustomerCenter();
    };

    const getProductLabel = (id: string | null): string => {
        switch (id) {
            case 'monthly':
                return '月額プラン';
            case 'yearly':
                return '年額プラン';
            case 'lifetime':
                return '買い切りプラン';
            default:
                return 'SwipeTax Pro';
        }
    };

    const premiumFeatures = getPremiumFeatures(t);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        SwipeTax Pro
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Premium Badge */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 shadow-lg">
                        <Crown className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-800">
                        SwipeTax Pro
                    </h2>
                    <p className="mt-2 text-gray-600">
                        確定申告をもっと便利に
                    </p>
                </div>

                {/* Current Status - Subscribed */}
                {isSubscribed && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-emerald-800">
                                    {getProductLabel(productId)}
                                </p>
                                {expirationDate && (
                                    <p className="text-sm text-emerald-600">
                                        {willRenew
                                            ? `次回更新日: ${expirationDate.toLocaleDateString('ja-JP')}`
                                            : `有効期限: ${expirationDate.toLocaleDateString('ja-JP')}`}
                                    </p>
                                )}
                                {productId === 'lifetime' && (
                                    <p className="text-sm text-emerald-600">永久ライセンス</p>
                                )}
                            </div>
                        </div>

                        {/* Manage Subscription Button */}
                        {isNative && (
                            <button
                                onClick={handleManageSubscription}
                                className="mt-4 w-full py-2 rounded-lg border border-emerald-300 text-emerald-700 font-medium flex items-center justify-center gap-2 hover:bg-emerald-100/50 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                サブスクリプションを管理
                            </button>
                        )}
                    </div>
                )}

                {/* Features */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                    <h3 className="font-bold text-gray-800">Proプランの機能</h3>
                    {premiumFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                                <feature.icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">
                                    {feature.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Subscribe Button - Not Subscribed */}
                {!isSubscribed && isNative && (
                    <>
                        <button
                            onClick={handleShowPaywall}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
                        >
                            <Crown className="w-5 h-5" />
                            プランを選択
                        </button>

                        {/* Restore Button */}
                        <button
                            onClick={handleRestore}
                            disabled={isRestoring}
                            className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {isRestoring ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    復元中...
                                </span>
                            ) : (
                                '購入を復元'
                            )}
                        </button>

                        {/* Restore Message */}
                        {restoreMessage && (
                            <p className={`text-center text-sm ${restoreMessage.includes('復元しました') ? 'text-emerald-600' : 'text-gray-600'}`}>
                                {restoreMessage}
                            </p>
                        )}
                    </>
                )}

                {/* Web Message */}
                {!isNative && !isSubscribed && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <p className="text-blue-800 text-center">
                            Pro機能はスマートフォンアプリからご購入いただけます
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                            App Store / Google Play でダウンロード
                        </p>
                    </div>
                )}

                {/* Not logged in message */}
                {!user && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-yellow-800 text-center">
                            購入にはログインが必要です
                        </p>
                    </div>
                )}

                {/* Legal Links */}
                <div className="text-center text-sm text-gray-500 space-y-2">
                    <div className="flex items-center justify-center gap-4">
                        <a href="/terms" className="text-blue-600 underline flex items-center gap-1">
                            利用規約
                            <ExternalLink className="w-3 h-3" />
                        </a>
                        <a href="/privacy" className="text-blue-600 underline flex items-center gap-1">
                            プライバシーポリシー
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                    {!isSubscribed && (
                        <p className="text-xs mt-4">
                            サブスクリプションは自動更新されます。解約は設定から行えます。
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
