'use client';

import Link from 'next/link';
import { Check, Star } from 'lucide-react';

const plans = [
  {
    name: 'PCブラウザ版',
    price: '無料',
    description: 'すべての基本機能が使い放題',
    features: [
      '取引仕分け無制限',
      'AI経費判定',
      'PDF申告書出力',
      '確定申告書B対応',
      '白色・青色申告対応',
      'クラウド保存',
    ],
    highlight: false,
    cta: '無料で始める',
    ctaLink: '/auth/login',
    badge: null,
  },
  {
    name: 'モバイルアプリ版',
    price: '¥580',
    period: '/月',
    annualPrice: '¥2,900/年',
    description: 'スマホアプリで快適に',
    features: [
      'PCブラウザ版の全機能',
      'スマホアプリ利用',
      'レシート撮影OCR',
      'QR決済スクショ対応',
      'オフライン利用',
      '優先サポート',
    ],
    highlight: true,
    cta: 'アプリをダウンロード',
    ctaLink: '#',
    badge: '人気',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            シンプルな料金プラン
          </h2>
          <p className="text-xl text-gray-600">
            まずはPCブラウザ版で無料体験。アプリ版は月額プランでお得に。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-lg ${
                plan.highlight ? 'ring-2 ring-blue-600 scale-105' : ''
              } p-8 transition-all hover:shadow-xl`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-full">
                    <Star className="w-4 h-4" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600 text-xl">{plan.period}</span>}
                </div>
                {plan.annualPrice && (
                  <div className="text-sm text-gray-500">または {plan.annualPrice}</div>
                )}
                <p className="text-gray-600 mt-3">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaLink}
                className={`block w-full py-4 rounded-xl font-semibold transition-all text-center ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-xl'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            すべてのプランに<span className="font-semibold text-gray-900">無料トライアル期間</span>があります。
            <br />
            クレジットカード登録不要で今すぐお試しいただけます。
          </p>
        </div>
      </div>
    </section>
  );
}
