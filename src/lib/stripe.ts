// 料金プラン
export const SUBSCRIPTION_PRICE = 580; // 円/月
export const TRIAL_DAYS = 14;

// Stripe公開キー（クライアント側で使用）
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

/**
 * チェックアウトセッションを作成してリダイレクト
 */
export async function redirectToCheckout(userId: string, email?: string): Promise<void> {
    // APIでチェックアウトセッションを作成
    const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
    }

    const { url } = await response.json();

    // チェックアウトページにリダイレクト
    if (url) {
        window.location.href = url;
    } else {
        throw new Error('Checkout URL not returned');
    }
}

/**
 * カスタマーポータルにリダイレクト（サブスク管理用）
 */
export async function redirectToCustomerPortal(userId: string): Promise<void> {
    const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
}

/**
 * Stripeが設定されているかチェック
 */
export function isStripeConfigured(): boolean {
    return !!STRIPE_PUBLISHABLE_KEY;
}
