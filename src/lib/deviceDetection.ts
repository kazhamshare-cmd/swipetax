/**
 * デバイス検出ユーティリティ
 * PC/モバイルブラウザ/ネイティブアプリを判別
 */

import { Capacitor } from '@capacitor/core';

export type DeviceType = 'desktop' | 'mobile-web' | 'native-app';

/**
 * 現在のデバイスタイプを取得
 */
export function getDeviceType(): DeviceType {
    // ネイティブアプリ（Capacitor）
    if (Capacitor.isNativePlatform()) {
        return 'native-app';
    }

    // ブラウザ環境
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        if (isMobileUserAgent()) {
            return 'mobile-web';
        }
    }

    return 'desktop';
}

/**
 * モバイルブラウザかどうかを判定（User-Agent）
 */
function isMobileUserAgent(): boolean {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent.toLowerCase();

    // モバイルデバイスのパターン
    const mobilePatterns = [
        /android/i,
        /webos/i,
        /iphone/i,
        /ipad/i,
        /ipod/i,
        /blackberry/i,
        /windows phone/i,
        /mobile/i,
    ];

    return mobilePatterns.some(pattern => pattern.test(userAgent));
}

/**
 * デスクトップブラウザかどうか
 */
export function isDesktopBrowser(): boolean {
    return getDeviceType() === 'desktop';
}

/**
 * モバイルブラウザかどうか（アプリではない）
 */
export function isMobileBrowser(): boolean {
    return getDeviceType() === 'mobile-web';
}

/**
 * ネイティブアプリかどうか
 */
export function isNativeApp(): boolean {
    return getDeviceType() === 'native-app';
}

/**
 * iOS端末かどうか
 */
export function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Android端末かどうか
 */
export function isAndroid(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /android/i.test(navigator.userAgent);
}

/**
 * App Storeのリンクを取得
 */
export function getAppStoreLink(): string {
    // TODO: 実際のApp Store/Play StoreのURLに置き換える
    if (isIOS()) {
        return 'https://apps.apple.com/app/swipetax/id000000000'; // 実際のIDに置き換え
    }
    return 'https://play.google.com/store/apps/details?id=com.swipetax.app'; // 実際のIDに置き換え
}
