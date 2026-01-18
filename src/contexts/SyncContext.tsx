'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface SyncContextType {
    status: SyncStatus;
    lastSyncTime: Date | null;
    isOnline: boolean;
    isSyncEnabled: boolean;
    error: string | null;
    manualSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
    status: 'idle',
    lastSyncTime: null,
    isOnline: true,
    isSyncEnabled: false,
    error: null,
    manualSync: async () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const manualSync = async () => {
        setStatus('syncing');
        try {
            // TODO: Implement sync logic
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLastSyncTime(new Date());
            setStatus('synced');
        } catch (e) {
            setError('同期に失敗しました');
            setStatus('error');
        }
    };

    return (
        <SyncContext.Provider
            value={{
                status,
                lastSyncTime,
                isOnline,
                isSyncEnabled: false, // Will be enabled with subscription
                error,
                manualSync,
            }}
        >
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    return useContext(SyncContext);
}
