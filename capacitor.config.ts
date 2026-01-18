import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.b19soft.swipetax',
    appName: 'SwipeTax',
    webDir: 'out',

    // Server configuration for development
    server: {
        // Use this for local development with live reload
        // url: 'http://192.168.68.108:3000',
        // cleartext: true,
    },

    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#3B82F6',
            showSpinner: false,
            androidScaleType: 'CENTER_CROP',
            splashFullScreen: true,
            splashImmersive: true,
        },
        Keyboard: {
            resize: 'body',
            resizeOnFullScreen: true,
        },
        StatusBar: {
            style: 'light',
            backgroundColor: '#3B82F6',
        },
        FirebaseAuthentication: {
            skipNativeAuth: false,
            providers: ['google.com', 'apple.com'],
        },
    },

    ios: {
        contentInset: 'automatic',
        preferredContentMode: 'mobile',
        scheme: 'SwipeTax',
    },

    android: {
        allowMixedContent: true,
    },
};

export default config;
