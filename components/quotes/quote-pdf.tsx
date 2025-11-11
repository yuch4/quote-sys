import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { ensureJapaneseFonts, FONT_FAMILY } from '@/lib/pdf/fonts'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentTableColumnKey,
} from '@/types/document-layout'
import { getDefaultDocumentLayout, sortColumns } from '@/lib/document-layout'

ensureJapaneseFonts()

// PDFスタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
  },
  header: {
    marginBottom: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 10,
    color: '#333',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  companyLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 10,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1pt solid #000',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
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
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderBottom: '1pt solid #000',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '0.5pt solid #ddd',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableCell: {
    fontSize: 9,
  },
  totalSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    marginBottom: 5,
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
    borderTop: '1pt solid #000',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    fontSize: 8,
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
    .map(([, bucket]) => bucket.sort((a, b) => a.order - b.order))
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

export function QuotePDF({ quote, companyInfo, layout }: QuotePDFProps) {
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

  const enabledSections = layout.sections.filter((section) => section.enabled)
  const headerRows = groupSectionsByRow(enabledSections.filter((section) => section.region === 'header'))
  const bodyRows = groupSectionsByRow(enabledSections.filter((section) => section.region === 'body'))
  const footerSections = enabledSections.filter((section) => section.region === 'footer').sort((a, b) => a.order - b.order)

  const defaultColumns = sortColumns(getDefaultDocumentLayout('quote').table_columns)
  const tableColumns = (() => {
    const active = sortColumns(layout.table_columns).filter((column) => column.enabled)
    return active.length > 0 ? active : defaultColumns
  })()

const renderSectionContent = (section: DocumentLayoutSectionConfig) => {
    switch (section.key) {
      case 'document_meta':
        return (
          <View>
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
        return (
          <View style={styles.companyInfo}>
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
          <View style={styles.section}>
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
          <View style={styles.section}>
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
          <View style={styles.section}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '明細'}</Text>
            )}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {tableColumns.map((column) => (
                  <Text key={`header-${column.key}`} style={[styles.tableHeaderCell, { width: `${column.width}%` }]}>
                    {column.label}
                  </Text>
                ))}
              </View>
              {quote.items
                .sort((a, b) => a.line_number - b.line_number)
                .map((item) => (
                  <View key={item.line_number} style={styles.tableRow}>
                    {tableColumns.map((column) => (
                      <Text
                        key={`${item.line_number}-${column.key}`}
                        style={[styles.tableCell, { width: `${column.width}%` }]}
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
          <View style={styles.totalSection}>
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
          <View style={styles.section}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '備考'}</Text>
            )}
            <Text>{quote.notes}</Text>
          </View>
        )
      case 'footer':
        return (
          <View style={styles.footer}>
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

  const renderSection = (section: DocumentLayoutSectionConfig) => {
    const content = renderSectionContent(section)
    if (!content) return null
    const widthStyle = section.column === 'full' ? { width: '100%' } : { width: `${section.width}%` }
    return (
      <View key={`${section.key}-${section.row}-${section.order}`} style={[styles.sectionContainer, widthStyle]}>
        {content}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {headerRows.map((row, index) => (
            <View key={`header-row-${index}`} style={styles.headerRow}>
              {row.map((section) => renderSection(section))}
            </View>
          ))}
        </View>

        {bodyRows.map((row, index) => (
          <View key={`body-row-${index}`} style={styles.rowGroup}>
            {row.map((section) => renderSection(section))}
          </View>
        ))}

        {footerSections.map((section) => renderSection(section))}
      </Page>
    </Document>
  )
}
