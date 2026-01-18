'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail, signInWithGoogle } from '@/lib/auth';
import { Mail, Lock, User, UserPlus, Loader2, ArrowLeft, Shield, Zap, Calculator } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // パスワード確認
        if (password !== confirmPassword) {
            setError('パスワードが一致しません');
            return;
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください');
            return;
        }

        setIsLoading(true);

        const { user, error } = await signUpWithEmail(email, password, displayName);

        if (error) {
            setError(error);
            setIsLoading(false);
        } else if (user) {
            router.push('/');
        }
    };

    const handleGoogleSignup = async () => {
        setError('');
        setIsLoading(true);

        const { user, error } = await signInWithGoogle();

        if (error) {
            setError(error);
            setIsLoading(false);
        } else if (user) {
            router.push('/');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4"
              style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)' }}>
            <div className="w-full max-w-md">
                {/* 戻るボタン */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 transition"
                >
                    <ArrowLeft size={18} />
                    ホームに戻る
                </Link>

                <div className="card-stationery p-8">
                    {/* ヘッダー */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-extrabold mb-2"
                            style={{
                                background: 'linear-gradient(135deg, #2563EB 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                            SwipeTaxへようこそ
                        </h1>
                        <p className="text-gray-500 text-sm">アカウントを作成して確定申告を始めましょう</p>
                    </div>

                    {/* 特徴 */}
                    <div className="flex justify-center gap-6 mb-6">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Zap size={18} className="text-blue-600" />
                            </div>
                            <span className="text-xs text-gray-500">スワイプ仕分け</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Calculator size={18} className="text-emerald-600" />
                            </div>
                            <span className="text-xs text-gray-500">AI自動判定</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                                <Shield size={18} className="text-cyan-600" />
                            </div>
                            <span className="text-xs text-gray-500">安全・安心</span>
                        </div>
                    </div>

                    {/* エラーメッセージ */}
                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 登録フォーム */}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">
                                お名前（任意）
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="input-stationery w-full !pl-12"
                                    placeholder="山田 太郎"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">
                                メールアドレス
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-stationery w-full !pl-12"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">
                                パスワード
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-stationery w-full !pl-12"
                                    placeholder="6文字以上"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">
                                パスワード（確認）
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-stationery w-full !pl-12"
                                    placeholder="もう一度入力"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-stationery btn-primary w-full flex items-center justify-center gap-2 mt-6"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <UserPlus size={20} />
                            )}
                            アカウントを作成
                        </button>
                    </form>

                    {/* 区切り線 */}
                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-sm text-gray-600">または</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Googleログイン */}
                    <button
                        onClick={handleGoogleSignup}
                        disabled={isLoading}
                        className="w-full p-3 rounded-2xl border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 transition flex items-center justify-center gap-3 font-medium text-gray-700"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Googleで登録
                    </button>

                    {/* ログインリンク */}
                    <p className="mt-8 text-center text-sm text-gray-500">
                        すでにアカウントをお持ちですか？{' '}
                        <Link href="/auth/login" className="text-blue-600 font-bold hover:underline">
                            ログイン
                        </Link>
                    </p>

                    {/* 利用規約 */}
                    <p className="mt-4 text-center text-xs text-gray-400">
                        登録することで、
                        <a href="https://b19.co.jp/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">利用規約</a>
                        と
                        <a href="https://b19.co.jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">プライバシーポリシー</a>
                        に同意したものとみなされます
                    </p>
                </div>
            </div>
        </main>
    );
}
