# データベース設計書

本ドキュメントでは、見積管理システム（quote-sys）のデータベース設計について詳細に説明します。

## 目次

- [概要](#概要)
- [ER図（テキストベース）](#er図テキストベース)
- [テーブル定義](#テーブル定義)
- [RLSポリシー一覧](#rlsポリシー一覧)
- [インデックス設計](#インデックス設計)
- [トリガー・関数](#トリガー関数)
- [Enum型定義](#enum型定義)

---

## 概要

### データベース構成

| 項目 | 詳細 |
|------|------|
| DBMS | PostgreSQL (Supabase) |
| スキーマ | public |
| 認証連携 | auth.users (Supabase Auth) |
| RLS | 全テーブルで有効 |

### 命名規則

- **テーブル名:** スネークケース、複数形（例: `projects`, `quote_items`）
- **カラム名:** スネークケース（例: `created_at`, `sales_rep_id`）
- **外部キー:** `{参照先テーブル単数形}_id`（例: `project_id`, `customer_id`）
- **ステータス系:** 日本語で定義（例: `'見積中'`, `'承認済み'`）

---

## ER図（テキストベース）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              【コアビジネス】                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   users      │
                    │──────────────│
                    │ id (PK)      │◄───────────────────────────────────────────┐
                    │ email        │                                            │
                    │ display_name │                                            │
                    │ role         │                                            │
                    └──────┬───────┘                                            │
                           │                                                    │
              ┌────────────┼────────────┐                                       │
              │            │            │                                       │
              ▼            ▼            ▼                                       │
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
    │  customers   │  │  suppliers   │  │  departments │                       │
    │──────────────│  │──────────────│  │──────────────│                       │
    │ id (PK)      │  │ id (PK)      │  │ id (PK)      │                       │
    │ customer_code│  │ supplier_code│  │ department_  │                       │
    │ customer_name│  │ supplier_name│  │   code       │                       │
    └──────┬───────┘  └──────┬───────┘  └──────────────┘                       │
           │                 │                                                  │
           │                 │                                                  │
           ▼                 │                                                  │
    ┌──────────────┐         │                                                  │
    │  projects    │         │                                                  │
    │──────────────│         │                                                  │
    │ id (PK)      │◄────────┼──────────────────────────────────────────────────┤
    │ project_     │         │                                          sales_rep_id
    │   number     │         │
    │ customer_id  │─────────┘
    │ status       │
    └──────┬───────┘
           │
           │ 1:N
           ▼
    ┌──────────────┐          ┌──────────────────────┐
    │   quotes     │          │ quote_approval_      │
    │──────────────│          │   instances          │
    │ id (PK)      │◄─────────│──────────────────────│
    │ project_id   │          │ id (PK)              │
    │ quote_number │          │ quote_id (FK)        │
    │ version      │          │ route_id (FK)        │
    │ approval_    │          │ status               │
    │   status     │          └──────────┬───────────┘
    └──────┬───────┘                     │
           │                             │ 1:N
           │ 1:N                         ▼
           ▼                   ┌──────────────────────┐
    ┌──────────────┐          │ quote_approval_      │
    │ quote_items  │          │   instance_steps     │
    │──────────────│          │──────────────────────│
    │ id (PK)      │          │ id (PK)              │
    │ quote_id     │          │ instance_id (FK)     │
    │ line_number  │          │ step_order           │
    │ product_name │          │ approver_role        │
    │ supplier_id  │──────────│ status               │
    │ procurement_ │          └──────────────────────┘
    │   status     │
    └──────┬───────┘
           │
           │ 1:N                     ┌──────────────┐
           ├─────────────────────────│ purchase_    │
           │                         │   orders     │
           │                         │──────────────│
           │                         │ id (PK)      │
           │                         │ quote_id     │
           │                         │ supplier_id  │
           │                         │ status       │
           │                         │ approval_    │
           │                         │   status     │
           │                         └──────┬───────┘
           │                                │
           ▼                                │ 1:N
    ┌──────────────┐                        ▼
    │ procurement_ │               ┌──────────────────┐
    │   logs       │               │ purchase_order_  │
    │──────────────│               │   items          │
    │ id (PK)      │               │──────────────────│
    │ quote_item_id│               │ id (PK)          │
    │ action_type  │               │ purchase_order_id│
    │ action_date  │               │ quote_item_id    │
    └──────────────┘               └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                           【計上・請求管理】                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

    projects                    quotes
        │                          │
        │ 1:N                      │
        ▼                          ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ billing_requests │    │ project_billing_ │
    │──────────────────│    │   schedules      │
    │ id (PK)          │    │──────────────────│
    │ project_id (FK)  │    │ id (PK)          │
    │ quote_id (FK)    │    │ project_id (FK)  │
    │ billing_month    │    │ quote_id (FK)    │
    │ status           │    │ billing_month    │
    └──────────────────┘    │ amount           │
                            │ status           │
                            └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                         【グループ会社CRM】                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ group_companies  │
    │──────────────────│
    │ id (PK)          │◄──────────────────────────────────────┐
    │ company_code     │                                       │
    │ company_name     │                                       │
    └─────────┬────────┘                                       │
              │                                                │
              │ 1:N                                            │ 1:N
              ├──────────────────────────┐                     │
              │                          │                     │
              ▼                          ▼                     │
    ┌──────────────────┐      ┌──────────────────────┐         │
    │ company_system_  │      │ company_security_    │         │
    │   usage          │      │   controls           │         │
    │──────────────────│      │──────────────────────│         │
    │ id (PK)          │      │ id (PK)              │         │
    │ group_company_id │      │ group_company_id     │─────────┘
    │ system_catalog_id│      │ control_type         │
    │ category         │      │ vendor               │
    │ system_name      │      │ adoption_status      │
    │ adoption_status  │      └──────────────────────┘
    └─────────┬────────┘
              │
              │ N:1
              ▼
    ┌──────────────────┐
    │ system_catalog   │
    │──────────────────│
    │ id (PK)          │
    │ category         │
    │ system_name      │
    │ vendor           │
    └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                              【承認フロー】                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ approval_routes  │
    │──────────────────│
    │ id (PK)          │◄──────────────────────────────────────┐
    │ name             │                                       │
    │ target_entity    │                                       │
    │ min_total_amount │                                       │
    │ max_total_amount │                                       │
    └─────────┬────────┘                                       │
              │                                                │
              │ 1:N                                            │
              ▼                                                │
    ┌──────────────────────┐                                   │
    │ approval_route_steps │                                   │
    │──────────────────────│                                   │
    │ id (PK)              │                                   │
    │ route_id (FK)        │───────────────────────────────────┘
    │ step_order           │
    │ approver_role        │
    └──────────────────────┘
```

---

## テーブル定義

### コアテーブル

#### users（ユーザー）

Supabase Auth と連携したユーザー管理テーブル。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | - | PK, auth.users.id を参照 |
| email | TEXT | NO | - | メールアドレス（UNIQUE） |
| display_name | TEXT | NO | - | 表示名 |
| department | TEXT | YES | - | 部門名（レガシー） |
| department_id | UUID | YES | - | 部門マスタID（FK） |
| role | TEXT | NO | - | 役割（営業/営業事務/管理者） |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

#### customers（顧客）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| customer_code | TEXT | NO | - | 顧客コード（UNIQUE） |
| customer_name | TEXT | NO | - | 顧客名 |
| customer_name_kana | TEXT | YES | - | 顧客名カナ |
| postal_code | TEXT | YES | - | 郵便番号 |
| address | TEXT | YES | - | 住所 |
| phone | TEXT | YES | - | 電話番号 |
| email | TEXT | YES | - | メールアドレス |
| contact_person | TEXT | YES | - | 担当者名 |
| is_deleted | BOOLEAN | NO | false | 論理削除フラグ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

#### suppliers（仕入先）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| supplier_code | TEXT | NO | - | 仕入先コード（UNIQUE） |
| supplier_name | TEXT | NO | - | 仕入先名 |
| contact_person | TEXT | YES | - | 担当者名 |
| phone | TEXT | YES | - | 電話番号 |
| email | TEXT | YES | - | メールアドレス |
| address | TEXT | YES | - | 住所 |
| payment_terms | TEXT | YES | - | 支払条件 |
| is_deleted | BOOLEAN | NO | false | 論理削除フラグ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

#### departments（部門マスタ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| department_code | TEXT | NO | - | 部門コード（UNIQUE） |
| department_name | TEXT | NO | - | 部門名 |
| sort_order | INTEGER | NO | 0 | 表示順 |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

### 案件・見積テーブル

#### projects（案件）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_number | TEXT | NO | - | 案件番号（UNIQUE） |
| customer_id | UUID | NO | - | 顧客ID（FK） |
| project_name | TEXT | NO | - | 案件名 |
| category | TEXT | NO | - | カテゴリ |
| department | TEXT | NO | - | 部門 |
| sales_rep_id | UUID | NO | - | 営業担当者ID（FK） |
| status | TEXT | NO | '見積中' | ステータス |
| order_month | TEXT | YES | - | 受注予定月 |
| accounting_month | TEXT | YES | - | 計上予定月 |
| expected_sales | DECIMAL(15,2) | YES | - | 見込売上 |
| expected_gross_profit | DECIMAL(15,2) | YES | - | 見込粗利 |
| contract_probability | TEXT | NO | 'C' | 受注確度（S/A/B/C/D） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**ステータス値:**
- `リード` - 見込み客段階
- `見積中` - 見積作成中
- `受注` - 受注確定
- `計上OK` - 計上準備完了
- `計上済み` - 計上処理完了
- `失注` - 失注
- `キャンセル` - キャンセル

---

#### quotes（見積）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | 案件ID（FK） |
| quote_number | TEXT | NO | - | 見積番号（UNIQUE） |
| version | INTEGER | NO | 1 | バージョン |
| issue_date | DATE | NO | - | 発行日 |
| valid_until | DATE | YES | - | 有効期限 |
| subject | TEXT | YES | - | 件名 |
| total_amount | DECIMAL(15,2) | NO | 0 | 合計金額 |
| total_cost | DECIMAL(15,2) | NO | 0 | 合計原価 |
| gross_profit | DECIMAL(15,2) | NO | 0 | 粗利 |
| approval_status | TEXT | NO | '下書き' | 承認ステータス |
| approved_by | UUID | YES | - | 承認者ID（FK） |
| approved_at | TIMESTAMPTZ | YES | - | 承認日時 |
| pdf_url | TEXT | YES | - | PDF URL |
| pdf_generated_at | TIMESTAMPTZ | YES | - | PDF生成日時 |
| previous_version_id | UUID | YES | - | 旧バージョンID |
| notes | TEXT | YES | - | 備考 |
| is_awarded | BOOLEAN | NO | false | 受注フラグ |
| awarded_at | TIMESTAMPTZ | YES | - | 受注日時 |
| awarded_by | UUID | YES | - | 受注登録者ID |
| created_by | UUID | NO | - | 作成者ID（FK） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**承認ステータス値:**
- `下書き` - 編集中
- `承認待ち` - 承認依頼中
- `承認済み` - 承認完了
- `却下` - 却下済み

---

#### quote_items（見積明細）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| quote_id | UUID | NO | - | 見積ID（FK、CASCADE） |
| line_number | INTEGER | NO | - | 行番号 |
| product_name | TEXT | NO | - | 品名 |
| description | TEXT | YES | - | 説明 |
| quantity | DECIMAL(10,2) | NO | - | 数量 |
| unit_price | DECIMAL(15,2) | NO | - | 提供単価 |
| amount | DECIMAL(15,2) | NO | - | 提供金額 |
| supplier_id | UUID | YES | - | 仕入先ID（FK） |
| cost_price | DECIMAL(15,2) | YES | - | 仕入単価 |
| cost_amount | DECIMAL(15,2) | YES | - | 仕入金額 |
| gross_profit | DECIMAL(15,2) | YES | - | 粗利 |
| requires_procurement | BOOLEAN | NO | false | 仕入要否 |
| procurement_status | TEXT | YES | - | 調達ステータス |
| ordered_at | TIMESTAMPTZ | YES | - | 発注日時 |
| received_at | TIMESTAMPTZ | YES | - | 入荷日時 |
| shipment_ready_date | DATE | YES | - | 出荷可能日 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**UNIQUE制約:** (quote_id, line_number)

**調達ステータス値:**
- `未発注` - 未発注
- `発注済` - 発注済み
- `入荷済` - 入荷済み

---

### 発注テーブル

#### purchase_orders（発注書）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| purchase_order_number | TEXT | NO | - | 発注番号（UNIQUE） |
| quote_id | UUID | YES | - | 見積ID（FK） |
| supplier_id | UUID | NO | - | 仕入先ID（FK） |
| order_date | DATE | NO | CURRENT_DATE | 発注日 |
| status | TEXT | NO | '未発注' | ステータス |
| approval_status | TEXT | NO | '下書き' | 承認ステータス |
| total_cost | DECIMAL(15,2) | NO | 0 | 合計金額 |
| notes | TEXT | YES | - | 備考 |
| pdf_url | TEXT | YES | - | PDF URL |
| pdf_generated_at | TIMESTAMPTZ | YES | - | PDF生成日時 |
| approved_by | UUID | YES | - | 承認者ID |
| approved_at | TIMESTAMPTZ | YES | - | 承認日時 |
| created_by | UUID | NO | - | 作成者ID（FK） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**ステータス値:**
- `未発注` - 未発注（承認待ち含む）
- `発注済` - 発注済み
- `キャンセル` - キャンセル

---

#### purchase_order_items（発注明細）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| purchase_order_id | UUID | NO | - | 発注書ID（FK、CASCADE） |
| quote_item_id | UUID | YES | - | 見積明細ID（FK） |
| quantity | DECIMAL(10,2) | NO | - | 数量 |
| unit_cost | DECIMAL(15,2) | NO | - | 仕入単価 |
| amount | DECIMAL(15,2) | NO | - | 金額 |
| manual_name | TEXT | YES | - | 手動入力品名 |
| manual_description | TEXT | YES | - | 手動入力説明 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

---

#### procurement_logs（発注・入荷履歴）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| quote_item_id | UUID | NO | - | 明細ID（FK） |
| action_type | TEXT | NO | - | アクション種別 |
| action_date | DATE | NO | - | アクション日 |
| quantity | DECIMAL(10,2) | NO | - | 数量 |
| performed_by | UUID | NO | - | 実行者ID（FK） |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

**アクション種別:**
- `発注` - 発注
- `入荷` - 入荷
- `出荷準備完了` - 出荷準備完了

---

### 承認フローテーブル

#### approval_routes（承認ルート）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| name | TEXT | NO | - | ルート名 |
| description | TEXT | YES | - | 説明 |
| requester_role | TEXT | YES | - | 申請者ロール |
| target_entity | TEXT | NO | - | 対象エンティティ |
| min_total_amount | DECIMAL(15,2) | YES | - | 最小金額 |
| max_total_amount | DECIMAL(15,2) | YES | - | 最大金額 |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_by | UUID | YES | - | 作成者ID |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**対象エンティティ:**
- `quote` - 見積
- `purchase_order` - 発注書

---

#### approval_route_steps（承認ステップ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| route_id | UUID | NO | - | ルートID（FK、CASCADE） |
| step_order | INTEGER | NO | - | ステップ順 |
| approver_role | TEXT | NO | - | 承認者ロール |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

**UNIQUE制約:** (route_id, step_order)

---

#### quote_approval_instances（見積承認インスタンス）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| quote_id | UUID | NO | - | 見積ID（FK、UNIQUE） |
| route_id | UUID | NO | - | ルートID（FK） |
| status | TEXT | NO | - | ステータス |
| current_step | INTEGER | YES | - | 現在のステップ |
| requested_by | UUID | YES | - | 依頼者ID |
| requested_at | TIMESTAMPTZ | NO | NOW() | 依頼日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |
| rejection_reason | TEXT | YES | - | 却下理由 |

**ステータス値:**
- `pending` - 進行中
- `approved` - 承認完了
- `rejected` - 却下
- `cancelled` - キャンセル

---

#### quote_approval_instance_steps（見積承認ステップインスタンス）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| instance_id | UUID | NO | - | インスタンスID（FK、CASCADE） |
| step_order | INTEGER | NO | - | ステップ順 |
| approver_role | TEXT | NO | - | 承認者ロール |
| approver_user_id | UUID | YES | - | 承認者ユーザーID |
| status | TEXT | NO | - | ステータス |
| decided_at | TIMESTAMPTZ | YES | - | 決定日時 |
| notes | TEXT | YES | - | 備考 |

**UNIQUE制約:** (instance_id, step_order)

---

#### purchase_order_approval_instances / purchase_order_approval_instance_steps

発注書用の承認インスタンス・ステップテーブル。構造は見積と同様。

---

### 計上テーブル

#### billing_requests（計上申請）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | 案件ID（FK） |
| quote_id | UUID | NO | - | 見積ID（FK） |
| billing_month | DATE | NO | - | 計上予定月 |
| status | TEXT | NO | '申請中' | ステータス |
| requested_by | UUID | NO | - | 申請者ID（FK） |
| requested_at | TIMESTAMPTZ | NO | NOW() | 申請日時 |
| reviewed_by | UUID | YES | - | 承認者ID |
| reviewed_at | TIMESTAMPTZ | YES | - | 承認日時 |
| rejection_reason | TEXT | YES | - | 却下理由 |
| exported_to_sales_system | BOOLEAN | NO | false | 販売システム連携済 |
| exported_to_notes | BOOLEAN | NO | false | ノーツ連携済 |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**ステータス値:**
- `申請中` - 申請中
- `承認済` - 承認済み
- `却下` - 却下
- `計上完了` - 計上完了

---

#### project_billing_schedules（計上予定）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | 案件ID（FK、CASCADE） |
| quote_id | UUID | YES | - | 見積ID（FK） |
| billing_month | DATE | NO | - | 計上予定月 |
| billing_date | DATE | YES | - | 計上予定日 |
| amount | DECIMAL(15,2) | NO | - | 金額 |
| status | TEXT | NO | '予定' | ステータス |
| notes | TEXT | YES | - | 備考 |
| confirmed_by | UUID | YES | - | 確認者ID |
| confirmed_at | TIMESTAMPTZ | YES | - | 確認日時 |
| billed_by | UUID | YES | - | 計上者ID |
| billed_at | TIMESTAMPTZ | YES | - | 計上日時 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**ステータス値:**
- `予定` - 予定
- `確認済` - 確認済み
- `延期` - 延期
- `計上済` - 計上済み

---

### 通知テーブル

#### notifications（通知）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | ユーザーID（FK、CASCADE） |
| title | TEXT | NO | - | タイトル |
| message | TEXT | NO | - | メッセージ |
| type | TEXT | NO | - | 通知種別 |
| link_url | TEXT | YES | - | リンクURL |
| is_read | BOOLEAN | NO | false | 既読フラグ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

**通知種別:**
- `見積承認` - 見積承認通知
- `見積差戻` - 見積差戻し通知
- `計上申請` - 計上申請通知
- `計上承認` - 計上承認通知
- `計上差戻` - 計上差戻し通知
- `入荷完了` - 入荷完了通知
- `その他` - その他

---

### 活動記録テーブル

#### project_activities（案件活動）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | 案件ID（FK、CASCADE） |
| activity_date | DATE | NO | - | 活動日 |
| subject | TEXT | NO | - | 件名 |
| details | TEXT | YES | - | 詳細 |
| next_action | TEXT | YES | - | 次のアクション |
| next_action_due_date | DATE | YES | - | 次のアクション期限 |
| created_by | UUID | NO | - | 作成者ID（FK） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

---

### グループ会社CRMテーブル

#### group_companies（グループ会社）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| company_code | TEXT | NO | - | 会社コード（UNIQUE） |
| company_name | TEXT | NO | - | 会社名 |
| company_name_kana | TEXT | YES | - | 会社名カナ |
| region | TEXT | YES | - | 地域 |
| country | TEXT | YES | - | 国 |
| industry | TEXT | YES | - | 業種 |
| employee_count_range | TEXT | YES | - | 従業員数範囲 |
| revenue_range | TEXT | YES | - | 売上規模 |
| it_maturity | TEXT | YES | - | IT成熟度 |
| relationship_status | TEXT | NO | 'active' | 関係ステータス |
| primary_contact_name | TEXT | YES | - | 主担当者名 |
| primary_contact_email | TEXT | YES | - | 主担当者メール |
| primary_contact_phone | TEXT | YES | - | 主担当者電話 |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

#### system_catalog（システムカタログ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| category | system_category | NO | - | カテゴリ |
| system_name | TEXT | NO | - | システム名 |
| vendor | TEXT | YES | - | ベンダー |
| product_url | TEXT | YES | - | 製品URL |
| description | TEXT | YES | - | 説明 |
| recommended | BOOLEAN | NO | false | 推奨フラグ |
| default_license_cost | DECIMAL(14,2) | YES | - | デフォルトライセンス費用 |
| cost_unit | TEXT | YES | - | 費用単位 |
| lifecycle_status | TEXT | NO | 'active' | ライフサイクルステータス |
| metadata | JSONB | NO | '{}' | メタデータ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**UNIQUE制約:** (category, system_name)

---

#### company_system_usage（会社システム利用状況）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| group_company_id | UUID | NO | - | グループ会社ID（FK、CASCADE） |
| system_catalog_id | UUID | YES | - | システムカタログID（FK） |
| category | system_category | NO | - | カテゴリ |
| system_name | TEXT | NO | - | システム名 |
| vendor | TEXT | YES | - | ベンダー |
| adoption_status | system_adoption_status | NO | 'in_use' | 導入状況 |
| deployment_model | TEXT | YES | - | デプロイモデル |
| contract_type | TEXT | YES | - | 契約形態 |
| license_count | INTEGER | YES | - | ライセンス数 |
| annual_cost | DECIMAL(16,2) | YES | - | 年間費用 |
| renewal_date | DATE | YES | - | 更新日 |
| satisfaction_score | SMALLINT | YES | - | 満足度（1-5） |
| integration_level | system_integration_level | NO | 'manual' | 統合レベル |
| security_risk_level | system_security_risk | NO | 'normal' | セキュリティリスク |
| point_of_contact | TEXT | YES | - | 担当者 |
| attachments | JSONB | NO | '[]' | 添付ファイル |
| notes | TEXT | YES | - | 備考 |
| last_verified_at | TIMESTAMPTZ | YES | - | 最終確認日時 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**UNIQUE制約:** (group_company_id, category, system_name)

---

#### company_security_controls（セキュリティ統制）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|----------|------|------|------------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| group_company_id | UUID | NO | - | グループ会社ID（FK、CASCADE） |
| control_type | TEXT | NO | - | 統制種別 |
| vendor | TEXT | YES | - | ベンダー |
| adoption_status | system_adoption_status | NO | 'in_use' | 導入状況 |
| coverage | TEXT | YES | - | カバレッジ |
| notes | TEXT | YES | - | 備考 |
| last_verified_at | TIMESTAMPTZ | YES | - | 最終確認日時 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**UNIQUE制約:** (group_company_id, control_type, vendor)

---

## RLSポリシー一覧

### 基本方針

| テーブル | 参照(SELECT) | 作成(INSERT) | 更新(UPDATE) | 削除(DELETE) |
|----------|--------------|--------------|--------------|--------------|
| users | 認証ユーザー全員 | - | 本人のみ | - |
| customers | 認証ユーザー全員（削除済除く） | 営業事務/管理者 | 営業事務/管理者 | 営業事務/管理者 |
| suppliers | 認証ユーザー全員（削除済除く） | 営業事務/管理者 | 営業事務/管理者 | 営業事務/管理者 |
| projects | 担当者 or 営業事務/管理者 | 担当者 or 営業事務/管理者 | 担当者 or 営業事務/管理者 | - |
| quotes | 案件担当者 or 営業事務/管理者 | 作成者かつ案件担当者 | 案件担当者 or 営業事務/管理者 | - |
| quote_items | 見積に準ずる | 見積に準ずる | 見積に準ずる | 見積に準ずる |
| purchase_orders | 認証ユーザー全員 | 営業事務/管理者 | 営業事務/管理者 | 営業事務/管理者 |
| notifications | 本人のみ | 営業事務/管理者 | 本人のみ | - |
| billing_requests | 案件担当者 or 営業事務/管理者 | 申請者かつ案件担当者 | 営業事務/管理者 | - |
| approval_routes | 認証ユーザー全員 | 営業事務/管理者 | 営業事務/管理者 | 営業事務/管理者 |
| group_companies | 認証ユーザー全員 | 営業事務/管理者 | 営業事務/管理者 | 営業事務/管理者 |

---

## インデックス設計

### パフォーマンス最適化インデックス

```sql
-- 案件検索
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_sales_rep_id ON projects(sales_rep_id);
CREATE INDEX idx_projects_status ON projects(status);

-- 見積検索
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_quotes_approval_status ON quotes(approval_status);

-- 明細検索
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_procurement_status ON quote_items(procurement_status);

-- 発注・入荷履歴
CREATE INDEX idx_procurement_logs_quote_item_id ON procurement_logs(quote_item_id);

-- 発注書
CREATE INDEX idx_purchase_orders_quote_id ON purchase_orders(quote_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_quote_item_id ON purchase_order_items(quote_item_id);

-- 計上申請
CREATE INDEX idx_billing_requests_project_id ON billing_requests(project_id);
CREATE INDEX idx_billing_requests_status ON billing_requests(status);
CREATE INDEX idx_billing_requests_billing_month ON billing_requests(billing_month);

-- 計上予定
CREATE INDEX idx_project_billing_schedules_project_id ON project_billing_schedules(project_id);
CREATE INDEX idx_project_billing_schedules_billing_month ON project_billing_schedules(billing_month);

-- 通知
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- 活動記録
CREATE INDEX idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX idx_project_activities_activity_date ON project_activities(activity_date);

-- 承認フロー
CREATE INDEX idx_approval_route_steps_route ON approval_route_steps(route_id);
CREATE INDEX idx_quote_approval_instances_quote ON quote_approval_instances(quote_id);
CREATE INDEX idx_quote_approval_steps_instance ON quote_approval_instance_steps(instance_id);

-- グループ会社CRM
CREATE INDEX group_companies_name_idx ON group_companies(company_name);
CREATE INDEX group_companies_industry_idx ON group_companies(industry);
CREATE INDEX company_system_usage_company_idx ON company_system_usage(group_company_id);
CREATE INDEX company_system_usage_category_idx ON company_system_usage(category);
CREATE INDEX company_system_usage_status_idx ON company_system_usage(adoption_status);
CREATE INDEX company_security_controls_company_idx ON company_security_controls(group_company_id);
```

---

## トリガー・関数

### updated_at 自動更新関数

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 適用テーブル

以下のテーブルに `BEFORE UPDATE` トリガーとして設定：

- users
- customers
- suppliers
- projects
- quotes
- quote_items
- billing_requests
- purchase_orders
- approval_routes
- quote_approval_instances
- project_billing_schedules
- group_companies
- system_catalog
- company_system_usage
- company_security_controls

---

## Enum型定義

### system_category

```sql
CREATE TYPE system_category AS ENUM (
  'sales_management',
  'accounting',
  'human_resources',
  'endpoint_security',
  'collaboration',
  'infrastructure',
  'erp',
  'other'
);
```

### system_adoption_status

```sql
CREATE TYPE system_adoption_status AS ENUM (
  'in_use',
  'pilot',
  'planned',
  'decommissioned',
  'unknown'
);
```

### system_integration_level

```sql
CREATE TYPE system_integration_level AS ENUM (
  'none',
  'manual',
  'partial',
  'full'
);
```

### system_security_risk

```sql
CREATE TYPE system_security_risk AS ENUM (
  'low',
  'normal',
  'high',
  'critical'
);
```

---

## 関連ドキュメント

- [API-REFERENCE.md](./API-REFERENCE.md) - API仕様書
- [BUSINESS-LOGIC.md](./BUSINESS-LOGIC.md) - ビジネスロジック仕様書
- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義書
