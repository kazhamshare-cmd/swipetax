# SwipeTax

**スワイプするだけで確定申告** - フラッシュカードアプリANCHOKOのスワイプUIを応用した確定申告支援サービス

## 概要

SwipeTaxは、経費の仕分けを「スワイプ」で直感的に行える確定申告アプリです。AIが自動で経費カテゴリを判定し、ユーザーは右スワイプで承認、左スワイプで修正するだけ。煩雑な経費仕分けをサクサク処理できます。

**本番URL**: https://swipetax.web.app

## 料金プラン

| プラン | 料金 |
|--------|------|
| **14日間無料トライアル** | ¥0 |
| **月額プラン** | ¥580/月 |

- PC・スマホ・タブレット共通（PWA）
- すべての機能が使い放題
- いつでもキャンセル可能

## 主な機能

### スワイプ仕分け
```
          ↑ 上スワイプ
          │ 保留（後で確認）
          │
←─────────┼─────────→
左スワイプ │  右スワイプ
カテゴリ変更│  AI判定OK
          │
          ↓ 下スワイプ
          私的支出（除外）
```

### 実装済み機能

#### Phase A: UX改善
- ビジネスプロフィール・アンケートページ（5ステップウィザード）
- 源泉徴収の複数エントリー対応（会社別登録）
- 保険料控除の複数エントリー対応（区分別上限自動計算）
- オンボーディングフロー
- 手動取引入力（経費/売上切替）
- 売上パターン別ガイド
- スワイプチュートリアル

#### Phase B: 飲食店向け機能
- 給与・人件費入力（アルバイト/社員両対応）
- 売上入力（日次売上記録）
- 仕入れ伝票OCR（食材仕分け自動読取）

#### その他
- 取引CSV/PDF明細インポート
- レシートOCR（GPT-4 Vision）
- QR決済スクショ対応
- 確定申告書B PDF出力
- 白色・青色申告対応

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フレームワーク** | Next.js 16 + React 19 |
| **スタイリング** | Tailwind CSS |
| **モバイル** | Capacitor (iOS/Android) / PWA |
| **認証** | Firebase Auth (Email, Google, Apple, LINE) |
| **データベース** | Firestore |
| **サーバー** | Firebase Functions |
| **ホスティング** | Firebase Hosting |
| **サブスクリプション** | Stripe |
| **AI/OCR** | OpenAI GPT-4 / GPT-4 Vision |
| **PDF生成** | pdf-lib |
| **CSV解析** | papaparse |

## 開発セットアップ

### 前提条件
- Node.js 18+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kazhamshare-cmd/swipetax.git
cd swipetax

# 依存関係インストール
npm install

# Firebase Functions の依存関係
cd functions && npm install && cd ..

# 開発サーバー起動
npm run dev
```

### 環境変数

`.env.local` ファイルを作成:

```env
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# App URL
NEXT_PUBLIC_APP_URL=https://swipetax.web.app

# LINE Login
NEXT_PUBLIC_LINE_CHANNEL_ID=your-line-channel-id

# Stripe (Client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# OpenAI (for local development only)
OPENAI_API_KEY=sk-xxx
```

Firebase Functions の環境変数は Firebase Config で管理:

```bash
firebase functions:config:set \
  line.channel_id="xxx" \
  line.channel_secret="xxx" \
  stripe.secret_key="sk_live_xxx" \
  stripe.price_id="price_xxx" \
  stripe.webhook_secret="whsec_xxx" \
  openai.api_key="sk-xxx" \
  app.url="https://swipetax.web.app"
```

## ビルド & デプロイ

### 静的ビルド（Firebase Hosting用）

```bash
# 静的エクスポートビルド
BUILD_TARGET=capacitor npm run build

# Firebase Hosting にデプロイ
firebase deploy --only hosting
```

### Firebase Functions デプロイ

```bash
firebase deploy --only functions
```

### 全体デプロイ

```bash
BUILD_TARGET=capacitor npm run build && firebase deploy
```

## プロジェクト構造

```
swipetax/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/               # 認証ページ（login, signup, line-complete）
│   │   ├── components/         # 共通コンポーネント
│   │   │   └── landing/        # ランディングページ用
│   │   ├── deductions/         # 控除入力
│   │   ├── filing-check/       # 確定申告要否チェック
│   │   ├── help/               # ヘルプページ
│   │   ├── import/             # データ取込（CSV, レシート, 明細）
│   │   ├── income/             # 収入入力
│   │   ├── onboarding/         # オンボーディング
│   │   ├── output/             # 申告書出力
│   │   ├── pricing/            # 料金ページ
│   │   ├── profile/            # ビジネスプロフィール
│   │   ├── restaurant/         # 飲食店向け機能
│   │   │   ├── payroll/        # 給与入力
│   │   │   ├── purchase/       # 仕入れOCR
│   │   │   └── sales/          # 売上入力
│   │   ├── subscription/       # サブスク管理
│   │   ├── summary/            # 集計確認
│   │   ├── swipe/              # スワイプ仕分け
│   │   └── transactions/       # 取引一覧・手動入力
│   ├── contexts/               # React Context
│   ├── hooks/                  # カスタムフック
│   └── lib/                    # ユーティリティ・サービス
│       ├── auth.ts             # 認証（Email, Google, Apple, LINE）
│       ├── business-profile-service.ts
│       ├── deduction-service.ts
│       ├── firebase.ts         # Firebase設定
│       ├── import/             # インポート関連
│       │   └── ocr-service.ts  # OCR（GPT-4 Vision）
│       ├── income-service.ts
│       ├── payroll-service.ts
│       ├── sales-service.ts
│       ├── subscription.ts     # Stripe連携
│       ├── tax-calculator.ts   # 税額計算
│       ├── transaction-service.ts
│       └── types.ts            # 型定義
├── functions/                  # Firebase Functions
│   └── src/
│       └── index.ts            # API エンドポイント
├── public/                     # 静的ファイル
├── out/                        # ビルド出力（静的エクスポート）
├── firebase.json               # Firebase設定
├── capacitor.config.ts         # Capacitor設定
└── next.config.ts              # Next.js設定
```

## Firebase Functions API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/import/ocr` | POST | レシート/明細のOCR処理 |
| `/api/auth/line/callback` | GET | LINE OAuth コールバック |
| `/api/stripe/create-checkout-session` | POST | Stripe決済セッション作成 |
| `/api/stripe/webhook` | POST | Stripe Webhook |
| `/api/stripe/portal` | POST | Stripeカスタマーポータル |

## Firestoreコレクション

| コレクション | 説明 |
|-------------|------|
| `swipetax_users` | ユーザー情報 |
| `swipetax_business_profiles` | ビジネスプロフィール |
| `swipetax_transactions` | 取引データ |
| `swipetax_deductions` | 控除情報 |
| `swipetax_tax_returns` | 申告書データ |
| `swipetax_payroll` | 給与データ |
| `swipetax_sales` | 売上データ |
| `swipetax_income` | 収入データ |

## 認証フロー

### LINE ログイン
1. ユーザーが「LINEでログイン」をクリック
2. LINE OAuth認証画面にリダイレクト
3. 認証後、`/api/auth/line/callback` にリダイレクト
4. Firebase Functions でアクセストークンを取得
5. LINEプロフィールからユーザー情報取得
6. Firebase Admin SDK でカスタムトークン生成
7. フロントエンドでカスタムトークンを使用してFirebase認証

### Stripe サブスクリプション
1. ユーザーが「14日間無料で始める」をクリック
2. Firebase Functionsで Checkout Session 作成
3. Stripe決済ページにリダイレクト
4. 決済完了後、Webhook でサブスク状態を Firestore に保存
5. 14日間の無料トライアル後、自動課金開始

## 関連ドキュメント

- [概要.md](./概要.md) - 詳細な企画書・フロー図
- [ANCHOKO_REUSE.md](./ANCHOKO_REUSE.md) - ANCHOKOからの再利用ファイル

## 開発ロードマップ

### 完了済み
- [x] Phase A: UX改善（プロフィール、控除、オンボーディング）
- [x] Phase B: 飲食店向け機能（給与、売上、仕入れOCR）
- [x] 認証（Email, Google, Apple, LINE）
- [x] Stripeサブスクリプション
- [x] Firebase Hosting デプロイ

### 予定
- [ ] Phase C: 年金受給者対応
- [ ] e-Tax XML出力
- [ ] 消費税申告対応

## ライセンス

Private - All rights reserved

## 作者

kazhamshare-cmd
