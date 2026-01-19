'use client';

import SplashScreen from './SplashScreen';

interface AppWrapperProps {
    children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
    return <SplashScreen>{children}</SplashScreen>;
}
