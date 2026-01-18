import {
    Purchases,
    LOG_LEVEL,
    CustomerInfo,
    PurchasesOfferings,
    PurchasesPackage,
    PurchasesStoreProduct,
    PURCHASES_ERROR_CODE,
} from '@revenuecat/purchases-capacitor';
import {
    RevenueCatUI,
    PaywallResultEnum,
} from '@revenuecat/purchases-capacitor-ui';
import { Capacitor } from '@capacitor/core';
import { SubscriptionData, SubscriptionStatus } from './types';

// RevenueCat API Key (iOS用 - Capacitorでネイティブ実行時に使用)
const REVENUECAT_API_KEY = 'appl_RQWIWejfTVTTGzpjAUkHeaeTJYB';

// Check if RevenueCat is properly configured (not a test/placeholder key)
const IS_REVENUECAT_CONFIGURED = !REVENUECAT_API_KEY.startsWith('test_');

// Product identifiers (configured in RevenueCat dashboard)
export const PRODUCT_ID_MONTHLY = 'swipetax_monthly'; // iOS用

// Entitlement identifier (configured in RevenueCat dashboard)
export const ENTITLEMENT_ID = 'SwipeTax Pro';

// ============================================
// Initialization
// ============================================

// Track initialization state
let revenueCatInitialized = false;

/**
 * Check if RevenueCat is properly initialized
 */
export function isRevenueCatAvailable(): boolean {
    return IS_REVENUECAT_CONFIGURED && revenueCatInitialized && Capacitor.isNativePlatform();
}

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initializePurchases(userId?: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.log('[RevenueCat] Not available on web platform');
        return;
    }

    // Skip initialization if not properly configured
    if (!IS_REVENUECAT_CONFIGURED) {
        console.log('[RevenueCat] Skipping initialization - API key not configured (using test key)');
        return;
    }

    try {
        // Set debug logging in development
        if (process.env.NODE_ENV === 'development') {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        }

        // Configure RevenueCat
        await Purchases.configure({
            apiKey: REVENUECAT_API_KEY,
            appUserID: userId || null,
        });

        revenueCatInitialized = true;
        console.log('[RevenueCat] Initialized successfully');
    } catch (error) {
        console.error('[RevenueCat] Initialization failed:', error);
        // Don't throw - let app continue without RevenueCat
        revenueCatInitialized = false;
    }
}

// ============================================
// User Management
// ============================================

/**
 * Set user ID for RevenueCat (call after Firebase auth)
 */
export async function setRevenueCatUserId(userId: string): Promise<CustomerInfo | null> {
    if (!isRevenueCatAvailable()) {
        console.log('[RevenueCat] Not available, skipping user login');
        return null;
    }

    try {
        const result = await Purchases.logIn({ appUserID: userId });
        console.log('[RevenueCat] User logged in:', userId);
        return result.customerInfo;
    } catch (error) {
        console.error('[RevenueCat] User login failed:', error);
        return null;
    }
}

/**
 * Log out from RevenueCat
 */
export async function logOutRevenueCat(): Promise<CustomerInfo | null> {
    if (!isRevenueCatAvailable()) {
        return null;
    }

    try {
        const result = await Purchases.logOut();
        console.log('[RevenueCat] User logged out');
        return result.customerInfo;
    } catch (error) {
        console.error('[RevenueCat] User logout failed:', error);
        return null;
    }
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!isRevenueCatAvailable()) {
        return null;
    }

    try {
        const result = await Purchases.getCustomerInfo();
        return result.customerInfo;
    } catch (error) {
        console.error('[RevenueCat] Get customer info failed:', error);
        return null;
    }
}

// ============================================
// Offerings & Products
// ============================================

/**
 * Get available offerings
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
    if (!isRevenueCatAvailable()) {
        return null;
    }

    try {
        const offerings = await Purchases.getOfferings();
        return offerings;
    } catch (error) {
        console.error('[RevenueCat] Error getting offerings:', error);
        return null;
    }
}

/**
 * Get available packages from current offering
 */
export async function getPackages(): Promise<PurchasesPackage[]> {
    if (!isRevenueCatAvailable()) {
        return [];
    }

    try {
        const offerings = await Purchases.getOfferings();
        return offerings?.current?.availablePackages || [];
    } catch (error) {
        console.error('[RevenueCat] Error getting packages:', error);
        return [];
    }
}

/**
 * Get products by IDs
 */
export async function getProducts(productIds: string[]): Promise<PurchasesStoreProduct[]> {
    if (!isRevenueCatAvailable()) {
        return [];
    }

    try {
        const result = await Purchases.getProducts({ productIdentifiers: productIds });
        return result.products;
    } catch (error) {
        console.error('[RevenueCat] Error getting products:', error);
        return [];
    }
}

// ============================================
// Subscription Status
// ============================================

/**
 * Check if user has active subscription
 */
export async function checkSubscriptionStatus(): Promise<{
    isActive: boolean;
    expirationDate: Date | null;
    willRenew: boolean;
    productId: string | null;
}> {
    if (!isRevenueCatAvailable()) {
        return { isActive: false, expirationDate: null, willRenew: false, productId: null };
    }

    try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

        if (entitlement) {
            return {
                isActive: true,
                expirationDate: entitlement.expirationDate
                    ? new Date(entitlement.expirationDate)
                    : null,
                willRenew: entitlement.willRenew,
                productId: entitlement.productIdentifier,
            };
        }

        return { isActive: false, expirationDate: null, willRenew: false, productId: null };
    } catch (error) {
        console.error('[RevenueCat] Error checking subscription:', error);
        return { isActive: false, expirationDate: null, willRenew: false, productId: null };
    }
}

/**
 * Check if specific entitlement is active
 */
export async function hasEntitlement(entitlementId: string = ENTITLEMENT_ID): Promise<boolean> {
    if (!isRevenueCatAvailable()) {
        return false;
    }

    try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        return !!customerInfo.entitlements.active[entitlementId];
    } catch (error) {
        console.error('[RevenueCat] Error checking entitlement:', error);
        return false;
    }
}

// ============================================
// Purchases
// ============================================

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
    errorCode?: PURCHASES_ERROR_CODE;
}> {
    if (!isRevenueCatAvailable()) {
        return { success: false, error: 'Purchases not available' };
    }

    try {
        const result = await Purchases.purchasePackage({ aPackage: pkg });
        console.log('[RevenueCat] Purchase successful');
        return { success: true, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const purchaseError = error as { code?: PURCHASES_ERROR_CODE; message?: string };

        // Handle user cancellation
        if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
            console.log('[RevenueCat] Purchase cancelled by user');
            return { success: false, error: 'cancelled', errorCode: purchaseError.code };
        }

        console.error('[RevenueCat] Purchase error:', error);
        return {
            success: false,
            error: purchaseError.message || 'Purchase failed',
            errorCode: purchaseError.code,
        };
    }
}

/**
 * Purchase a product by ID
 */
export async function purchaseProduct(productId: string): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
}> {
    if (!isRevenueCatAvailable()) {
        return { success: false, error: 'Purchases not available' };
    }

    try {
        const result = await Purchases.purchaseStoreProduct({
            product: { identifier: productId } as PurchasesStoreProduct,
        });
        return { success: true, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const purchaseError = error as { code?: PURCHASES_ERROR_CODE; message?: string };

        if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
            return { success: false, error: 'cancelled' };
        }

        return { success: false, error: purchaseError.message || 'Purchase failed' };
    }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<{
    success: boolean;
    isActive: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
}> {
    if (!isRevenueCatAvailable()) {
        return { success: false, isActive: false, error: 'Not available' };
    }

    try {
        const result = await Purchases.restorePurchases();
        const isActive = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID];

        console.log('[RevenueCat] Restore successful, active:', isActive);
        return { success: true, isActive, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const restoreError = error as { message?: string };
        console.error('[RevenueCat] Restore error:', error);
        return { success: false, isActive: false, error: restoreError.message || 'Restore failed' };
    }
}

// ============================================
// RevenueCat UI - Paywall
// ============================================

/**
 * Present the RevenueCat Paywall
 * This shows the paywall configured in RevenueCat dashboard
 */
export async function presentPaywall(): Promise<{
    presented: boolean;
    purchased: boolean;
    error?: string;
}> {
    if (!isRevenueCatAvailable()) {
        return { presented: false, purchased: false, error: 'Not available' };
    }

    try {
        const result = await RevenueCatUI.presentPaywall();

        const purchased = result.result === PaywallResultEnum.PURCHASED ||
                         result.result === PaywallResultEnum.RESTORED;

        console.log('[RevenueCat] Paywall result:', result.result);

        return {
            presented: true,
            purchased,
        };
    } catch (error: unknown) {
        const paywallError = error as { message?: string };
        console.error('[RevenueCat] Paywall error:', error);
        return { presented: false, purchased: false, error: paywallError.message };
    }
}

/**
 * Present paywall if user doesn't have entitlement
 * Returns true if user has access (either already had or just purchased)
 */
export async function presentPaywallIfNeeded(): Promise<{
    hasAccess: boolean;
    wasPurchased: boolean;
    error?: string;
}> {
    if (!isRevenueCatAvailable()) {
        return { hasAccess: false, wasPurchased: false, error: 'Not available' };
    }

    try {
        const result = await RevenueCatUI.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: ENTITLEMENT_ID,
        });

        const wasPurchased = result.result === PaywallResultEnum.PURCHASED ||
                            result.result === PaywallResultEnum.RESTORED;

        // If not presented, user already has access
        const hasAccess = result.result === PaywallResultEnum.NOT_PRESENTED || wasPurchased;

        console.log('[RevenueCat] Paywall if needed result:', result.result);

        return { hasAccess, wasPurchased };
    } catch (error: unknown) {
        const paywallError = error as { message?: string };
        console.error('[RevenueCat] Paywall if needed error:', error);
        return { hasAccess: false, wasPurchased: false, error: paywallError.message };
    }
}

// ============================================
// RevenueCat UI - Customer Center
// ============================================

/**
 * Present the Customer Center
 * Allows users to manage their subscription
 */
export async function presentCustomerCenter(): Promise<{
    presented: boolean;
    error?: string;
}> {
    if (!isRevenueCatAvailable()) {
        return { presented: false, error: 'Not available' };
    }

    try {
        await RevenueCatUI.presentCustomerCenter();
        console.log('[RevenueCat] Customer Center presented');
        return { presented: true };
    } catch (error: unknown) {
        const centerError = error as { message?: string };
        console.error('[RevenueCat] Customer Center error:', error);
        return { presented: false, error: centerError.message };
    }
}

// ============================================
// Listeners
// ============================================

/**
 * Listen for customer info updates
 */
export function addCustomerInfoListener(
    callback: (customerInfo: CustomerInfo) => void
): () => void {
    if (!isRevenueCatAvailable()) {
        return () => {};
    }

    Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('[RevenueCat] Customer info updated');
        callback(info);
    });

    return () => {
        // RevenueCat Capacitor plugin handles cleanup internally
    };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert CustomerInfo to SubscriptionData
 */
export function customerInfoToSubscriptionData(
    customerInfo: CustomerInfo,
    userId: string
): SubscriptionData | null {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (!entitlement) {
        return null;
    }

    const getStatus = (): SubscriptionStatus => {
        if (!entitlement.isActive) return 'expired';
        if (entitlement.willRenew) return 'active';
        return 'cancelled';
    };

    return {
        userId,
        productId: entitlement.productIdentifier,
        status: getStatus(),
        purchaseDate: new Date(entitlement.originalPurchaseDate).getTime(),
        expirationDate: entitlement.expirationDate
            ? new Date(entitlement.expirationDate).getTime()
            : Date.now() + 365 * 24 * 60 * 60 * 1000,
        isActive: entitlement.isActive,
        platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
        originalTransactionId: entitlement.productIdentifier,
    };
}

/**
 * Format package price for display
 */
export function formatPackagePrice(pkg: PurchasesPackage): string {
    return pkg.product.priceString;
}

/**
 * Get package period description (Japanese)
 */
export function getPackagePeriod(pkg: PurchasesPackage): string {
    switch (pkg.packageType) {
        case 'MONTHLY':
            return '月額';
        case 'ANNUAL':
            return '年額';
        case 'WEEKLY':
            return '週額';
        case 'LIFETIME':
            return '買い切り';
        case 'SIX_MONTH':
            return '6ヶ月';
        case 'THREE_MONTH':
            return '3ヶ月';
        case 'TWO_MONTH':
            return '2ヶ月';
        default:
            return '';
    }
}

/**
 * Get package period description (English)
 */
export function getPackagePeriodEn(pkg: PurchasesPackage): string {
    switch (pkg.packageType) {
        case 'MONTHLY':
            return 'Monthly';
        case 'ANNUAL':
            return 'Yearly';
        case 'WEEKLY':
            return 'Weekly';
        case 'LIFETIME':
            return 'Lifetime';
        case 'SIX_MONTH':
            return '6 Months';
        case 'THREE_MONTH':
            return '3 Months';
        case 'TWO_MONTH':
            return '2 Months';
        default:
            return '';
    }
}

/**
 * Check if running on native platform
 */
export function isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
}
