'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/auth';
import { Mail, Send, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const { error } = await resetPassword(email);

        if (error) {
            setError(error);
        } else {
            setSuccess(true);
        }
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4"
              style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)' }}>
            <div className="w-full max-w-md">
                {/* 戻るボタン */}
                <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 transition"
                >
                    <ArrowLeft size={18} />
                    ログインに戻る
                </Link>

                <div className="card-stationery p-8">
                    {success ? (
                        // 成功メッセージ
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-emerald-100">
                                <CheckCircle size={40} className="text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-2">メールを送信しました</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                {email} にパスワードリセット用のメールを送信しました。メールの指示に従ってパスワードを再設定してください。
                            </p>
                            <Link href="/auth/login" className="btn-stationery btn-primary inline-flex items-center gap-2">
                                ログインに戻る
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* ヘッダー */}
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-extrabold mb-2"
                                    style={{
                                        background: 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}>
                                    パスワードをリセット
                                </h1>
                                <p className="text-gray-500 text-sm">
                                    登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
                                </p>
                            </div>

                            {/* エラーメッセージ */}
                            {error && (
                                <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* リセットフォーム */}
                            <form onSubmit={handleReset} className="space-y-4">
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

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-stationery btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <Send size={20} />
                                    )}
                                    リセットメールを送信
                                </button>
                            </form>

                            {/* ログインリンク */}
                            <p className="mt-6 text-center text-sm text-gray-500">
                                パスワードを思い出しましたか？{' '}
                                <Link href="/auth/login" className="text-blue-600 font-bold hover:underline">
                                    ログイン
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
