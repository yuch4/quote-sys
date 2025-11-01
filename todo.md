# 見積システム開発タスク一覧

## 🎉 実装完了サマリー

### ✅ Phase 1: 基盤構築 - **完了**
- 開発環境セットアップ（Next.js 15, Supabase, shadcn/ui）
- Supabaseプロジェクト作成（Tokyo region, Project ID: fcqaounlphlmnlhzrqmj）
- データベーススキーマ構築（8テーブル + RLS + インデックス）
- 認証機能実装（ログイン/ログアウト、ミドルウェア）
- ダッシュボードレイアウト（サイドバー、ヘッダー）
- マスタ管理機能
  - 顧客マスタ（CRUD - Tabsで統合管理）
  - 仕入先マスタ（CRUD - Tabsで統合管理）
  - ユーザー管理（CRUD - Tabsで統合管理、管理者のみ）
- 案件管理機能（一覧・登録・編集・詳細）

### ✅ Phase 2: 見積機能 - **完了**
- 見積一覧ページ（フィルタ・検索機能付き）
- 見積作成ページ（動的明細、リアルタイム計算）
- 見積詳細ページ（全情報表示）
- 見積編集ページ（下書きのみ編集可）
- 見積承認フロー
  - 承認依頼、承認/却下機能
  - 下書きに戻す機能
  - 役割ベースの権限制御
- 見積書PDF生成
  - @react-pdf/rendererでPDF生成
  - Supabase Storageへアップロード
  - PDFダウンロード機能
- 見積改訂機能
  - バージョン管理（v1, v2, v3...）
  - 改訂版作成
  - バージョン履歴表示

### ✅ Phase 3: 発注・入荷管理 - **完了**
- 発注待ち一覧ページ
  - 承認済み見積から仕入要=trueの明細を抽出
  - ステータス・仕入先・検索フィルター
  - チェックボックスによる複数選択
  - 一括発注登録（procurement_logsへ記録）
  - CSVエクスポート機能
- 入荷登録ページ
  - 発注済み明細の検索・表示
  - 経過日数アラート（7日以上黄色、14日以上赤色）
  - 入荷登録フォーム（日付・数量・備考）
  - 部分入荷対応
  - ステータス自動更新
- 進捗ダッシュボード
  - 統計カード（未発注・発注済み・入荷済み・長期未入荷）
  - 長期未入荷アラート（14日以上）
  - 仕入先別サマリー
  - 最近の発注済み明細一覧

### ✅ Phase 4: 計上管理 - **完了**
- 計上可能案件一覧
  - 全明細入荷済み案件の自動判定
  - 売上・粗利・粗利率表示
  - ステータス別フィルター（未申請/申請中/承認済み/差戻し）
- 計上申請機能（営業担当）
  - 計上日・備考入力
  - billing_requestsテーブルへ登録
  - 差戻し後の再申請
- 計上承認機能（営業事務・管理者）
  - 申請一覧表示
  - 承認・差戻し処理
  - 差戻し理由記録
- 統計ダッシュボード
  - 計上可能・申請中・承認済み・差戻し件数

### ✅ Phase 5: マスタ管理・レポート - **完了**
- マスタデータ管理画面（/dashboard/settings）
  - タブ式UI（顧客・仕入先・ユーザー）
  - 各マスタのCRUD機能統合
  - ダイアログによる登録・編集
  - 営業事務・管理者のみアクセス可
- レポート・業績分析（/dashboard/reports）
  - 全体統計（総売上・総粗利・案件数・平均粗利率）
  - 営業担当別実績テーブル
    - 案件数・承認済み数・売上・粗利・粗利率
    - 計上済み・計上待ち件数
  - 案件別詳細テーブル
    - 案件ごとの売上・原価・粗利・粗利率
    - 計上状況バッジ表示
  - 営業担当フィルター（営業事務・管理者）
  - 粗利率による色分け表示（20%以上緑、10-20%青、10%未満赤）

### ✅ Phase 6: 総合テスト・最適化 - **完了**
- TypeScript型エラー修正
  - Supabaseクエリ結果の型キャスト
  - 暗黙的any型の明示的型注釈
- コンポーネント追加
  - Tabsコンポーネント（マスタ管理用）
  - Textareaコンポーネント（計上申請備考用）
- ドキュメント整備
  - README更新（システム概要、機能説明、セットアップ手順）
  - 技術スタック・データベース構造記載
  - デプロイ手順記載

### ✅ Phase 7: UI/UX改善・通知機能 - **完了**
- Toast通知システム（sonner）
  - ライブラリインストール・設定
  - 主要ページのalert()をtoastに置換（見積作成・編集、案件作成、マスタ管理）
  - 成功・エラー・情報通知の実装
- ダッシュボード機能強化
  - KPIカード4種（総案件数、承認済み見積数、今月売上、今月粗利）
  - アラート機能（承認待ち見積、長期未入荷明細）
  - 最近の見積活動一覧
  - 役割別データフィルタリング
- レポートグラフ化（Recharts）
  - 月次売上・粗利推移ラインチャート（過去6ヶ月）
  - 営業担当別売上ランキング棒グラフ（トップ5）
  - レスポンシブデザイン対応
- システム内通知機能
  - notificationsテーブル作成（9番目のテーブル）
  - ベルアイコン・未読件数バッジ表示
  - 通知一覧Sheet（引き出し式UI）
  - リアルタイム通知更新（Supabase Realtime）
  - 既読管理（個別・一括既読）
  - 通知タイプ別色分け・リンク機能
- UI/UXコンポーネント追加
  - Skeletonローダーコンポーネント
  - Sheetコンポーネント（通知用）
- バグ修正
  - 案件作成時の顧客インライン登録（customer_code自動生成）

### ✅ Phase 9: パフォーマンス最適化 - **完了**
- ページネーション実装
  - shadcn/ui Paginationコンポーネント追加
  - 見積一覧: Server Components + searchParams + .range()（20件/ページ）
  - 案件一覧: Server Components + searchParams + .range()（20件/ページ）
  - 発注待ち一覧: Client Component + useSearchParams + クライアントサイドページネーション（20件/ページ）
  - スマートページ番号表示（最初2、最後2、現在±1、省略記号）
  - 前へ/次へボタン、URLベースのページ管理

### ✅ Phase 10: レスポンシブデザイン - **完了**
- サイドバーのレスポンシブ対応
  - デスクトップ: 固定サイドバー（256px幅、アイコン付きナビゲーション）
  - モバイル: ハンバーガーメニュー → Sheetコンポーネントでドロワー表示
  - lucide-reactアイコン統合
  - Sidebarコンポーネント化（/components/layout/sidebar.tsx）
  - MobileSidebarコンポーネント作成（/components/layout/mobile-sidebar.tsx）
- テーブルのレスポンシブ対応
  - 見積一覧: デスクトップ=テーブル、モバイル=カード表示
  - 案件一覧: デスクトップ=テーブル、モバイル=カード表示
  - カード形式で重要情報を縦積み、見やすく整理
- フォームのレスポンシブ対応
  - 案件登録フォーム: グリッド `grid-cols-1 md:grid-cols-2`
  - 見積登録フォーム: グリッド `grid-cols-1 md:grid-cols-2`
  - ヘッダー: フレキシブルレイアウト（縦→横）
- ダッシュボードのレスポンシブ対応
  - KPIカード: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - アラートカード: `grid-cols-1 lg:grid-cols-2`
  - テキストサイズ調整（`text-2xl md:text-3xl`）
  - パディング調整（`p-4 md:p-6`）
- レポートページのレスポンシブ対応
  - 統計カード: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`
  - フィルター: モバイルで幅100%、デスクトップで固定幅
- ブレークポイント戦略
  - モバイル: ~768px未満（md未満）
  - タブレット: 768px~1024px（md~lg）
  - デスクトップ: 1024px以上（lg以上）

### ✅ Phase 8: メール通知機能 - **完了**
- Resend統合
  - Resendライブラリインストール・設定（/lib/email/resend.ts）
  - API Key環境変数設定（RESEND_API_KEY、EMAIL_FROM）
  - メール送信API Route作成（/app/api/email/send/route.ts）
- HTMLメールテンプレート作成（/lib/email/templates.ts）
  - 見積承認/却下通知テンプレート（ステータスバッジ、案件情報、却下理由）
  - 計上申請/承認/差戻し通知テンプレート（申請タイプ別、差戻し理由）
  - 長期未入荷アラートテンプレート（明細一覧、経過日数、発注日）
  - レスポンシブデザイン、ブランドカラー、アクションボタン
- メール送信ユーティリティ作成（/lib/email/send.ts）
  - sendQuoteApprovalEmail: 見積承認/却下時に営業担当へ通知
  - sendBillingRequestEmail: 計上申請・承認・差戻し通知（new/approved/rejected）
  - sendLongDelayAlertEmail: 14日以上未入荷明細を営業事務へ通知
- 見積承認フローへの統合
  - approveQuote: 承認時にメール送信
  - rejectQuote: 却下時にメール送信（却下理由含む）
  - /app/(dashboard)/dashboard/quotes/[id]/actions.ts
- 計上管理フローへの統合
  - 計上申請時: 営業事務へメール送信（new）
  - 承認時: 営業担当へメール送信（approved）
  - 差戻し時: 営業担当へメール送信（rejected、差戻し理由含む）
  - /app/(dashboard)/dashboard/billing/page.tsx
- 長期未入荷アラート
  - Cron Job API作成（/app/api/cron/long-delay-alert/route.ts）
  - 14日以上未入荷の明細を自動検出
  - 営業事務・管理者へ一括メール送信
  - 認証トークン保護（CRON_SECRET）
- 環境変数設定
  - .env.exampleファイル作成
  - README更新（メール通知機能、環境変数説明）

---

## 📊 システム概要

### 達成目標
**月35-40時間 → 3-4時間**への業務時間削減

### 主要機能
1. **案件管理**: 自動採番（P-YYYY-XXXX）、CRUD
2. **見積管理**: 作成・編集・承認・PDF・バージョン管理
3. **発注管理**: 待ち一覧・一括発注・入荷登録・進捗ダッシュボード
4. **計上管理**: 可能案件判定・申請・承認ワークフロー
5. **マスタ管理**: 顧客・仕入先・ユーザーCRUD
6. **レポート**: 営業別実績・粗利分析・案件統計

### 権限体系
- **営業**: 自分の案件・見積・計上申請
- **営業事務**: 全案件・見積承認・発注管理・計上承認・マスタ管理
- **管理者**: 全機能 + ユーザー管理

---

## 🔄 ビジネスフロー

### 1. 見積フロー
```
案件登録 → 見積作成（下書き） → 承認申請 → 営業事務承認 → 承認済み
                              ↓
                            差戻し → 修正 → 再申請
承認済み → 改訂作成（新バージョン） → 下書き → 承認申請...
```

### 2. 発注フロー
```
承認済み見積 → 仕入要明細抽出 → 発注待ち一覧
                              ↓
                        一括発注登録 → 発注済み
                              ↓
                        入荷登録 → 入荷済み
                              ↓
                    （部分入荷の場合は発注済みのまま）
```

### 3. 計上フロー
```
全明細入荷済み → 計上可能判定 → 営業が計上申請
                              ↓
                  営業事務が承認/差戻し → 承認済み
                              ↓
                            差戻し → 再申請
```

---

## 📁 プロジェクト構造（最新）

```
quote-sys/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # ダッシュボード（KPI・アラート・最近の活動）✨
│   │   │   ├── projects/            # 案件管理
│   │   │   │   ├── page.tsx         # 一覧
│   │   │   │   ├── new/             # 新規作成
│   │   │   │   └── [id]/            # 詳細・編集
│   │   │   ├── quotes/              # 見積管理
│   │   │   │   ├── page.tsx         # 一覧
│   │   │   │   ├── new/             # 新規作成
│   │   │   │   └── [id]/            # 詳細・編集・改訂
│   │   │   ├── procurement/         # 発注管理
│   │   │   │   ├── page.tsx         # 進捗ダッシュボード
│   │   │   │   ├── pending/         # 発注待ち一覧
│   │   │   │   └── receiving/       # 入荷登録
│   │   │   ├── billing/             # 計上管理
│   │   │   │   └── page.tsx         # 計上可能案件・申請・承認
│   │   │   ├── reports/             # レポート
│   │   │   │   └── page.tsx         # 業績分析・グラフ ✨
│   │   │   └── settings/            # マスタ管理
│   │   │       └── page.tsx         # 顧客・仕入先・ユーザー統合管理
│   │   └── layout.tsx               # ダッシュボードレイアウト（Toaster・通知ベル）✨
│   ├── login/                       # ログイン
│   └── api/auth/                    # 認証API
├── components/
│   ├── ui/                          # shadcn/uiコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── checkbox.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── skeleton.tsx             ✨ NEW
│   │   └── sheet.tsx                ✨ NEW
│   ├── quotes/                      # 見積関連コンポーネント
│   │   ├── approval-actions.tsx
│   │   ├── pdf-generate-button.tsx
│   │   ├── quote-pdf.tsx
│   │   └── version-history.tsx
│   └── notifications/               ✨ NEW
│       └── notification-bell.tsx    # 通知ベルアイコン・Sheet UI
├── lib/
│   ├── supabase/                    # Supabase設定
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── pdf/                         # PDF生成
│       └── generate-quote-pdf.ts
├── supabase/
│   └── migrations/                  # DBマイグレーション
│       ├── 20250101000000_initial_schema.sql
│       └── 20251101000001_add_notifications.sql  ✨ NEW
├── docs/
│   └── REQUIREMENTS.md              # 要件定義書
├── .github/
│   └── copilot-instructions.md      # 開発ルール
├── middleware.ts                    # 認証ミドルウェア
├── README.md                        # システム説明書 ✨
└── todo.md                          # このファイル
```

---

## 🗄️ データベーステーブル

| テーブル名 | 説明 | 主要カラム |
|:---|:---|:---|
| **users** | ユーザー情報 | id, email, display_name, role |
| **customers** | 顧客マスタ | id, customer_name, customer_code, contact_person, email, phone |
| **suppliers** | 仕入先マスタ | id, supplier_name, contact_person, email, phone |
| **projects** | 案件 | id, project_number, project_name, customer_id, sales_rep_id |
| **quotes** | 見積ヘッダ | id, quote_number, version, approval_status, project_id |
| **quote_items** | 見積明細 | id, product_name, quantity, unit_price, requires_procurement, procurement_status |
| **procurement_logs** | 発注・入荷履歴 | id, quote_item_id, action_type, action_date, quantity |
| **billing_requests** | 計上申請 | id, quote_id, billing_date, status, requested_by, approved_by |
| **notifications** | システム通知 | id, user_id, title, message, type, link_url, is_read, created_at |

---

## 🚀 次のフェーズ（今後の拡張）

### Phase 8: メール通知機能（優先度：中）
- [ ] Resend統合
  - [ ] API Key設定
  - [ ] メールテンプレート作成
- [ ] 見積承認/差戻し通知
- [ ] 計上申請/承認通知
- [ ] 長期未入荷アラート

### Phase 9: パフォーマンス最適化（優先度：高）
- [ ] ページネーション実装
  - [ ] 見積一覧・案件一覧（1ページ20件）
  - [ ] 発注待ち一覧
  - [ ] レポート一覧
- [ ] クエリ最適化
  - [ ] N+1問題の解消
  - [ ] 不要なJOINの削減
- [ ] キャッシング戦略
  - [ ] React Query導入検討
  - [ ] Server Component最適化

### Phase 10: レスポンシブ対応強化（優先度：高）
- [ ] モバイルUI最適化
  - [ ] テーブルをカード表示に切替
  - [ ] タッチ操作最適化
- [ ] タブレット対応
  - [ ] 中間サイズでのレイアウト調整
- [ ] ブレークポイント統一

### Phase 11: 高度なレポート（優先度：中）
- [ ] 期間フィルター
  - [ ] 月次・四半期・年次切替
  - [ ] カスタム期間指定
- [ ] 顧客別売上ランキング
- [ ] 案件カテゴリ別分析
- [ ] CSVエクスポート（レポートデータ）

### Phase 12: テスト実装（優先度：高）
- [ ] 単体テスト（Vitest）
  - [ ] ユーティリティ関数
  - [ ] 計算ロジック
  - [ ] バリデーション
- [ ] E2Eテスト（Playwright）
  - [ ] ログイン〜見積作成
  - [ ] 承認フロー
  - [ ] 発注〜入荷登録
  - [ ] 計上申請〜承認

### Phase 13: 本番リリース準備（優先度：高）
- [ ] Vercelデプロイ
  - [ ] プロジェクト作成・設定
  - [ ] 環境変数設定
  - [ ] ドメイン設定
- [ ] Supabase本番環境
  - [ ] 本番プロジェクト作成
  - [ ] RLSポリシー確認
  - [ ] Storageバケット作成（documents）
- [ ] セキュリティチェック
  - [ ] 環境変数の保護
  - [ ] CORS設定
  - [ ] レート制限
- [ ] バックアップ設定
  - [ ] 自動バックアップ有効化
  - [ ] 復元手順確立
- [ ] ユーザートレーニング
  - [ ] マニュアル作成
  - [ ] ハンズオン実施

---

## 💡 今後の拡張アイデア

### 機能拡張
- [ ] 見積テンプレート機能
- [ ] 一括見積作成
- [ ] 見積比較機能（バージョン間diff）
- [ ] AIによる見積金額提案
- [ ] Slack/Teams通知連携
- [ ] モバイルアプリ（React Native）

### データ分析
- [ ] ダッシュボード強化
  - KPI表示
  - 目標達成率
  - トレンド分析
- [ ] 予測機能
  - 売上予測
  - 在庫予測
  - リードタイム分析

---

## 🛠️ 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **UIライブラリ**: shadcn/ui
- **アイコン**: lucide-react
- **PDF生成**: @react-pdf/renderer
- **通知**: sonner (Toast通知)
- **グラフ**: recharts (チャート・グラフ)

### バックエンド
- **BaaS**: Supabase
  - PostgreSQL (Tokyo region)
  - Supabase Auth
  - Supabase Storage
  - Supabase Realtime（通知機能）
  - Row Level Security (RLS)
- **API**: Server Actions / Server Components

### インフラ
- **ホスティング**: Vercel（予定）
- **開発サーバー**: localhost:3000
- **Git**: GitHub (yuch4/quote-sys)

---

## 📝 Git コミット履歴（主要）

```
feat: Phase 1完了 - 認証・DB・マスタ・案件管理
feat: 見積一覧・作成機能実装
feat: 見積詳細・編集機能実装
feat: 見積承認フロー実装
feat: 見積書PDF生成機能実装
feat: 見積改訂機能とバージョン履歴表示実装
feat: 発注待ち一覧・一括発注機能実装
feat: 入荷登録ページ実装
feat: 発注・入荷進捗ダッシュボード実装
feat: 計上管理機能実装（申請・承認・差戻し）
feat: マスタデータ管理画面実装（顧客・仕入先・ユーザー）
feat: レポート・業績分析機能実装
fix: 型エラー修正とコンポーネント追加
docs: README更新（システム概要、機能説明、セットアップ手順）
feat: Toast通知システム実装（sonner）
feat: 案件作成時の顧客インライン登録修正
feat: ダッシュボード機能強化（KPI、アラート、最近の活動）
feat: レポートグラフ化（Recharts - 月次売上推移、営業別ランキング）
feat: Skeletonローダーコンポーネント追加
feat: システム内通知機能実装（ベルアイコン、リアルタイム更新）
docs: README・todo.md更新（Phase 7完了状況反映）
```

---

## 📋 開発メモ

### Supabase情報
- **Project ID**: `fcqaounlphlmnlhzrqmj`
- **Region**: `ap-northeast-1` (Tokyo)
- **URL**: `https://fcqaounlphlmnlhzrqmj.supabase.co`
- **テーブル数**: 9（notifications追加）

### 開発サーバー起動
```bash
npm run dev
```

### 環境変数 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 実装時の注意点
1. **型安全性**: Supabaseクエリ結果は`as any`でキャスト（型定義が複雑なため）
2. **権限チェック**: 各ページで`user.role`を確認し、アクセス制御
3. **ステータス管理**: procurement_status、approval_status、billing_statusの整合性
4. **部分入荷**: 入荷数量が発注数量未満の場合、ステータスを「発注済み」のまま維持
5. **バージョン管理**: 見積改訂時は`previous_version_id`で旧バージョンを参照
6. **通知**: Supabase Realtimeで自動更新、cleanup処理を必ず実装
7. **Toast**: sonnerのtoast.success/error/infoを使用、alert()は非推奨

---

## ✅ 開発完了チェックリスト

### Phase 1-7（完了済み）
- [x] 認証・権限管理
- [x] データベース構築（9テーブル：users, customers, suppliers, projects, quotes, quote_items, procurement_logs, billing_requests, notifications）
- [x] マスタ管理（顧客・仕入先・ユーザー）
- [x] 案件管理（CRUD）
- [x] 見積管理（CRUD・承認・PDF・バージョン管理）
- [x] 発注管理（待ち一覧・発注・入荷・ダッシュボード）
- [x] 計上管理（判定・申請・承認）
- [x] レポート（営業実績・粗利分析・グラフ化）
- [x] Toast通知システム（sonner）
- [x] ダッシュボード強化（KPI・アラート・最近の活動）
- [x] システム内通知（ベルアイコン・リアルタイム更新）
- [x] Skeletonローダー
- [x] 型エラー修正
- [x] README・todo.md整備

### Phase 8以降（今後）
- [ ] メール通知（Resend）
- [ ] ページネーション（20件/ページ）
- [ ] レスポンシブ対応強化
- [ ] 高度なレポート（期間フィルター、顧客別分析）
- [ ] パフォーマンス最適化（クエリ最適化、キャッシング）
- [ ] テスト実装（単体・E2E）
- [ ] 本番リリース準備

---

**最終更新**: 2025年11月1日  
**ステータス**: Phase 1-7完了  

**Phase 7で実装完了した機能**:
- ✅ Toast通知システム（sonner）- alert()からの完全移行
- ✅ ダッシュボード機能強化（KPIカード、承認待ち・長期未入荷アラート、最近の見積活動）
- ✅ レポートグラフ化（Recharts - 月次売上推移、営業別ランキング）
- ✅ システム内通知機能（ベルアイコン、未読件数、リアルタイム更新、Sheet UI）
- ✅ Skeletonローダーコンポーネント
- ✅ 案件作成時の顧客インライン登録修正（customer_code自動生成）

**次の優先実装（Phase 8-10）**:
- メール通知（Resend統合）
- ページネーション（見積・案件一覧で20件/ページ）
- レスポンシブ対応強化（モバイル・タブレット最適化）
- 高度なレポート（期間フィルター、顧客別分析）
