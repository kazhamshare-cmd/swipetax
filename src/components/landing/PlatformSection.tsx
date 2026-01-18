'use client';

import Link from 'next/link';
import { Monitor, Smartphone, Cloud, Zap } from 'lucide-react';

export function PlatformSection() {
  return (
    <section className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* PC Browser Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-100 to-emerald-100 p-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold text-gray-900">PCブラウザ版</span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/5"></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="h-16 bg-blue-100 rounded"></div>
                  <div className="h-16 bg-emerald-100 rounded"></div>
                  <div className="h-16 bg-amber-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full">
              <Monitor className="w-4 h-4 text-blue-700" />
              <span className="text-sm text-blue-700">PCブラウザ版</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              PCで作業するなら<br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                完全無料
              </span>
            </h2>

            <p className="text-xl text-gray-600 leading-relaxed">
              大画面で効率的に仕分け作業。広告表示はありますが、すべての機能を無料でご利用いただけます。freeeやMoney Forwardからの乗り換えにも最適です。
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">高速処理</div>
                  <div className="text-sm text-gray-600">大画面で一気に仕分け</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">クラウド保存</div>
                  <div className="text-sm text-gray-600">どこからでもアクセス</div>
                </div>
              </div>
            </div>

            <Link
              href="/auth/login"
              className="inline-flex px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl hover:shadow-2xl transition-all items-center gap-2"
            >
              PCで無料で始める
              <Monitor className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Mobile App Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span className="text-sm text-emerald-700">スマホアプリ版</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              移動中でも<br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                サクサク仕分け
              </span>
            </h2>

            <p className="text-xl text-gray-600 leading-relaxed">
              スワイプ操作に最適化されたアプリ版。レシート撮影、QR決済スクショ取り込みなど、スマホならではの便利機能が満載です。
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                <span className="text-gray-700">レシート撮影でOCR自動読み取り</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                <span className="text-gray-700">PayPay・楽天ペイのスクショ対応</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                <span className="text-gray-700">オフラインでも利用可能</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                App Storeでダウンロード
                <Smartphone className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                Google Playでダウンロード
                <Smartphone className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-emerald-100 to-teal-100 p-8">
              <div className="bg-white rounded-xl p-6 shadow-lg max-w-[280px] mx-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-gray-900 text-sm">SwipeTax App</span>
                </div>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <div className="text-lg font-bold text-gray-900">¥5,400</div>
                  <div className="text-sm text-gray-600">スターバックス</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>← スワイプ</span>
                  <span>スワイプ →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
