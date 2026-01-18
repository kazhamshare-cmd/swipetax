'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
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
                        利用規約
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                    <p className="text-sm text-gray-500">最終更新日: 2025年1月</p>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">1. サービスの概要</h2>
                        <p className="text-gray-600 leading-relaxed">
                            SwipeTax（以下「本サービス」）は、確定申告の経費仕分けを支援するアプリケーションです。
                            本規約は、本サービスのご利用に関する条件を定めるものです。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">2. サービスの性質</h2>
                        <p className="text-gray-600 leading-relaxed">
                            本サービスは確定申告書作成の補助ツールであり、税務アドバイスを提供するものではありません。
                            AI判定機能は参考情報として提供され、最終的な申告内容の判断はお客様ご自身の責任において行ってください。
                            必要に応じて税理士等の専門家にご相談ください。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">3. アカウント</h2>
                        <ul className="text-gray-600 leading-relaxed list-disc list-inside space-y-1">
                            <li>アカウントを作成するには13歳以上である必要があります</li>
                            <li>正確なアカウント情報を提供してください</li>
                            <li>アカウント情報の機密性を維持する責任があります</li>
                            <li>アカウントでの全ての活動に責任を負います</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">4. 無料版とプレミアム版</h2>
                        <div className="text-gray-600 leading-relaxed space-y-2">
                            <p><strong>PC版（無料）:</strong> 全機能を無料でご利用いただけます</p>
                            <p><strong>スマートフォンアプリ（サブスクリプション）:</strong></p>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                                <li>スワイプ仕分け機能</li>
                                <li>AI経費判定</li>
                                <li>クラウド同期</li>
                                <li>レシートOCR</li>
                                <li>e-Tax連携（Pro版）</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">5. サブスクリプション</h2>
                        <ul className="text-gray-600 leading-relaxed list-disc list-inside space-y-1">
                            <li>サブスクリプションは自動更新されます</li>
                            <li>現在の期間終了の24時間前までにキャンセルしない限り更新されます</li>
                            <li>キャンセルはApp Store/Google Playの設定から行えます</li>
                            <li>返金は各ストアのポリシーに従います</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">6. 禁止事項</h2>
                        <ul className="text-gray-600 leading-relaxed list-disc list-inside space-y-1">
                            <li>サービスの不正使用またはハッキング</li>
                            <li>虚偽の情報の入力</li>
                            <li>サービスを不正な目的で使用すること</li>
                            <li>サービスを商用目的で再販売すること</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">7. 免責事項</h2>
                        <p className="text-gray-600 leading-relaxed">
                            本サービスは「現状有姿」で提供されます。
                            申告内容の誤りや税務調査による追徴課税等について、法律で認められる最大限の範囲で責任を負いません。
                            サービスの中断、データ損失、その他の損害についても同様です。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">8. 準拠法</h2>
                        <p className="text-gray-600 leading-relaxed">
                            本規約は日本法に準拠し、解釈されるものとします。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">9. お問い合わせ</h2>
                        <p className="text-gray-600 leading-relaxed">
                            利用規約に関するご質問: support@swipetax.app
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
