import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Check if building for Capacitor (static export)
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
    // Static export only for Capacitor app
    // Vercel uses server-side rendering for dynamic routes
    ...(isCapacitorBuild && { output: 'export' }),

    // Use trailing slash for proper Capacitor routing
    // This generates /study/_placeholder/index.html instead of /study/_placeholder.html
    trailingSlash: isCapacitorBuild,

    // Image optimization
    images: {
        unoptimized: isCapacitorBuild,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
        ],
    },

    // Disable strict mode for better Capacitor compatibility
    reactStrictMode: false,

    // Webpack configuration for sql.js
    webpack: (config, { isServer }) => {
        // sql.js uses fs and path which are not available in browser
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
            };
        }
        return config;
    },

    // Turbopack configuration (Next.js 15+)
    turbopack: {
        resolveAlias: {
            fs: { browser: './src/lib/empty-module.js' },
            path: { browser: './src/lib/empty-module.js' },
            crypto: { browser: './src/lib/empty-module.js' },
        },
    },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
