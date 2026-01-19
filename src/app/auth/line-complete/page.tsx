'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithLineToken } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function LineCompletePage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const completeSignIn = async () => {
            // URLフラグメントからトークンを取得
            const hash = window.location.hash;
            const tokenMatch = hash.match(/token=([^&]+)/);

            if (!tokenMatch || !tokenMatch[1]) {
                setError('認証トークンが見つかりません');
                setTimeout(() => router.push('/auth/login'), 3000);
                return;
            }

            const customToken = tokenMatch[1];

            // Firebase認証を完了
            const { user, error } = await signInWithLineToken(customToken);

            if (error) {
                setError(error);
                setTimeout(() => router.push('/auth/login'), 3000);
                return;
            }

            if (user) {
                // ログイン成功、ホームにリダイレクト
                router.push('/');
            }
        };

        completeSignIn();
    }, [router]);

    return (
        <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-sm w-full">
                {error ? (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 mb-2">エラー</h1>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <p className="text-sm text-gray-400">ログイン画面に戻ります...</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00B900] flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 mb-2">LINEログイン中...</h1>
                        <p className="text-gray-600">認証を完了しています</p>
                    </>
                )}
            </div>
        </main>
    );
}
