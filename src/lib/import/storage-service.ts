// Firebase Storage サービス
import { ref, uploadBytes, getDownloadURL, UploadResult } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { DocumentType } from './document-types';

/**
 * 画像をFirebase Storageにアップロード
 */
export async function uploadImage(
    blob: Blob,
    documentType: DocumentType,
    userId: string
): Promise<{ url: string; path: string }> {
    if (!storage) {
        throw new Error('Firebase Storage が初期化されていません');
    }

    // ファイルパスを生成
    const timestamp = Date.now();
    const fileName = `${timestamp}.jpg`;
    const path = `users/${userId}/${documentType}/${fileName}`;

    // Storage参照を作成
    const storageRef = ref(storage, path);

    // アップロード
    const result: UploadResult = await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
        customMetadata: {
            documentType,
            uploadedAt: new Date().toISOString(),
        },
    });

    // ダウンロードURLを取得
    const url = await getDownloadURL(result.ref);

    return { url, path };
}

/**
 * Data URL からBlobを作成
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * 画像を圧縮（必要に応じて）
 */
export async function compressImage(
    blob: Blob,
    maxWidth: number = 1920,
    quality: number = 0.8
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // アスペクト比を保持してリサイズ
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(blob);
    });
}
