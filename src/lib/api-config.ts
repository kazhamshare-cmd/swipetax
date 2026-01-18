// API設定 - Web版とアプリ版で異なるAPIベースURLを使用
// アプリ版はFirebase Functionsを呼び出す

// Firebase Functions URL
// 形式: https://us-central1-PROJECT_ID.cloudfunctions.net
const FIREBASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL ||
    'https://us-central1-anki-a7075.cloudfunctions.net';

/**
 * Capacitorアプリかどうかを判定
 */
function isCapacitorApp(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    // Capacitorアプリの場合はcapacitor://またはfile://プロトコルを使用
    return (
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'file:' ||
        // iOS WebViewの判定（localhostではない）
        (window.location.hostname === '' || window.location.hostname === 'localhost' && window.location.port === '')
    );
}

/**
 * APIベースURLを取得
 * - Web版（サーバーサイド）: 相対パス（''）
 * - アプリ版（Capacitor）: Firebase Functions URL
 */
export function getApiBaseUrl(): string {
    // ブラウザ環境でない場合は空文字（サーバーサイド）
    if (typeof window === 'undefined') {
        return '';
    }

    if (isCapacitorApp()) {
        return FIREBASE_FUNCTIONS_URL;
    }

    // Web版は相対パス
    return '';
}

/**
 * APIエンドポイントのURLを生成
 */
export function getApiUrl(endpoint: string): string {
    const baseUrl = getApiBaseUrl();
    // 先頭のスラッシュを確保
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (isCapacitorApp()) {
        // Firebase Functionsの場合は /api エンドポイントを使用
        // /api/import/ocr -> https://...cloudfunctions.net/api/import/ocr
        return `${baseUrl}/api${normalizedEndpoint.replace('/api', '')}`;
    }

    return `${baseUrl}${normalizedEndpoint}`;
}
