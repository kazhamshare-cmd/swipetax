'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { shouldUseRestApi, restGetDoc, restSetDoc } from '@/lib/firestoreRest';
import {
    initializePurchases,
    setRevenueCatUserId,
    logOutRevenueCat,
    checkSubscriptionStatus,
    addCustomerInfoListener,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    restorePurchases,
    ENTITLEMENT_ID,
} from '@/lib/subscription';
import { getDeviceType, type DeviceType } from '@/lib/deviceDetection';

// トライアル期間（日数）
const TRIAL_DAYS = 7;

interface SubscriptionContextType {
    // State
    isSubscribed: boolean;
    isLoading: boolean;
    expirationDate: Date | null;
    willRenew: boolean;
    productId: string | null;
    isNative: boolean;

    // Device type
    deviceType: DeviceType;
    isMobileWeb: boolean; // モバイルブラウザ（アプリDLを促す）
    isDesktop: boolean;   // デスクトップ（無料アクセス）

    // Trial state
    isTrialActive: boolean;
    trialDaysLeft: number;
    trialEndDate: Date | null;

    // Combined access check
    hasAccess: boolean; // true if subscribed OR in trial period OR desktop browser

    // Actions
    refresh: () => Promise<void>;
    showPaywall: () => Promise<boolean>;
    showPaywallIfNeeded: () => Promise<boolean>;
    showCustomerCenter: () => Promise<void>;
    restore: () => Promise<{ success: boolean; isActive: boolean }>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
    isSubscribed: false,
    isLoading: true,
    expirationDate: null,
    willRenew: false,
    productId: null,
    isNative: false,
    deviceType: 'desktop',
    isMobileWeb: false,
    isDesktop: true,
    isTrialActive: false,
    trialDaysLeft: 0,
    trialEndDate: null,
    hasAccess: false,
    refresh: async () => {},
    showPaywall: async () => false,
    showPaywallIfNeeded: async () => false,
    showCustomerCenter: async () => {},
    restore: async () => ({ success: false, isActive: false }),
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [expirationDate, setExpirationDate] = useState<Date | null>(null);
    const [willRenew, setWillRenew] = useState(false);
    const [productId, setProductId] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [isNative] = useState(Capacitor.isNativePlatform());

    // Device type detection
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
    const isMobileWeb = deviceType === 'mobile-web';
    const isDesktop = deviceType === 'desktop';

    // Trial state
    const [isTrialActive, setIsTrialActive] = useState(false);
    const [trialDaysLeft, setTrialDaysLeft] = useState(0);
    const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
    const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);

    // デバイスタイプを検出
    useEffect(() => {
        setDeviceType(getDeviceType());
    }, []);

    // Combined access:
    // - Desktop browser: 常に無料アクセス
    // - Mobile web: アプリDLを促す（アクセス不可）
    // - Native app: subscribed OR in trial period
    const hasAccess = isDesktop || isSubscribed || isTrialActive;

    // Refresh subscription status
    const refresh = useCallback(async () => {
        if (!isNative) {
            setIsLoading(false);
            return;
        }

        try {
            const status = await checkSubscriptionStatus();
            setIsSubscribed(status.isActive);
            setExpirationDate(status.expirationDate);
            setWillRenew(status.willRenew);
            setProductId(status.productId);
        } catch (error) {
            console.error('[Subscription] Error refreshing:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isNative]);

    // Show paywall
    const showPaywall = useCallback(async (): Promise<boolean> => {
        if (!isNative) return false;

        const result = await presentPaywall();
        if (result.purchased) {
            await refresh();
        }
        return result.purchased;
    }, [isNative, refresh]);

    // Show paywall if user doesn't have subscription
    const showPaywallIfNeeded = useCallback(async (): Promise<boolean> => {
        if (!isNative) return false;

        const result = await presentPaywallIfNeeded();
        if (result.wasPurchased) {
            await refresh();
        }
        return result.hasAccess;
    }, [isNative, refresh]);

    // Show customer center
    const showCustomerCenter = useCallback(async () => {
        if (!isNative) return;
        await presentCustomerCenter();
    }, [isNative]);

    // Restore purchases
    const restore = useCallback(async () => {
        if (!isNative) return { success: false, isActive: false };

        const result = await restorePurchases();
        if (result.success) {
            await refresh();
        }
        return { success: result.success, isActive: result.isActive };
    }, [isNative, refresh]);

    // Initialize RevenueCat
    useEffect(() => {
        const init = async () => {
            if (!isNative) {
                setIsLoading(false);
                return;
            }

            try {
                await initializePurchases();
                // Always mark as initialized - even if RevenueCat is not configured,
                // the app should continue to work with trial-based access
                setInitialized(true);
            } catch (error) {
                console.error('[Subscription] Initialization error:', error);
                // Still mark as initialized so the app continues
                setInitialized(true);
                setIsLoading(false);
            }
        };

        init();
    }, [isNative]);

    // Handle user changes
    useEffect(() => {
        console.log('[Subscription] User effect: initialized=', initialized, 'authLoading=', authLoading, 'user=', user?.uid);
        if (!initialized || authLoading) {
            console.log('[Subscription] Skipping user effect - not ready');
            return;
        }

        const handleUserChange = async () => {
            if (!isNative) {
                console.log('[Subscription] Not native, setting loading=false');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            console.log('[Subscription] Handling user change...');

            try {
                if (user) {
                    console.log('[Subscription] Setting RevenueCat user ID:', user.uid);
                    // This will gracefully handle the case where RevenueCat is not configured
                    await setRevenueCatUserId(user.uid);
                } else {
                    console.log('[Subscription] Logging out RevenueCat');
                    // This will gracefully handle the case where RevenueCat is not configured
                    await logOutRevenueCat();
                }
                console.log('[Subscription] Refreshing...');
                await refresh();
                console.log('[Subscription] User change complete');
            } catch (error) {
                console.error('[Subscription] User change error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        handleUserChange();
    }, [user, initialized, authLoading, isNative, refresh]);

    // Listen for customer info updates
    useEffect(() => {
        if (!initialized || !isNative) return;

        const cleanup = addCustomerInfoListener((customerInfo: CustomerInfo) => {
            const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
            setIsSubscribed(!!entitlement);

            if (entitlement) {
                setExpirationDate(
                    entitlement.expirationDate ? new Date(entitlement.expirationDate) : null
                );
                setWillRenew(entitlement.willRenew);
                setProductId(entitlement.productIdentifier);
            } else {
                setExpirationDate(null);
                setWillRenew(false);
                setProductId(null);
            }
        });

        return cleanup;
    }, [initialized, isNative]);

    // Check and set trial period
    useEffect(() => {
        console.log('[Subscription] Trial effect: authLoading=', authLoading, 'user=', user?.uid);
        if (authLoading || !user) {
            console.log('[Subscription] Skipping trial check - not ready');
            setIsTrialActive(false);
            setTrialDaysLeft(0);
            setTrialEndDate(null);
            setTrialStartDate(null);
            return;
        }

        const checkTrialStatus = async () => {
            console.log('[Subscription] Checking trial status for user:', user.uid);

            try {
                let startDate: Date;
                let userData: any = null;

                // ネイティブプラットフォームではREST APIを使用
                if (shouldUseRestApi()) {
                    console.log('[Subscription] Using REST API for trial check');
                    userData = await restGetDoc(`users/${user.uid}`);
                    console.log('[Subscription] REST API result:', userData ? 'found' : 'not found');
                } else {
                    // Web環境ではFirestore SDKを使用
                    const userDocRef = doc(db, 'users', user.uid);
                    console.log('[Subscription] Fetching user doc via SDK...');
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        userData = userDoc.data();
                        // Firestore Timestampを変換
                        if (userData.trialStartDate?.toDate) {
                            userData.trialStartDate = userData.trialStartDate.toDate().getTime();
                        }
                    }
                }

                if (userData?.trialStartDate) {
                    // 既存のトライアル開始日を使用
                    console.log('[Subscription] Found existing trial start date:', userData.trialStartDate);
                    // REST APIは数値（ミリ秒）で返す
                    startDate = new Date(userData.trialStartDate);
                } else {
                    // 新規ユーザー: トライアル開始日を設定
                    console.log('[Subscription] Setting new trial start date');
                    startDate = new Date();

                    // Firestoreへの書き込み
                    if (shouldUseRestApi()) {
                        restSetDoc(`users/${user.uid}`, {
                            trialStartDate: startDate.getTime(),
                            email: user.email || '',
                            displayName: user.displayName || '',
                            createdAt: Date.now(),
                        }).catch(e => console.error('[Subscription] Failed to save trial:', e));
                    } else {
                        const userDocRef = doc(db, 'users', user.uid);
                        setDoc(userDocRef, {
                            trialStartDate: serverTimestamp(),
                            email: user.email,
                            displayName: user.displayName,
                            createdAt: serverTimestamp(),
                        }, { merge: true }).catch(e => console.error('[Subscription] Failed to save trial:', e));
                    }
                }

                setTrialStartDate(startDate);

                // トライアル終了日を計算
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + TRIAL_DAYS);
                setTrialEndDate(endDate);

                // 残り日数を計算
                const now = new Date();
                const diffTime = endDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log('[Subscription] Trial days left:', diffDays);

                if (diffDays > 0) {
                    setIsTrialActive(true);
                    setTrialDaysLeft(diffDays);
                } else {
                    setIsTrialActive(false);
                    setTrialDaysLeft(0);
                }
            } catch (error) {
                console.error('[Subscription] Trial check error:', error);
                // エラー時はトライアル有効として扱う（新規ユーザーに優しく）
                setIsTrialActive(true);
                setTrialDaysLeft(TRIAL_DAYS);
            }
        };

        checkTrialStatus();
    }, [user, authLoading]);

    return (
        <SubscriptionContext.Provider
            value={{
                isSubscribed,
                isLoading,
                expirationDate,
                willRenew,
                productId,
                isNative,
                deviceType,
                isMobileWeb,
                isDesktop,
                isTrialActive,
                trialDaysLeft,
                trialEndDate,
                hasAccess,
                refresh,
                showPaywall,
                showPaywallIfNeeded,
                showCustomerCenter,
                restore,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
