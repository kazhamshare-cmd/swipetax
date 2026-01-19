'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SubscriptionPage() {
    const router = useRouter();

    useEffect(() => {
        // 新しい料金ページにリダイレクト
        router.replace('/pricing');
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );
}
