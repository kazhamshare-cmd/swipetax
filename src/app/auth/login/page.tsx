'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { signInWithEmail, signInWithGoogle, signInWithApple } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, LogIn, Loader2, ArrowLeft, Receipt, Calculator, FileText, Shield, Zap, CheckCircle } from 'lucide-react';

export default function LoginPage() {
    const t = useTranslations();
    const router = useRouter();
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 既にログイン済みならホームへ
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const { user, error } = await signInWithEmail(email, password);

        if (error) {
            setError(error);
            setIsLoading(false);
        } else if (user) {
            router.push('/');
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);

        try {
            const { user, error } = await signInWithGoogle();

            if (error) {
                setError(error);
                setIsLoading(false);
            } else if (user) {
                router.push('/');
            } else {
                setError(t('auth.loginFailed'));
                setIsLoading(false);
            }
        } catch (e) {
            console.error('[Login] Exception:', e);
            setError(t('auth.loginFailed'));
            setIsLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setError('');
        setIsLoading(true);

        try {
            const { user, error } = await signInWithApple();

            if (error) {
                setError(error);
                setIsLoading(false);
            } else if (user) {
                router.push('/');
            } else {
                setIsLoading(false);
            }
        } catch (e) {
            console.error('[Login] Exception:', e);
            setError(t('auth.loginFailed'));
            setIsLoading(false);
        }
    };

    const features = [
        {
            icon: Receipt,
            title: 'スワイプで仕分け',
            description: '経費の判定を左右スワイプで',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            icon: Calculator,
            title: 'AI自動判定',
            description: 'GPT-4が経費カテゴリを提案',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            icon: FileText,
            title: '申告書自動作成',
            description: '確定申告書B・青色申告対応',
            color: 'text-cyan-600',
            bg: 'bg-cyan-50',
        },
        {
            icon: Shield,
            title: '安心のセキュリティ',
            description: 'データは暗号化して保存',
            color: 'text-slate-600',
            bg: 'bg-slate-50',
        },
    ];

    const targetUsers = ['副業サラリーマン', 'フリーランス', '個人事業主', '青色申告', '白色申告'];

    return (
        <main className="min-h-screen"
              style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #DBEAFE 100%)' }}>

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-8 lg:py-16">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

                    {/* Left: Service Overview */}
                    <div className="flex-1 text-center lg:text-left">
                        {/* Logo & Title */}
                        <h1 className="text-4xl lg:text-5xl font-extrabold mb-4"
                            style={{
                                background: 'linear-gradient(135deg, #2563EB 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                            SwipeTax
                        </h1>
                        <p className="text-xl lg:text-2xl text-gray-700 font-medium mb-2">
                            スワイプするだけで確定申告
                        </p>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto lg:mx-0">
                            経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。
                        </p>

                        {/* Target Users */}
                        <div className="mb-8">
                            <p className="text-sm text-gray-500 mb-3">対象ユーザー</p>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                                {targetUsers.map((user) => (
                                    <span
                                        key={user}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white shadow-sm text-sm font-medium text-gray-700 border border-gray-100"
                                    >
                                        <CheckCircle size={14} className="text-emerald-500" />
                                        {user}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {features.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="p-4 rounded-2xl bg-white/70 backdrop-blur border border-white/50 shadow-sm"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-2`}>
                                        <feature.icon size={20} className={feature.color} />
                                    </div>
                                    <h3 className="font-bold text-gray-700 text-sm mb-1">{feature.title}</h3>
                                    <p className="text-xs text-gray-500">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Login Form */}
                    <div className="w-full max-w-md">
                        <div className="card-stationery p-8">
                            {/* 無料バナー */}
                            <div className="bg-gradient-to-r from-[#D1FAE5] to-[#DBEAFE] rounded-xl p-3 mb-4 text-center">
                                <p className="text-sm font-bold text-emerald-700">PC版は完全無料</p>
                                <p className="text-xs text-gray-600 mt-1">申告書作成まで無料で利用できます</p>
                            </div>

                            {/* ヘッダー */}
                            <div className="text-center mb-6">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Zap size={24} className="text-blue-600" />
                                    <h2 className="text-2xl font-extrabold text-gray-700">
                                        今すぐ始める
                                    </h2>
                                </div>
                                <p className="text-gray-500 text-sm">無料で確定申告を簡単に</p>
                            </div>

                            {/* エラーメッセージ */}
                            {error && (
                                <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Appleログイン（最優先表示） */}
                            <button
                                onClick={handleAppleLogin}
                                disabled={isLoading}
                                className="w-full p-4 rounded-2xl border-2 border-gray-900 bg-black hover:bg-gray-800 transition flex items-center justify-center gap-3 font-bold text-white mb-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                </svg>
                                Appleでサインイン
                            </button>

                            {/* Googleログイン */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-500 bg-white hover:bg-blue-50 transition flex items-center justify-center gap-3 font-bold text-gray-700 mb-4"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Googleでサインイン
                            </button>

                            {/* 区切り線 */}
                            <div className="my-5 flex items-center gap-4">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-sm text-gray-400">または</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            {/* ログインフォーム */}
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-stationery w-full !pl-12"
                                            placeholder={t('auth.email')}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-stationery w-full !pl-12"
                                            placeholder={t('auth.password')}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-stationery btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <LogIn size={20} />
                                    )}
                                    {t('common.login')}
                                </button>
                            </form>

                            <div className="mt-4 flex justify-between text-sm">
                                <Link
                                    href="/auth/reset-password"
                                    className="text-gray-500 hover:text-blue-600"
                                >
                                    {t('auth.forgotPassword')}
                                </Link>
                                <Link href="/auth/signup" className="text-blue-600 font-bold hover:underline">
                                    {t('common.signup')}
                                </Link>
                            </div>

                            {/* 利用規約 */}
                            <p className="mt-6 text-center text-xs text-gray-400">
                                ログインすることで
                                <a href="https://b19.co.jp/terms/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">利用規約</a>
                                と
                                <a href="https://b19.co.jp/privacy/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">プライバシーポリシー</a>
                                に同意したものとみなされます
                            </p>
                        </div>

                        {/* Back to Home */}
                        <div className="mt-4 text-center">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition"
                            >
                                <ArrowLeft size={16} />
                                ホームに戻る
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-8 text-center text-sm text-gray-500">
                <p>© 2025 SwipeTax. All rights reserved.</p>
            </footer>
        </main>
    );
}
