export type DocumentTargetEntity = 'quote' | 'purchase_order'

export type DocumentSectionKey =
  | 'document_meta'
  | 'company_info'
  | 'customer_info'
  | 'project_info'
  | 'supplier_info'
  | 'quote_info'
  | 'items_table'
  | 'totals'
  | 'notes'
  | 'footer'

export type DocumentSectionRegion = 'header' | 'body' | 'footer'
export type DocumentSectionColumn = 'left' | 'right' | 'full'

export interface DocumentLayoutSectionConfig {
  key: DocumentSectionKey
  label: string
  enabled: boolean
  region: DocumentSectionRegion
  row: number
  column: DocumentSectionColumn
  width: number
  order: number
  title?: string | null
  show_title?: boolean | null
  show_label?: boolean | null
}

export type DocumentTableColumnKey =
  | 'line_number'
  | 'product_name'
  | 'description'
  | 'quantity'
  | 'unit_price'
  | 'unit_cost'
  | 'amount'

export interface DocumentLayoutTableColumnConfig {
  key: DocumentTableColumnKey
  label: string
  enabled: boolean
  width: number
  order: number
}

export interface DocumentLayoutConfig {
  sections: DocumentLayoutSectionConfig[]
  table_columns: DocumentLayoutTableColumnConfig[]
}

export interface DocumentLayoutSettingsRow extends DocumentLayoutConfig {
  target_entity: DocumentTargetEntity
  updated_at: string
}
