import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Response } from 'express';
import OpenAI from 'openai';
import Stripe from 'stripe';

// Firebase Admin初期化
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const auth = admin.auth();

// OpenAI client - 遅延初期化
let openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({ apiKey });
    }
    return openai;
}

// Stripe client - 遅延初期化
let stripe: Stripe | null = null;
function getStripeClient(): Stripe {
    if (!stripe) {
        const secretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        stripe = new Stripe(secretKey, { apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion });
    }
    return stripe;
}

// 定数
const TRIAL_DAYS = 14;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || functions.config().app?.url || 'https://swipetax.web.app';

// ========================================
// ドキュメントタイプとインターフェース
// ========================================

type DocumentType = 'receipt' | 'bank_statement' | 'tax_return';

interface ReceiptOCRResult {
    success: boolean;
    merchant: string | null;
    date: string | null;
    totalAmount: number | null;
    items: Array<{ name: string; price: number }>;
    suggestedCategory: string | null;
    confidence: number;
    rawText?: string;
    error?: string;
}

interface LineTokenResponse {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token: string;
}

interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

interface LineIdTokenPayload {
    iss: string;
    sub: string;
    aud: string;
    exp: number;
    iat: number;
    name?: string;
    picture?: string;
    email?: string;
}

// ========================================
// OCRプロンプト
// ========================================

const OCR_PROMPTS: Record<DocumentType, string> = {
    receipt: `あなたは日本のレシート・領収書を解析するOCRアシスタントです。
画像からレシートの情報を抽出し、以下のJSON形式で回答してください。

{
  "merchant": "店舗名",
  "date": "YYYY-MM-DD形式の日付",
  "totalAmount": 合計金額（数値）,
  "items": [{"name": "商品名", "price": 金額}],
  "suggestedCategory": "経費カテゴリ（travel/communication/entertainment/supplies/books/advertising/outsourcing/rent/utilities/fees/insurance/depreciation/miscellaneous）",
  "confidence": 信頼度（0-100）
}

注意：
- 金額は税込み合計を使用
- 日付が不明な場合はnull
- カテゴリは店舗名や商品から推測
- JSONのみ出力（説明不要）`,

    bank_statement: `あなたは日本の銀行通帳・明細を解析するOCRアシスタントです。
画像から銀行明細の情報を抽出し、以下のJSON形式で回答してください。

{
  "bankName": "銀行名",
  "accountNumber": "口座番号（あれば）",
  "transactions": [
    {
      "date": "YYYY-MM-DD形式の日付",
      "description": "摘要・取引内容",
      "amount": 金額（数値、出金はプラス、入金はマイナス）,
      "balance": 残高（あれば）,
      "isDeposit": true/false（入金かどうか）
    }
  ],
  "confidence": 信頼度（0-100）
}

注意：
- 日付は西暦に変換
- 出金（支払い）は正の数、入金は負の数
- JSONのみ出力（説明不要）`,

    tax_return: `あなたは日本の確定申告書を解析するOCRアシスタントです。
画像から確定申告書の情報を抽出し、以下のJSON形式で回答してください。

{
  "fiscalYear": 申告年度（数値）,
  "filingType": "申告種類（white/blue_simple/blue_regular）",
  "businessIncome": 事業所得（数値）,
  "salaryIncome": 給与所得（数値）,
  "deductions": {
    "medical": 医療費控除,
    "social_insurance": 社会保険料控除,
    "life_insurance": 生命保険料控除,
    "earthquake_insurance": 地震保険料控除,
    "donation": 寄附金控除,
    "spouse": 配偶者控除,
    "dependent": 扶養控除,
    "basic": 基礎控除,
    "mortgage": 住宅ローン控除
  },
  "taxableIncome": 課税所得（数値）,
  "totalTax": 所得税額（数値）,
  "confidence": 信頼度（0-100）
}

注意：
- 金額は全て数値
- 不明な項目はnull
- JSONのみ出力（説明不要）`,
};

// ========================================
// メインAPIハンドラー
// ========================================

export const api = functions.https.onRequest(async (req, res) => {
    // CORS設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const path = req.path;
    console.log(`[API] ${req.method} ${path}`);

    try {
        // ルーティング
        if (path === '/api/import/ocr' || path === '/import/ocr') {
            await handleOCR(req, res);
        } else if (path === '/api/auth/line/callback' || path === '/auth/line/callback') {
            await handleLineCallback(req, res);
        } else if (path === '/api/stripe/create-checkout-session' || path === '/stripe/create-checkout-session') {
            await handleStripeCheckout(req, res);
        } else if (path === '/api/stripe/webhook' || path === '/stripe/webhook') {
            await handleStripeWebhook(req, res);
        } else if (path === '/api/stripe/portal' || path === '/stripe/portal') {
            await handleStripePortal(req, res);
        } else {
            res.status(404).json({ error: 'Not found', path });
        }
    } catch (error) {
        console.error('[API] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// OCR処理
// ========================================

async function handleOCR(req: functions.https.Request, res: Response): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        let imageBase64: string | undefined;
        let documentType: DocumentType = 'receipt';

        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('application/json')) {
            const body = req.body;
            imageBase64 = body.imageBase64;
            documentType = body.documentType || 'receipt';
        } else {
            res.status(400).json({ error: 'Please use JSON format with imageBase64' });
            return;
        }

        if (!imageBase64) {
            res.status(400).json({ error: 'Image data is required' });
            return;
        }

        const prompt = OCR_PROMPTS[documentType];
        const response = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                                detail: 'high',
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
            res.status(500).json({ success: false, error: 'OCR結果を取得できませんでした' });
            return;
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            res.status(500).json({ success: false, error: 'JSON形式の結果を取得できませんでした', rawText: content });
            return;
        }

        const result = JSON.parse(jsonMatch[0]);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'OCR処理に失敗しました' });
    }
}

// ========================================
// LINE認証コールバック
// ========================================

async function handleLineCallback(req: functions.https.Request, res: Response): Promise<void> {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;
    const errorDescription = req.query.error_description as string;

    if (error) {
        console.error('[LINE Auth] OAuth error:', error, errorDescription);
        res.redirect(`${APP_URL}/auth/login?error=line_auth_failed`);
        return;
    }

    if (!code) {
        console.error('[LINE Auth] No authorization code');
        res.redirect(`${APP_URL}/auth/login?error=no_code`);
        return;
    }

    const lineChannelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || functions.config().line?.channel_id;
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET || functions.config().line?.channel_secret;

    if (!lineChannelId || !lineChannelSecret) {
        console.error('[LINE Auth] LINE credentials not configured');
        res.redirect(`${APP_URL}/auth/login?error=config_error`);
        return;
    }

    try {
        // 1. 認証コードをアクセストークンに交換
        const redirectUri = `${APP_URL}/api/auth/line/callback`;
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: lineChannelId,
                client_secret: lineChannelSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('[LINE Auth] Token exchange failed:', errorData);
            res.redirect(`${APP_URL}/auth/login?error=token_exchange_failed`);
            return;
        }

        const tokenData: LineTokenResponse = await tokenResponse.json();

        // 2. ユーザー情報を取得
        let email: string | undefined;
        let name: string | undefined;
        let picture: string | undefined;
        let lineUserId: string;

        if (tokenData.id_token) {
            const parts = tokenData.id_token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(
                    Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
                ) as LineIdTokenPayload;
                email = payload.email;
                name = payload.name;
                picture = payload.picture;
                lineUserId = payload.sub;
            } else {
                const profileResponse = await fetch('https://api.line.me/v2/profile', {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const profile: LineProfile = await profileResponse.json();
                lineUserId = profile.userId;
                name = profile.displayName;
                picture = profile.pictureUrl;
            }
        } else {
            const profileResponse = await fetch('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const profile: LineProfile = await profileResponse.json();
            lineUserId = profile.userId;
            name = profile.displayName;
            picture = profile.pictureUrl;
        }

        // 3. Firebase UIDを生成
        const firebaseUid = `line:${lineUserId}`;

        // 4. Firestoreでユーザーを検索または作成
        const userDoc = await db.collection('users').doc(firebaseUid).get();

        if (!userDoc.exists) {
            await db.collection('users').doc(firebaseUid).set({
                email: email || null,
                displayName: name || 'LINE User',
                photoURL: picture || null,
                provider: 'line',
                lineUserId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } else {
            await db.collection('users').doc(firebaseUid).update({
                displayName: name || userDoc.data()?.displayName,
                photoURL: picture || userDoc.data()?.photoURL,
                updatedAt: new Date(),
            });
        }

        // 5. Firebase Custom Tokenを作成
        const customToken = await auth.createCustomToken(firebaseUid, {
            provider: 'line',
            lineUserId,
        });

        // 6. リダイレクト
        res.redirect(`${APP_URL}/auth/line-complete#token=${customToken}`);

    } catch (err) {
        console.error('[LINE Auth] Error:', err);
        res.redirect(`${APP_URL}/auth/login?error=auth_failed`);
    }
}

// ========================================
// Stripe Checkout Session作成
// ========================================

async function handleStripeCheckout(req: functions.https.Request, res: Response): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { userId, email } = req.body;

        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }

        const priceId = process.env.STRIPE_PRICE_ID || functions.config().stripe?.price_id;
        if (!priceId) {
            res.status(500).json({ message: 'Stripe Price ID is not configured' });
            return;
        }

        const stripeClient = getStripeClient();

        // 既存のStripe Customerを検索または作成
        let customerId: string | undefined;

        if (email) {
            const existingCustomers = await stripeClient.customers.list({ email, limit: 1 });

            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
            } else {
                const customer = await stripeClient.customers.create({
                    email,
                    metadata: { firebaseUid: userId },
                });
                customerId = customer.id;
            }
        }

        // チェックアウトセッションを作成
        const session = await stripeClient.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: customerId,
            customer_email: customerId ? undefined : email,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: TRIAL_DAYS,
                metadata: { firebaseUid: userId },
            },
            metadata: { firebaseUid: userId },
            success_url: `${APP_URL}/?subscription=success`,
            cancel_url: `${APP_URL}/pricing?cancelled=true`,
            locale: 'ja',
            allow_promotion_codes: true,
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ message: 'Failed to create checkout session' });
    }
}

// ========================================
// Stripe Webhook
// ========================================

async function handleStripeWebhook(req: functions.https.Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

    if (!signature) {
        res.status(400).json({ message: 'Missing stripe-signature header' });
        return;
    }

    let event: Stripe.Event;

    try {
        const stripeClient = getStripeClient();
        // rawBodyを使用（Firebase Functionsは自動的にreq.rawBodyを提供）
        const rawBody = (req as any).rawBody || req.body;
        event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret || '');
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).json({ message: 'Webhook signature verification failed' });
        return;
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdate(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }
            case 'invoice.payment_succeeded': {
                console.log(`Payment succeeded for invoice ${(event.data.object as Stripe.Invoice).id}`);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ message: 'Webhook handler failed' });
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.firebaseUid;
    if (!userId) {
        console.error('No firebaseUid in checkout session metadata');
        return;
    }

    const subscriptionId = session.subscription as string;

    await db.collection('users').doc(userId).set({
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        updatedAt: new Date(),
    }, { merge: true });

    console.log(`Checkout completed for user ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.firebaseUid;

    let targetUserId = userId;
    if (!targetUserId) {
        const customerId = subscription.customer as string;
        const usersSnapshot = await db.collection('users')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
            targetUserId = usersSnapshot.docs[0].id;
        }
    }

    if (!targetUserId) {
        console.error('Could not find user for subscription:', subscription.id);
        return;
    }

    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    const subscriptionData = subscription as unknown as Record<string, unknown>;
    const currentPeriodEnd = subscriptionData.current_period_end
        ? new Date((subscriptionData.current_period_end as number) * 1000)
        : null;

    await db.collection('users').doc(targetUserId).set({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionCurrentPeriodEnd: currentPeriodEnd,
        subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
        updatedAt: new Date(),
    }, { merge: true });

    console.log(`Subscription ${subscription.id} updated for user ${targetUserId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error('No user found for customer:', customerId);
        return;
    }

    const userId = usersSnapshot.docs[0].id;

    await db.collection('users').doc(userId).set({
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null,
        updatedAt: new Date(),
    }, { merge: true });

    console.log(`Subscription deleted for user ${userId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) return;

    const userId = usersSnapshot.docs[0].id;

    await db.collection('users').doc(userId).set({
        subscriptionStatus: 'past_due',
        updatedAt: new Date(),
    }, { merge: true });

    console.log(`Payment failed for user ${userId}`);
}

// ========================================
// Stripe Customer Portal
// ========================================

async function handleStripePortal(req: functions.https.Request, res: Response): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }

        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.stripeCustomerId) {
            res.status(404).json({ message: 'No subscription found' });
            return;
        }

        const stripeClient = getStripeClient();
        const session = await stripeClient.billingPortal.sessions.create({
            customer: userData.stripeCustomerId,
            return_url: `${APP_URL}/settings`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        res.status(500).json({ message: 'Failed to create portal session' });
    }
}
