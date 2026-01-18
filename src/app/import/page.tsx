'use client';

import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, Receipt, Building2, FileText } from 'lucide-react';

interface ImportOption {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
    badge?: string;
}

const IMPORT_OPTIONS: ImportOption[] = [
    {
        id: 'csv',
        icon: FileSpreadsheet,
        title: 'CSV読み込み',
        description: 'freee、Money Forward、弥生会計のCSVを取り込み',
        href: '/import/csv',
    },
    {
        id: 'receipt',
        icon: Receipt,
        title: 'レシート撮影',
        description: 'レシートを撮影してOCRで読み取り',
        href: '/import/receipt',
    },
    {
        id: 'statement',
        icon: Building2,
        title: '通帳撮影',
        description: '通帳を撮影して複数取引を一括抽出',
        href: '/import/statement',
    },
    {
        id: 'tax-return',
        icon: FileText,
        title: '前年確定申告書',
        description: '前年の申告書から控除情報を引き継ぎ',
        href: '/import/tax-return',
        badge: 'NEW',
    },
];

export default function ImportPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
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
                        データ取り込み
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="max-w-lg mx-auto px-4 py-6">
                <p className="text-sm text-gray-500 mb-6">
                    取引データを取り込む方法を選択してください
                </p>

                <div className="space-y-3">
                    {IMPORT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                            <Link
                                key={option.id}
                                href={option.href}
                                className="block p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {option.title}
                                            </h3>
                                            {option.badge && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                                    {option.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {option.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* ヒント */}
                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2">ヒント</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>
                            • 会計ソフトをお使いの場合は、CSV読み込みが最も効率的です
                        </li>
                        <li>
                            • レシートは1枚ずつ撮影すると、より正確に読み取れます
                        </li>
                        <li>
                            • 取り込んだデータはスワイプで簡単に仕分けできます
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
