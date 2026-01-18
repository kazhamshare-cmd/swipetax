# ANCHOKOから再利用するファイル

## そのままコピー（設定系）

```
/package.json           → 修正して使用
/tsconfig.json          → そのまま使用
/next.config.ts         → そのまま使用
/tailwind.config.ts     → そのまま使用
/postcss.config.mjs     → そのまま使用
/capacitor.config.ts    → 修正して使用
/.eslintrc.json         → そのまま使用
```

## そのままコピー（認証・インフラ）

```
/src/lib/firebase.ts           → Firebase設定（プロジェクトID変更）
/src/lib/auth.ts               → 認証ロジック
/src/lib/subscription.ts       → RevenueCat連携
/src/lib/deviceDetection.ts    → デバイス判定
/src/contexts/AuthContext.tsx  → 認証コンテキスト
/src/hooks/useDevice.ts        → デバイスフック
```

## 修正して使用（UI系）

```
/src/app/layout.tsx                    → アプリ名変更
/src/app/HomeClient.tsx                → ランディングページ完全書き換え
/src/app/components/Header.tsx         → ロゴ・ナビゲーション変更
/src/app/components/UserMenu.tsx       → そのまま使用
/src/app/auth/login/page.tsx           → そのまま使用
/src/app/auth/signup/page.tsx          → そのまま使用
/src/app/subscription/page.tsx         → そのまま使用
/src/app/settings/page.tsx             → 修正して使用
```

## 参考にして新規作成（コア機能）

```
/src/app/study/[id]/StudyClient.tsx    → スワイプロジック参考
                                        → SwipeClient.tsx として新規作成
```

## 新規作成

```
/src/lib/types.ts              → TaxUser, Transaction, TaxReturn等
/src/lib/actions.ts            → Firestore操作
/src/lib/tax-calculator.ts     → 税額計算
/src/lib/csv-parser.ts         → CSV読み込み
/src/lib/ai-categorizer.ts     → AI経費判定

/src/app/onboarding/           → オンボーディング
/src/app/import/               → データ取り込み
/src/app/swipe/                → メインスワイプ画面
/src/app/deductions/           → 控除入力
/src/app/summary/              → 集計確認
/src/app/output/               → 出力
```

## 不要（コピーしない）

```
/src/app/study/                → フラッシュカード学習（不要）
/src/app/review/               → 復習（不要）
/src/app/editor/               → カード編集（不要）
/src/app/decks/                → デッキ管理（不要）
/src/app/browser/              → カード閲覧（不要）
/src/app/import-export/        → Ankiインポート（不要）
/src/app/shared/               → 共有カテゴリ（不要）
/src/app/stats/                → 学習統計（不要）
/src/app/help/                 → SRSヘルプ（不要）
/src/lib/srs.ts                → 間隔反復アルゴリズム（不要）
/src/lib/importers/            → Ankiインポーター（不要）
```

## コピー実行コマンド

```bash
# プロジェクトディレクトリ作成
mkdir -p /Users/ikushimakazuyuki/Documents/swipetax/src/{app,lib,contexts,hooks,messages,types}
mkdir -p /Users/ikushimakazuyuki/Documents/swipetax/src/app/{auth,components,onboarding,import,swipe,deductions,summary,output,settings,subscription}
mkdir -p /Users/ikushimakazuyuki/Documents/swipetax/src/app/auth/{login,signup,reset-password}
mkdir -p /Users/ikushimakazuyuki/Documents/swipetax/public

# 設定ファイル
cp /Users/ikushimakazuyuki/Documents/__anchoko/tsconfig.json /Users/ikushimakazuyuki/Documents/swipetax/
cp /Users/ikushimakazuyuki/Documents/__anchoko/next.config.ts /Users/ikushimakazuyuki/Documents/swipetax/
cp /Users/ikushimakazuyuki/Documents/__anchoko/tailwind.config.ts /Users/ikushimakazuyuki/Documents/swipetax/
cp /Users/ikushimakazuyuki/Documents/__anchoko/postcss.config.mjs /Users/ikushimakazuyuki/Documents/swipetax/

# lib
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/lib/firebase.ts /Users/ikushimakazuyuki/Documents/swipetax/src/lib/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/lib/auth.ts /Users/ikushimakazuyuki/Documents/swipetax/src/lib/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/lib/subscription.ts /Users/ikushimakazuyuki/Documents/swipetax/src/lib/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/lib/deviceDetection.ts /Users/ikushimakazuyuki/Documents/swipetax/src/lib/

# contexts, hooks
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/contexts/*.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/contexts/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/hooks/*.ts /Users/ikushimakazuyuki/Documents/swipetax/src/hooks/

# i18n
cp -r /Users/ikushimakazuyuki/Documents/__anchoko/src/i18n /Users/ikushimakazuyuki/Documents/swipetax/src/
cp -r /Users/ikushimakazuyuki/Documents/__anchoko/src/messages /Users/ikushimakazuyuki/Documents/swipetax/src/

# components
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/components/Header.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/components/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/components/UserMenu.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/components/

# auth pages
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/auth/login/page.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/auth/login/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/auth/signup/page.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/auth/signup/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/auth/reset-password/page.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/auth/reset-password/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/auth/login/layout.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/auth/login/ 2>/dev/null || true
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/auth/signup/layout.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/auth/signup/ 2>/dev/null || true

# subscription, settings
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/subscription/page.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/subscription/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/settings/page.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/settings/

# layout, globals
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/layout.tsx /Users/ikushimakazuyuki/Documents/swipetax/src/app/
cp /Users/ikushimakazuyuki/Documents/__anchoko/src/app/globals.css /Users/ikushimakazuyuki/Documents/swipetax/src/app/

# public
cp -r /Users/ikushimakazuyuki/Documents/__anchoko/public/* /Users/ikushimakazuyuki/Documents/swipetax/public/ 2>/dev/null || true
```
