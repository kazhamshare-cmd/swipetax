'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { onAuthChange, getCurrentUser, isNativePlatform, auth } from '@/lib/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => {},
});

// Cloud Function REST APIを直接呼び出す（httpsCallableがWebViewでハングするため）
async function callGetCustomToken(idToken: string): Promise<string> {
    const url = 'https://asia-northeast1-anki-a7075.cloudfunctions.net/exchangeToken';

    console.log('[callGetCustomToken] Calling Cloud Function...');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
    });

    console.log('[callGetCustomToken] Response status:', response.status);

    const result = await response.json();
    console.log('[callGetCustomToken] Response:', JSON.stringify(result).substring(0, 100));

    if (!response.ok || result.error) {
        throw new Error(result.error || result.details || `HTTP ${response.status}`);
    }

    return result.customToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // サインアウト処理
    const signOut = useCallback(async () => {
        try {
            // ネイティブプラットフォームの場合はネイティブFirebaseからもサインアウト
            if (isNativePlatform()) {
                await FirebaseAuthentication.signOut();
            }
            // Web SDKからサインアウト
            await firebaseSignOut(auth);
            setUser(null);
        } catch (error) {
            console.error('[AuthContext] Sign out error:', error);
            throw error;
        }
    }, []);

    useEffect(() => {
        let authFired = false;

        const unsubscribe = onAuthChange((firebaseUser) => {
            console.log('[AuthContext] onAuthChange fired:', firebaseUser?.email);
            authFired = true;
            setUser(firebaseUser);
            setLoading(false);
        });

        // ネイティブプラットフォームの場合、ネイティブFirebaseのユーザーもチェックしWeb SDKと同期
        const checkAndSyncNativeUser = async () => {
            if (!isNativePlatform()) return;

            try {
                const result = await FirebaseAuthentication.getCurrentUser();
                console.log('[AuthContext] Native getCurrentUser:', result.user?.email);

                if (result.user && !authFired) {
                    // IDトークンを取得してCloud Function経由でWeb SDKと同期
                    console.log('[AuthContext] Getting ID token for Web SDK sync...');
                    try {
                        const tokenResult = await FirebaseAuthentication.getIdToken({ forceRefresh: false });
                        if (tokenResult.token) {
                            console.log('[AuthContext] Got ID token, calling Cloud Function via REST...');

                            // タイムアウト付きでCloud Function呼び出し
                            const timeoutPromise = new Promise<never>((_, reject) =>
                                setTimeout(() => reject(new Error('Cloud Function timeout')), 10000)
                            );

                            try {
                                const customToken = await Promise.race([
                                    callGetCustomToken(tokenResult.token),
                                    timeoutPromise
                                ]);
                                console.log('[AuthContext] Got custom token, signing in to Web SDK...');

                                // signInWithCustomTokenにもタイムアウトを設定
                                const signInTimeout = new Promise<never>((_, reject) =>
                                    setTimeout(() => reject(new Error('signInWithCustomToken timeout')), 8000)
                                );

                                try {
                                    const userCredential = await Promise.race([
                                        signInWithCustomToken(auth, customToken),
                                        signInTimeout
                                    ]);
                                    console.log('[AuthContext] Web SDK sync success:', userCredential.user?.email);
                                    authFired = true;
                                    // onAuthChange will handle setting the user
                                    return;
                                } catch (signInError: any) {
                                    console.log('[AuthContext] signInWithCustomToken failed:', signInError?.message || signInError);
                                    // カスタムトークンは取得できたので、ネイティブユーザーで続行
                                }
                            } catch (cfError: any) {
                                console.log('[AuthContext] Cloud Function call failed:', cfError?.message || cfError);
                            }
                        }
                    } catch (syncError: any) {
                        console.log('[AuthContext] Web SDK sync failed:', syncError?.message || syncError);
                    }

                    // 同期失敗してもネイティブユーザーで続行
                    console.log('[AuthContext] Using native user without Web SDK sync');
                    setUser(result.user as any);
                    setLoading(false);
                    authFired = true;
                }
            } catch (e) {
                console.log('[AuthContext] Native getCurrentUser error:', e);
            }
        };

        // 即座にネイティブユーザーをチェック
        checkAndSyncNativeUser();

        // Timeout fallback
        const timeout = setTimeout(async () => {
            if (!authFired) {
                console.log('[AuthContext] Timeout - checking fallbacks');
                const currentUser = getCurrentUser();
                if (currentUser) {
                    console.log('[AuthContext] Found Web SDK currentUser:', currentUser.email);
                    setUser(currentUser);
                    setLoading(false);
                    return;
                }

                if (isNativePlatform()) {
                    try {
                        const result = await FirebaseAuthentication.getCurrentUser();
                        if (result.user) {
                            console.log('[AuthContext] Timeout - Using native user:', result.user.email);
                            setUser(result.user as any);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.log('[AuthContext] Timeout - Native check error:', e);
                    }
                }

                console.log('[AuthContext] No user found');
                setUser(null);
                setLoading(false);
            }
        }, 12000); // signInWithCustomToken の完了を待つため長めに設定

        return () => {
            unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
