'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  CreditCard,
  Globe,
  Moon,
  Bell,
  Info,
  LogOut,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface UserSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  language: 'ja',
  theme: 'light',
  notifications: true,
};

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('swipetax-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings
  const saveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('swipetax-settings', JSON.stringify(newSettings));
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">{t('settings.title')}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">{t('settings.account')}</h2>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {user?.email || 'ゲスト'}
                </p>
                <p className="text-sm text-gray-500">
                  {user ? '認証済み' : '未ログイン'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <Link
          href="/subscription"
          className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{t('settings.subscription')}</p>
            <p className="text-sm text-gray-500">プラン管理</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">設定</h2>
          </div>

          {/* Language */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{t('settings.language')}</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => saveSettings({ ...settings, language: e.target.value })}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Theme */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Moon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{t('settings.theme')}</p>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => saveSettings({ ...settings, theme: e.target.value as UserSettings['theme'] })}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="system">システム</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="p-4 flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{t('settings.notifications')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => saveSettings({ ...settings, notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">{t('settings.about')}</p>
            <p className="text-sm text-gray-500">SwipeTax v0.1.0</p>
          </div>
        </div>

        {/* Logout */}
        {user && (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t('common.logout')}</span>
          </button>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('auth.logoutConfirm')}
            </h3>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
