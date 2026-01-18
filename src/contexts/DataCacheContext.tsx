'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Transaction } from '@/lib/types';

interface CacheData {
    transactions: Transaction[];
    lastFetched: number;
}

interface DataCacheContextType {
    transactions: Transaction[];
    loading: boolean;
    refresh: () => Promise<void>;
    invalidateCache: () => void;
}

const DataCacheContext = createContext<DataCacheContextType | null>(null);

// キャッシュの有効期限（5分）
const CACHE_TTL = 5 * 60 * 1000;

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [cache, setCache] = useState<CacheData | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!user) {
            setCache(null);
            return;
        }

        // Check cache validity
        if (cache && Date.now() - cache.lastFetched < CACHE_TTL) {
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement actual data fetching
            // const transactions = await getTransactions(user.uid);
            const transactions: Transaction[] = [];

            setCache({
                transactions,
                lastFetched: Date.now(),
            });
        } catch (error) {
            console.error('[DataCache] Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [user, cache]);

    const invalidateCache = useCallback(() => {
        setCache(null);
    }, []);

    return (
        <DataCacheContext.Provider
            value={{
                transactions: cache?.transactions || [],
                loading,
                refresh,
                invalidateCache,
            }}
        >
            {children}
        </DataCacheContext.Provider>
    );
}

export function useDataCache() {
    const context = useContext(DataCacheContext);
    if (!context) {
        throw new Error('useDataCache must be used within a DataCacheProvider');
    }
    return context;
}
