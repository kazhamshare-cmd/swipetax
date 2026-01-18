'use client';

import { Upload, Sparkles, Hand, FileCheck, Calculator, Download } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'データ取り込み',
    description: 'クレカ明細やレシートを撮影・アップロード',
    icon: Upload,
    color: 'from-blue-500 to-cyan-600',
  },
  {
    number: '02',
    title: 'AI判定',
    description: 'GPT-4が経費カテゴリを自動判定',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
  },
  {
    number: '03',
    title: 'スワイプ仕分け',
    description: '直感的な操作で承認・修正・除外',
    icon: Hand,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    number: '04',
    title: '控除入力',
    description: '医療費・保険料などの控除を入力',
    icon: FileCheck,
    color: 'from-amber-500 to-orange-600',
  },
  {
    number: '05',
    title: '自動計算',
    description: '所得税・還付額を自動で計算',
    icon: Calculator,
    color: 'from-rose-500 to-red-600',
  },
  {
    number: '06',
    title: '申告書出力',
    description: 'PDF出力・e-Tax連携で提出',
    icon: Download,
    color: 'from-indigo-500 to-blue-600',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            確定申告が6ステップで完了
          </h2>
          <p className="text-xl text-gray-600">
            面倒な確定申告もSwipeTaxなら簡単に。初めての方でも安心です。
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group"
            >
              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl font-bold text-gray-200 group-hover:text-gray-300 transition-colors">
                  {step.number}
                </span>
                <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl`}>
                  <step.icon className="w-7 h-7 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>

              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-300 to-transparent"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
