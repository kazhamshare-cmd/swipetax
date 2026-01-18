'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LandingPage } from './LandingPage';
import HomeClient from './HomeClient';

export default function Home() {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    // Capacitorでネイティブアプリかどうかを判定
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // 判定中は何も表示しない（フラッシュ防止）
  if (isNative === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // ネイティブアプリ → アプリ画面、Web → ランディングページ
  return isNative ? <HomeClient /> : <LandingPage />;
}
