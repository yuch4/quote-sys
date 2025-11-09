# 見積システム 詳細設計書

## 📚 ドキュメント一覧

本ディレクトリには、見積システムの各機能に関する詳細設計書が格納されています。

### 全体設計

#### [00_システム全体設計.md](./00_システム全体設計.md)
- システムアーキテクチャ
- 技術スタック
- ディレクトリ構造
- データフロー
- 認証・認可の概要
- 画面遷移図
- API設計
- 非機能要件

---

### 機能別詳細設計

#### [01_認証・認可機能設計.md](./01_認証・認可機能設計.md)
**対象機能**: ログイン、ユーザー管理、役割ベースアクセス制御（RBAC）

**主要内容**:
- Supabase Authを使用した認証フロー
- ユーザーデータモデル（users テーブル）
- ログイン/ログアウト処理
- Row Level Security（RLS）ポリシー
- 役割定義（営業、営業事務、管理者）
- セキュリティ対策

**関連ファイル**:
- `/lib/supabase/client.ts`
- `/lib/supabase/server.ts`
- `/lib/supabase/middleware.ts`
- `/middleware.ts`
- `/app/(auth)/login/page.tsx`

---

#### [02_案件管理機能設計.md](./02_案件管理機能設計.md)
**対象機能**: 案件の作成、編集、一覧表示、詳細表示、活動記録

**主要内容**:
- 案件データモデル（projects テーブル、project_activities テーブル）
- 案件一覧画面（検索、フィルタ、ソート）
- 案件作成画面（顧客選択、新規顧客登録）
- 案件詳細画面（見積一覧、発注書一覧、活動記録）
- ステータス管理（リード → 見積中 → 受注 → 計上OK → 計上済み）
- 契約確度管理（S/A/B/C/D）
- 活動記録機能

**関連ファイル**:
- `/app/(dashboard)/dashboard/projects/page.tsx`
- `/app/(dashboard)/dashboard/projects/new/page.tsx`
- `/app/(dashboard)/dashboard/projects/[id]/page.tsx`
- `/components/projects/project-filters.tsx`
- `/components/procurement/project-activity-form.tsx`
- `/lib/projects/status.ts`

---

#### [03_見積管理機能設計.md](./03_見積管理機能設計.md)
**対象機能**: 見積の作成、承認フロー、PDF生成、バージョン管理

**主要内容**:
- 見積データモデル（quotes テーブル、quote_items テーブル）
- 見積作成画面（明細入力、自動計算）
- 見積承認フロー（下書き → 承認待ち → 承認済み / 却下）
- 承認インスタンス管理（approval_instances）
- 見積書PDF自動生成（@react-pdf/renderer）
- バージョン管理（改訂機能）
- 見積番号の自動採番

**関連ファイル**:
- `/app/(dashboard)/dashboard/quotes/page.tsx`
- `/app/(dashboard)/dashboard/quotes/new/page.tsx`
- `/app/(dashboard)/dashboard/quotes/[id]/page.tsx`
- `/components/quotes/quote-pdf.tsx`
- `/components/quotes/approval-actions.tsx`
- `/lib/pdf/generate-quote-pdf.ts`

---

#### [04_発注・入荷管理機能設計.md](./04_発注・入荷管理機能設計.md)
**対象機能**: 発注書作成、発注承認、入荷登録、進捗管理

**主要内容**:
- 発注書データモデル（purchase_orders、purchase_order_items）
- 発注候補一覧（仕入要明細の抽出）
- 発注書作成（見積明細から自動/手動）
- 発注承認フロー
- 入荷登録画面
- 調達進捗ダッシュボード
- 長期未入荷アラート（14日以上）
- 活動記録（procurement_activities）
- CSVエクスポート

**関連ファイル**:
- `/app/(dashboard)/dashboard/procurement/page.tsx`
- `/app/(dashboard)/dashboard/procurement/pending/page.tsx`
- `/app/(dashboard)/dashboard/procurement/purchase-orders/page.tsx`
- `/app/(dashboard)/dashboard/procurement/receiving/page.tsx`
- `/components/purchase-orders/purchase-order-create-dialog.tsx`
- `/components/procurement/alert-reminder.tsx`

---

#### [05-09_その他機能設計.md](./05-09_その他機能設計.md)
**対象機能**: 計上管理、通知、レポート、マスタ管理、共通コンポーネント

**主要内容**:

##### **05. 計上管理機能**
- 計上申請データモデル（billing_requests）
- 営業ダッシュボード（申請可否の自動判定）
- 計上申請一覧（営業事務）
- 計上承認/却下処理
- CSVエクスポート（販売システム/ノーツ連携用）

##### **06. 通知機能**
- 通知データモデル（notifications）
- メール送信（Resend）
- システム内通知（ベルアイコン）
- Supabase Realtimeによるリアルタイム通知
- 通知種別（見積承認、計上申請、入荷完了、長期未入荷アラート）

##### **07. レポート・分析機能**
- 月次売上推移グラフ
- 営業担当別売上ランキング
- 顧客別売上ランキング
- 粗利分析
- 案件進捗分析（ステータス別、契約確度別）

##### **08. マスタ管理機能**
- 顧客マスタ（CRUD、CSV一括インポート）
- 仕入先マスタ（CRUD、CSV一括インポート）
- ユーザー管理（作成、編集、無効化、役割設定）

##### **09. 共通コンポーネント設計**
- UIコンポーネント（shadcn/ui）
- レイアウトコンポーネント（Sidebar、UserMenu）
- ユーティリティ関数（日付、通貨フォーマット）
- カスタムフック（useCurrentUser）

**関連ファイル**:
- `/app/(dashboard)/dashboard/billing/page.tsx`
- `/app/(dashboard)/dashboard/reports/page.tsx`
- `/app/(dashboard)/dashboard/settings/page.tsx`
- `/components/notifications/notification-bell.tsx`
- `/components/layout/sidebar.tsx`
- `/components/ui/*`
- `/lib/email/send.ts`
- `/lib/utils.ts`

---

## 🗂️ ディレクトリ構造

```
/docs
├── design/                           # 本ディレクトリ
│   ├── README.md                     # 本ファイル
│   ├── 00_システム全体設計.md
│   ├── 01_認証・認可機能設計.md
│   ├── 02_案件管理機能設計.md
│   ├── 03_見積管理機能設計.md
│   ├── 04_発注・入荷管理機能設計.md
│   └── 05-09_その他機能設計.md
├── REQUIREMENTS.md                   # 要件定義書
└── E2E_TEST_REPORT.md                # E2Eテストレポート
```

---

## 📖 使い方

### 1. 初めて読む方
まず **[00_システム全体設計.md](./00_システム全体設計.md)** を読んで、システム全体像を把握してください。

### 2. 機能実装時
実装する機能に対応する設計書を参照してください。各設計書には以下が含まれています:
- データモデル（テーブル定義、型定義）
- 画面設計（表示項目、入力項目、機能）
- 実装例（TypeScript/TSXコード）
- RLSポリシー
- テスト方針

### 3. コード理解時
実装済みのコードを理解する際、対応する設計書を参照することで、意図や設計思想を把握できます。

---

## 🔗 関連ドキュメント

- [要件定義書](../REQUIREMENTS.md): システムの要件、解決する課題、期待効果
- [E2Eテストレポート](../E2E_TEST_REPORT.md): E2Eテストの結果レポート
- [見積システムの問題点](../見積システムの問題点.md): 現状業務の課題分析

---

## 🛠️ 開発環境

詳細は [00_システム全体設計.md](./00_システム全体設計.md) の「技術スタック」セクションを参照。

**主要技術**:
- Next.js 16.0.1 (App Router)
- TypeScript 5.x
- Supabase (PostgreSQL + Auth + Storage)
- Tailwind CSS + shadcn/ui
- @react-pdf/renderer
- Resend (メール送信)
- Vitest + Playwright (テスト)

---

## 📝 更新履歴

| 日付 | 更新内容 | 担当者 |
|------|---------|--------|
| 2025-01-XX | 詳細設計書初版作成 | GitHub Copilot |

---

## 💡 質問・フィードバック

設計書に関する質問やフィードバックは、プロジェクトの担当者にお問い合わせください。
