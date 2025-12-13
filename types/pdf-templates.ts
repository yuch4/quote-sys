/**
 * PDF生成テンプレート・押印関連の型定義
 */

export type TemplateTargetEntity = 'quote' | 'purchase_order'

export interface Template {
  id: string
  name: string
  description: string | null
  target_entity: TemplateTargetEntity
  html_content: string
  css_content: string | null
  variables_schema: TemplateVariable[]
  version: number
  is_active: boolean
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  key: string
  type: 'string' | 'number' | 'date' | 'array' | 'object' | 'currency'
  label: string
  description?: string
  required?: boolean
  sample?: unknown
}

export type StampType = 'company_seal' | 'official'

export interface StampAsset {
  id: string
  stamp_type: StampType
  name: string
  image_path: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserStamp {
  id: string
  user_id: string
  name: string
  image_path: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type QuoteFileType = 'draft' | 'final'

export interface StampApplication {
  slot: number // 1, 2, 3 for 担当印, 0 for 角印
  user_id?: string
  user_name?: string
  role?: string
  stamp_type: 'user' | 'company_seal'
  stamp_id: string
  stamp_version: number
  image_url?: string
  applied_at: string
}

export interface QuoteFile {
  id: string
  quote_id: string
  file_type: QuoteFileType
  storage_path: string
  file_name: string
  file_size: number | null
  sha256_hash: string | null
  template_id: string | null
  template_version: number | null
  stamps_applied: StampApplication[]
  generated_by: string | null
  generated_at: string
}

export type AuditEventType =
  | 'quote_created'
  | 'quote_updated'
  | 'quote_submitted'
  | 'quote_approved'
  | 'quote_rejected'
  | 'pdf_generated'
  | 'pdf_downloaded'
  | 'pdf_emailed'
  | 'pdf_viewed_portal'
  | 'stamp_applied'
  | 'template_created'
  | 'template_updated'

export type AuditEntityType = 'quote' | 'quote_file' | 'template' | 'user_stamp' | 'stamp_asset'

export interface AuditLog {
  id: string
  event_type: AuditEventType
  entity_type: AuditEntityType
  entity_id: string
  user_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// PDF生成用のデータ構造
export interface QuotePDFData {
  quoteNo: string
  issuedAt: string
  validUntil?: string
  subject?: string
  customerName: string
  customerPostalCode?: string
  customerAddress?: string
  customerPhone?: string
  projectNumber: string
  projectName: string
  salesRepName: string
  items: QuotePDFItem[]
  subtotal: number
  taxAmount?: number
  total: number
  notes?: string
  companyName: string
  companyAddress: string
  companyLogoUrl?: string
  stamps?: {
    slot1?: StampApplication
    slot2?: StampApplication
    slot3?: StampApplication
    companySeal?: StampApplication
  }
}

export interface QuotePDFItem {
  lineNumber: number
  productName: string
  description?: string
  quantity: number
  unitPrice: number
  amount: number
}

// テンプレートプレビュー用サンプルデータ
export const SAMPLE_QUOTE_DATA: QuotePDFData = {
  quoteNo: 'Q-2024-0001',
  issuedAt: '2024年12月13日',
  validUntil: '2025年1月13日',
  subject: 'システム構築一式',
  customerName: '株式会社サンプル',
  customerPostalCode: '100-0001',
  customerAddress: '東京都千代田区千代田1-1-1',
  customerPhone: '03-1234-5678',
  projectNumber: 'P-2024-0001',
  projectName: 'サンプルプロジェクト',
  salesRepName: '山田 太郎',
  items: [
    { lineNumber: 1, productName: 'サーバー構築', description: 'Webサーバー構築作業', quantity: 1, unitPrice: 500000, amount: 500000 },
    { lineNumber: 2, productName: '運用保守', description: '月額保守費用（12ヶ月）', quantity: 12, unitPrice: 50000, amount: 600000 },
  ],
  subtotal: 1100000,
  total: 1100000,
  notes: '・納期：ご発注後2週間\n・支払条件：月末締め翌月末払い',
  companyName: '株式会社〇〇システム',
  companyAddress: '〒150-0001\n東京都渋谷区神宮前1-2-3\nTEL: 03-9999-8888',
}
