'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { User, LogIn, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function UserMenu() {
    const t = useTranslations();
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        setIsOpen(false);
        router.refresh();
    };

    if (loading) {
        return (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
        );
    }

    if (!user) {
        return (
            <Link
                href="/auth/login"
                className="btn-stationery btn-primary text-sm flex items-center gap-2"
            >
                <LogIn size={16} />
                {t('common.login')}
            </Link>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-white border-2 border-gray-100 hover:border-blue-500 transition shadow-sm"
            >
                {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-8 h-8 rounded-full"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                        <User size={16} className="text-blue-600" />
                    </div>
                )}
                <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate hidden sm:block">
                    {user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown size={14} className="text-gray-600" />
            </button>

            {isOpen && (
                <>
                    {/* オーバーレイ */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* ドロップダウンメニュー */}
                    <div className="absolute right-0 mt-2 w-56 card-stationery p-2 z-50">
                        <div className="px-3 py-2 border-b border-gray-100 mb-2">
                            <p className="font-bold text-gray-800 truncate">
                                {user.displayName || t('common.user')}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-blue-50 transition"
                        >
                            <Settings size={18} className="text-gray-600" />
                            {t('settings.title')}
                        </Link>

                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition"
                        >
                            <LogOut size={18} />
                            {t('common.logout')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
