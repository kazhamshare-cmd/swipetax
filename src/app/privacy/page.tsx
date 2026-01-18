'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        プライバシーポリシー
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                    <p className="text-sm text-gray-500">最終更新日: 2025年1月</p>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">1. はじめに</h2>
                        <p className="text-gray-600 leading-relaxed">
                            SwipeTax（以下「本アプリ」）は、お客様のプライバシーを尊重し、個人情報の保護に努めています。
                            本プライバシーポリシーは、本アプリがどのような情報を収集し、どのように使用するかを説明します。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">2. 収集する情報</h2>
                        <div className="text-gray-600 leading-relaxed space-y-2">
                            <p><strong>アカウント情報:</strong> メールアドレス、氏名</p>
                            <p><strong>取引データ:</strong> 経費情報、収入情報、取引履歴</p>
                            <p><strong>レシート画像:</strong> OCR処理用にアップロードされた画像</p>
                            <p><strong>申告書データ:</strong> 確定申告書作成に必要な情報</p>
                            <p><strong>決済情報:</strong> サブスクリプション購入履歴（決済処理はApp Store/Google Playが行います）</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">3. 情報の使用目的</h2>
                        <ul className="text-gray-600 leading-relaxed list-disc list-inside space-y-1">
                            <li>確定申告書の作成支援</li>
                            <li>AI経費判定機能の提供</li>
                            <li>クラウド同期機能の提供（プレミアム会員）</li>
                            <li>カスタマーサポートの提供</li>
                            <li>サービスの改善・開発</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">4. 情報の共有</h2>
                        <p className="text-gray-600 leading-relaxed">
                            お客様の個人情報は、以下の場合を除き第三者と共有しません：
                        </p>
                        <ul className="text-gray-600 leading-relaxed list-disc list-inside space-y-1 mt-2">
                            <li>お客様の同意がある場合</li>
                            <li>法律で要求される場合</li>
                            <li>サービス提供に必要なインフラパートナー（Firebase, RevenueCat, OpenAI）との共有</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">5. データの保存</h2>
                        <p className="text-gray-600 leading-relaxed">
                            お客様のデータは、Firebase（Google Cloud Platform）の安全なサーバーに保存されます。
                            税務関連の機密データは暗号化され、適切なセキュリティ対策が施されています。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">6. お客様の権利</h2>
                        <ul className="text-gray-600 leading-relaxed list-disc list-inside space-y-1">
                            <li>個人データへのアクセス権</li>
                            <li>データの訂正または削除を要求する権利</li>
                            <li>データのエクスポート権</li>
                            <li>アカウントの削除権</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">7. ポリシーの変更</h2>
                        <p className="text-gray-600 leading-relaxed">
                            本プライバシーポリシーは随時更新される場合があります。
                            重要な変更がある場合は、アプリ内でお知らせします。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">8. お問い合わせ</h2>
                        <p className="text-gray-600 leading-relaxed">
                            プライバシーに関するご質問やご懸念がある場合は、以下までご連絡ください：
                        </p>
                        <p className="text-gray-600 mt-2">
                            メール: support@swipetax.app
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
