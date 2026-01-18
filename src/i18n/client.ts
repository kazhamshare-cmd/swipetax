'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';

export const locales = ['ja', 'en', 'zh-CN', 'ko', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';

export function useLocale(): Locale {
    return useNextIntlLocale() as Locale;
}

export function setLocale(locale: Locale) {
    // Set cookie for server-side detection
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    // Reload to apply new locale
    window.location.reload();
}

export function getStoredLocale(): Locale {
    if (typeof document === 'undefined') return defaultLocale;
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    const locale = match?.[1] as Locale | undefined;
    return locale && locales.includes(locale) ? locale : defaultLocale;
}
