'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
    children: React.ReactNode;
}

export default function SplashScreen({ children }: SplashScreenProps) {
    const [showSplash, setShowSplash] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Check if splash was already shown in this session
        const splashShown = sessionStorage.getItem('splashShown');

        if (splashShown) {
            setShowSplash(false);
            return;
        }

        // Start fade out after 800ms
        const fadeTimer = setTimeout(() => {
            setFadeOut(true);
        }, 800);

        // Hide splash after fade animation (800ms + 300ms fade)
        const hideTimer = setTimeout(() => {
            setShowSplash(false);
            sessionStorage.setItem('splashShown', 'true');
        }, 1100);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, []);

    if (!showSplash) {
        return <>{children}</>;
    }

    return (
        <>
            {/* Splash Screen */}
            <div
                className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${
                    fadeOut ? 'opacity-0' : 'opacity-100'
                }`}
            >
                <div className="flex flex-col items-center">
                    <Image
                        src="/b19-logo.png"
                        alt="株式会社ビーク"
                        width={240}
                        height={80}
                        priority
                        className="object-contain"
                    />
                </div>
            </div>
            {/* Preload children in background */}
            <div className="opacity-0 pointer-events-none">
                {children}
            </div>
        </>
    );
}
