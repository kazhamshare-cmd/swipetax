'use client';

import Link from 'next/link';
import {
    ArrowLeft,
    AlertCircle,
    CheckCircle,
    HelpCircle,
    Wallet,
    Building2,
    CreditCard,
    ArrowRight,
} from 'lucide-react';

export default function IncomePatternGuidePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        売上パターン別の入力方法
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* Introduction */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h2 className="font-medium text-blue-800 mb-1">このページについて</h2>
                            <p className="text-sm text-blue-700">
                                フリーランス・個人事業主の方が多い売上の入金パターン別に、
                                正しい入力方法を解説します。
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pattern 1: Direct Payment */}
                <section className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">パターン1: 企業から直接入金</h3>
                                <p className="text-xs text-gray-500">取引先からの振込</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                                請求書を発行して企業から直接入金を受ける最もシンプルなパターンです。
                            </p>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-2">例：Webサイト制作 100万円</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium text-gray-700">売上として入力:</span>
                                    <span className="font-bold text-emerald-600">¥1,000,000</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-emerald-700">
                                <strong>ポイント：</strong>入金された金額をそのまま売上として入力します。
                            </p>
                        </div>
                    </div>
                </section>

                {/* Pattern 2: With Withholding Tax */}
                <section className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-purple-50 border-b border-purple-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">パターン2: 源泉徴収あり</h3>
                                <p className="text-xs text-gray-500">源泉税が差し引かれて入金</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                                企業が源泉徴収税（約10.21%）を差し引いて入金するパターンです。
                            </p>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-gray-500">例：報酬100万円、源泉徴収102,100円</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">請求額:</span>
                                    <span className="text-gray-700">¥1,000,000</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">源泉徴収:</span>
                                    <span className="text-red-500">-¥102,100</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm border-t border-gray-200 pt-2">
                                    <span className="text-gray-500">入金額:</span>
                                    <span className="font-medium text-gray-700">¥897,900</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-purple-700">
                                    <p><strong>売上として入力:</strong> ¥1,000,000（請求額＝税引前の金額）</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-amber-700">
                                    <p><strong>源泉徴収税額:</strong> ¥102,100を「プロフィール設定」→「源泉徴収税額」に年間合計で入力</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pattern 3: Coconala etc. */}
                <section className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-orange-50 border-b border-orange-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">パターン3: ココナラ・クラウドソーシング</h3>
                                <p className="text-xs text-gray-500">プラットフォーム手数料が差し引かれる</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                                ココナラ（22%）、クラウドワークス（5〜20%）、ランサーズ（16.5%）などのプラットフォームを利用する場合です。
                            </p>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-gray-500">例：ココナラで案件10万円（手数料22%）</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">案件金額:</span>
                                    <span className="text-gray-700">¥100,000</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">手数料(22%):</span>
                                    <span className="text-red-500">-¥22,000</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm border-t border-gray-200 pt-2">
                                    <span className="text-gray-500">受取金額:</span>
                                    <span className="font-medium text-gray-700">¥78,000</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-sm text-orange-800 font-medium mb-2">
                                    2つの入力方法があります
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <span className="text-orange-600 font-bold">A.</span>
                                        <div className="text-sm text-orange-700">
                                            <p><strong>売上:</strong> ¥100,000（総額）</p>
                                            <p><strong>経費（支払手数料）:</strong> ¥22,000</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-orange-600 font-bold">B.</span>
                                        <div className="text-sm text-orange-700">
                                            <p><strong>売上:</strong> ¥78,000（実際の入金額）のみ</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-700">
                                    <p><strong>どちらが良い？</strong></p>
                                    <p className="mt-1">
                                        方法Aの方が実際の取引金額が明確になり、事業規模を正確に把握できます。
                                        ただし、方法Bでも税額に影響はありません。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pattern 4: Factoring */}
                <section className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-blue-50 border-b border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ArrowRight className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">パターン4: ファクタリング</h3>
                                <p className="text-xs text-gray-500">売掛金を早期に現金化</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                                請求書（売掛金）をファクタリング会社に売却して、手数料を差し引いた金額を先に受け取るパターンです。
                            </p>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-gray-500">例：売掛金100万円をファクタリング（手数料10%）</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">売掛金額:</span>
                                    <span className="text-gray-700">¥1,000,000</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">手数料(10%):</span>
                                    <span className="text-red-500">-¥100,000</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm border-t border-gray-200 pt-2">
                                    <span className="text-gray-500">入金額:</span>
                                    <span className="font-medium text-gray-700">¥900,000</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-700">
                                    <p><strong>売上:</strong> ¥1,000,000（元の請求金額）</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-700">
                                    <p><strong>経費（支払手数料）:</strong> ¥100,000</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-amber-700">
                                    <p>ファクタリング手数料は「支払手数料」として経費計上します。売上は元の請求金額で計上してください。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Summary */}
                <section className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                    <h3 className="font-bold mb-4">まとめ：入力のポイント</h3>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-200">1.</span>
                            <span><strong>売上</strong>は原則、手数料差引前の「請求額」で入力</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-200">2.</span>
                            <span><strong>プラットフォーム・ファクタリング手数料</strong>は「支払手数料」で経費計上</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-200">3.</span>
                            <span><strong>源泉徴収税</strong>は「プロフィール設定」で年間合計を入力（還付計算に使用）</span>
                        </li>
                    </ul>
                </section>

                {/* Action Links */}
                <div className="space-y-3">
                    <Link
                        href="/transactions/new"
                        className="block w-full py-4 bg-blue-600 text-white font-medium rounded-xl text-center hover:bg-blue-700 transition-colors"
                    >
                        取引を入力する
                    </Link>
                    <Link
                        href="/profile"
                        className="block w-full py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl text-center hover:bg-gray-50 transition-colors"
                    >
                        プロフィール設定へ（源泉徴収）
                    </Link>
                </div>
            </main>
        </div>
    );
}
