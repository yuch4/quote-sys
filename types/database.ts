// ユーザー型
export type UserRole = '営業' | '営業事務' | '管理者'

export interface User {
  id: string
  email: string
  display_name: string
  department: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// 顧客型
export interface Customer {
  id: string
  customer_code: string
  customer_name: string
  customer_name_kana: string | null
  postal_code: string | null
  address: string | null
  phone: string | null
  email: string | null
  contact_person: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

// 仕入先型
export interface Supplier {
  id: string
  supplier_code: string
  supplier_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  payment_terms: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

// 案件型
export type ProjectStatus = '見積中' | '受注' | '失注' | 'キャンセル'

export interface Project {
  id: string
  project_number: string
  customer_id: string
  project_name: string
  category: string
  department: string
  sales_rep_id: string
  status: ProjectStatus
  created_at: string
  updated_at: string
  // リレーション
  customer?: Customer
  sales_rep?: User
  quotes?: Quote[]
}

// 見積型
export type ApprovalStatus = '下書き' | '承認待ち' | '承認済み' | '却下'

export interface Quote {
  id: string
  project_id: string
  quote_number: string
  version: number
  issue_date: string
  valid_until: string | null
  total_amount: number
  total_cost: number
  gross_profit: number
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  pdf_url: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // リレーション
  project?: Project
  items?: QuoteItem[]
  created_by_user?: User
  approved_by_user?: User
}

// 明細型
export type ProcurementStatus = '未発注' | '発注済' | '入荷済'

export interface QuoteItem {
  id: string
  quote_id: string
  line_number: number
  product_name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  supplier_id: string | null
  cost_price: number | null
  cost_amount: number | null
  gross_profit: number | null
  requires_procurement: boolean
  procurement_status: ProcurementStatus | null
  ordered_at: string | null
  received_at: string | null
  shipment_ready_date: string | null
  created_at: string
  updated_at: string
  // リレーション
  quote?: Quote
  supplier?: Supplier
}

// 発注・入荷履歴型
export type ActionType = '発注' | '入荷' | '出荷準備完了'

export interface ProcurementLog {
  id: string
  quote_item_id: string
  action_type: ActionType
  action_date: string
  quantity: number
  performed_by: string
  notes: string | null
  created_at: string
  // リレーション
  quote_item?: QuoteItem
  performed_by_user?: User
}

// 計上申請型
export type BillingStatus = '申請中' | '承認済' | '却下' | '計上完了'

export interface BillingRequest {
  id: string
  project_id: string
  quote_id: string
  billing_month: string
  status: BillingStatus
  requested_by: string
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  exported_to_sales_system: boolean
  exported_to_notes: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // リレーション
  project?: Project
  quote?: Quote
  requested_by_user?: User
  reviewed_by_user?: User
}

// フォーム用の型
export interface ProjectFormData {
  customer_id: string
  project_name: string
  category: string
  department: string
  sales_rep_id: string
}

export interface QuoteFormData {
  project_id: string
  issue_date: string
  valid_until?: string
  notes?: string
  items: QuoteItemFormData[]
}

export interface QuoteItemFormData {
  product_name: string
  description?: string
  quantity: number
  unit_price: number
  supplier_id?: string
  cost_price?: number
  requires_procurement: boolean
}

export interface CustomerFormData {
  customer_code: string
  customer_name: string
  customer_name_kana?: string
  postal_code?: string
  address?: string
  phone?: string
  email?: string
  contact_person?: string
}

export interface SupplierFormData {
  supplier_code: string
  supplier_name: string
  contact_person?: string
  phone?: string
  email?: string
  payment_terms?: string
}
