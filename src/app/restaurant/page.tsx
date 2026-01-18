'use client';

import Link from 'next/link';
import {
    ArrowLeft,
    Users,
    TrendingUp,
    Camera,
    ChevronRight,
} from 'lucide-react';

export default function RestaurantMenuPage() {
    const menuItems = [
        {
            href: '/restaurant/payroll',
            icon: Users,
            title: '給与・人件費入力',
            description: 'アルバイト・社員の給与を入力',
            color: 'blue',
            bgColor: 'bg-blue-100',
            iconColor: 'text-blue-600',
            borderColor: 'hover:border-blue-400',
        },
        {
            href: '/restaurant/sales',
            icon: TrendingUp,
            title: '売上入力',
            description: '日次売上を記録',
            color: 'emerald',
            bgColor: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            borderColor: 'hover:border-emerald-400',
        },
        {
            href: '/restaurant/purchase',
            icon: Camera,
            title: '仕入れ伝票撮影',
            description: '伝票を撮影してOCRで読み取り',
            color: 'orange',
            bgColor: 'bg-orange-100',
            iconColor: 'text-orange-600',
            borderColor: 'hover:border-orange-400',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        飲食店向けメニュー
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* 説明 */}
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <h2 className="font-medium text-amber-800 mb-1">
                        飲食店経営に特化した機能
                    </h2>
                    <p className="text-sm text-amber-700">
                        給与計算、売上管理、仕入れ伝票の読み取りを
                        <br />
                        かんたんに行えます。
                    </p>
                </div>

                {/* メニュー一覧 */}
                <div className="space-y-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block bg-white rounded-xl border-2 border-gray-200 ${item.borderColor} p-4 transition-all hover:shadow-md`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-14 h-14 ${item.bgColor} rounded-xl flex items-center justify-center`}
                                    >
                                        <Icon className={`w-7 h-7 ${item.iconColor}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-800">{item.title}</h3>
                                        <p className="text-sm text-gray-500">{item.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* ヒント */}
                <div className="mt-8 p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-700 mb-2">使い方のヒント</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>
                                <strong>給与入力</strong>
                                ：アルバイトは時給×時間で自動計算。社員は控除も入力できます。
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            <span>
                                <strong>売上入力</strong>
                                ：毎日の売上を支払方法別に記録。月間集計も自動で確認できます。
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>
                                <strong>仕入れ伝票</strong>
                                ：撮影するだけでAIが仕入先・品目・金額を読み取ります。
                            </span>
                        </li>
                    </ul>
                </div>

                {/* フッターリンク */}
                <div className="mt-8 text-center">
                    <Link
                        href="/swipe"
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        仕分け画面へ →
                    </Link>
                </div>
            </main>
        </div>
    );
}
