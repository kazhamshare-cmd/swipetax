'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { shouldUseRestApi, restGetDoc, restSetDoc } from '@/lib/firestoreRest';
import { redirectToCheckout, redirectToCustomerPortal, isStripeConfigured, SUBSCRIPTION_PRICE, TRIAL_DAYS } from '@/lib/stripe';

// サブスクリプションステータスの型
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';

interface SubscriptionContextType {
    // State
    isSubscribed: boolean;
    isLoading: boolean;
    subscriptionStatus: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;

    // Trial state
    isTrialActive: boolean;
    trialDaysLeft: number;
    trialEndDate: Date | null;

    // Combined access check
    hasAccess: boolean; // true if subscribed OR in trial period

    // Stripe info
    stripeConfigured: boolean;
    monthlyPrice: number;
    trialDays: number;

    // Actions
    refresh: () => Promise<void>;
    startCheckout: () => Promise<void>;
    openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
    isSubscribed: false,
    isLoading: true,
    subscriptionStatus: 'none',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isTrialActive: false,
    trialDaysLeft: 0,
    trialEndDate: null,
    hasAccess: false,
    stripeConfigured: false,
    monthlyPrice: SUBSCRIPTION_PRICE,
    trialDays: TRIAL_DAYS,
    refresh: async () => {},
    startCheckout: async () => {},
    openCustomerPortal: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none');
    const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

    // Trial state
    const [isTrialActive, setIsTrialActive] = useState(false);
    const [trialDaysLeft, setTrialDaysLeft] = useState(0);
    const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);

    // Combined access: subscribed OR in trial period
    const hasAccess = isSubscribed || isTrialActive;

    // Stripeが設定されているかチェック
    const stripeConfigured = isStripeConfigured();

    // Refresh subscription status from Firestore
    const refresh = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            let userData: Record<string, unknown> | null = null;

            if (shouldUseRestApi()) {
                userData = await restGetDoc(`users/${user.uid}`);
            } else {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    userData = userDoc.data();
                }
            }

            if (userData) {
                const status = (userData.subscriptionStatus as SubscriptionStatus) || 'none';
                setSubscriptionStatus(status);
                setIsSubscribed(status === 'active' || status === 'trialing');

                if (userData.subscriptionCurrentPeriodEnd) {
                    const endDate = userData.subscriptionCurrentPeriodEnd instanceof Date
                        ? userData.subscriptionCurrentPeriodEnd
                        : new Date(userData.subscriptionCurrentPeriodEnd as number);
                    setCurrentPeriodEnd(endDate);
                }

                setCancelAtPeriodEnd(!!userData.subscriptionCancelAtPeriodEnd);
            }
        } catch (error) {
            console.error('[Subscription] Error refreshing:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Start Stripe checkout
    const startCheckout = useCallback(async () => {
        if (!user) {
            throw new Error('ログインが必要です');
        }

        await redirectToCheckout(user.uid, user.email || undefined);
    }, [user]);

    // Open Stripe customer portal
    const openCustomerPortal = useCallback(async () => {
        if (!user) {
            throw new Error('ログインが必要です');
        }

        await redirectToCustomerPortal(user.uid);
    }, [user]);

    // Listen for user document changes (subscription updates)
    useEffect(() => {
        if (authLoading || !user) {
            setIsLoading(false);
            return;
        }

        // Web環境ではリアルタイムリスナーを使用
        if (!shouldUseRestApi()) {
            const userDocRef = doc(db, 'users', user.uid);
            const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const status = (userData.subscriptionStatus as SubscriptionStatus) || 'none';
                    setSubscriptionStatus(status);
                    setIsSubscribed(status === 'active' || status === 'trialing');

                    if (userData.subscriptionCurrentPeriodEnd) {
                        const endDate = userData.subscriptionCurrentPeriodEnd.toDate
                            ? userData.subscriptionCurrentPeriodEnd.toDate()
                            : new Date(userData.subscriptionCurrentPeriodEnd);
                        setCurrentPeriodEnd(endDate);
                    }

                    setCancelAtPeriodEnd(!!userData.subscriptionCancelAtPeriodEnd);
                }
                setIsLoading(false);
            }, (error) => {
                console.error('[Subscription] Listener error:', error);
                setIsLoading(false);
            });

            return () => unsubscribe();
        } else {
            // REST API環境では手動リフレッシュ
            refresh();
        }
    }, [user, authLoading, refresh]);

    // Check and set trial period
    useEffect(() => {
        if (authLoading || !user) {
            setIsTrialActive(false);
            setTrialDaysLeft(0);
            setTrialEndDate(null);
            return;
        }

        // 既にサブスク中ならトライアルチェック不要
        if (isSubscribed) {
            setIsTrialActive(false);
            setTrialDaysLeft(0);
            setTrialEndDate(null);
            return;
        }

        const checkTrialStatus = async () => {
            try {
                let startDate: Date;
                let userData: Record<string, unknown> | null = null;

                if (shouldUseRestApi()) {
                    userData = await restGetDoc(`users/${user.uid}`);
                } else {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        userData = data;
                        // Firestore Timestampを変換
                        if (data.trialStartDate?.toDate) {
                            userData = { ...data, trialStartDate: data.trialStartDate.toDate().getTime() };
                        }
                    }
                }

                if (userData?.trialStartDate) {
                    // 既存のトライアル開始日を使用
                    startDate = new Date(userData.trialStartDate as number);
                } else {
                    // 新規ユーザー: トライアル開始日を設定
                    startDate = new Date();

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

                // トライアル終了日を計算
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + TRIAL_DAYS);
                setTrialEndDate(endDate);

                // 残り日数を計算
                const now = new Date();
                const diffTime = endDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
    }, [user, authLoading, isSubscribed]);

    return (
        <SubscriptionContext.Provider
            value={{
                isSubscribed,
                isLoading,
                subscriptionStatus,
                currentPeriodEnd,
                cancelAtPeriodEnd,
                isTrialActive,
                trialDaysLeft,
                trialEndDate,
                hasAccess,
                stripeConfigured,
                monthlyPrice: SUBSCRIPTION_PRICE,
                trialDays: TRIAL_DAYS,
                refresh,
                startCheckout,
                openCustomerPortal,
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
