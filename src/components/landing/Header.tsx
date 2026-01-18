'use client';

import Link from 'next/link';
import { AppIcon } from '@/components/AppIcon';

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <AppIcon size={40} />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              SwipeTax
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
              機能
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">
              使い方
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">
              料金
            </a>
            <Link
              href="/auth/login"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
