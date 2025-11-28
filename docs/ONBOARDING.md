# 🎓 見積管理システム オンボーディングガイド

**ようこそ！** このドキュメントは、見積管理システム（quote-sys）に新しく参加する開発者向けの入門ガイドです。プロジェクトの全体像を理解し、すぐに開発を始められるようにサポートします。

---

## 📋 目次

1. [プロジェクト概要](#-プロジェクト概要)
2. [技術スタック](#-技術スタック)
3. [ディレクトリ構造](#-ディレクトリ構造)
4. [開発環境のセットアップ](#-開発環境のセットアップ)
5. [データベース構造](#-データベース構造)
6. [主要な機能モジュール](#-主要な機能モジュール)
7. [開発ルールとコーディング規約](#-開発ルールとコーディング規約)
8. [よくある質問（FAQ）](#-よくある質問faq)
9. [用語集](#-用語集)

---

## 🎯 プロジェクト概要

### このシステムは何をするの？

見積管理システムは、**Excel依存の見積・発注・計上業務を効率化するWebアプリケーション**です。

#### 💡 解決する課題

| 課題 | 現状 | 目標 |
|:-----|:-----|:-----|
| 月間作業時間 | 35-40時間 | 3-4時間 (**90%削減**) |
| データ管理 | Excel・紙・複数システムに分散 | 1つのWebアプリに統合 |
| 入力回数 | 同じデータを4回入力 | 1回入力で完結 |

#### 🔧 主な機能

1. **案件管理** - 顧客からの引き合いを登録・追跡
2. **見積管理** - 見積書の作成・承認・PDF出力
3. **発注管理** - 仕入先への発注・入荷の追跡
4. **計上管理** - 売上計上の申請・承認ワークフロー
5. **レポート** - 売上・粗利の分析・可視化

---

## 🛠 技術スタック

### フロントエンド（画面側）

| 技術 | バージョン | 役割 | 補足説明 |
|:-----|:----------|:-----|:---------|
| **Next.js** | 16.0.1 | Webフレームワーク | React をベースとした高速なWebアプリ構築ツール。App Router使用 |
| **React** | 19.2.0 | UIライブラリ | 画面の部品（コンポーネント）を作るための基盤 |
| **TypeScript** | 5.x | 言語 | JavaScriptに「型」を追加して安全性を高めた言語 |
| **Tailwind CSS** | 4.x | スタイリング | クラス名でデザインを適用するCSSフレームワーク |
| **shadcn/ui** | - | UIコンポーネント | ボタン・入力欄などの美しい部品集 |
| **Recharts** | 3.3.0 | グラフ | 売上推移などのチャート描画 |
| **sonner** | 2.0.7 | 通知 | 操作結果を画面右下に表示するトースト通知 |

### バックエンド（サーバー側）

| 技術 | 役割 | 補足説明 |
|:-----|:-----|:---------|
| **Supabase** | BaaS（Backend as a Service） | データベース・認証・ファイル保存を一括提供するサービス |
| **PostgreSQL** | データベース | Supabase内で動作するリレーショナルDB |
| **Supabase Auth** | 認証 | ログイン・ログアウト・ユーザー管理 |
| **Supabase Storage** | ファイル保存 | PDFファイルなどの保管場所 |
| **Supabase Realtime** | リアルタイム更新 | 通知などの即時反映 |

### 外部サービス

| 技術 | 役割 | 補足説明 |
|:-----|:-----|:---------|
| **Resend** | メール送信 | 見積承認通知などのメール配信 |
| **@react-pdf/renderer** | PDF生成 | 見積書・発注書のPDF作成 |

### 開発ツール

| 技術 | 役割 | 補足説明 |
|:-----|:-----|:---------|
| **Vitest** | 単体テスト | 関数やコンポーネントの自動テスト |
| **Playwright** | E2Eテスト | ブラウザ操作を自動化するテスト |
| **ESLint** | 静的解析 | コードの問題を自動検出 |

---

## 📁 ディレクトリ構造

プロジェクトのフォルダ構成を理解することで、「どこに何があるか」がわかります。

```
quote-sys/
│
├── 📂 app/                    # ⭐ アプリケーションのメイン部分
│   ├── 📂 (auth)/             # 認証関連ページ（ログインなど）
│   │   └── login/             # ログインページ
│   │
│   ├── 📂 (dashboard)/        # メイン機能のページ群
│   │   ├── layout.tsx         # 共通レイアウト（サイドバー含む）
│   │   └── 📂 dashboard/
│   │       ├── page.tsx       # ダッシュボード（トップページ）
│   │       ├── 📂 projects/   # 案件管理
│   │       ├── 📂 quotes/     # 見積管理
│   │       ├── 📂 procurement/# 発注・入荷管理
│   │       ├── 📂 billing/    # 計上管理
│   │       ├── 📂 reports/    # レポート・分析
│   │       └── 📂 settings/   # マスタ管理（顧客・仕入先など）
│   │
│   ├── 📂 api/                # APIエンドポイント
│   │   ├── auth/              # 認証API
│   │   ├── cron/              # 定期実行タスク
│   │   └── email/             # メール送信API
│   │
│   ├── globals.css            # グローバルスタイル
│   ├── layout.tsx             # ルートレイアウト
│   └── page.tsx               # トップページ（リダイレクト）
│
├── 📂 components/             # ⭐ 再利用可能なUI部品
│   ├── 📂 ui/                 # 汎用コンポーネント（ボタン・カードなど）
│   ├── 📂 layout/             # レイアウト関連（サイドバーなど）
│   ├── 📂 quotes/             # 見積関連コンポーネント
│   ├── 📂 purchase-orders/    # 発注書関連
│   ├── 📂 notifications/      # 通知関連
│   └── 📂 projects/           # 案件関連
│
├── 📂 lib/                    # ⭐ ユーティリティ・共通ロジック
│   ├── 📂 supabase/           # Supabase接続設定
│   │   ├── client.ts          # クライアント側接続
│   │   ├── server.ts          # サーバー側接続
│   │   └── middleware.ts      # 認証ミドルウェア
│   ├── 📂 email/              # メール送信ロジック
│   ├── 📂 pdf/                # PDF生成ロジック
│   └── utils.ts               # 共通ユーティリティ関数
│
├── 📂 types/                  # TypeScript型定義
│   └── database.ts            # データベーステーブルの型
│
├── 📂 supabase/               # ⭐ データベース関連
│   ├── 📂 migrations/         # DBスキーマ変更履歴
│   └── seed.sql               # 初期データ投入スクリプト
│
├── 📂 docs/                   # ドキュメント
│   ├── REQUIREMENTS.md        # 要件定義書
│   └── ONBOARDING.md          # このファイル
│
├── 📂 e2e/                    # E2Eテスト
│
├── 📂 public/                 # 静的ファイル（フォントなど）
│
├── 📄 package.json            # 依存ライブラリ定義
├── 📄 tsconfig.json           # TypeScript設定
├── 📄 next.config.ts          # Next.js設定
├── 📄 middleware.ts           # 認証ミドルウェア
├── 📄 todo.md                 # 開発タスク管理
└── 📄 README.md               # プロジェクト説明
```

### 💡 覚えておくべきフォルダ

| フォルダ | 編集頻度 | 何をするところ？ |
|:---------|:---------|:-----------------|
| `app/(dashboard)/dashboard/` | ⭐⭐⭐ 高 | 新機能のページを作る場所 |
| `components/` | ⭐⭐⭐ 高 | 再利用するUI部品を作る場所 |
| `lib/` | ⭐⭐ 中 | 共通ロジック・ユーティリティを書く場所 |
| `supabase/migrations/` | ⭐ 低 | データベース変更時のみ |

---

## 🚀 開発環境のセットアップ

### 前提条件

開発を始める前に、以下のツールがインストールされていることを確認してください：

- **Node.js** 18以上 （[ダウンロード](https://nodejs.org/)）
- **Git** （[ダウンロード](https://git-scm.com/)）
- **VS Code** 推奨 （[ダウンロード](https://code.visualstudio.com/)）

### 1. リポジトリのクローン

まず、プロジェクトのコードをダウンロードします：

```bash
git clone https://github.com/yuch4/quote-sys.git
cd quote-sys
```

### 2. 依存ライブラリのインストール

プロジェクトを動かすための「部品（ライブラリ）」をダウンロードします：

```bash
npm install
```

これにより、`node_modules` フォルダが作成され、必要なツールがすべて準備されます。

### 3. 環境変数の設定

アプリがSupabaseと通信するための設定ファイルを作成します：

```bash
# .env.local ファイルを作成
cp .env.example .env.local
```

`.env.local` を開いて、以下の値を設定してください：

```env
# Supabase（必須）- 管理者から取得
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# アプリURL（ローカル開発時）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend（メール機能を使う場合）
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
```

> 💡 **ヒント**: Supabaseの接続情報は、プロジェクト管理者またはチームリーダーに確認してください。

### 4. 開発サーバーの起動

すべての準備が整ったら、開発サーバーを起動します：

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開くと、アプリが表示されます！

### 5. 利用可能なコマンド

| コマンド | 説明 |
|:---------|:-----|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番用ビルド |
| `npm run lint` | コード品質チェック |
| `npm run test` | 単体テスト実行 |
| `npm run test:e2e` | E2Eテスト実行 |

---

## 🗄 データベース構造

このシステムは9つのメインテーブルで構成されています。

### テーブル一覧

```
┌─────────────────────────────────────────────────────────┐
│                    データベース構造                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐      │
│  │  users   │      │customers │      │suppliers │      │
│  │ (ユーザー)│      │  (顧客)  │      │ (仕入先) │      │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘      │
│       │                 │                 │            │
│       └────────┬────────┘                 │            │
│                ▼                          │            │
│         ┌──────────┐                      │            │
│         │ projects │◄─────────────────────┘            │
│         │  (案件)  │                                   │
│         └────┬─────┘                                   │
│              │                                         │
│              ▼                                         │
│         ┌──────────┐                                   │
│         │  quotes  │                                   │
│         │  (見積)  │                                   │
│         └────┬─────┘                                   │
│              │                                         │
│    ┌─────────┼─────────┐                               │
│    ▼         ▼         ▼                               │
│ ┌────────┐ ┌────────┐ ┌──────────────────┐            │
│ │quote_  │ │billing_│ │procurement_logs  │            │
│ │items   │ │requests│ │  (発注・入荷履歴) │            │
│ │(明細)  │ │(計上)  │ └──────────────────┘            │
│ └────────┘ └────────┘                                  │
│                                                         │
│  ┌────────────────┐                                    │
│  │ notifications  │                                    │
│  │    (通知)      │                                    │
│  └────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

### 各テーブルの役割

| テーブル名 | 説明 | 主要カラム |
|:-----------|:-----|:-----------|
| **users** | システム利用者 | email, display_name, role（営業/営業事務/管理者） |
| **customers** | 顧客情報 | customer_name, customer_code, contact_person |
| **suppliers** | 仕入先情報 | supplier_name, contact_person, payment_terms |
| **projects** | 案件（商談） | project_number（自動採番）, project_name, status |
| **quotes** | 見積ヘッダ | quote_number, version, approval_status, pdf_url |
| **quote_items** | 見積明細 | product_name, quantity, unit_price, procurement_status |
| **procurement_logs** | 発注・入荷履歴 | action_type（発注/入荷）, action_date, quantity |
| **billing_requests** | 計上申請 | billing_date, status（申請中/承認済み/差戻し） |
| **notifications** | システム通知 | title, message, type, is_read |

---

## 🔧 主要な機能モジュール

### 1. 認証フロー

```
ログイン画面 → Supabase Auth認証 → ミドルウェアで権限チェック → ダッシュボード
```

- **関連ファイル**: `app/(auth)/login/`, `middleware.ts`, `lib/supabase/`

### 2. 見積ワークフロー

```
下書き → 承認申請 → 営業事務が確認 → 承認 or 差戻し → PDF生成
                        ↓
                    メール通知送信
```

- **関連ファイル**: `app/(dashboard)/dashboard/quotes/`, `components/quotes/`

### 3. 発注・入荷フロー

```
承認済み見積 → 仕入要の明細抽出 → 発注登録 → 入荷登録 → 全入荷で計上可能
```

- **関連ファイル**: `app/(dashboard)/dashboard/procurement/`

### 4. 権限管理

| 役割 | できること |
|:-----|:-----------|
| **営業** | 自分の案件・見積の作成・編集、計上申請 |
| **営業事務** | 全案件閲覧、見積承認、発注管理、計上承認 |
| **管理者** | 全機能 + ユーザー管理 |

---

## 📝 開発ルールとコーディング規約

### Gitコミットルール

変更をコミットする際は、以下の形式を使用してください：

```
<タイプ>: <説明>
```

| タイプ | 用途 | 例 |
|:-------|:-----|:---|
| `feat` | 新機能追加 | `feat: 見積検索フィルター追加` |
| `fix` | バグ修正 | `fix: 承認ボタンが動かない問題を修正` |
| `refactor` | リファクタリング | `refactor: 見積一覧の共通処理を抽出` |
| `docs` | ドキュメント | `docs: READMEにセットアップ手順追加` |
| `chore` | 雑務 | `chore: 依存ライブラリ更新` |

### コーディング規約

1. **TypeScript**: 型は明示的に記述する
2. **コンポーネント**: 関数コンポーネント + hooks を使用
3. **スタイリング**: Tailwind CSSのユーティリティクラスを使用
4. **状態管理**: React Hook Form（フォーム）、useState（ローカル）

### ファイル命名規則

- **コンポーネント**: `kebab-case.tsx` （例: `quote-pdf.tsx`）
- **ユーティリティ**: `camelCase.ts` （例: `generatePdf.ts`）
- **型定義**: `PascalCase` （例: `type QuoteItem = {...}`）

---

## ❓ よくある質問（FAQ）

### Q: 開発サーバーが起動しない

**A:** 以下を確認してください：
1. Node.js 18以上がインストールされているか
2. `npm install` を実行したか
3. `.env.local` ファイルが正しく設定されているか

### Q: Supabaseに接続できない

**A:** `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認してください。

### Q: 新しいページを追加したい

**A:** `app/(dashboard)/dashboard/` 配下に新しいフォルダを作成し、その中に `page.tsx` を作成します。

例：`app/(dashboard)/dashboard/new-feature/page.tsx`

### Q: 新しいUIコンポーネントを追加したい

**A:** shadcn/ui のコンポーネントを追加できます：

```bash
npx shadcn@latest add [コンポーネント名]
```

### Q: データベーススキーマを変更したい

**A:** `supabase/migrations/` にマイグレーションファイルを追加し、Supabase MCPを使用して適用します。

---

## 📖 用語集

| 用語 | 説明 |
|:-----|:-----|
| **案件（Project）** | 顧客からの引き合い・商談の単位 |
| **見積（Quote）** | 案件に対する提案と金額の提示 |
| **明細（Quote Item）** | 見積の内訳（1行 = 1商品・サービス） |
| **計上（Billing）** | 売上・仕入を会計システムに記録すること |
| **RLS（Row Level Security）** | Supabaseのセキュリティ機能。ユーザーごとにアクセスできるデータを制限 |
| **App Router** | Next.js 13以降の新しいルーティング方式 |
| **Server Components** | サーバー側でレンダリングされるReactコンポーネント |
| **Toast** | 画面の隅に一時的に表示される通知メッセージ |

---

## 📚 参考リンク

### 公式ドキュメント

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/en-US/)

### プロジェクト内ドキュメント

- [要件定義書](./REQUIREMENTS.md)
- [開発タスク一覧](../todo.md)
- [開発ルール](../.github/copilot-instructions.md)

---

## 🤝 困ったときは

1. まずこのドキュメントを確認
2. `docs/REQUIREMENTS.md` で要件を確認
3. `todo.md` で実装状況を確認
4. チームメンバーに相談

---

**最終更新**: 2025年11月28日  
**作成者**: quote-sys 開発チーム
