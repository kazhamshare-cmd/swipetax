import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';

// Check if building for static export (Capacitor)
const isStaticBuild = process.env.BUILD_TARGET === 'capacitor';

export default getRequestConfig(async () => {
    let locale: Locale = defaultLocale;

    // For static export (Capacitor), use default locale
    // Client-side locale detection will handle the actual locale
    if (!isStaticBuild) {
        try {
            // Try to get locale from cookie first
            const cookieStore = await cookies();
            const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;

            if (cookieLocale && locales.includes(cookieLocale)) {
                locale = cookieLocale;
            } else {
                // If no cookie, try to detect from Accept-Language header
                const headersList = await headers();
                const acceptLanguage = headersList.get('accept-language');
                if (acceptLanguage) {
                    const preferred = acceptLanguage.split(',')[0].split('-')[0];
                    if (locales.includes(preferred as Locale)) {
                        locale = preferred as Locale;
                    }
                }
            }
        } catch {
            // Fallback to default locale if cookies/headers fail
        }
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
