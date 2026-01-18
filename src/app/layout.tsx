import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

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
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
            </head>
            <body className="antialiased">
                <NextIntlClientProvider messages={messages}>
                    <AuthProvider>
                        <SubscriptionProvider>
                            {children}
                        </SubscriptionProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
