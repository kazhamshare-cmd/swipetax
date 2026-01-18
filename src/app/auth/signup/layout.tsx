import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '新規登録 | SwipeTax - スワイプで確定申告',
    description: 'SwipeTaxに無料登録して確定申告を始めましょう。経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。',
    keywords: [
        'SwipeTax 登録',
        '確定申告 アプリ 無料',
        'AI 経費判定',
        'フリーランス 確定申告',
    ],
    openGraph: {
        title: 'SwipeTax 新規登録 - スワイプで確定申告',
        description: '経費の仕分けを左右スワイプで完了。AIが自動判定、あなたは確認するだけ。',
        type: 'website',
    },
    alternates: {
        canonical: 'https://swipetax.app/auth/signup',
    },
};

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
