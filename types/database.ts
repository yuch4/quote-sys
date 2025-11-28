// ユーザー型
export type UserRole = '営業' | '営業事務' | '管理者'

export interface User {
  id: string
  email: string
  display_name: string
  department: string | null
  department_id: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  department_code: string
  department_name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompanyProfile {
  id: boolean
  company_name: string
  company_address: string
  updated_at: string
}

export type SystemCategory =
  | 'sales_management'
  | 'accounting'
  | 'human_resources'
  | 'endpoint_security'
  | 'collaboration'
  | 'infrastructure'
  | 'erp'
  | 'other'

export type SystemAdoptionStatus =
  | 'in_use'
  | 'pilot'
  | 'planned'
  | 'decommissioned'
  | 'unknown'

export type SystemIntegrationLevel = 'none' | 'manual' | 'partial' | 'full'

export type SystemSecurityRisk = 'low' | 'normal' | 'high' | 'critical'

export type SecurityControlType = string

export interface GroupCompany {
  id: string
  company_code: string
  company_name: string
  company_name_kana: string | null
  region: string | null
  country: string | null
  industry: string | null
  employee_count_range: string | null
  revenue_range: string | null
  it_maturity: string | null
  relationship_status: string
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SystemCatalogEntry {
  id: string
  category: SystemCategory
  system_name: string
  vendor: string | null
  product_url: string | null
  description: string | null
  recommended: boolean
  default_license_cost: number | null
  cost_unit: string | null
  lifecycle_status: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CompanySystemUsage {
  id: string
  group_company_id: string
  system_catalog_id: string | null
  category: SystemCategory
  system_name: string
  vendor: string | null
  adoption_status: SystemAdoptionStatus
  deployment_model: string | null
  contract_type: string | null
  license_count: number | null
  annual_cost: number | null
  renewal_date: string | null
  satisfaction_score: number | null
  integration_level: SystemIntegrationLevel
  security_risk_level: SystemSecurityRisk
  point_of_contact: string | null
  attachments: Record<string, unknown>[]
  notes: string | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
  group_company?: GroupCompany
  system_catalog?: SystemCatalogEntry
}

export interface CompanySecurityControl {
  id: string
  group_company_id: string
  control_type: SecurityControlType
  vendor: string | null
  adoption_status: SystemAdoptionStatus
  coverage: string | null
  notes: string | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
  group_company?: GroupCompany
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
  address: string | null
  payment_terms: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export type ContractProbability = 'S' | 'A' | 'B' | 'C' | 'D'

// 案件型
export type ProjectStatus =
  | 'リード'
  | '見積中'
  | '受注'
  | '計上OK'
  | '計上済み'
  | '失注'
  | 'キャンセル'

export interface Project {
  id: string
  project_number: string
  customer_id: string
  project_name: string
  category: string
  department: string
  sales_rep_id: string
  status: ProjectStatus
  order_month: string | null
  accounting_month: string | null
  expected_sales: number | null
  expected_gross_profit: number | null
  contract_probability: ContractProbability
  created_at: string
  updated_at: string
  // リレーション
  customer?: Customer
  sales_rep?: User
  quotes?: Quote[]
  billing_schedules?: ProjectBillingSchedule[]
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
  subject: string | null
  total_amount: number
  total_cost: number
  gross_profit: number
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  pdf_url: string | null
  pdf_generated_at: string | null
  previous_version_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  is_awarded: boolean
  awarded_at: string | null
  awarded_by: string | null
  // リレーション
  project?: Project
  items?: QuoteItem[]
  created_by_user?: User
  approved_by_user?: User
  purchase_orders?: PurchaseOrder[]
  approval_instance?: QuoteApprovalInstance
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
  purchase_order_items?: PurchaseOrderItem[]
}

export type PurchaseOrderStatus = '未発注' | '発注済' | 'キャンセル'

export interface PurchaseOrder {
  id: string
  purchase_order_number: string
  quote_id: string | null
  supplier_id: string
  order_date: string
  status: PurchaseOrderStatus
  total_cost: number
  notes: string | null
  pdf_url: string | null
  pdf_generated_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  items?: PurchaseOrderItem[]
  approval_status?: ApprovalStatus
  approved_by?: string | null
  approved_at?: string | null
  approval_instance?: PurchaseOrderApprovalInstance | PurchaseOrderApprovalInstance[] | null
  quote?: Quote
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  quote_item_id: string | null
  quantity: number
  unit_cost: number
  amount: number
  created_at: string
  quote_item?: QuoteItem
  manual_name?: string | null
  manual_description?: string | null
}

export type BillingScheduleStatus = '予定' | '確認済' | '延期' | '計上済'

export interface ProjectBillingSchedule {
  id: string
  project_id: string
  quote_id: string | null
  billing_month: string
  billing_date: string | null
  amount: number
  status: BillingScheduleStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  billed_by: string | null
  billed_at: string | null
  created_at: string
  updated_at: string
  quote?: Quote
}

// 仕入（原価）計上予定の型定義
export type CostScheduleStatus = '予定' | '確認済' | '延期' | '計上済'

export interface ProjectCostSchedule {
  id: string
  project_id: string
  quote_id: string | null
  purchase_order_id: string | null
  cost_month: string
  cost_date: string | null
  amount: number
  status: CostScheduleStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  recorded_by: string | null
  recorded_at: string | null
  created_at: string
  updated_at: string
  quote?: Quote
  purchase_order?: PurchaseOrder
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

// 承認フロー設定
export interface ApprovalRoute {
  id: string
  name: string
  description: string | null
  requester_role: UserRole | null
  target_entity: 'quote' | 'purchase_order'
  min_total_amount: number | null
  max_total_amount: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  steps?: ApprovalRouteStep[]
}

export interface ApprovalRouteStep {
  id: string
  route_id: string
  step_order: number
  approver_role: UserRole
  notes: string | null
  created_at: string
}

export type ApprovalInstanceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped'

export interface QuoteApprovalInstance {
  id: string
  quote_id: string
  route_id: string
  status: ApprovalInstanceStatus
  current_step: number | null
  requested_by: string | null
  requested_at: string
  updated_at: string
  rejection_reason: string | null
  route?: ApprovalRoute
  steps?: QuoteApprovalInstanceStep[]
}

export interface QuoteApprovalInstanceStep {
  id: string
  instance_id: string
  step_order: number
  approver_role: UserRole
  approver_user_id: string | null
  status: ApprovalStepStatus
  decided_at: string | null
  notes: string | null
  approver?: User
}

export interface PurchaseOrderApprovalInstance {
  id: string
  purchase_order_id: string
  route_id: string
  status: ApprovalInstanceStatus
  current_step: number | null
  requested_by: string | null
  requested_at: string
  updated_at: string
  rejection_reason: string | null
  route?: ApprovalRoute
  steps?: PurchaseOrderApprovalInstanceStep[]
}

export interface PurchaseOrderApprovalInstanceStep {
  id: string
  instance_id: string
  step_order: number
  approver_role: UserRole
  approver_user_id: string | null
  status: ApprovalStepStatus
  decided_at: string | null
  notes: string | null
  approver?: User
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
  address?: string
  payment_terms?: string
}

// 帳票レイアウト設定型
export interface DocumentLayoutSettings {
  target_entity: 'quote' | 'purchase_order'
  sections: Record<string, unknown>[]
  table_columns: Record<string, unknown>[]
  page: Record<string, unknown> | null
  styles: Record<string, unknown> | null
  table_styles: Record<string, unknown> | null
  updated_at: string
}
