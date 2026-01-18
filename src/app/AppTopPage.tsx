'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppIcon } from '@/components/AppIcon';
import { Loader2 } from 'lucide-react';

export function AppTopPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ログイン済みならホーム画面へ
  useEffect(() => {
    if (!loading && user) {
      router.push('/swipe');
    }
  }, [user, loading, router]);

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ログイン済みの場合はリダイレクト中
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* ロゴ */}
        <div className="mb-8">
          <AppIcon size={80} />
        </div>

        {/* タイトル */}
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
          SwipeTax
        </h1>
        <p className="text-gray-600 mb-12 text-center">
          スワイプするだけで確定申告
        </p>

        {/* ログインボタン */}
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            ログイン / 新規登録
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-6 text-center">
        <div className="flex justify-center gap-6 text-sm text-gray-500">
          <a
            href="https://b19.co.jp/terms/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            利用規約
          </a>
          <a
            href="https://b19.co.jp/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            プライバシーポリシー
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          © 2026 B19 Co., Ltd.
        </p>
      </footer>
    </div>
  );
}
