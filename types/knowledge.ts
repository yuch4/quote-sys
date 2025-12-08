// ナレッジ・チケット管理 型定義

// チケットステータス
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'

// チケット優先度
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

// コンテンツ公開範囲
export type ContentVisibility = 'internal' | 'customer' | 'public'

// チケットカテゴリ
export type TicketCategory =
  | 'technical_support'   // 技術サポート
  | 'billing'             // 請求関連
  | 'product_inquiry'     // 製品問い合わせ
  | 'feature_request'     // 機能要望
  | 'bug_report'          // バグ報告
  | 'general'             // 一般問い合わせ
  | 'other'               // その他

// チケット
export interface KnowledgeTicket {
  id: string
  ticket_number: string
  customer_id: string | null
  group_company_id: string | null
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  visibility: ContentVisibility
  assigned_to: string | null
  created_by: string
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // リレーション
  customer?: {
    id: string
    customer_name: string
    email: string | null
  }
  group_company?: {
    id: string
    company_name: string
  }
  assigned_user?: {
    id: string
    display_name: string
    email: string
  }
  created_by_user?: {
    id: string
    display_name: string
    email: string
  }
  comments?: TicketComment[]
  attachments?: TicketAttachment[]
  knowledge_links?: KnowledgeBase[]
}

// チケットコメント（対応履歴）
export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string | null
  customer_session_id: string | null
  content: string
  is_internal: boolean
  created_at: string
  // リレーション
  user?: {
    id: string
    display_name: string
    email: string
  }
  customer_session?: {
    id: string
    customer_name: string
  }
  attachments?: TicketAttachment[]
}

// 添付ファイル
export interface TicketAttachment {
  id: string
  ticket_id: string
  comment_id: string | null
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: string | null
  uploaded_by_customer: string | null
  created_at: string
}

// ナレッジベース記事
export interface KnowledgeBase {
  id: string
  title: string
  content: string
  category: TicketCategory
  tags: string[]
  visibility: ContentVisibility
  view_count: number
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
  // リレーション
  created_by_user?: {
    id: string
    display_name: string
  }
}

// チケット⇔ナレッジ紐付け
export interface TicketKnowledgeLink {
  ticket_id: string
  knowledge_id: string
  created_at: string
}

// 顧客ポータル招待
export interface CustomerPortalInvite {
  id: string
  token: string
  customer_id: string
  email: string
  expires_at: string
  used_at: string | null
  created_by: string
  created_at: string
  // リレーション
  customer?: {
    id: string
    customer_name: string
  }
}

// 顧客ポータルセッション
export interface CustomerPortalSession {
  id: string
  session_token: string
  invite_id: string
  customer_id: string
  customer_name: string
  customer_email: string
  expires_at: string
  created_at: string
}

// チケット作成フォーム
export interface CreateTicketInput {
  customer_id?: string
  group_company_id?: string
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  visibility?: ContentVisibility
  assigned_to?: string
}

// チケット更新フォーム
export interface UpdateTicketInput {
  title?: string
  description?: string
  category?: TicketCategory
  priority?: TicketPriority
  status?: TicketStatus
  visibility?: ContentVisibility
  assigned_to?: string | null
}

// コメント作成フォーム
export interface CreateCommentInput {
  ticket_id: string
  content: string
  is_internal?: boolean
}

// ナレッジ作成フォーム
export interface CreateKnowledgeInput {
  title: string
  content: string
  category: TicketCategory
  tags?: string[]
  visibility?: ContentVisibility
  is_published?: boolean
}

// ナレッジ更新フォーム
export interface UpdateKnowledgeInput {
  title?: string
  content?: string
  category?: TicketCategory
  tags?: string[]
  visibility?: ContentVisibility
  is_published?: boolean
}

// 招待作成フォーム
export interface CreateInviteInput {
  customer_id: string
  email: string
}

// チケットフィルター
export interface TicketFilters {
  status?: TicketStatus | 'all'
  priority?: TicketPriority | 'all'
  category?: TicketCategory | 'all'
  customer_id?: string
  group_company_id?: string
  assigned_to?: string
  search?: string
}

// ナレッジフィルター
export interface KnowledgeFilters {
  category?: TicketCategory | 'all'
  visibility?: ContentVisibility | 'all'
  is_published?: boolean
  search?: string
  tags?: string[]
}

// 分析データ
export interface TicketAnalytics {
  total_tickets: number
  open_tickets: number
  in_progress_tickets: number
  resolved_tickets: number
  closed_tickets: number
  average_resolution_time_hours: number
  tickets_by_category: { category: TicketCategory; count: number }[]
  tickets_by_priority: { priority: TicketPriority; count: number }[]
  tickets_by_company: { company_id: string; company_name: string; count: number }[]
  tickets_over_time: { date: string; count: number }[]
}

// ステータス表示名
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: '未対応',
  in_progress: '対応中',
  pending: '保留',
  resolved: '解決済み',
  closed: 'クローズ',
}

// 優先度表示名
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: '低',
  normal: '通常',
  high: '高',
  urgent: '緊急',
}

// カテゴリ表示名
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical_support: '技術サポート',
  billing: '請求関連',
  product_inquiry: '製品問い合わせ',
  feature_request: '機能要望',
  bug_report: 'バグ報告',
  general: '一般問い合わせ',
  other: 'その他',
}

// 公開範囲表示名
export const VISIBILITY_LABELS: Record<ContentVisibility, string> = {
  internal: '社内限定',
  customer: '顧客公開',
  public: '一般公開',
}

// ステータスカラー
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-amber-100 text-amber-800 border-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  pending: 'bg-slate-100 text-slate-800 border-slate-300',
  resolved: 'bg-teal-100 text-teal-800 border-teal-300',
  closed: 'bg-gray-100 text-gray-800 border-gray-300',
}

// 優先度カラー
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  normal: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  urgent: 'bg-red-100 text-red-700 border-red-300',
}

// 優先度ボーダーカラー（左ボーダー用）
export const TICKET_PRIORITY_BORDER_COLORS: Record<TicketPriority, string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
}

// 公開範囲カラー
export const VISIBILITY_COLORS: Record<ContentVisibility, string> = {
  internal: 'bg-purple-100 text-purple-800 border-purple-300',
  customer: 'bg-green-100 text-green-800 border-green-300',
  public: 'bg-cyan-100 text-cyan-800 border-cyan-300',
}
