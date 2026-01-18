'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check, Loader2 } from 'lucide-react';
import { useCamera, CameraResult } from '@/hooks/useCamera';

interface CameraCaptureProps {
    onCapture: (result: CameraResult) => void;
    onCancel: () => void;
    title?: string;
    instructions?: string;
}

export function CameraCapture({
    onCapture,
    onCancel,
    title = '撮影',
    instructions = '書類がフレーム内に収まるように撮影してください',
}: CameraCaptureProps) {
    const {
        isCapturing,
        error,
        capturePhoto,
        isNative,
        clearError,
    } = useCamera();

    const [capturedImage, setCapturedImage] = useState<CameraResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 撮影
    const handleTakePhoto = useCallback(async () => {
        const result = await capturePhoto('camera');
        if (result) {
            setCapturedImage(result);
        }
    }, [capturePhoto]);

    // ギャラリーから選択
    const handlePickFromGallery = useCallback(async () => {
        const result = await capturePhoto('gallery');
        if (result) {
            setCapturedImage(result);
        }
    }, [capturePhoto]);

    // 撮り直し
    const handleRetake = useCallback(() => {
        setCapturedImage(null);
        clearError();
    }, [clearError]);

    // 撮影/選択完了時の処理
    const handleConfirm = useCallback(() => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    }, [capturedImage, onCapture]);

    // Webでのファイル選択
    const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const result: CameraResult = {
                dataUrl,
                blob: file,
                format: file.type.split('/')[1] || 'jpeg',
            };

            setCapturedImage(result);
        } catch (err) {
            console.error('ファイル読み込みエラー:', err);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    // プレビュー表示時
    if (capturedImage) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                {/* プレビュー画像 */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <img
                        src={capturedImage.dataUrl}
                        alt="Captured"
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                </div>

                {/* アクションボタン */}
                <div className="p-4 pb-8 flex items-center justify-center gap-6">
                    <button
                        onClick={handleRetake}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
                            <RotateCcw className="w-6 h-6" />
                        </div>
                        <span className="text-xs">撮り直し</span>
                    </button>

                    <button
                        onClick={handleConfirm}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8" />
                        </div>
                        <span className="text-xs">この画像を使用</span>
                    </button>

                    <button
                        onClick={onCancel}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
                            <X className="w-6 h-6" />
                        </div>
                        <span className="text-xs">キャンセル</span>
                    </button>
                </div>
            </div>
        );
    }

    // 撮影/選択画面
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* ヘッダー */}
            <div className="p-4 flex items-center justify-between text-white">
                <button onClick={onCancel} className="p-2">
                    <X className="w-6 h-6" />
                </button>
                <h2 className="font-medium">{title}</h2>
                <div className="w-10" />
            </div>

            {/* 説明 */}
            <div className="px-6 py-4 text-center text-white">
                <p className="text-sm opacity-80">{instructions}</p>
            </div>

            {/* カメラプレビュー/プレースホルダー */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-sm aspect-[3/4] border-2 border-dashed border-white/50 rounded-xl flex items-center justify-center">
                    {isCapturing || isProcessing ? (
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                    ) : (
                        <div className="text-center text-white/60">
                            <Camera className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-sm">下のボタンで撮影または選択</p>
                        </div>
                    )}
                </div>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="px-4 py-2 bg-red-500/80 text-white text-center text-sm">
                    {error}
                </div>
            )}

            {/* アクションボタン */}
            <div className="p-4 pb-8 flex items-center justify-center gap-8">
                {/* ギャラリーから選択 */}
                <button
                    onClick={isNative ? handlePickFromGallery : () => fileInputRef.current?.click()}
                    disabled={isCapturing || isProcessing}
                    className="flex flex-col items-center gap-1 text-white"
                >
                    <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs">選択</span>
                </button>

                {/* 撮影ボタン（ネイティブのみ） */}
                {isNative && (
                    <button
                        onClick={handleTakePhoto}
                        disabled={isCapturing}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                            <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full" />
                        </div>
                        <span className="text-xs">撮影</span>
                    </button>
                )}

                {/* Web用ファイル選択 */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>
        </div>
    );
}
