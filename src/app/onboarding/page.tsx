'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    Loader2,
    Sparkles,
    ArrowRight,
    FileText,
    PiggyBank,
    Calculator,
    CheckCircle,
} from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [step, setStep] = useState(0);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/auth/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const features = [
        {
            icon: Sparkles,
            title: 'スワイプで簡単仕分け',
            description: 'AIが経費のカテゴリを提案。左右にスワイプするだけで仕分け完了',
            color: 'blue',
        },
        {
            icon: PiggyBank,
            title: '按分も自動計算',
            description: '家賃や光熱費の事業使用割合を設定すれば、自動で按分計算',
            color: 'green',
        },
        {
            icon: Calculator,
            title: '源泉徴収・還付金もOK',
            description: '源泉徴収された税額を入力すれば、還付金額まで自動計算',
            color: 'purple',
        },
        {
            icon: FileText,
            title: '確定申告書を自動作成',
            description: '入力したデータから確定申告書Bを自動生成してPDF出力',
            color: 'amber',
        },
    ];

    const handleStartSetup = () => {
        router.push('/profile');
    };

    const handleSkipSetup = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
            {/* Welcome Step */}
            {step === 0 && (
                <div className="min-h-screen flex flex-col">
                    {/* Header */}
                    <div className="pt-12 pb-8 px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                                アカウント作成完了
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            SwipeTaxへようこそ！
                        </h1>
                        <p className="text-gray-600 max-w-md mx-auto">
                            確定申告をもっと簡単に。
                            <br />
                            まずは事業の設定を行いましょう。
                        </p>
                    </div>

                    {/* Features */}
                    <div className="flex-1 px-6 py-4">
                        <div className="max-w-md mx-auto space-y-4">
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                const bgColor = {
                                    blue: 'bg-blue-100',
                                    green: 'bg-green-100',
                                    purple: 'bg-purple-100',
                                    amber: 'bg-amber-100',
                                }[feature.color];
                                const iconColor = {
                                    blue: 'text-blue-600',
                                    green: 'text-green-600',
                                    purple: 'text-purple-600',
                                    amber: 'text-amber-600',
                                }[feature.color];

                                return (
                                    <div
                                        key={index}
                                        className="flex items-start gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white"
                                    >
                                        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <Icon className={`w-6 h-6 ${iconColor}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 mb-1">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-8 bg-white/50 backdrop-blur-sm border-t border-white">
                        <div className="max-w-md mx-auto space-y-3">
                            <button
                                onClick={handleStartSetup}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                            >
                                事業設定を始める
                                <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSkipSetup}
                                className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                            >
                                あとで設定する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
