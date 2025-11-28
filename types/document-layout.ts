export type DocumentTargetEntity = 'quote' | 'purchase_order'

export type DocumentSectionKey =
  | 'document_meta'
  | 'document_title'      // タイトルのみ（御見積書）
  | 'document_number'     // 見積番号・発行日（右上）
  | 'company_info'
  | 'customer_info'
  | 'customer_name_only'  // 顧客名のみ（宛先）
  | 'greeting_text'       // ご照会の件、〜
  | 'summary_box'         // 件名・金額・納期・取引条件・有効期限
  | 'stamp_area'          // 印鑑エリア
  | 'project_info'
  | 'supplier_info'
  | 'quote_info'
  | 'items_table'
  | 'totals'
  | 'notes'
  | 'footer'

export type DocumentSectionRegion = 'header' | 'body' | 'footer'
export type DocumentSectionColumn = 'left' | 'right' | 'full'
export type TextAlign = 'left' | 'center' | 'right'
export type PositionMode = 'flow' | 'absolute'
export type ColumnsLayout = 1 | 2 | 3 // 行の段組み数

// ページ設定
export interface DocumentPageConfig {
  size: 'A4' | 'A3' | 'LETTER' | 'LEGAL'
  orientation: 'portrait' | 'landscape'
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

// グローバルスタイル設定
export interface DocumentStyleConfig {
  // フォント設定
  baseFontSize: number
  titleFontSize: number
  sectionTitleFontSize: number
  tableFontSize: number
  footerFontSize: number
  
  // カラー設定
  primaryColor: string
  secondaryColor: string
  borderColor: string
  headerBgColor: string
  tableHeaderBgColor: string
  tableStripeBgColor: string
  
  // スペーシング
  sectionSpacing: number
  itemSpacing: number
  
  // 罫線
  borderWidth: number
  tableBorderWidth: number
  
  // ヘッダー・フッター
  showPageNumbers: boolean
  pageNumberPosition: 'left' | 'center' | 'right'
  
  // 会社ロゴ
  companyLogoUrl?: string | null
  companyLogoWidth?: number
  companyLogoHeight?: number
  companyLogoPosition?: 'left' | 'center' | 'right'
}

// テーブルスタイル設定
export interface DocumentTableStyleConfig {
  headerAlign: TextAlign
  cellPadding: number
  showRowNumbers: boolean
  showGridLines: boolean
  alternateRowColors: boolean
}

export interface DocumentLayoutSectionConfig {
  key: DocumentSectionKey
  label: string
  enabled: boolean
  region: DocumentSectionRegion
  row: number
  column: DocumentSectionColumn
  columnIndex?: number // 段組み内での位置 (0, 1, 2)
  columnsInRow?: ColumnsLayout // この行の段組み数 (1, 2, 3)
  width: number
  order: number
  title?: string | null
  show_title?: boolean | null
  show_label?: boolean | null
  // セクション固有のスタイル
  fontSize?: number | null
  fontWeight?: 'normal' | 'bold' | null
  textAlign?: TextAlign | null
  backgroundColor?: string | null
  padding?: number | null
  marginTop?: number | null
  marginBottom?: number | null
  // 自由配置モード用
  positionMode?: PositionMode
  x?: number | null
  y?: number | null
  height?: number | null
  zIndex?: number | null
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
  // 列固有のスタイル
  textAlign?: TextAlign | null
  fontWeight?: 'normal' | 'bold' | null
}

export interface DocumentLayoutConfig {
  sections: DocumentLayoutSectionConfig[]
  table_columns: DocumentLayoutTableColumnConfig[]
  page?: DocumentPageConfig
  styles?: DocumentStyleConfig
  tableStyles?: DocumentTableStyleConfig
}

export interface DocumentLayoutSettingsRow extends DocumentLayoutConfig {
  target_entity: DocumentTargetEntity
  updated_at: string
}
