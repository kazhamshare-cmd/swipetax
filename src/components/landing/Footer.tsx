'use client';

import Link from 'next/link';
import { FileText, Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">SwipeTax</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              スワイプするだけで確定申告。煩雑な経費仕分けを簡単に、誰でも使える確定申告サービス。
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/kazhamshare-cmd/swipetax"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="mailto:support@swipetax.app"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">サービス</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white transition-colors">機能</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">使い方</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">料金</a></li>
              <li><a href="#" className="hover:text-white transition-colors">ヘルプセンター</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">会社情報</h4>
            <ul className="space-y-2">
              <li><a href="https://b19.co.jp/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">運営会社</a></li>
              <li><a href="https://b19.co.jp/terms/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">利用規約</a></li>
              <li><a href="https://b19.co.jp/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">プライバシーポリシー</a></li>
              <li><a href="https://b19.co.jp/contact/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">お問い合わせ</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; 2026 SwipeTax. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 max-w-2xl text-center sm:text-right">
            ※ SwipeTaxは確定申告書作成ツールです。税務相談が必要な場合は税理士にご相談ください。<br />
            ※ 個人情報保護法に基づき、お客様の情報は厳重に管理されます。
          </p>
        </div>
      </div>
    </footer>
  );
}
