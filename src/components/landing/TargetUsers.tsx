'use client';

import Link from 'next/link';
import { Briefcase, Code, Store } from 'lucide-react';

const targetUsers = [
  {
    icon: Briefcase,
    title: '副業サラリーマン',
    description: '本業の給与所得と副業収入の申告に。年末調整では対応できない控除もしっかり反映できます。',
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Code,
    title: 'フリーランス',
    description: 'エンジニア、デザイナー、ライターなど。経費の仕分けから青色申告まで完全サポート。',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: Store,
    title: '個人事業主',
    description: '事業所得の申告に必要な機能を完備。消費税申告にも対応予定です。',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
  },
];

export function TargetUsers() {
  return (
    <section className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            こんな方におすすめ
          </h2>
          <p className="text-xl text-gray-600">
            様々な働き方に対応した確定申告サポート
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {targetUsers.map((user) => (
            <div
              key={user.title}
              className={`${user.bgColor} p-8 rounded-2xl hover:scale-105 transition-all`}
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${user.color} rounded-xl mb-6`}>
                <user.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {user.title}
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {user.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-12 text-center text-white">
          <h3 className="text-3xl sm:text-4xl font-bold mb-4">
            まずは無料で試してみませんか?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            PCブラウザ版なら、全機能を無料でお試しいただけます。<br />
            クレジットカード登録不要、今すぐ始められます。
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-10 py-4 bg-white text-blue-600 rounded-xl hover:shadow-2xl transition-all font-semibold text-lg"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </section>
  );
}
