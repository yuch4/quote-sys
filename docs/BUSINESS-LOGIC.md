# ビジネスロジック仕様書

本ドキュメントでは、見積管理システム（quote-sys）のビジネスロジックについて詳細に説明します。

## 目次

- [概要](#概要)
- [見積承認フロー](#見積承認フロー)
- [発注・入荷フロー](#発注入荷フロー)
- [計上フロー](#計上フロー)
- [権限・アクセス制御](#権限アクセス制御)
- [ステータス遷移](#ステータス遷移)
- [自動計算ロジック](#自動計算ロジック)

---

## 概要

### ビジネスフロー全体像

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              【見積から計上までの流れ】                          │
└─────────────────────────────────────────────────────────────────────────────────┘

  【営業】                    【営業事務】                  【管理者】
     │                            │                            │
     ▼                            │                            │
 ┌──────────┐                     │                            │
 │ 案件登録 │                     │                            │
 └────┬─────┘                     │                            │
      │                           │                            │
      ▼                           │                            │
 ┌──────────┐                     │                            │
 │ 見積作成 │                     │                            │
 │ (下書き) │                     │                            │
 └────┬─────┘                     │                            │
      │                           │                            │
      ▼                           ▼                            ▼
 ┌──────────┐              ┌──────────┐                ┌──────────┐
 │承認依頼  │─────────────▶│  承認    │────(条件)────▶│  承認    │
 └────┬─────┘              │ or 却下  │                │ or 却下  │
      │                    └────┬─────┘                └────┬─────┘
      │                         │                            │
      │◄────────────────────────┴────────────────────────────┘
      │           (承認完了)
      ▼
 ┌──────────┐
 │承認済み  │
 │ PDF生成  │
 └────┬─────┘
      │
      ▼
 ┌──────────┐              ┌──────────┐
 │ 受注確定 │─────────────▶│ 発注書   │
 │          │              │ 作成     │
 └────┬─────┘              └────┬─────┘
      │                         │
      │                         ▼
      │                    ┌──────────┐              ┌──────────┐
      │                    │ 発注承認 │─────────────▶│ 発注実行 │
      │                    └────┬─────┘              └────┬─────┘
      │                         │                         │
      │                         │                         ▼
      │                         │                    ┌──────────┐
      │                         │                    │ 入荷登録 │
      │                         │                    └────┬─────┘
      │                         │                         │
      │◄────────────────────────┴─────────────────────────┘
      │           (全明細入荷完了)
      ▼
 ┌──────────┐              ┌──────────┐
 │ 計上申請 │─────────────▶│ 計上承認 │
 └──────────┘              └────┬─────┘
                                │
                                ▼
                           ┌──────────┐
                           │ 計上完了 │
                           └──────────┘
```

---

## 見積承認フロー

### 承認フロー概要

見積の承認は、金額帯ごとに設定された **承認ルート** に基づいて、段階的に承認者が決定されます。

```
┌─────────────────────────────────────────────────────────────┐
│                    【見積承認フロー】                        │
└─────────────────────────────────────────────────────────────┘

       営業              営業事務            管理者
         │                  │                  │
         ▼                  │                  │
    ┌─────────┐             │                  │
    │ 下書き  │             │                  │
    └────┬────┘             │                  │
         │ 承認依頼         │                  │
         ▼                  │                  │
    ┌─────────┐             │                  │
    │承認待ち │◄────────────┼──────────────────┤
    └────┬────┘             │                  │
         │                  │                  │
         │     ┌────────────┴────────────┐     │
         │     │   承認ルート判定        │     │
         │     │ (金額帯・ロールで判定)   │     │
         │     └────────────┬────────────┘     │
         │                  │                  │
         │     ┌────────────▼────────────┐     │
         │     │ ステップ1: 営業事務承認  │────▶│
         │     └────────────┬────────────┘     │
         │                  │(承認)            │
         │     ┌────────────▼────────────┐     │
         │     │ ステップ2: 管理者承認   │◄────│
         │     │ (金額が閾値超の場合)     │     │
         │     └────────────┬────────────┘     │
         │                  │(承認)            │
         ▼                  ▼                  │
    ┌─────────────────────────────────────┐    │
    │            承認済み                  │    │
    │         (PDF自動生成)                │    │
    └─────────────────────────────────────┘    │
         │                                     │
         │◄────────(却下の場合)────────────────┤
         ▼                                     │
    ┌─────────┐                                │
    │  却下   │                                │
    └────┬────┘                                │
         │ 修正・再依頼                        │
         ▼                                     │
    ┌─────────┐                                │
    │ 下書き  │────────────────────────────────┘
    └─────────┘
```

---

### 承認ルート設定

承認ルートは `approval_routes` テーブルで管理され、以下の条件で適用されます：

| 条件 | 説明 |
|------|------|
| `target_entity` | 対象エンティティ（quote / purchase_order） |
| `requester_role` | 申請者のロール（null: 全員、指定: 特定ロールのみ） |
| `min_total_amount` | 最小金額（null: 下限なし） |
| `max_total_amount` | 最大金額（null: 上限なし） |
| `is_active` | 有効フラグ |

**ルート選択ロジック:**

```typescript
// 1. 有効なルートを金額順に取得
// 2. 以下の条件をすべて満たすルートを選択：
//    - ロールが一致（またはnull）
//    - 金額が範囲内
//    - 最初に一致したルートを使用

const matchedRoute = sortedRoutes.find((route) => {
  const matchesRole = !route.requester_role || route.requester_role === requester.role
  const matchesMin = route.min_total_amount == null || totalAmount >= route.min_total_amount
  const matchesMax = route.max_total_amount == null || totalAmount <= route.max_total_amount
  return matchesRole && matchesMin && matchesMax
})
```

---

### 承認ステップ

各承認ルートには複数のステップを設定できます：

| 設定項目 | 説明 |
|----------|------|
| `step_order` | 承認順序（1から順番に） |
| `approver_role` | 承認者ロール（営業 / 営業事務 / 管理者） |

**ステップ処理ロジック:**

1. 現在のステップを取得
2. 承認者のロールが現在ステップのロールと一致するか確認
3. 承認/却下を記録
4. 次のステップがあれば進行、なければ完了

```typescript
// 承認時の処理
if (remainingSteps.length > 0) {
  // 次のステップへ
  const nextStep = remainingSteps[0]
  await updateCurrentStep(nextStep.step_order)
  return { message: `次の承認者は${nextStep.approver_role}です` }
} else {
  // 全ステップ完了
  await completeApproval()
  return { message: '承認が完了しました' }
}
```

---

### 承認インスタンス

承認の進捗は `quote_approval_instances` と `quote_approval_instance_steps` で管理されます。

**インスタンスステータス:**

| ステータス | 説明 |
|------------|------|
| `pending` | 承認進行中 |
| `approved` | 承認完了 |
| `rejected` | 却下 |
| `cancelled` | キャンセル（下書きに戻す） |

**ステップステータス:**

| ステータス | 説明 |
|------------|------|
| `pending` | 承認待ち |
| `approved` | 承認済み |
| `rejected` | 却下 |
| `skipped` | スキップ |

---

### 見積ステータス同期

見積の承認状況に応じて、案件ステータスが自動更新されます：

```typescript
// 案件ステータスの自動更新ロジック
const AUTO_MANAGED_PROJECT_STATUSES = ['リード', '見積中']

async function syncProjectAutoStatus(projectId: string) {
  const project = await getProject(projectId)
  
  // 手動管理ステータスの場合は更新しない
  if (!AUTO_MANAGED_PROJECT_STATUSES.includes(project.status)) {
    return
  }
  
  // 承認済み見積があるか確認
  const hasApprovedQuote = await checkApprovedQuoteExists(projectId)
  
  // ステータス決定
  const nextStatus = hasApprovedQuote ? '見積中' : 'リード'
  
  if (project.status !== nextStatus) {
    await updateProjectStatus(projectId, nextStatus)
  }
}
```

---

## 発注・入荷フロー

### 発注フロー概要

```
┌─────────────────────────────────────────────────────────────┐
│                    【発注・入荷フロー】                      │
└─────────────────────────────────────────────────────────────┘

    見積明細                発注書                  入荷
       │                     │                      │
       ▼                     │                      │
  ┌─────────┐                │                      │
  │仕入要明細│                │                      │
  │(未発注)  │                │                      │
  └────┬────┘                │                      │
       │ 発注書作成          │                      │
       ▼                     ▼                      │
  ┌─────────┐           ┌─────────┐                 │
  │ 発注書  │◄──────────│ 未発注  │                 │
  │ 紐付け  │           │ (下書き)│                 │
  └────┬────┘           └────┬────┘                 │
       │                     │ 承認依頼             │
       │                     ▼                      │
       │                ┌─────────┐                 │
       │                │承認待ち │                 │
       │                └────┬────┘                 │
       │                     │ 承認                 │
       │                     ▼                      │
       │                ┌─────────┐                 │
       │                │承認済み │                 │
       │                └────┬────┘                 │
       │                     │ 発注実行             │
       ▼                     ▼                      │
  ┌─────────┐           ┌─────────┐                 │
  │ 発注済  │◄──────────│ 発注済  │                 │
  │         │           │         │                 │
  └────┬────┘           └─────────┘                 │
       │                                            │
       │◄───────────────────────────────────────────┤
       │           入荷登録                         │
       ▼                                            ▼
  ┌─────────┐                               ┌──────────────┐
  │ 入荷済  │                               │procurement_  │
  └─────────┘                               │   logs       │
                                            │ (履歴記録)   │
                                            └──────────────┘
```

---

### 発注書作成ロジック

発注書は以下の2つの方法で作成できます：

#### 1. 見積明細からの発注書作成

```typescript
async function createPurchaseOrders(payload: {
  quoteId: string
  itemIds: string[]      // 発注対象の明細ID
  combineBySupplier: boolean  // 仕入先別にまとめるか
}) {
  // --- 1) バリデーション ---
  // - 明細が存在するか
  // - 仕入要の明細か
  // - 未発注状態か
  // - 仕入先が設定されているか

  // --- 2) グループ化 ---
  if (combineBySupplier) {
    // 同じ仕入先の明細をまとめて1つの発注書に
    groups = groupBySupplier(items)
  } else {
    // 明細ごとに個別の発注書を作成
    groups = items.map(item => [item])
  }

  // --- 3) 発注書作成 ---
  for (const group of groups) {
    const purchaseOrder = await createPurchaseOrder({
      supplier_id: group[0].supplier_id,
      total_cost: sumCosts(group),
      status: '未発注',
      approval_status: '下書き',
    })

    // 明細を発注書に紐付け
    for (const item of group) {
      await createPurchaseOrderItem({
        purchase_order_id: purchaseOrder.id,
        quote_item_id: item.id,
        quantity: item.quantity,
        unit_cost: item.cost_price,
      })
    }
  }
}
```

#### 2. 独立した発注書作成

見積に紐づかない発注書を手動で作成できます：

```typescript
async function createStandalonePurchaseOrder(payload: {
  supplierId: string
  items: Array<{
    name: string
    quantity: number
    unitCost: number
  }>
}) {
  // quote_id: null で作成
  // manual_name, manual_description で品名・説明を管理
}
```

---

### 発注承認フロー

発注書も見積と同様の承認フローを持ちます：

1. `purchase_order_approval_instances` でインスタンス管理
2. `purchase_order_approval_instance_steps` でステップ管理
3. `approval_routes` で `target_entity = 'purchase_order'` のルートを使用

**発注実行の前提条件:**

```typescript
// 発注済みへの変更は承認完了後のみ
if (status === '発注済' && purchaseOrder.approval_status !== '承認済み') {
  return { success: false, message: '承認完了後でないと発注済みに変更できません' }
}
```

---

### 入荷登録ロジック

入荷登録時の処理：

```typescript
async function registerReceiving(quoteItemId: string, receivingData: {
  receivedQuantity: number
  shipmentReadyDate: string
  notes?: string
}) {
  // --- 1) 見積明細を更新 ---
  await updateQuoteItem(quoteItemId, {
    procurement_status: '入荷済',
    received_at: new Date().toISOString(),
    shipment_ready_date: receivingData.shipmentReadyDate,
  })

  // --- 2) 履歴を記録 ---
  await createProcurementLog({
    quote_item_id: quoteItemId,
    action_type: '入荷',
    action_date: new Date().toISOString(),
    quantity: receivingData.receivedQuantity,
    performed_by: currentUser.id,
    notes: receivingData.notes,
  })

  // --- 3) 通知 ---
  // 営業担当者に入荷完了を通知
  await sendNotification({
    user_id: project.sales_rep_id,
    type: '入荷完了',
    message: `${product_name}の入荷が完了しました`,
  })
}
```

---

## 計上フロー

### 計上申請フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    【計上申請フロー】                        │
└─────────────────────────────────────────────────────────────┘

       営業                           営業事務
         │                               │
         ▼                               │
    ┌─────────┐                          │
    │計上可否 │                          │
    │ 確認    │                          │
    └────┬────┘                          │
         │                               │
         │ 条件チェック:                 │
         │ - 全明細が入荷済み            │
         │ - 出荷可能日が設定済み        │
         │                               │
         ▼                               │
    ┌─────────┐                          │
    │ 申請中  │──────────────────────────▶
    └────┬────┘                          │
         │                               ▼
         │                          ┌─────────┐
         │                          │ 承認/   │
         │                          │ 却下    │
         │                          └────┬────┘
         │                               │
         │◄──────────────────────────────┤
         │        (結果通知)              │
         ▼                               │
    ┌─────────┐                          │
    │承認済み │                          │
    │  or     │                          │
    │  却下   │                          │
    └────┬────┘                          │
         │                               │
         │(承認の場合)                   │
         ▼                               ▼
    ┌─────────────────────────────────────┐
    │           計上完了                   │
    │  - 販売システム連携用CSV出力        │
    │  - ノーツ連携用CSV出力              │
    └─────────────────────────────────────┘
```

---

### 計上可否判定

計上申請が可能かどうかは以下の条件で判定されます：

```typescript
function canRequestBilling(project: Project): {
  canRequest: boolean
  reason?: string
} {
  const approvedQuotes = project.quotes.filter(q => q.approval_status === '承認済み')
  
  if (approvedQuotes.length === 0) {
    return { canRequest: false, reason: '承認済みの見積がありません' }
  }

  // 全明細の入荷状況を確認
  for (const quote of approvedQuotes) {
    const pendingItems = quote.items.filter(item => 
      item.requires_procurement && 
      item.procurement_status !== '入荷済'
    )
    
    if (pendingItems.length > 0) {
      return { canRequest: false, reason: '未入荷の明細があります' }
    }

    const noShipmentDate = quote.items.filter(item =>
      item.requires_procurement && 
      !item.shipment_ready_date
    )
    
    if (noShipmentDate.length > 0) {
      return { canRequest: false, reason: '出荷可能日が未設定の明細があります' }
    }
  }

  return { canRequest: true }
}
```

---

### 計上スケジュール管理

`project_billing_schedules` テーブルで月次の計上予定を管理します。

**ステータス遷移:**

```
予定 → 確認済 → 計上済
         ↓
        延期
```

| ステータス | 説明 | 遷移条件 |
|------------|------|----------|
| 予定 | 計上予定 | 初期状態 |
| 確認済 | 確認済み | 営業事務が確認 |
| 延期 | 延期 | 計上月変更時 |
| 計上済 | 計上完了 | 計上処理完了時 |

---

## 権限・アクセス制御

### ロール別権限マトリクス

| 機能 | 営業 | 営業事務 | 管理者 |
|------|:----:|:--------:|:------:|
| 案件参照（自分の） | ✓ | ✓ | ✓ |
| 案件参照（全て） | - | ✓ | ✓ |
| 案件作成 | ✓ | ✓ | ✓ |
| 案件編集（自分の） | ✓ | ✓ | ✓ |
| 案件編集（全て） | - | ✓ | ✓ |
| 見積作成 | ✓ | ✓ | ✓ |
| 見積承認依頼 | ✓ | ✓ | ✓ |
| 見積承認 | - | ✓ | ✓ |
| 発注書作成 | - | ✓ | ✓ |
| 発注書承認 | - | ✓ | ✓ |
| 入荷登録 | - | ✓ | ✓ |
| 計上申請 | ✓ | ✓ | ✓ |
| 計上承認 | - | ✓ | ✓ |
| 顧客マスタ管理 | - | ✓ | ✓ |
| 仕入先マスタ管理 | - | ✓ | ✓ |
| ユーザー管理 | - | - | ✓ |
| 承認ルート管理 | - | - | ✓ |

---

### RLSによるデータアクセス制御

Row Level Security (RLS) により、DBレベルでアクセス制御を実施：

```sql
-- 案件: 担当者または営業事務/管理者のみアクセス可能
CREATE POLICY "案件参照権限" ON projects
  FOR SELECT USING (
    auth.uid() = sales_rep_id 
    OR auth.uid() IN (
      SELECT id FROM users WHERE role IN ('営業事務', '管理者')
    )
  );

-- 見積: 案件の権限に準ずる
CREATE POLICY "見積参照権限" ON quotes
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE
        sales_rep_id = auth.uid() 
        OR auth.uid() IN (
          SELECT id FROM users WHERE role IN ('営業事務', '管理者')
        )
    )
  );
```

---

### ミドルウェアによるルート保護

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証の場合はログインページへ
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 認証済みでログインページにアクセスした場合はダッシュボードへ
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
```

---

## ステータス遷移

### 案件ステータス

```
                    ┌─────────┐
                    │  リード  │
                    └────┬────┘
                         │ 承認済み見積あり
                         ▼
                    ┌─────────┐
           ┌────────│ 見積中  │────────┐
           │        └────┬────┘        │
           │             │             │
           │(失注)       │(受注)       │(キャンセル)
           ▼             ▼             ▼
      ┌─────────┐   ┌─────────┐   ┌─────────┐
      │  失注   │   │  受注   │   │キャンセル│
      └─────────┘   └────┬────┘   └─────────┘
                         │ 計上準備完了
                         ▼
                    ┌─────────┐
                    │ 計上OK  │
                    └────┬────┘
                         │ 計上完了
                         ▼
                    ┌─────────┐
                    │ 計上済み │
                    └─────────┘
```

**遷移ルール:**

| 現在 | 遷移先 | 条件 |
|------|--------|------|
| リード | 見積中 | 承認済み見積が存在する（自動） |
| 見積中 | リード | 承認済み見積がない（自動） |
| 見積中 | 受注 | 手動変更 |
| 見積中 | 失注 | 手動変更 |
| 見積中 | キャンセル | 手動変更 |
| 受注 | 計上OK | 計上準備完了（手動） |
| 計上OK | 計上済み | 計上完了（手動） |

---

### 見積承認ステータス

```
         ┌─────────┐
         │  下書き  │◄─────────────┐
         └────┬────┘              │
              │ 承認依頼          │ 下書きに戻す
              ▼                   │
         ┌─────────┐              │
    ┌────│承認待ち │────┐         │
    │    └─────────┘    │         │
    │                   │         │
    │(承認)             │(却下)   │
    ▼                   ▼         │
┌─────────┐        ┌─────────┐    │
│承認済み │        │  却下   │────┘
└─────────┘        └─────────┘
```

---

### 調達ステータス

```
         ┌─────────┐
         │  未発注  │
         └────┬────┘
              │ 発注実行
              ▼
         ┌─────────┐
         │ 発注済  │
         └────┬────┘
              │ 入荷登録
              ▼
         ┌─────────┐
         │ 入荷済  │
         └─────────┘
```

---

## 自動計算ロジック

### 見積金額計算

```typescript
// lib/utils/business.ts

// 明細金額 = 数量 × 単価
function calculateItemAmount(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

// 明細原価 = 数量 × 仕入単価
function calculateItemCost(quantity: number, costPrice: number): number {
  return quantity * costPrice
}

// 明細粗利 = 明細金額 - 明細原価
function calculateItemProfit(amount: number, cost: number): number {
  return amount - cost
}

// 見積合計金額 = Σ明細金額
function calculateQuoteTotal(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

// 見積合計原価 = Σ明細原価
function calculateQuoteCost(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + (item.cost_amount || 0), 0)
}

// 粗利 = 合計金額 - 合計原価
function calculateProfit(totalAmount: number, totalCost: number): number {
  return totalAmount - totalCost
}

// 粗利率 = 粗利 / 合計金額 × 100
function calculateProfitRate(totalAmount: number, totalCost: number): number {
  if (totalAmount === 0) return 0
  return (calculateProfit(totalAmount, totalCost) / totalAmount) * 100
}
```

---

### 番号採番ルール

```typescript
// 案件番号: P-YYYY-XXXX
function generateProjectNumber(year: number, sequence: number): string {
  return `P-${year}-${String(sequence).padStart(4, '0')}`
}

// 見積番号: Q-YYYY-XXXX-vN
function generateQuoteNumber(year: number, sequence: number, version: number): string {
  return `Q-${year}-${String(sequence).padStart(4, '0')}-v${version}`
}

// 発注番号: PO-YYYY-XXXX
function generatePurchaseOrderNumber(year: number, sequence: number): string {
  return `PO-${year}-${String(sequence).padStart(4, '0')}`
}
```

---

## 関連ドキュメント

- [API-REFERENCE.md](./API-REFERENCE.md) - API仕様書
- [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) - データベース設計書
- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義書
- [design/03_見積管理機能設計.md](./design/03_見積管理機能設計.md) - 見積管理機能設計
- [design/04_発注・入荷管理機能設計.md](./design/04_発注・入荷管理機能設計.md) - 発注・入荷管理機能設計
