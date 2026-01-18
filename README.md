# SwipeTax

スワイプするだけで確定申告 - ANCHOKOベースの確定申告アプリ

## プロジェクト概要

ANCHOKOのスワイプUIを活用し、確定申告の経費仕分けを直感的に行えるサービス。

### スワイプアクション

- **→ 右スワイプ**: AI判定OK（承認）
- **← 左スワイプ**: カテゴリ修正
- **↑ 上スワイプ**: 保留（後で確認）
- **↓ 下スワイプ**: 私的支出（除外）

## 技術スタック

- **Framework**: Next.js 16 + React 19
- **Mobile**: Capacitor (iOS/Android)
- **Backend**: Firebase (Auth, Firestore)
- **Subscription**: RevenueCat
- **AI**: OpenAI GPT-4
- **PDF**: pdf-lib
- **CSV**: papaparse

## セットアップ

```bash
# 依存関係インストール
cd /Users/ikushimakazuyuki/Documents/swipetax
npm install

# Firebase設定
# src/lib/firebase.ts のfirebaseConfigを更新

# 開発サーバー起動
npm run dev
```

## ディレクトリ構造

```
swipetax/
├── 概要.md              # 詳細な企画書
├── ANCHOKO_REUSE.md     # ANCHOKOからの再利用リスト
├── README.md            # このファイル
├── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx           # トップページ
│   │   ├── HomeClient.tsx     # ランディングページ
│   │   ├── layout.tsx         # レイアウト
│   │   ├── auth/              # 認証ページ
│   │   ├── components/        # 共通コンポーネント
│   │   ├── onboarding/        # オンボーディング（TODO）
│   │   ├── import/            # データ取り込み（TODO）
│   │   ├── swipe/             # スワイプ仕分け（TODO）
│   │   ├── deductions/        # 控除入力（TODO）
│   │   ├── summary/           # 集計確認（TODO）
│   │   └── output/            # 出力（TODO）
│   ├── lib/
│   │   ├── types.ts           # 型定義
│   │   ├── firebase.ts        # Firebase設定
│   │   ├── auth.ts            # 認証
│   │   └── subscription.ts    # サブスク
│   ├── contexts/              # React Context
│   ├── hooks/                 # カスタムフック
│   ├── i18n/                  # 多言語対応
│   └── messages/              # 翻訳ファイル
└── public/                    # 静的ファイル
```

## 開発TODO

### 完了済み (2026/01/16)
- [x] ANCHOKOからベースコードをコピー
- [x] npm install で依存関係インストール
- [x] Firebase設定（プレースホルダー - コンソールで作成後に設定値更新必要）
- [x] スワイプ仕分けUI (`/swipe` - SwipeClient.tsx)
  - 4方向スワイプ対応
  - カテゴリ選択モーダル
  - サンプルデータ表示

### Phase 1: コア機能（続き）
- [ ] Firebaseコンソールで新プロジェクト作成
- [ ] オンボーディング画面
- [ ] CSVインポート機能

### Phase 2: AI判定
- [ ] OpenAI API連携
- [ ] 経費カテゴリ判定

### Phase 3: 申告書生成
- [ ] 税額計算ロジック
- [ ] 控除入力フォーム
- [ ] PDF生成

## 関連ドキュメント

- [概要.md](./概要.md) - 詳細な企画書・フロー図
- [ANCHOKO_REUSE.md](./ANCHOKO_REUSE.md) - ANCHOKOからの再利用ファイル

## 参考

- ANCHOKO: `/Users/ikushimakazuyuki/Documents/__anchoko/`
- StudyClient.tsx（スワイプUI参考）: `__anchoko/src/app/study/[id]/StudyClient.tsx`
