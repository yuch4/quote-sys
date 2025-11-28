'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentTargetEntity,
  DocumentPageConfig,
  DocumentStyleConfig,
  DocumentTableStyleConfig,
  ColumnsLayout,
} from '@/types/document-layout'
import {
  DEFAULT_PAGE_CONFIG,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_TABLE_STYLE_CONFIG,
  sortSections,
  sortColumns,
} from '@/lib/document-layout'

interface LayoutPreviewProps {
  target: DocumentTargetEntity
  layout: DocumentLayoutConfig
  className?: string
}

// サンプルデータ
const SAMPLE_QUOTE_DATA = {
  quote_number: 'Q-2025-0001',
  issue_date: '2025年1月15日',
  valid_until: '2025年2月14日',
  company_name: '株式会社サンプル',
  company_address: '〒100-0001\n東京都千代田区千代田1-1-1',
  customer_name: 'テスト顧客株式会社',
  customer_address: '〒150-0001\n東京都渋谷区神宮前1-1-1',
  project_name: 'システム開発プロジェクト',
  items: [
    { name: 'システム設計', quantity: 1, unit_price: 500000, amount: 500000 },
    { name: '開発費用', quantity: 3, unit_price: 300000, amount: 900000 },
    { name: 'テスト・検証', quantity: 1, unit_price: 200000, amount: 200000 },
  ],
  subtotal: 1600000,
  tax: 160000,
  total: 1760000,
  notes: '※ 上記金額には消費税10%が含まれます。\n※ 納期: 契約後2ヶ月',
}

const SAMPLE_PO_DATA = {
  po_number: 'PO-2025-0001',
  order_date: '2025年1月20日',
  company_name: '株式会社サンプル',
  company_address: '〒100-0001\n東京都千代田区千代田1-1-1',
  supplier_name: 'サプライヤー株式会社',
  supplier_address: '〒160-0001\n東京都新宿区西新宿1-1-1',
  quote_ref: 'Q-2025-0001',
  items: [
    { name: 'サーバー機器', quantity: 2, unit_price: 150000, amount: 300000 },
    { name: 'ネットワーク機器', quantity: 5, unit_price: 50000, amount: 250000 },
  ],
  subtotal: 550000,
  tax: 55000,
  total: 605000,
  notes: '※ 納品場所: 東京本社\n※ 希望納品日: 2025年2月末',
}

export function LayoutPreview({ target, layout, className }: LayoutPreviewProps) {
  const pageConfig = layout.page ?? DEFAULT_PAGE_CONFIG
  const styleConfig = layout.styles ?? DEFAULT_STYLE_CONFIG
  const tableStyleConfig = layout.tableStyles ?? DEFAULT_TABLE_STYLE_CONFIG

  const sections = useMemo(() => sortSections(layout.sections), [layout.sections])
  const columns = useMemo(() => sortColumns(layout.table_columns), [layout.table_columns])
  const enabledColumns = columns.filter((c) => c.enabled)

  const quoteData = SAMPLE_QUOTE_DATA
  const poData = SAMPLE_PO_DATA

  // ページサイズの計算 (pt → px 変換、1pt ≈ 1.33px)
  const getPageDimensions = () => {
    let width = 595 // A4
    let height = 842

    if (pageConfig.size === 'A3') {
      width = 842
      height = 1191
    } else if (pageConfig.size === 'LETTER') {
      width = 612
      height = 792
    } else if (pageConfig.size === 'LEGAL') {
      width = 612
      height = 1008
    }

    if (pageConfig.orientation === 'landscape') {
      ;[width, height] = [height, width]
    }

    return { width: width * 0.75, height: height * 0.75 }
  }

  const { width: pageWidth, height: pageHeight } = getPageDimensions()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(value)
  }

  const renderSectionContent = (section: DocumentLayoutSectionConfig) => {
    if (!section.enabled) return null

    switch (section.key) {
      case 'document_title':
        return (
          <div className="text-center">
            <h1
              style={{
                fontSize: styleConfig.titleFontSize * 0.9,
                color: styleConfig.primaryColor,
                fontWeight: 'bold',
              }}
            >
              {section.title || (target === 'quote' ? '御見積書' : '発注書')}
            </h1>
          </div>
        )

      case 'document_number':
        return (
          <div className="text-right text-sm">
            <div>（見積No.）{quoteData.quote_number}</div>
            <div>（発行日）{quoteData.issue_date}</div>
          </div>
        )

      case 'customer_name_only':
        return (
          <div>
            <span className="font-bold text-lg">{quoteData.customer_name}</span>
            <span className="ml-4">御中</span>
          </div>
        )

      case 'greeting_text':
        return (
          <div className="text-sm my-2">
            {section.title || 'ご照会の件、下記の通りお見積り申し上げます。'}
          </div>
        )

      case 'summary_box':
        return (
          <div className="border border-gray-400 p-3 text-sm">
            <div className="flex border-b border-gray-200 pb-2 mb-2">
              <span className="w-20 font-bold">件　　名</span>
              <span className="font-bold">{quoteData.project_name}</span>
            </div>
            <div className="flex pb-2 mb-2">
              <span className="w-20 font-bold">金　　額</span>
              <span className="text-lg font-bold">{formatCurrency(quoteData.total)}-</span>
              <span className="ml-2 text-xs text-red-600">（税抜き価格）</span>
            </div>
            <div className="flex border-b border-gray-200 pb-2 mb-2">
              <span className="w-20 font-bold">納　　期</span>
              <span>別途お打合せ</span>
            </div>
            <div className="flex border-b border-gray-200 pb-2 mb-2">
              <span className="w-20 font-bold">取引条件</span>
              <span>従来通り</span>
            </div>
            <div className="flex pb-2">
              <span className="w-20 font-bold">有効期限</span>
              <span>発行日より1ヶ月</span>
            </div>
            <div className="text-xs text-red-600 mt-2">
              ※ご請求時には別途、法令所定の消費税等を合わせてご請求させて頂きます。
            </div>
          </div>
        )

      case 'stamp_area':
        return (
          <div className="text-right">
            {styleConfig.companyLogoUrl && (
              <div className="mb-2">
                <img
                  src={styleConfig.companyLogoUrl}
                  alt="Logo"
                  className="inline-block"
                  style={{
                    width: (styleConfig.companyLogoWidth || 80) * 0.6,
                    height: (styleConfig.companyLogoHeight || 30) * 0.6,
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
            <div className="font-bold mb-1">{quoteData.company_name}</div>
            <div className="text-xs whitespace-pre-line mb-2">{quoteData.company_address}</div>
            <div className="flex justify-end gap-2">
              <div className="w-10 h-10 border border-gray-400 flex items-center justify-center">
                <span className="text-xs text-gray-400">承認</span>
              </div>
              <div className="w-10 h-10 border border-gray-400 flex items-center justify-center">
                <span className="text-xs text-gray-400">担当</span>
              </div>
            </div>
          </div>
        )

      case 'document_meta':
        return (
          <div className="text-center">
            {section.show_title !== false && (
              <h1
                style={{
                  fontSize: styleConfig.titleFontSize * 0.75,
                  color: styleConfig.primaryColor,
                  marginBottom: 8,
                }}
              >
                {section.title || (target === 'quote' ? '御見積書' : '発注書')}
              </h1>
            )}
            <div className="text-sm text-gray-600">
              <div>{target === 'quote' ? `見積番号: ${quoteData.quote_number}` : `発注番号: ${poData.po_number}`}</div>
              <div>{target === 'quote' ? `発行日: ${quoteData.issue_date}` : `発注日: ${poData.order_date}`}</div>
              {target === 'quote' && <div>有効期限: {quoteData.valid_until}</div>}
            </div>
          </div>
        )

      case 'company_info':
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-1">{section.label}</div>
            )}
            <div className="font-bold">{quoteData.company_name}</div>
            <div className="text-sm whitespace-pre-line">{quoteData.company_address}</div>
          </div>
        )

      case 'customer_info':
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-1">{section.label}</div>
            )}
            <div className="font-bold">{quoteData.customer_name} 御中</div>
            <div className="text-sm whitespace-pre-line">{quoteData.customer_address}</div>
          </div>
        )

      case 'supplier_info':
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-1">{section.label}</div>
            )}
            <div className="font-bold">{poData.supplier_name}</div>
            <div className="text-sm whitespace-pre-line">{poData.supplier_address}</div>
          </div>
        )

      case 'project_info':
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-1">{section.label}</div>
            )}
            <div className="font-medium">{quoteData.project_name}</div>
          </div>
        )

      case 'quote_info':
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-1">{section.label}</div>
            )}
            <div className="text-sm">参照見積: {poData.quote_ref}</div>
          </div>
        )

      case 'items_table':
        const items = target === 'quote' ? quoteData.items : poData.items
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-2">{section.label}</div>
            )}
            <table
              className="w-full text-sm"
              style={{
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: styleConfig.tableHeaderBgColor,
                    textAlign: tableStyleConfig.headerAlign,
                  }}
                >
                  {enabledColumns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: tableStyleConfig.cellPadding * 0.75,
                        border: tableStyleConfig.showGridLines
                          ? `${styleConfig.tableBorderWidth}px solid ${styleConfig.borderColor}`
                          : 'none',
                        width: `${col.width}%`,
                        textAlign: col.textAlign || 'left',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      backgroundColor:
                        tableStyleConfig.alternateRowColors && index % 2 === 1
                          ? styleConfig.tableStripeBgColor
                          : 'transparent',
                    }}
                  >
                    {enabledColumns.map((col) => {
                      let value: string | number = ''
                      if (col.key === 'line_number') value = index + 1
                      else if (col.key === 'product_name') value = item.name
                      else if (col.key === 'quantity') value = item.quantity
                      else if (col.key === 'unit_price') value = formatCurrency(item.unit_price)
                      else if (col.key === 'amount') value = formatCurrency(item.amount)

                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: tableStyleConfig.cellPadding * 0.75,
                            border: tableStyleConfig.showGridLines
                              ? `${styleConfig.tableBorderWidth}px solid ${styleConfig.borderColor}`
                              : 'none',
                            textAlign: col.textAlign || 'left',
                          }}
                        >
                          {value}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case 'totals':
        const totalsData = target === 'quote' ? quoteData : poData
        return (
          <div className="text-right">
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-2 text-left">{section.label}</div>
            )}
            <div className="space-y-1">
              <div className="flex justify-end gap-4">
                <span>小計:</span>
                <span className="w-24">{formatCurrency(totalsData.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span>消費税:</span>
                <span className="w-24">{formatCurrency(totalsData.tax)}</span>
              </div>
              <div
                className="flex justify-end gap-4 font-bold pt-2 border-t"
                style={{ borderColor: styleConfig.borderColor }}
              >
                <span>合計:</span>
                <span className="w-24" style={{ color: styleConfig.primaryColor }}>
                  {formatCurrency(totalsData.total)}
                </span>
              </div>
            </div>
          </div>
        )

      case 'notes':
        const notesData = target === 'quote' ? quoteData : poData
        return (
          <div>
            {section.show_label !== false && (
              <div className="text-xs text-gray-500 mb-1">{section.label}</div>
            )}
            <div className="text-sm whitespace-pre-line text-gray-600">{notesData.notes}</div>
          </div>
        )

      case 'footer':
        return (
          <div className="text-center text-xs text-gray-400">
            本書は見本データです。実際の帳票はPDFで出力されます。
          </div>
        )

      default:
        return null
    }
  }

  // セクションを行ごとにグループ化
  const groupedSections = sections.reduce((acc, section) => {
    if (!section.enabled) return acc
    const row = section.row
    if (!acc[row]) acc[row] = []
    acc[row].push(section)
    return acc
  }, {} as Record<number, DocumentLayoutSectionConfig[]>)

  const sortedRows = Object.keys(groupedSections)
    .map(Number)
    .sort((a, b) => a - b)

  // 行の段組み数を取得
  const getRowColumnsLayout = (rowSections: DocumentLayoutSectionConfig[]): ColumnsLayout => {
    const firstSection = rowSections[0]
    if (firstSection?.columnsInRow) return firstSection.columnsInRow
    // columnsInRowが未設定の場合、セクション数から推測
    if (rowSections.length === 1) return 1
    if (rowSections.length === 2) return 2
    if (rowSections.length >= 3) return 3
    return 1
  }

  return (
    <div className={cn('bg-gray-200 rounded-lg p-4 overflow-auto', className)}>
      <div
        className="bg-white shadow-lg mx-auto font-sans"
        style={{
          width: pageWidth,
          minHeight: pageHeight,
          padding: `${pageConfig.margin.top * 0.75}px ${pageConfig.margin.right * 0.75}px ${pageConfig.margin.bottom * 0.75}px ${pageConfig.margin.left * 0.75}px`,
          fontSize: styleConfig.baseFontSize * 0.75,
          color: styleConfig.secondaryColor,
        }}
      >
        {/* ロゴ */}
        {styleConfig.companyLogoUrl && (
          <div
            className="mb-4"
            style={{
              textAlign: styleConfig.companyLogoPosition || 'right',
            }}
          >
            <img
              src={styleConfig.companyLogoUrl}
              alt="Company Logo"
              style={{
                width: (styleConfig.companyLogoWidth || 100) * 0.75,
                height: (styleConfig.companyLogoHeight || 40) * 0.75,
                objectFit: 'contain',
                display: 'inline-block',
              }}
            />
          </div>
        )}

        {/* セクション */}
        {sortedRows.map((row) => {
          const rowSections = groupedSections[row]
          const columnsInRow = getRowColumnsLayout(rowSections)
          
          return (
            <div
              key={row}
              className="flex flex-wrap gap-4"
              style={{ marginBottom: styleConfig.sectionSpacing * 0.75 }}
            >
              {rowSections
                .sort((a, b) => (a.columnIndex ?? a.order) - (b.columnIndex ?? b.order))
                .map((section) => {
                  const getWidth = () => {
                    // 全幅または1列の場合
                    if (section.column === 'full' || columnsInRow === 1) return '100%'
                    // 段組みの場合
                    if (columnsInRow === 2) return 'calc(50% - 8px)'
                    if (columnsInRow === 3) return 'calc(33.333% - 10.666px)'
                    // 従来のwidth指定
                    return `calc(${section.width}% - 8px)`
                  }

                  return (
                    <div
                      key={section.key}
                      style={{
                        width: getWidth(),
                        padding: section.padding ? section.padding * 0.75 : 0,
                        marginTop: section.marginTop ? section.marginTop * 0.75 : 0,
                        marginBottom: section.marginBottom ? section.marginBottom * 0.75 : 0,
                        backgroundColor: section.backgroundColor || 'transparent',
                        fontSize: section.fontSize ? section.fontSize * 0.75 : undefined,
                        fontWeight: section.fontWeight || undefined,
                        textAlign: section.textAlign || undefined,
                      }}
                    >
                      {renderSectionContent(section)}
                    </div>
                  )
                })}
            </div>
          )
        })}

        {/* ページ番号 */}
        {styleConfig.showPageNumbers && (
          <div
            className="absolute bottom-4 left-0 right-0 text-xs text-gray-400"
            style={{
              textAlign: styleConfig.pageNumberPosition || 'center',
              paddingLeft: pageConfig.margin.left * 0.75,
              paddingRight: pageConfig.margin.right * 0.75,
            }}
          >
            1 / 1
          </div>
        )}
      </div>
    </div>
  )
}
