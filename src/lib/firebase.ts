import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Capacitor } from "@capacitor/core";

// SwipeTax Firebase Config
// TODO: Firebase Console で新規プロジェクト作成後、以下を更新
// https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'swipetax.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'swipetax',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'swipetax.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestoreの初期化（ローカルキャッシュ有効化）
let db: ReturnType<typeof getFirestore>;

if (typeof window !== 'undefined') {
    try {
        if (Capacitor.isNativePlatform()) {
            // ネイティブアプリではLong Polling + ローカルキャッシュを使用
            db = initializeFirestore(app, {
                experimentalForceLongPolling: true,
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
            console.log('[Firebase] Firestore initialized with long polling + local cache for native');
        } else {
            // WebではIndexedDBでローカルキャッシュを有効化（高速化）
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
            console.log('[Firebase] Firestore initialized with local cache for web');
        }
    } catch (e) {
        // 既に初期化済みの場合
        console.log('[Firebase] Firestore already initialized, using existing instance');
        db = getFirestore(app);
    }
} else {
    // サーバーサイドレンダリング時
    db = getFirestore(app);
}

const storage = getStorage(app);

export { app, db, storage };
