'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, BarChart3, Globe, Receipt } from 'lucide-react';
import UserMenu from './UserMenu';
import SyncIndicator from './SyncIndicator';
import { useTranslations } from 'next-intl';
import { setLocale, getStoredLocale, type Locale } from '@/i18n/client';

const LANGUAGE_OPTIONS: { code: Locale; label: string; flag: string }[] = [
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
];

export default function Header() {
    const t = useTranslations();
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [currentLocale, setCurrentLocale] = useState<Locale>('ja');

    useEffect(() => {
        setCurrentLocale(getStoredLocale());
    }, []);

    const handleLanguageChange = (locale: Locale) => {
        setLocale(locale);
        setCurrentLocale(locale);
        setShowLangMenu(false);
    };

    const currentLang = LANGUAGE_OPTIONS.find(l => l.code === currentLocale);

    return (
        <header className="mb-8">
            {/* トップバー */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Link
                        href="/swipe"
                        className="p-2.5 card-stationery hover:shadow-lg text-gray-500 hover:text-[#2563EB] transition"
                        title="スワイプ仕分け"
                    >
                        <Receipt size={20} />
                    </Link>
                    <Link
                        href="/summary"
                        className="p-2.5 card-stationery hover:shadow-lg text-gray-500 hover:text-[#2563EB] transition"
                        title="集計"
                    >
                        <BarChart3 size={20} />
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    {/* 言語切り替え */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="p-2.5 card-stationery hover:shadow-lg text-gray-500 hover:text-[#2563EB] transition flex items-center gap-1"
                            title={t('settings.language')}
                        >
                            <Globe size={18} />
                            <span className="text-sm hidden sm:inline">{currentLang?.flag}</span>
                        </button>

                        {showLangMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowLangMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-44 card-stationery p-2 z-50">
                                    {LANGUAGE_OPTIONS.map(({ code, label, flag }) => (
                                        <button
                                            key={code}
                                            onClick={() => handleLanguageChange(code)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                                                currentLocale === code
                                                    ? 'bg-[#DBEAFE] text-[#1D4ED8] font-medium'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <span>{flag}</span>
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <SyncIndicator />
                    <UserMenu />
                </div>
            </div>

            {/* タイトル */}
            <div className="text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                    style={{
                        background: 'linear-gradient(135deg, #2563EB 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                    SwipeTax
                </h1>
                <p className="text-gray-500 mt-2 font-medium text-sm tracking-wide">
                    スワイプするだけで確定申告
                </p>

                {/* データ取り込みボタン */}
                <div className="mt-6">
                    <Link
                        href="/import"
                        className="btn-stationery btn-primary inline-flex items-center gap-2"
                    >
                        <FileText size={20} />
                        データを取り込む
                    </Link>
                </div>
            </div>
        </header>
    );
}
