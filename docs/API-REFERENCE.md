# API リファレンス

本ドキュメントでは、見積管理システム（quote-sys）のAPI仕様について説明します。

## 目次

- [概要](#概要)
- [認証・認可](#認証認可)
- [Server Actions](#server-actions)
- [API Routes](#api-routes)
- [エラーハンドリング](#エラーハンドリング)

---

## 概要

このシステムでは、Next.js 15のApp Router機能を活用し、以下の2つの方法でサーバーサイド処理を実装しています：

| 方式 | 用途 | 特徴 |
|------|------|------|
| **Server Actions** | フォーム送信、データ更新 | `'use server'`ディレクティブで定義、型安全 |
| **API Routes** | 外部連携、重い処理 | RESTful エンドポイント、認証ヘッダー対応 |

---

## 認証・認可

### 認証方式

- **Supabase Auth** を使用したメール/パスワード認証
- セッション管理は Supabase SSR 経由でCookieベース
- ミドルウェアで全リクエストに対してセッションを検証

### 認証フロー

```
1. ユーザー → /login ページでログイン
2. Supabase Auth が認証トークンを発行
3. Cookie にセッション情報を保存
4. ミドルウェアがリクエストごとにセッションを検証
5. 未認証の場合は /login にリダイレクト
```

### ロール（役割）

| ロール | 説明 | 主な権限 |
|--------|------|----------|
| `営業` | 営業担当者 | 自分の案件・見積の作成・編集、計上申請 |
| `営業事務` | 事務担当者 | 全案件閲覧、発注管理、入荷登録、計上承認 |
| `管理者` | システム管理者 | 全権限 + ユーザー管理、マスタ管理 |

### Row Level Security (RLS)

データベースレベルでのアクセス制御を実施。詳細は [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) を参照。

---

## Server Actions

Server Actionsは `'use server'` ディレクティブで定義された関数で、クライアントから直接呼び出せます。

### 案件管理 (Projects)

**ファイル:** `app/(dashboard)/dashboard/projects/actions.ts`

#### updateProjectStatus

案件のステータスを更新します。

```typescript
async function updateProjectStatus(params: {
  projectId: string
  status: string
}): Promise<{ success: boolean; message?: string }>
```

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| projectId | string | ✓ | 案件ID（UUID） |
| status | string | ✓ | 新しいステータス |

**有効なステータス値:**
- `リード` - 見込み客段階
- `見積中` - 見積作成中
- `受注` - 受注確定
- `計上OK` - 計上準備完了
- `計上済み` - 計上処理完了
- `失注` - 失注
- `キャンセル` - キャンセル

**レスポンス例:**
```json
{ "success": true }
// または
{ "success": false, "message": "無効なステータスです。" }
```

---

### 見積管理 (Quotes)

**ファイル:** `app/(dashboard)/dashboard/quotes/[id]/actions.ts`

#### requestApproval

見積の承認依頼を送信します。

```typescript
async function requestApproval(quoteId: string): Promise<{
  success: boolean
  message: string
}>
```

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| quoteId | string | ✓ | 見積ID（UUID） |

**前提条件:**
- 見積のステータスが `下書き` であること
- 依頼者が見積の作成者、または営業事務/管理者であること
- 適用可能な承認フローが存在すること

**処理フロー:**
1. ユーザー情報・見積情報を取得
2. 見積金額に適合する承認ルートを検索
3. 承認インスタンス・ステップを作成
4. 見積ステータスを `承認待ち` に更新
5. キャッシュを再検証

---

#### approveQuote

見積を承認します。

```typescript
async function approveQuote(quoteId: string, userId: string): Promise<{
  success: boolean
  message: string
}>
```

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| quoteId | string | ✓ | 見積ID |
| userId | string | ✓ | 承認者のユーザーID |

**承認ルール:**
- 承認者のロールが現在のステップの承認ロールと一致していること
- 全ステップ完了時に見積ステータスを `承認済み` に更新
- 案件ステータスを自動で `見積中` に更新

---

#### rejectQuote

見積を却下します。

```typescript
async function rejectQuote(
  quoteId: string,
  userId: string,
  rejectReason?: string
): Promise<{ success: boolean; message: string }>
```

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| quoteId | string | ✓ | 見積ID |
| userId | string | ✓ | 却下者のユーザーID |
| rejectReason | string | - | 却下理由 |

---

#### returnToDraft

却下された見積を下書きに戻します。

```typescript
async function returnToDraft(quoteId: string): Promise<{
  success: boolean
  message: string
}>
```

---

#### createPurchaseOrders

見積明細から発注書を作成します。

```typescript
async function createPurchaseOrders(payload: {
  quoteId: string
  itemIds: string[]
  orderDate?: string
  combineBySupplier: boolean
  notes?: string
}): Promise<{
  success: boolean
  ordersCreated?: number
  message: string
}>
```

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| quoteId | string | ✓ | 見積ID |
| itemIds | string[] | ✓ | 発注対象の明細ID配列 |
| orderDate | string | - | 発注日（省略時は当日） |
| combineBySupplier | boolean | ✓ | 仕入先別にまとめるか |
| notes | string | - | 備考 |

---

### 発注管理 (Purchase Orders)

**ファイル:** `app/(dashboard)/dashboard/procurement/purchase-orders/actions.ts`

#### updatePurchaseOrder

発注書を更新します。

```typescript
async function updatePurchaseOrder(payload: {
  purchaseOrderId: string
  orderDate?: string
  status: '未発注' | '発注済' | 'キャンセル'
  notes?: string | null
}): Promise<{ success: boolean; message: string }>
```

**ステータス遷移ルール:**
- `発注済` への変更は承認完了後のみ可能
- `発注済` 変更時に見積明細のステータスも `発注済` に更新
- 発注履歴（procurement_logs）に記録

---

#### createStandalonePurchaseOrder

見積に紐づかない独立した発注書を作成します。

```typescript
async function createStandalonePurchaseOrder(payload: {
  supplierId: string
  orderDate?: string
  notes?: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    unitCost: number
  }>
}): Promise<{ success: boolean; message: string }>
```

---

#### requestPurchaseOrderApproval

発注書の承認依頼を送信します。

```typescript
async function requestPurchaseOrderApproval(
  purchaseOrderId: string
): Promise<{ success: boolean; message: string }>
```

---

#### approvePurchaseOrder / rejectPurchaseOrder

発注書を承認/却下します。

```typescript
async function approvePurchaseOrder(
  purchaseOrderId: string,
  userId: string
): Promise<{ success: boolean; message: string }>

async function rejectPurchaseOrder(
  purchaseOrderId: string,
  userId: string,
  rejectReason?: string
): Promise<{ success: boolean; message: string }>
```

---

#### cancelPurchaseOrderApproval

発注書の承認を取り消し、下書きに戻します。

```typescript
async function cancelPurchaseOrderApproval(
  purchaseOrderId: string
): Promise<{ success: boolean; message: string }>
```

---

### 活動記録 (Project Activities)

**ファイル:** `app/(dashboard)/dashboard/procurement/activity/actions.ts`

#### createProjectActivity

案件に活動記録を追加します。

```typescript
async function createProjectActivity(input: {
  projectId: string
  activityDate: string
  subject: string
  details?: string
  nextAction?: string
  nextActionDueDate?: string
}): Promise<{ success: boolean; message?: string }>
```

---

### テンプレート管理 (Templates)

**ファイル:** `app/(dashboard)/dashboard/settings/templates/actions.ts`

#### getTemplates

全テンプレート一覧を取得します。

```typescript
async function getTemplates(): Promise<Template[]>
```

---

#### getTemplate

指定IDのテンプレートを取得します。

```typescript
async function getTemplate(id: string): Promise<Template | null>
```

---

#### createTemplate / updateTemplate

テンプレートを作成/更新します。

```typescript
async function createTemplate(formData: {
  name: string
  description?: string
  target_entity: 'quote' | 'purchase_order'
  html_content: string
  css_content?: string
  settings_json?: string | null
  is_active: boolean
  is_default: boolean
}): Promise<{ success: boolean; message: string; data?: Template }>
```

---

#### deleteTemplate / duplicateTemplate

テンプレートを削除/複製します。

```typescript
async function deleteTemplate(id: string): Promise<{ success: boolean; message: string }>
async function duplicateTemplate(id: string): Promise<{ success: boolean; message: string; data?: Template }>
```

---

### グループ会社管理 (Group Companies)

**ファイル:** `app/(dashboard)/dashboard/settings/group-companies/actions.ts`

#### fetchGroupCompanySummaries

グループ会社一覧を取得（システム利用状況サマリー付き）。

```typescript
async function fetchGroupCompanySummaries(): Promise<ActionResult<Array<
  GroupCompany & {
    system_usage_count: number
    security_control_count: number
    system_names: string[]
    security_products: string[]
  }
>>>
```

---

#### fetchGroupCompanyDetail

グループ会社の詳細を取得。

```typescript
async function fetchGroupCompanyDetail(id: string): Promise<ActionResult<
  GroupCompany & {
    system_usage: CompanySystemUsage[]
    security_controls: CompanySecurityControl[]
  }
>>
```

---

#### fetchSystemUsageAnalytics

システム利用状況の分析データを取得。

```typescript
async function fetchSystemUsageAnalytics(): Promise<ActionResult<SystemUsageAnalytics>>
```

**レスポンス内容:**
- `total_companies` - 会社総数
- `total_system_records` - システム登録総数
- `avg_systems_per_company` - 会社あたり平均システム数
- `estimated_annual_cost` - 推定年間コスト
- `adoption_by_category` - カテゴリ別導入状況
- `vendor_adoption` - ベンダー別導入状況
- `standardization_candidates` - 標準化候補

---

#### simulateVendorConsolidation

ベンダー統合シミュレーションを実行。

```typescript
async function simulateVendorConsolidation(input: {
  vendor: string
  discount_rate?: number
  include_unassigned?: boolean
}): Promise<ActionResult<VendorConsolidationScenario>>
```

---

#### upsertGroupCompany / deleteGroupCompany

グループ会社を登録/更新/削除。

```typescript
async function upsertGroupCompany(input: GroupCompanyInput): Promise<ActionResult<{ id: string }>>
async function deleteGroupCompany(id: string): Promise<ActionResult<{ id: string }>>
```

---

## API Routes

RESTful APIエンドポイントです。

### PDF生成

#### POST /api/pdf/generate

見積データからPDFを生成します。

**リクエスト:**
```json
{
  "quoteId": "uuid",
  "templateId": "uuid (optional)",
  "applyStamps": false,
  "fileType": "draft | final"
}
```

**レスポンス (200):**
```json
{
  "success": true,
  "url": "https://...",
  "fileName": "Q-2024-0001_v1.pdf",
  "fileSize": 12345,
  "sha256Hash": "abc123...",
  "stampsApplied": 0
}
```

**制限事項:**
- `fileType: "final"` は承認済みの見積のみ
- `maxDuration: 60秒` (Vercel Pro/Enterprise)

---

#### POST /api/pdf/preview

プレビューHTMLを生成します。

**リクエスト:**
```json
{
  "quoteId": "uuid (optional)",
  "templateId": "uuid (optional)",
  "htmlTemplate": "string (optional)",
  "cssTemplate": "string (optional)",
  "useSampleData": false
}
```

**レスポンス (200):**
```json
{
  "success": true,
  "html": "<html>...</html>"
}
```

---

### メール送信

#### POST /api/email/send

メールを送信します。

**リクエスト:**
```json
{
  "type": "quote_approval | billing_request | long_delay_alert",
  "recipientEmail": "user@example.com",
  // type に応じた追加フィールド
}
```

**メールタイプ:**

| type | 用途 | 追加フィールド |
|------|------|----------------|
| `quote_approval` | 見積承認通知 | quoteNumber, status |
| `billing_request` | 計上申請通知 | projectName, requestType |
| `long_delay_alert` | 長期未入荷アラート | items (配列) |

---

#### POST /api/email/ticket-notification

チケット通知メールを送信します。

**リクエスト:**
```json
{
  "type": "ticket_created | ticket_updated | ticket_resolved | ticket_comment | ticket_assigned",
  "ticketId": "uuid",
  "recipientEmail": "user@example.com",
  "recipientName": "string (optional)",
  "additionalInfo": { ... }
}
```

---

### Cron ジョブ

#### GET/POST /api/cron/long-delay-alert

長期未入荷アラートを送信します。

**認証:**
```
Authorization: Bearer {CRON_SECRET}
```

**用途:** Vercel Cron、GitHub Actions、外部Cronサービスから定期実行

---

### 認証

#### POST /api/auth/logout

ログアウト処理を行い、`/login` にリダイレクトします。

---

#### POST /api/portal/auth

顧客ポータルの認証（招待トークン検証）。

**リクエスト:**
```json
{
  "token": "招待トークン",
  "email": "顧客メールアドレス"
}
```

**レスポンス (200):**
```json
{
  "success": true,
  "session": {
    "session_token": "xxx",
    "customer_name": "顧客名"
  }
}
```

**Cookie設定:**
- `portal_session`: HTTPOnly, Secure, 7日間有効

---

## エラーハンドリング

### Server Actions

Server Actionsは以下の形式でエラーを返します：

```typescript
{
  success: false,
  message: "エラーメッセージ"
}
```

**一般的なエラー:**
- `認証が必要です` - 未ログイン
- `ユーザー情報の取得に失敗しました` - セッション無効
- `権限がありません` - ロール不足
- `データの取得に失敗しました` - DB接続エラー

### API Routes

API Routesは標準的なHTTPステータスコードを返します：

| ステータス | 説明 |
|------------|------|
| 200 | 成功 |
| 400 | リクエスト不正（バリデーションエラー） |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソース不存在 |
| 500 | サーバーエラー |

**エラーレスポンス形式:**
```json
{
  "error": "エラーメッセージ",
  "details": { ... }  // オプション
}
```

---

## 関連ドキュメント

- [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) - データベース設計書
- [BUSINESS-LOGIC.md](./BUSINESS-LOGIC.md) - ビジネスロジック仕様書
- [TECH-STACK.md](./TECH-STACK.md) - 技術スタック詳細
