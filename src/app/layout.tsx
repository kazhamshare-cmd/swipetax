import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import AppWrapper from "@/components/AppWrapper";

export const metadata: Metadata = {
    title: {
        default: "SwipeTax - スワイプで確定申告",
        template: "%s | SwipeTax",
    },
    description: "経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。確定申告を最も簡単に。",
    keywords: ["確定申告", "青色申告", "白色申告", "経費", "フリーランス", "副業", "税金", "AI"],
    authors: [{ name: "SwipeTax Team" }],
    creator: "SwipeTax",
    publisher: "B19 Co., Ltd.",
    manifest: "/manifest.json",
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "32x32" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "SwipeTax",
    },
    openGraph: {
        type: "website",
        locale: "ja_JP",
        siteName: "SwipeTax",
        title: "SwipeTax - スワイプで確定申告",
        description: "経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。",
    },
    twitter: {
        card: "summary_large_image",
        title: "SwipeTax - スワイプで確定申告",
        description: "経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。",
    },
    robots: {
        index: true,
        follow: true,
    },
    category: "finance",
};

export const viewport: Viewport = {
    themeColor: "#3B82F6",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale === 'ja' ? 'ja' : 'en'}>
            <head>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
            </head>
            <body className="antialiased">
                <NextIntlClientProvider messages={messages}>
                    <AuthProvider>
                        <SubscriptionProvider>
                            <AppWrapper>
                                {children}
                            </AppWrapper>
                        </SubscriptionProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
