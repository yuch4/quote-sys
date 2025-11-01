# 見積管理システム

Excelベースの見積業務を効率化するWebアプリケーション

## 概要

このシステムは、月35-40時間かかっていた見積・発注・計上業務を3-4時間に短縮することを目的としています。

### 主な機能

- **ダッシュボード**: KPI表示（進行中案件・今月売上・粗利）、アラート（承認待ち・長期未入荷）、最近の活動
- **案件管理**: 案件の登録・編集（自動採番: PRJ-YYYY-XXXX形式）、顧客のインライン登録
- **見積管理**: 見積作成・編集・承認ワークフロー・PDF出力・バージョン管理
- **発注管理**: 発注待ち一覧・一括発注登録・入荷登録・進捗ダッシュボード
- **計上管理**: 計上可能案件抽出・計上申請・承認/差戻しワークフロー
- **マスタ管理**: 顧客・仕入先・ユーザーのCRUD（タブUI）
- **レポート**: 営業担当別実績・粗利分析・グラフ表示（月次売上推移・営業別ランキング）
- **通知機能**: システム内通知、ベルアイコン、未読件数、リアルタイム更新
- **メール通知**: 見積承認/却下、計上申請/承認/差戻し、長期未入荷アラート（Resend経由）

### UI/UX機能

- **Toast通知**: ユーザーアクションへの視覚的フィードバック（sonner）
- **グラフ表示**: 月次売上推移、営業別売上ランキング（Recharts）
- **Skeletonローダー**: データ読込中の表示改善
- **レスポンシブ対応**: モバイル・タブレット対応

### 権限

- **営業**: 自分の案件・見積・計上申請
- **営業事務**: 全案件・見積承認・発注管理・計上承認・マスタ管理
- **管理者**: 全機能 + ユーザー管理

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React, TypeScript
- **グラフ**: Recharts
- **通知**: sonner
- **メール送信**: Resend
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **PDF生成**: @react-pdf/renderer

## セットアップ

### 前提条件

- Node.js 18以上
- Supabaseアカウント
### 環境変数

`.env.local`を作成し、以下を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (メール送信)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Cron Secret (オプション)
CRON_SECRET=your_random_secret_string
```

詳細は`.env.example`を参照してください。T_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## データベース構造

### テーブル

3. **計上判定**: 全明細が入荷済み → 計上可能
4. **計上承認フロー**: 未申請 → 申請中 → 承認済み/差戻し
5. **通知**: 見積承認/差戻、計上承認/差戻、入荷完了時に自動通知
6. **メール通知**:
   - 見積承認/却下時: 営業担当へメール送信
   - 計上申請時: 営業事務へメール送信
   - 計上承認/差戻し時: 営業担当へメール送信
   - 長期未入荷アラート: 14日以上未入荷の明細を営業事務へ通知（Cron実行）
- **projects**: 案件（自動採番: PRJ-YYYY-XXXX形式、営業担当紐付け）
- **quotes**: 見積（承認ワークフロー、バージョン管理）
- **quote_items**: 見積明細（仕入要フラグ、発注ステータス）
- **procurement_logs**: 発注・入荷履歴
- **billing_requests**: 計上申請（承認ワークフロー）
- **notifications**: システム内通知（リアルタイム更新）

### 主要なビジネスロジック

1. **見積承認フロー**: 下書き → 承認申請中 → 承認済み/差戻し
2. **発注管理**: 未発注 → 発注済み → 入荷済み（部分入荷対応）
3. **計上判定**: 全明細が入荷済み → 計上可能
4. **計上承認フロー**: 未申請 → 申請中 → 承認済み/差戻し
5. **通知**: 見積承認/差戻、計上承認/差戻、入荷完了時に自動通知

## プロジェクト構造

```
quote-sys/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # ダッシュボード
│   │   │   ├── projects/             # 案件管理
│   │   │   ├── quotes/               # 見積管理
│   │   │   ├── procurement/          # 発注管理
│   │   │   ├── billing/              # 計上管理
│   │   │   ├── reports/              # レポート
│   │   │   └── settings/             # マスタ管理
│   │   └── layout.tsx                # ダッシュボードレイアウト
│   ├── login/                        # ログイン
│   └── api/auth/                     # 認証API
├── components/
│   ├── ui/                           # shadcn/uiコンポーネント
│   ├── quotes/                       # 見積関連コンポーネント
│   └── notifications/                # 通知コンポーネント
├── lib/
│   ├── supabase/                     # Supabaseクライアント
│   └── pdf/                          # PDF生成
└── supabase/
    └── migrations/                   # DBマイグレーション
```

## 実装済み機能

### Phase 1-6: 基本機能（完了）
- ✅ 認証・権限管理
- ✅ データベース構築（9テーブル）
- ✅ マスタ管理（顧客・仕入先・ユーザー）
- ✅ 案件管理（CRUD）
- ✅ 見積管理（CRUD・承認・PDF・バージョン管理）
- ✅ 発注管理（待ち一覧・発注・入荷・ダッシュボード）
- ✅ 計上管理（判定・申請・承認）
- ✅ レポート（営業実績・粗利分析）

### Phase 7: UI/UX改善（完了）
- ✅ Toast通知システム（sonner）
- ✅ ダッシュボード機能強化（KPI、アラート）
- ✅ レポートグラフ化（Recharts）
- ✅ 通知機能（ベルアイコン、リアルタイム）
- ✅ Skeletonローダー

### 今後の拡張予定
- ページネーション（大量データ対応）
- レスポンシブ対応強化
- メール通知（Resend統合）
- E2Eテスト（Playwright）
- 本番デプロイ（Vercel）
└── docs/
    └── REQUIREMENTS.md               # 要件定義書
```

## 主要な機能詳細

### 見積管理

- **見積作成**: 明細行の追加・削除、自動計算（売上・原価・粗利）
- **承認ワークフロー**: 営業担当が申請 → 営業事務が承認/差戻し
- **PDF出力**: 見積書をPDF生成してSupabase Storageに保存
- **バージョン管理**: 見積修正時に新バージョン作成（v1, v2, v3...）

### 発注管理

- **発注待ち一覧**: 承認済み見積から仕入要=trueの明細を自動抽出
- **一括発注**: 複数明細を選択して一括発注登録
- **入荷登録**: 発注済み明細の入荷を登録（部分入荷対応）
- **進捗ダッシュボード**: 長期未入荷アラート（14日以上）、仕入先別サマリー

### 計上管理

- **計上可能判定**: 全明細が入荷済みの案件を自動判定
- **計上申請**: 営業担当が計上日・備考を入力して申請
- **承認/差戻し**: 営業事務が申請を承認または差戻し

### レポート

- **営業担当別実績**: 売上・粗利・粗利率の集計
- **案件別詳細**: 案件ごとの粗利分析
- **計上状況**: 未計上・申請中・計上済みの件数

## デプロイ

### Vercel推奨

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定（Supabase URL, Anon Key）
3. デプロイ実行

### Supabase設定

1. プロジェクト作成
2. データベーススキーマを適用（SQLエディタで実行）
3. Row Level Security (RLS) ポリシー設定
4. Storage バケット作成（'documents'）

## ライセンス

MIT

## 開発者向け情報

開発ルールは `.github/copilot-instructions.md` を参照してください。

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
