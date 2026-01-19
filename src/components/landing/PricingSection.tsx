'use client';

import Link from 'next/link';
import { Check, Sparkles, Monitor, Smartphone, Tablet } from 'lucide-react';

const features = [
  '取引仕分け無制限',
  'AI経費判定',
  'PDF申告書出力',
  '確定申告書B対応',
  '白色・青色申告対応',
  'クラウド保存',
  'レシート撮影OCR',
  'QR決済スクショ対応',
  'PC・スマホ・タブレット対応',
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            シンプルな料金プラン
          </h2>
          <p className="text-xl text-gray-600">
            14日間無料でお試し。すべての機能が使い放題。
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="relative bg-white rounded-2xl shadow-xl ring-2 ring-orange-500 p-8">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="inline-flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-full">
                <Sparkles className="w-4 h-4" />
                すべてのデバイス対応
              </div>
            </div>

            <div className="text-center mb-8 pt-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">SwipeTax プレミアム</h3>

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Monitor className="w-5 h-5" />
                  <span className="text-sm">PC</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Smartphone className="w-5 h-5" />
                  <span className="text-sm">スマホ</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Tablet className="w-5 h-5" />
                  <span className="text-sm">タブレット</span>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-5xl font-bold text-gray-900">¥580</span>
                <span className="text-gray-600 text-xl">/月</span>
              </div>
              <div className="inline-block px-4 py-2 bg-orange-100 rounded-full">
                <span className="text-orange-700 font-semibold">14日間無料トライアル</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-orange-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/auth/signup"
              className="block w-full py-4 rounded-xl font-semibold transition-all text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-xl"
            >
              14日間無料で始める
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            クレジットカード登録後、<span className="font-semibold text-gray-900">14日間は無料</span>でご利用いただけます。
            <br />
            いつでもキャンセル可能。解約後も期間終了まで利用できます。
          </p>
        </div>
      </div>
    </section>
  );
}
