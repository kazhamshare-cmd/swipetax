'use client';

import Link from 'next/link';
import { Monitor, Smartphone, Tablet, Cloud, Zap, Camera, CreditCard } from 'lucide-react';

export function PlatformSection() {
  return (
    <section className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              どのデバイスでも
            </span>
            <br />
            同じ体験を
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            PC、スマホ、タブレット。お好きなデバイスでいつでもどこでも確定申告作業ができます。
            データはクラウドで自動同期。
          </p>
        </div>

        {/* Device Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* PC */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Monitor className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">PC / Mac</h3>
            <p className="text-gray-600 mb-4">
              大画面で効率的に作業。キーボードショートカットで高速仕分け。
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
              <Zap className="w-4 h-4" />
              <span>大量データの一括処理に最適</span>
            </div>
          </div>

          {/* Smartphone */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">スマートフォン</h3>
            <p className="text-gray-600 mb-4">
              スワイプ操作でサクサク仕分け。レシート撮影もその場で。
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
              <Camera className="w-4 h-4" />
              <span>レシートOCR・QR決済対応</span>
            </div>
          </div>

          {/* Tablet */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Tablet className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">タブレット</h3>
            <p className="text-gray-600 mb-4">
              PCとスマホのいいとこ取り。ソファでゆったり確定申告。
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
              <CreditCard className="w-4 h-4" />
              <span>タッチ操作で直感的に</span>
            </div>
          </div>
        </div>

        {/* Cloud Sync Feature */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6">
                <Cloud className="w-4 h-4" />
                <span className="text-sm">クラウド同期</span>
              </div>
              <h3 className="text-3xl font-bold mb-4">
                デバイス間で自動同期
              </h3>
              <p className="text-orange-100 text-lg leading-relaxed">
                朝の通勤中にスマホでレシートを撮影。夜は自宅のPCで一括仕分け。
                すべてのデータはクラウドで自動同期されるので、どこでも続きから作業できます。
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="w-8 h-0.5 bg-white/40"></div>
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                    <Cloud className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="w-8 h-0.5 bg-white/40"></div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Monitor className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/auth/signup"
            className="inline-flex px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-2xl transition-all items-center gap-2 font-semibold"
          >
            14日間無料で始める
          </Link>
          <p className="text-gray-500 mt-4 text-sm">
            PC・スマホ・タブレット共通で月額580円
          </p>
        </div>
      </div>
    </section>
  );
}
