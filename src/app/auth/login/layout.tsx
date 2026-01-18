import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ログイン | SwipeTax - スワイプで確定申告',
    description: 'SwipeTaxにログインして確定申告を始めましょう。経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。',
    keywords: [
        'SwipeTax ログイン',
        '確定申告 アプリ',
        'AI 経費判定',
        'フリーランス 確定申告',
    ],
    openGraph: {
        title: 'SwipeTax - スワイプで確定申告',
        description: '経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。',
        type: 'website',
    },
    alternates: {
        canonical: 'https://swipetax.app/auth/login',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
