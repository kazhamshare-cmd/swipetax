'use client';

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

export interface CameraResult {
    dataUrl: string;
    blob: Blob;
    format: string;
}

interface UseCameraReturn {
    capturePhoto: (source: 'camera' | 'gallery') => Promise<CameraResult | null>;
    isCapturing: boolean;
    error: string | null;
    isNative: boolean;
    clearError: () => void;
}

/**
 * カメラ/ギャラリーから画像を取得するフック
 *
 * - ネイティブアプリ: Capacitor Camera API を使用
 * - Web: file input を使用
 */
export function useCamera(): UseCameraReturn {
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isNative = Capacitor.isNativePlatform();

    const capturePhoto = useCallback(
        async (source: 'camera' | 'gallery'): Promise<CameraResult | null> => {
            setIsCapturing(true);
            setError(null);

            try {
                if (isNative) {
                    // Capacitor Camera を使用
                    const photo = await captureWithCapacitor(source);
                    return photo;
                } else {
                    // Web fallback
                    const photo = await captureWithWebInput(source);
                    return photo;
                }
            } catch (e: unknown) {
                const err = e as Error;

                // ユーザーキャンセルはエラーとして扱わない
                if (
                    err.message === 'User cancelled photos app' ||
                    err.message === 'User denied access to camera' ||
                    err.message?.includes('cancelled')
                ) {
                    return null;
                }

                setError(err.message || '画像の取得に失敗しました');
                return null;
            } finally {
                setIsCapturing(false);
            }
        },
        [isNative]
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        capturePhoto,
        isCapturing,
        error,
        isNative,
        clearError,
    };
}

/**
 * Capacitor Camera API で画像を取得
 */
async function captureWithCapacitor(
    source: 'camera' | 'gallery'
): Promise<CameraResult | null> {
    const photo: Photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        width: 2048,
        height: 2048,
        correctOrientation: true,
    });

    if (!photo.dataUrl) {
        throw new Error('画像の取得に失敗しました');
    }

    const blob = await dataUrlToBlob(photo.dataUrl);

    return {
        dataUrl: photo.dataUrl,
        blob,
        format: photo.format || 'jpeg',
    };
}

/**
 * Web の file input で画像を取得
 */
function captureWithWebInput(source: 'camera' | 'gallery'): Promise<CameraResult | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        // カメラを直接開く場合（モバイルブラウザ）
        if (source === 'camera') {
            input.capture = 'environment';
        }

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }

            try {
                // 画像を圧縮・リサイズ
                const resized = await resizeImage(file, 2048, 0.9);
                const dataUrl = await blobToDataUrl(resized);

                resolve({
                    dataUrl,
                    blob: resized,
                    format: file.type.split('/')[1] || 'jpeg',
                });
            } catch (e) {
                reject(e);
            }
        };

        input.oncancel = () => {
            resolve(null);
        };

        // iOS Safari 対策: body に追加してからクリック
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

/**
 * Data URL を Blob に変換
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

/**
 * Blob を Data URL に変換
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 画像をリサイズ
 */
function resizeImage(file: File, maxSize: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // 最大サイズを超える場合はリサイズ
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context の取得に失敗しました'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('画像の変換に失敗しました'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        img.src = URL.createObjectURL(file);
    });
}

export default useCamera;
