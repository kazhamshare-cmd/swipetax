'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full">
              <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
              <span className="text-sm text-orange-700">2026年確定申告対応</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block text-gray-900">スワイプするだけで</span>
              <span className="block bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                確定申告
              </span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              煩雑な経費仕分けをサクサク処理。<br />
              副業サラリーマンからフリーランスまで、<br />
              誰でも簡単に確定申告書を作成できます。
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/signup"
                className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 font-bold"
              >
                14日間無料で始める
                <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 bg-white text-gray-700 rounded-xl border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600 transition-all flex items-center justify-center gap-2 font-medium"
              >
                ログイン
              </Link>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="px-4 py-2 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">14日間無料</div>
                <div className="text-sm text-gray-600">トライアル期間</div>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">¥580/月</div>
                <div className="text-sm text-gray-600">PC・スマホ・タブレット共通</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-orange-100 to-orange-50 p-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="text-2xl font-bold text-gray-900 mb-2">¥12,800</div>
                <div className="text-gray-600 mb-1">Amazon.co.jp</div>
                <div className="text-sm text-gray-500 mb-4">2024/03/15</div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-700 font-medium mb-1">
                    AI判定: 消耗品費
                  </div>
                  <div className="text-xs text-orange-600">信頼度: 85%</div>
                </div>
                <div className="mt-4 flex justify-between text-sm text-gray-500">
                  <span>← 経費じゃない</span>
                  <span>経費！ →</span>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl blur-3xl opacity-20"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
