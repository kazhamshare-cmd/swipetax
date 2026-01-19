'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LandingPage } from './LandingPage';
import { AppTopPage } from './AppTopPage';

export default function Home() {
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    // Capacitorでプラットフォームを判定
    const p = Capacitor.getPlatform();
    console.log('[Home] Platform detected:', p);
    console.log('[Home] isNativePlatform:', Capacitor.isNativePlatform());
    setPlatform(p);
  }, []);

  // 判定中は何も表示しない（フラッシュ防止）
  if (platform === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // ios/android → アプリ用画面、web → ランディングページ
  const isNativeApp = platform === 'ios' || platform === 'android';

  return isNativeApp ? <AppTopPage /> : <LandingPage />;
}
