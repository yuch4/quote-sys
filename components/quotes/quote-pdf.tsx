import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { ensureJapaneseFonts, FONT_FAMILY } from '@/lib/pdf/fonts'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentTableColumnKey,
  DocumentStyleConfig,
  DocumentPageConfig,
  DocumentTableStyleConfig,
  ColumnsLayout,
} from '@/types/document-layout'
import {
  getDefaultDocumentLayout,
  sortColumns,
  sortSections,
  DEFAULT_PAGE_CONFIG,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_TABLE_STYLE_CONFIG,
} from '@/lib/document-layout'

ensureJapaneseFonts()

// 動的スタイル生成関数
const createStyles = (
  pageConfig: DocumentPageConfig,
  styleConfig: DocumentStyleConfig,
  tableStyleConfig: DocumentTableStyleConfig
) =>
  StyleSheet.create({
    page: {
      padding: pageConfig.margin.top,
      paddingLeft: pageConfig.margin.left,
      paddingRight: pageConfig.margin.right,
      paddingBottom: pageConfig.margin.bottom,
      fontSize: styleConfig.baseFontSize,
      fontFamily: FONT_FAMILY,
    },
    header: {
      marginBottom: styleConfig.sectionSpacing,
      gap: 10,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      fontSize: styleConfig.titleFontSize,
      fontWeight: 'bold',
      marginBottom: 10,
      color: styleConfig.primaryColor,
    },
    metaLabel: {
      fontSize: styleConfig.baseFontSize,
      color: styleConfig.secondaryColor,
      marginBottom: 6,
    },
    sectionContainer: {
      flexGrow: 1,
    },
    companyInfo: {
      textAlign: 'right',
      gap: 2,
    },
    companyName: {
      fontSize: styleConfig.sectionTitleFontSize,
      fontWeight: 'bold',
    },
    companyLabel: {
      fontSize: styleConfig.baseFontSize,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    companyAddress: {
      fontSize: styleConfig.baseFontSize,
    },
    companyLogo: {
      width: styleConfig.companyLogoWidth || 100,
      height: styleConfig.companyLogoHeight || 40,
      marginBottom: 8,
    },
    rowGroup: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: styleConfig.sectionSpacing,
      flexWrap: 'wrap',
    },
    section: {
      marginBottom: styleConfig.sectionSpacing,
    },
    sectionTitle: {
      fontSize: styleConfig.sectionTitleFontSize,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: `${styleConfig.borderWidth}pt solid ${styleConfig.borderColor}`,
      paddingBottom: 4,
      color: styleConfig.primaryColor,
    },
    row: {
      flexDirection: 'row',
      marginBottom: styleConfig.itemSpacing,
    },
    label: {
      width: '30%',
      fontWeight: 'bold',
    },
    value: {
      width: '70%',
    },
    table: {
      width: '100%',
      marginTop: 10,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: styleConfig.tableHeaderBgColor,
      padding: tableStyleConfig.cellPadding,
      borderBottom: `${styleConfig.borderWidth}pt solid ${styleConfig.borderColor}`,
    },
    tableRow: {
      flexDirection: 'row',
      padding: tableStyleConfig.cellPadding,
      borderBottom: tableStyleConfig.showGridLines
        ? `${styleConfig.tableBorderWidth}pt solid #ddd`
        : 'none',
    },
    tableRowAlternate: {
      flexDirection: 'row',
      padding: tableStyleConfig.cellPadding,
      borderBottom: tableStyleConfig.showGridLines
        ? `${styleConfig.tableBorderWidth}pt solid #ddd`
        : 'none',
      backgroundColor: tableStyleConfig.alternateRowColors
        ? styleConfig.tableStripeBgColor
        : 'transparent',
    },
    tableHeaderCell: {
      fontWeight: 'bold',
      fontSize: styleConfig.tableFontSize,
      textAlign: tableStyleConfig.headerAlign,
    },
    tableCell: {
      fontSize: styleConfig.tableFontSize,
    },
    totalSection: {
      marginTop: styleConfig.sectionSpacing + 5,
      alignItems: 'flex-end',
    },
    totalRow: {
      flexDirection: 'row',
      width: '40%',
      justifyContent: 'space-between',
      marginBottom: styleConfig.itemSpacing,
      paddingHorizontal: 10,
    },
    totalLabel: {
      fontWeight: 'bold',
    },
    totalValue: {
      fontWeight: 'bold',
    },
    grandTotal: {
      flexDirection: 'row',
      width: '40%',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      paddingHorizontal: 10,
      borderTop: `${styleConfig.borderWidth}pt solid ${styleConfig.borderColor}`,
    },
    grandTotalLabel: {
      fontSize: styleConfig.sectionTitleFontSize + 2,
      fontWeight: 'bold',
      color: styleConfig.primaryColor,
    },
    grandTotalValue: {
      fontSize: styleConfig.sectionTitleFontSize + 2,
      fontWeight: 'bold',
      color: styleConfig.primaryColor,
    },
    footer: {
      marginTop: styleConfig.sectionSpacing * 2,
      fontSize: styleConfig.footerFontSize,
      color: '#666',
    },
    pageNumber: {
      position: 'absolute',
      bottom: 15,
      left: 0,
      right: 0,
      fontSize: styleConfig.footerFontSize,
      textAlign: styleConfig.pageNumberPosition,
      color: '#666',
    },
  })

interface QuoteItem {
  line_number: number
  product_name: string
  description: string | null
  quantity: number
  unit_price: string
  amount: string
  supplier?: {
    supplier_name: string
  } | null
}

interface QuotePDFProps {
  quote: {
    quote_number: string
    version: number
    issue_date: string
    valid_until: string | null
    subject: string | null
    total_amount: string
    total_cost: string
    gross_profit: string
    notes: string | null
    project: {
      project_number: string
      project_name: string
      customer: {
        customer_name: string
        postal_code: string | null
        address: string | null
        phone: string | null
      }
      sales_rep: {
        display_name: string
      }
    }
    items: QuoteItem[]
  }
  companyInfo: {
    name: string
    address: string
  }
  layout: DocumentLayoutConfig
}

const groupSectionsByRow = (sections: DocumentLayoutSectionConfig[]) => {
  const rows = new Map<number, DocumentLayoutSectionConfig[]>()
  sections.forEach((section) => {
    const bucket = rows.get(section.row) || []
    bucket.push(section)
    rows.set(section.row, bucket)
  })
  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([row, bucket]) => ({
      row,
      sections: bucket.sort((a, b) => (a.columnIndex ?? a.order) - (b.columnIndex ?? b.order)),
    }))
}

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

// 段組み対応の幅計算
const getColumnWidth = (section: DocumentLayoutSectionConfig, columnsInRow: ColumnsLayout): string => {
  if (section.column === 'full' || columnsInRow === 1) return '100%'
  if (columnsInRow === 2) return '48%'
  if (columnsInRow === 3) return '31%'
  return `${section.width}%`
}

const getColumnValue = (key: DocumentTableColumnKey, item: QuoteItem, formatCurrency: (value: string | number) => string) => {
  switch (key) {
    case 'line_number':
      return String(item.line_number)
    case 'product_name':
      return item.product_name
    case 'description':
      return item.description || '-'
    case 'quantity':
      return String(item.quantity)
    case 'unit_price':
    case 'unit_cost':
      return formatCurrency(item.unit_price)
    case 'amount':
      return formatCurrency(item.amount)
    default:
      return ''
  }
}

const getTextAlign = (align?: string | null): 'left' | 'center' | 'right' => {
  if (align === 'center' || align === 'right') return align
  return 'left'
}

export function QuotePDF({ quote, companyInfo, layout }: QuotePDFProps) {
  const pageConfig = layout.page ?? DEFAULT_PAGE_CONFIG
  const styleConfig = layout.styles ?? DEFAULT_STYLE_CONFIG
  const tableStyleConfig = layout.tableStyles ?? DEFAULT_TABLE_STYLE_CONFIG
  const styles = createStyles(pageConfig, styleConfig, tableStyleConfig)

  const formatCurrency = (amount: string | number) => {
    const numericAmount = typeof amount === 'number' ? amount : Number(amount)
    return `¥${numericAmount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // プレビューと同じロジック: 有効なセクションをrow順でソート・グルーピング
  const enabledSections = sortSections(layout.sections.filter((section) => section.enabled))
  const groupedRows = groupSectionsByRow(enabledSections)

  const defaultColumns = sortColumns(getDefaultDocumentLayout('quote').table_columns)
  const tableColumns = (() => {
    const active = sortColumns(layout.table_columns).filter((column) => column.enabled)
    return active.length > 0 ? active : defaultColumns
  })()

  const renderSectionContent = (section: DocumentLayoutSectionConfig) => {
    const sectionStyle = {
      ...(section.fontSize && { fontSize: section.fontSize }),
      ...(section.backgroundColor && { backgroundColor: section.backgroundColor }),
      ...(section.padding && { padding: section.padding }),
      ...(section.marginTop && { marginTop: section.marginTop }),
      ...(section.marginBottom && { marginBottom: section.marginBottom }),
    }

    switch (section.key) {
      case 'document_title':
        // タイトルのみ（御見積書）- 中央配置
        return (
          <View style={[{ alignItems: 'center', marginBottom: styleConfig.sectionSpacing }, sectionStyle]}>
            <Text style={[styles.title, { fontSize: styleConfig.titleFontSize + 4 }]}>
              {section.title?.trim() || '御見積書'}
            </Text>
          </View>
        )
      
      case 'document_number':
        // 見積番号・発行日（右上）
        return (
          <View style={[{ textAlign: 'right' }, sectionStyle]}>
            <Text style={{ marginBottom: 4 }}>（見積No.）{quote.quote_number}</Text>
            <Text>（発行日）{formatDate(quote.issue_date)}</Text>
          </View>
        )
      
      case 'customer_name_only':
        // 顧客名のみ（宛先）
        return (
          <View style={sectionStyle}>
            <Text style={{ fontSize: styleConfig.sectionTitleFontSize + 2, fontWeight: 'bold' }}>
              {quote.project.customer.customer_name}
            </Text>
            <Text style={{ fontSize: styleConfig.baseFontSize, marginLeft: 20 }}>御中</Text>
          </View>
        )
      
      case 'greeting_text':
        // 挨拶文
        return (
          <View style={[{ marginTop: 8, marginBottom: 8 }, sectionStyle]}>
            <Text style={{ fontSize: styleConfig.baseFontSize }}>
              {section.title || 'ご照会の件、下記の通りお見積り申し上げます。'}
            </Text>
          </View>
        )
      
      case 'summary_box':
        // 見積概要ボックス（件名・金額・納期・取引条件・有効期限）
        const summaryBoxStyle = StyleSheet.create({
          box: {
            border: `${styleConfig.borderWidth}pt solid ${styleConfig.borderColor}`,
            padding: 10,
          },
          row: {
            flexDirection: 'row',
            marginBottom: 6,
            borderBottom: `0.5pt solid #ddd`,
            paddingBottom: 6,
          },
          label: {
            width: 80,
            fontWeight: 'bold',
            fontSize: styleConfig.baseFontSize,
          },
          value: {
            flex: 1,
            fontSize: styleConfig.baseFontSize,
          },
          amountRow: {
            flexDirection: 'row',
            marginBottom: 6,
            paddingBottom: 6,
          },
          amountValue: {
            fontSize: styleConfig.sectionTitleFontSize + 2,
            fontWeight: 'bold',
          },
          taxNote: {
            fontSize: styleConfig.baseFontSize - 2,
            color: '#cc0000',
            marginLeft: 10,
          },
          noteText: {
            fontSize: styleConfig.baseFontSize - 2,
            color: '#cc0000',
            marginTop: 8,
          },
        })
        return (
          <View style={[summaryBoxStyle.box, sectionStyle]}>
            <View style={summaryBoxStyle.row}>
              <Text style={summaryBoxStyle.label}>件　　名</Text>
              <Text style={[summaryBoxStyle.value, { fontWeight: 'bold' }]}>
                {quote.subject || quote.project.project_name}
              </Text>
            </View>
            <View style={summaryBoxStyle.amountRow}>
              <Text style={summaryBoxStyle.label}>金　　額</Text>
              <Text style={summaryBoxStyle.amountValue}>{formatCurrency(quote.total_amount)}-</Text>
              <Text style={summaryBoxStyle.taxNote}>（税抜き価格）</Text>
            </View>
            <View style={summaryBoxStyle.row}>
              <Text style={summaryBoxStyle.label}>納　　期</Text>
              <Text style={summaryBoxStyle.value}>別途お打合せ</Text>
            </View>
            <View style={summaryBoxStyle.row}>
              <Text style={summaryBoxStyle.label}>取引条件</Text>
              <Text style={summaryBoxStyle.value}>従来通り</Text>
            </View>
            <View style={[summaryBoxStyle.row, { borderBottom: 'none' }]}>
              <Text style={summaryBoxStyle.label}>有効期限</Text>
              <Text style={summaryBoxStyle.value}>
                {quote.valid_until ? `発行日より${Math.ceil((new Date(quote.valid_until).getTime() - new Date(quote.issue_date).getTime()) / (1000 * 60 * 60 * 24 * 30))}ヶ月` : '発行日より1ヶ月'}
              </Text>
            </View>
            <Text style={summaryBoxStyle.noteText}>
              ※ご請求時には別途、法令所定の消費税等を合わせてご請求させて頂きます。
            </Text>
          </View>
        )
      
      case 'stamp_area':
        // 印鑑エリア（会社情報 + 印鑑枠）
        const stampStyle = StyleSheet.create({
          container: {
            alignItems: 'flex-end',
          },
          companySection: {
            marginBottom: 10,
            textAlign: 'right',
          },
          companyName: {
            fontSize: styleConfig.sectionTitleFontSize,
            fontWeight: 'bold',
            marginBottom: 4,
          },
          address: {
            fontSize: styleConfig.baseFontSize - 1,
            marginBottom: 2,
          },
          stampBoxContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 10,
          },
          stampBox: {
            width: 50,
            height: 50,
            border: `1pt solid ${styleConfig.borderColor}`,
            alignItems: 'center',
            justifyContent: 'center',
          },
          stampLabel: {
            fontSize: 8,
            color: '#999',
          },
        })
        return (
          <View style={[stampStyle.container, sectionStyle]}>
            {styleConfig.companyLogoUrl && (
              <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                <Image src={styleConfig.companyLogoUrl} style={styles.companyLogo} />
              </View>
            )}
            <View style={stampStyle.companySection}>
              {companyInfo.name && <Text style={stampStyle.companyName}>{companyInfo.name}</Text>}
              {companyInfo.address &&
                companyInfo.address.split('\n').map((line, index) => (
                  <Text key={`stamp-address-${index}`} style={stampStyle.address}>
                    {line}
                  </Text>
                ))}
            </View>
            <View style={stampStyle.stampBoxContainer}>
              <View style={stampStyle.stampBox}>
                <Text style={stampStyle.stampLabel}>承認</Text>
              </View>
              <View style={stampStyle.stampBox}>
                <Text style={stampStyle.stampLabel}>担当</Text>
              </View>
            </View>
          </View>
        )

      case 'document_meta':
        return (
          <View style={sectionStyle}>
            {section.show_title !== false && (
              <Text style={styles.title}>{section.title?.trim() || '御見積書'}</Text>
            )}
            {section.show_label !== false && section.label && (
              <Text style={styles.metaLabel}>{section.label}</Text>
            )}
            <Text>見積番号: {quote.quote_number}</Text>
            <Text>バージョン: v{quote.version}</Text>
            <Text>件名: {quote.subject || '（件名未設定）'}</Text>
            <Text>発行日: {formatDate(quote.issue_date)}</Text>
            {quote.valid_until && <Text>有効期限: {formatDate(quote.valid_until)}</Text>}
          </View>
        )
      case 'company_info':
        if (!companyInfo.name && !companyInfo.address) return null
        const logoPosition = styleConfig.companyLogoPosition || 'right'
        return (
          <View style={[styles.companyInfo, sectionStyle]}>
            {styleConfig.companyLogoUrl && (
              <View
                style={{
                  alignItems:
                    logoPosition === 'left'
                      ? 'flex-start'
                      : logoPosition === 'center'
                        ? 'center'
                        : 'flex-end',
                }}
              >
                <Image src={styleConfig.companyLogoUrl} style={styles.companyLogo} />
              </View>
            )}
            {section.label && <Text style={styles.companyLabel}>{section.label}</Text>}
            {companyInfo.name && <Text style={styles.companyName}>{companyInfo.name}</Text>}
            {companyInfo.address &&
              companyInfo.address.split('\n').map((line, index) => (
                <Text key={`company-address-${index}`} style={styles.companyAddress}>
                  {line}
                </Text>
              ))}
          </View>
        )
      case 'customer_info':
        return (
          <View style={[styles.section, sectionStyle]}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || 'お客様情報'}</Text>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>顧客名:</Text>
              <Text style={styles.value}>{quote.project.customer.customer_name} 御中</Text>
            </View>
            {quote.project.customer.postal_code && (
              <View style={styles.row}>
                <Text style={styles.label}>郵便番号:</Text>
                <Text style={styles.value}>{quote.project.customer.postal_code}</Text>
              </View>
            )}
            {quote.project.customer.address && (
              <View style={styles.row}>
                <Text style={styles.label}>住所:</Text>
                <Text style={styles.value}>{quote.project.customer.address}</Text>
              </View>
            )}
            {quote.project.customer.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>電話:</Text>
                <Text style={styles.value}>{quote.project.customer.phone}</Text>
              </View>
            )}
          </View>
        )
      case 'project_info':
        return (
          <View style={[styles.section, sectionStyle]}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '案件情報'}</Text>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>案件番号:</Text>
              <Text style={styles.value}>{quote.project.project_number}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>案件名:</Text>
              <Text style={styles.value}>{quote.project.project_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>営業担当:</Text>
              <Text style={styles.value}>{quote.project.sales_rep.display_name}</Text>
            </View>
          </View>
        )
      case 'items_table':
        return (
          <View style={[styles.section, sectionStyle]}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '明細'}</Text>
            )}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {tableColumns.map((column) => (
                  <Text
                    key={`header-${column.key}`}
                    style={[
                      styles.tableHeaderCell,
                      { width: `${column.width}%`, textAlign: getTextAlign(column.textAlign) },
                    ]}
                  >
                    {column.label}
                  </Text>
                ))}
              </View>
              {quote.items
                .sort((a, b) => a.line_number - b.line_number)
                .map((item, index) => (
                  <View
                    key={item.line_number}
                    style={
                      tableStyleConfig.alternateRowColors && index % 2 === 1
                        ? styles.tableRowAlternate
                        : styles.tableRow
                    }
                  >
                    {tableColumns.map((column) => (
                      <Text
                        key={`${item.line_number}-${column.key}`}
                        style={[
                          styles.tableCell,
                          {
                            width: `${column.width}%`,
                            textAlign: getTextAlign(column.textAlign),
                            fontWeight: column.fontWeight || 'normal',
                          },
                        ]}
                      >
                        {getColumnValue(column.key, item, formatCurrency)}
                      </Text>
                    ))}
                  </View>
                ))}
            </View>
          </View>
        )
      case 'totals':
        return (
          <View style={[styles.totalSection, sectionStyle]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{section.label || '小計'}:</Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.total_amount)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>合計金額:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(quote.total_amount)}</Text>
            </View>
          </View>
        )
      case 'notes':
        if (!quote.notes) return null
        return (
          <View style={[styles.section, sectionStyle]}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '備考'}</Text>
            )}
            <Text>{quote.notes}</Text>
          </View>
        )
      case 'footer':
        return (
          <View style={[styles.footer, sectionStyle]}>
            {section.show_label !== false && section.label && (
              <Text style={{ fontWeight: 'bold' }}>{section.label}</Text>
            )}
            <Text>本見積書は {formatDate(quote.issue_date)} に発行されました。</Text>
            {quote.valid_until && <Text>有効期限: {formatDate(quote.valid_until)} まで</Text>}
          </View>
        )
      default:
        return null
    }
  }

  // 段組み対応のセクションレンダリング
  const renderSection = (section: DocumentLayoutSectionConfig, columnsInRow: ColumnsLayout) => {
    const content = renderSectionContent(section)
    if (!content) return null
    const widthStyle = { width: getColumnWidth(section, columnsInRow) }
    return (
      <View key={`${section.key}-${section.row}-${section.order}`} style={[styles.sectionContainer, widthStyle]}>
        {content}
      </View>
    )
  }

  const pageSize = pageConfig.size
  const isLandscape = pageConfig.orientation === 'landscape'

  return (
    <Document>
      <Page
        size={pageSize}
        orientation={isLandscape ? 'landscape' : 'portrait'}
        style={styles.page}
      >
        {/* プレビューと同じ: 行ごとにレンダリング */}
        {groupedRows.map(({ row, sections: rowSections }) => {
          const columnsInRow = getRowColumnsLayout(rowSections)
          return (
            <View key={`row-${row}`} style={styles.rowGroup}>
              {rowSections.map((section) => renderSection(section, columnsInRow))}
            </View>
          )
        })}

        {styleConfig.showPageNumbers && (
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        )}
      </Page>
    </Document>
  )
}
