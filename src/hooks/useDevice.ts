'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface DeviceInfo {
    isNative: boolean;      // Capacitorネイティブアプリかどうか
    isMobile: boolean;      // モバイルデバイスかどうか
    isIOS: boolean;         // iOSかどうか
    isAndroid: boolean;     // Androidかどうか
    platform: 'ios' | 'android' | 'web';
    hasNotch: boolean;      // ノッチがあるか（iPhone X以降など）
    safeAreaTop: number;    // セーフエリア上部
    safeAreaBottom: number; // セーフエリア下部
}

export function useDevice(): DeviceInfo {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        isNative: false,
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        platform: 'web',
        hasNotch: false,
        safeAreaTop: 0,
        safeAreaBottom: 0,
    });

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
        const isIOS = platform === 'ios';
        const isAndroid = platform === 'android';
        const isMobile = isIOS || isAndroid || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // ノッチ検出（CSS環境変数を使用）
        const hasNotch = isIOS && (
            window.screen.height >= 812 || // iPhone X以降の縦画面
            window.screen.width >= 812     // iPhone X以降の横画面
        );

        // セーフエリアの取得
        const computedStyle = getComputedStyle(document.documentElement);
        const safeAreaTop = parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) ||
            (hasNotch ? 44 : 0);
        const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) ||
            (hasNotch ? 34 : 0);

        setDeviceInfo({
            isNative,
            isMobile,
            isIOS,
            isAndroid,
            platform,
            hasNotch,
            safeAreaTop,
            safeAreaBottom,
        });
    }, []);

    return deviceInfo;
}

// ネイティブアプリ専用の機能かどうかを判定
export function useIsNative(): boolean {
    const { isNative } = useDevice();
    return isNative;
}

// モバイルデバイスかどうかを判定
export function useIsMobile(): boolean {
    const { isMobile } = useDevice();
    return isMobile;
}
