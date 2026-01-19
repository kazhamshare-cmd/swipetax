'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail, signInWithGoogle, signInWithApple, signInWithLine } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

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

        try {
            const { user, error } = await signInWithGoogle();

            if (error) {
                setError(error);
                setIsLoading(false);
            } else if (user) {
                router.push('/');
            } else {
                setError('登録に失敗しました');
                setIsLoading(false);
            }
        } catch (e) {
            console.error('[Signup] Exception:', e);
            setError('登録に失敗しました');
            setIsLoading(false);
        }
    };

    const handleAppleSignup = async () => {
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
            console.error('[Signup] Exception:', e);
            setError('登録に失敗しました');
            setIsLoading(false);
        }
    };

    const handleLineSignup = async () => {
        setError('');
        setIsLoading(true);

        try {
            const { error } = await signInWithLine();

            if (error) {
                setError(error);
                setIsLoading(false);
            }
            // LINEはリダイレクトするのでここでは何もしない
        } catch (e) {
            console.error('[Signup] Exception:', e);
            setError('登録に失敗しました');
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* 登録カード */}
                <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                    {/* オレンジヘッダー */}
                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-8 text-center text-white">
                        <h1 className="text-2xl font-bold mb-1">新規登録</h1>
                        <p className="text-orange-100 text-sm">14日間無料でお試しいただけます</p>
                    </div>

                    {/* フォーム部分 */}
                    <div className="p-6">
                        {/* エラーメッセージ */}
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* ソーシャルログイン（上部） */}
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={handleLineSignup}
                                disabled={isLoading}
                                className="w-full py-3 bg-[#00B900] text-white rounded-lg flex items-center justify-center gap-3 hover:bg-[#00A000] transition disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                </svg>
                                <span className="font-medium">LINEで登録</span>
                            </button>

                            <button
                                onClick={handleGoogleSignup}
                                disabled={isLoading}
                                className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span className="text-gray-700 font-medium">Googleで登録</span>
                            </button>

                            <button
                                onClick={handleAppleSignup}
                                disabled={isLoading}
                                className="w-full py-3 bg-black text-white rounded-lg flex items-center justify-center gap-3 hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                </svg>
                                <span className="font-medium">Appleで登録</span>
                            </button>
                        </div>

                        {/* 区切り線 */}
                        <div className="my-6 flex items-center gap-4">
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-sm text-gray-400">またはメールで登録</span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                        </div>

                        {/* 登録フォーム */}
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    お名前（任意）
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                    placeholder="山田 太郎"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    メールアドレス
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                    placeholder="mail@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    パスワード
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                    placeholder="6文字以上"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    パスワード（確認）
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                    placeholder="もう一度入力"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : null}
                                アカウントを作成
                            </button>
                        </form>

                        {/* ログインリンク */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-500">
                                すでにアカウントをお持ちですか？{' '}
                                <Link href="/auth/login" className="text-orange-600 font-bold hover:underline">
                                    ログイン
                                </Link>
                            </p>
                        </div>

                        {/* 利用規約 */}
                        <p className="mt-6 text-center text-xs text-gray-400">
                            登録することで、
                            <a href="https://b19.co.jp/terms/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">利用規約</a>
                            および
                            <a href="https://b19.co.jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">プライバシーポリシー</a>
                            に同意したものとみなされます。
                        </p>
                    </div>
                </div>

                {/* 料金案内 */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-bold text-orange-600">14日間無料</span>でお試しいただけます
                    </p>
                    <p className="text-xs text-gray-500">
                        その後 月額580円（PC・スマホ・タブレット共通）
                    </p>
                </div>

                {/* フッター */}
                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>© 2025 SwipeTax by B19 Co., Ltd.</p>
                </div>
            </div>
        </main>
    );
}
