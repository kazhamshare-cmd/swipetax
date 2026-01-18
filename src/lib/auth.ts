'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInWithCredential,
    sendPasswordResetEmail,
    updateProfile,
    User,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    setPersistence
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// Firebase config - uses env vars with fallback to hardcoded values for builds
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAmm2njfhcnWN-_lr3C25FrQqqnrPwgrF8',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'anki-a7075.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'anki-a7075',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'anki-a7075.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence based on platform (IndexedDB has issues in Capacitor WebView)
if (typeof window !== 'undefined') {
    const isNative = Capacitor.isNativePlatform();
    // Use localStorage persistence for native apps to avoid IndexedDB issues
    setPersistence(auth, isNative ? browserLocalPersistence : indexedDBLocalPersistence)
        .catch((error) => {
            console.warn('Failed to set auth persistence:', error);
        });
}

// メールアドレスでログイン
export async function signInWithEmail(email: string, password: string) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { user: result.user, error: null };
    } catch (error: any) {
        return { user: null, error: getErrorMessage(error.code) };
    }
}

// メールアドレスで新規登録
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // 表示名を設定
        if (displayName && result.user) {
            await updateProfile(result.user, { displayName });
        }

        return { user: result.user, error: null };
    } catch (error: any) {
        return { user: null, error: getErrorMessage(error.code) };
    }
}

// ネイティブプラットフォームかどうかをチェック
export function isNativePlatform(): boolean {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

// Googleでログイン
export async function signInWithGoogle() {
    try {
        // Capacitor（ネイティブアプリ）環境ではCapacitor Firebase Authを使用
        if (isNativePlatform()) {
            try {
                // ネイティブのGoogle Sign-Inを使用
                console.log('[Auth] Starting native Google sign-in...');
                const result = await FirebaseAuthentication.signInWithGoogle();
                console.log('[Auth] Native result:', JSON.stringify(result, null, 2));

                // skipNativeAuth: false の場合、result.user が直接返される（Firebase認証済み）
                if (result.user) {
                    console.log('[Auth] Got result.user from native');

                    // Web SDKも同期するため、credential でサインイン
                    const idToken = result.credential?.idToken;
                    const accessToken = result.credential?.accessToken;

                    if (idToken || accessToken) {
                        console.log('[Auth] Syncing with Web SDK using tokens...');
                        console.log('[Auth] idToken:', idToken ? 'present' : 'missing');
                        console.log('[Auth] accessToken:', accessToken ? 'present' : 'missing');

                        try {
                            // idTokenとaccessTokenの両方を渡す
                            const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);

                            // タイムアウトなしで試行（Long Pollingが有効になったので）
                            console.log('[Auth] Calling signInWithCredential...');
                            const userCredential = await signInWithCredential(auth, credential);
                            console.log('[Auth] Web SDK sync success:', userCredential.user?.email);
                            return { user: userCredential.user, error: null };
                        } catch (syncError: any) {
                            console.error('[Auth] Web SDK sync failed:', syncError?.code, syncError?.message);
                            // 同期失敗してもネイティブユーザーで続行
                        }
                    } else {
                        console.log('[Auth] No tokens in credential');
                    }

                    // Web SDK同期できなかった場合でも、ネイティブユーザー情報を使って続行
                    console.log('[Auth] Returning native user directly');
                    return { user: result.user as any, error: null };
                }

                // skipNativeAuth: true の場合、credential のみ返される
                if (result.credential) {
                    console.log('[Auth] No result.user, trying credential only...');
                    const idToken = result.credential.idToken;
                    const accessToken = result.credential.accessToken;

                    if (idToken || accessToken) {
                        const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
                        const userCredential = await signInWithCredential(auth, credential);
                        console.log('[Auth] signInWithCredential success:', userCredential.user?.email);
                        return { user: userCredential.user, error: null };
                    }
                }

                console.log('[Auth] No user or credential in result');
                return { user: null, error: 'Googleログインに失敗しました' };
            } catch (nativeError: any) {
                console.error('[Auth] Native Google sign-in error:', nativeError);
                return { user: null, error: 'Googleログインに失敗しました。メールアドレスでログインしてください。' };
            }
        }

        // Web環境ではポップアップ方式を使用
        const result = await signInWithPopup(auth, googleProvider);
        return { user: result.user, error: null };
    } catch (error: any) {
        console.error('[Auth] Google sign-in error:', error);
        return { user: null, error: getErrorMessage(error.code) };
    }
}

// Appleでログイン
export async function signInWithApple() {
    try {
        // Capacitor（ネイティブアプリ）環境ではCapacitor Firebase Authを使用
        if (isNativePlatform()) {
            try {
                console.log('[Auth] Starting native Apple sign-in...');
                const result = await FirebaseAuthentication.signInWithApple();
                console.log('[Auth] Native Apple result:', JSON.stringify(result, null, 2));

                if (result.user) {
                    console.log('[Auth] Got result.user from native Apple');

                    // Web SDKも同期するため、credential でサインイン
                    const idToken = result.credential?.idToken;
                    const nonce = result.credential?.nonce;

                    if (idToken) {
                        console.log('[Auth] Syncing with Web SDK using Apple tokens...');
                        try {
                            const provider = new OAuthProvider('apple.com');
                            const credential = provider.credential({
                                idToken,
                                rawNonce: nonce || undefined
                            });
                            const userCredential = await signInWithCredential(auth, credential);
                            console.log('[Auth] Web SDK sync success:', userCredential.user?.email);
                            return { user: userCredential.user, error: null };
                        } catch (syncError: any) {
                            console.error('[Auth] Web SDK sync failed:', syncError?.code, syncError?.message);
                        }
                    }

                    console.log('[Auth] Returning native Apple user directly');
                    return { user: result.user as any, error: null };
                }

                console.log('[Auth] No user in Apple result');
                return { user: null, error: 'Appleログインに失敗しました' };
            } catch (nativeError: any) {
                console.error('[Auth] Native Apple sign-in error:', nativeError);
                if (nativeError?.message?.includes('canceled') || nativeError?.code === 'ERR_CANCELED') {
                    return { user: null, error: null }; // ユーザーがキャンセルした場合
                }
                return { user: null, error: 'Appleログインに失敗しました。他の方法でログインしてください。' };
            }
        }

        // Web環境ではポップアップ方式を使用
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        const result = await signInWithPopup(auth, appleProvider);
        return { user: result.user, error: null };
    } catch (error: any) {
        console.error('[Auth] Apple sign-in error:', error);
        if (error?.code === 'auth/popup-closed-by-user') {
            return { user: null, error: null }; // ユーザーがキャンセルした場合
        }
        return { user: null, error: getErrorMessage(error.code) };
    }
}

// ログアウト
export async function signOut() {
    try {
        // まずFirebase JS SDKのセッションをクリア
        await firebaseSignOut(auth);

        // ネイティブ環境の場合、ネイティブのセッションもクリア
        if (isNativePlatform()) {
            await FirebaseAuthentication.signOut();
        }

        return { error: null };
    } catch (error: any) {
        console.error('Sign out failed:', error);
        return { error: 'ログアウトに失敗しました' };
    }
}

// パスワードリセットメールを送信
export async function resetPassword(email: string) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error.code) };
    }
}

// 認証状態の監視
export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}

// 現在のユーザーを取得
export function getCurrentUser() {
    return auth.currentUser;
}

// エラーメッセージを日本語に変換
function getErrorMessage(code: string): string {
    switch (code) {
        case 'auth/invalid-email':
            return 'メールアドレスの形式が正しくありません';
        case 'auth/user-disabled':
            return 'このアカウントは無効になっています';
        case 'auth/user-not-found':
            return 'アカウントが見つかりません';
        case 'auth/wrong-password':
            return 'パスワードが間違っています';
        case 'auth/invalid-credential':
            return 'メールアドレスまたはパスワードが間違っています';
        case 'auth/email-already-in-use':
            return 'このメールアドレスは既に使用されています';
        case 'auth/weak-password':
            return 'パスワードは6文字以上で入力してください';
        case 'auth/too-many-requests':
            return 'ログイン試行回数が多すぎます。しばらく待ってから再度お試しください';
        case 'auth/popup-closed-by-user':
            return 'ログインがキャンセルされました';
        case 'auth/network-request-failed':
            return 'ネットワークエラーが発生しました。接続を確認してください';
        default:
            return 'エラーが発生しました。もう一度お試しください';
    }
}

export { auth };
