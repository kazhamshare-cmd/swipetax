'use client';

import { useParams, useSearchParams, usePathname } from 'next/navigation';
import { useMemo } from 'react';

/**
 * 動的ルート用のパラメータ取得フック
 * - クエリパラメータ `_id` があればそれを優先（Capacitor対応）
 * - パスネームから直接抽出（_placeholderの問題を回避）
 * - フォールバックとして通常のURLパラメータを使用
 */
export function useCapacitorParams(paramName: string = 'id'): string {
    const params = useParams();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const result = useMemo(() => {
        const queryId = searchParams.get('_id');
        const paramValue = params[paramName];

        console.log('[useCapacitorParams] queryId:', queryId, 'paramValue:', paramValue, 'pathname:', pathname);

        // 1. クエリパラメータ _id があれば優先（Capacitor対応）
        if (queryId) {
            console.log('[useCapacitorParams] Using queryId:', queryId);
            return queryId;
        }

        // 2. パスネームから直接抽出（_placeholderの問題を回避）
        // /study/[id] → /study/xxxxx の形式を想定
        // /decks/[id] → /decks/xxxxx の形式を想定
        // /editor/edit/[id] → /editor/edit/xxxxx の形式を想定
        if (pathname) {
            const segments = pathname.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1];

            // 最後のセグメントが有効なIDかどうかを確認
            // _placeholder や 空文字、一般的なルート名でないことを確認
            if (lastSegment &&
                lastSegment !== '_placeholder' &&
                lastSegment !== 'study' &&
                lastSegment !== 'decks' &&
                lastSegment !== 'edit' &&
                lastSegment !== 'new') {
                console.log('[useCapacitorParams] Using pathname segment:', lastSegment);
                return lastSegment;
            }
        }

        // 3. フォールバック: 通常のURLパラメータを使用
        if (Array.isArray(paramValue)) {
            const val = paramValue[0] || '';
            if (val && val !== '_placeholder') {
                console.log('[useCapacitorParams] Using array param:', val);
                return val;
            }
        }

        const val = (paramValue as string) || '';
        if (val && val !== '_placeholder') {
            console.log('[useCapacitorParams] Using param:', val);
            return val;
        }

        console.log('[useCapacitorParams] No valid ID found');
        return '';
    }, [params, searchParams, pathname, paramName]);

    return result;
}
