import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentTableColumnKey,
} from '@/types/document-layout'
import { ensureJapaneseFonts, FONT_FAMILY } from '@/lib/pdf/fonts'
import { getDefaultDocumentLayout, sortColumns } from '@/lib/document-layout'

ensureJapaneseFonts()

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
  companyLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
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
    width: '35%',
    fontWeight: 'bold',
  },
  value: {
    width: '65%',
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
  footer: {
    marginTop: 30,
    fontSize: 8,
    color: '#666',
  },
})

interface PurchaseOrderItemForPDF {
  line_number: number
  name: string
  description: string | null
  quantity: number
  unit_cost: number
  amount: number
}

interface PurchaseOrderPDFProps {
  order: {
    purchase_order_number: string
    order_date: string
    status: string
    total_cost: number
    notes: string | null
    supplier: {
      supplier_name: string | null
      address: string | null
      phone: string | null
      email: string | null
    } | null
    quote?: {
      quote_number: string | null
      project?: {
        project_name: string | null
        project_number: string | null
        customer?: {
          customer_name: string | null
        }
      } | null
    } | null
  }
  companyInfo: {
    name: string
    address: string
  }
  items: PurchaseOrderItemForPDF[]
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

const getColumnValue = (
  key: DocumentTableColumnKey,
  item: PurchaseOrderItemForPDF,
  formatCurrency: (value: number) => string,
) => {
  switch (key) {
    case 'line_number':
      return String(item.line_number)
    case 'product_name':
      return item.name
    case 'description':
      return item.description || '-'
    case 'quantity':
      return String(item.quantity)
    case 'unit_price':
    case 'unit_cost':
      return formatCurrency(item.unit_cost)
    case 'amount':
      return formatCurrency(item.amount)
    default:
      return ''
  }
}

export function PurchaseOrderPDF({ order, companyInfo, items, layout }: PurchaseOrderPDFProps) {
  const formatCurrency = (value: number) => `¥${Number(value || 0).toLocaleString()}`
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
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

  const defaultColumns = sortColumns(getDefaultDocumentLayout('purchase_order').table_columns)
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
              <Text style={styles.title}>{section.title?.trim() || '発注書'}</Text>
            )}
            {section.show_label !== false && section.label && (
              <Text style={styles.metaLabel}>{section.label}</Text>
            )}
            <Text>発注書番号: {order.purchase_order_number}</Text>
            <Text>発注日: {formatDate(order.order_date)}</Text>
            <Text>ステータス: {order.status}</Text>
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
      case 'supplier_info':
        if (!order.supplier) return null
        return (
          <View style={styles.section}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '仕入先情報'}</Text>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>仕入先名:</Text>
              <Text style={styles.value}>{order.supplier.supplier_name || '-'}</Text>
            </View>
            {order.supplier.address && (
              <View style={styles.row}>
                <Text style={styles.label}>住所:</Text>
                <Text style={styles.value}>{order.supplier.address}</Text>
              </View>
            )}
            {order.supplier.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>電話:</Text>
                <Text style={styles.value}>{order.supplier.phone}</Text>
              </View>
            )}
            {order.supplier.email && (
              <View style={styles.row}>
                <Text style={styles.label}>メール:</Text>
                <Text style={styles.value}>{order.supplier.email}</Text>
              </View>
            )}
          </View>
        )
      case 'quote_info':
        if (!order.quote) return null
        return (
          <View style={styles.section}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '関連見積'}</Text>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>見積番号:</Text>
              <Text style={styles.value}>{order.quote.quote_number || '-'}</Text>
            </View>
            {order.quote.project?.project_name && (
              <View style={styles.row}>
                <Text style={styles.label}>案件名:</Text>
                <Text style={styles.value}>{order.quote.project.project_name}</Text>
              </View>
            )}
            {order.quote.project?.customer?.customer_name && (
              <View style={styles.row}>
                <Text style={styles.label}>顧客名:</Text>
                <Text style={styles.value}>{order.quote.project.customer.customer_name}</Text>
              </View>
            )}
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
              {items.map((item, index) => (
                <View key={`${item.line_number}-${index}`} style={styles.tableRow}>
                  {tableColumns.map((column) => (
                    <Text
                      key={`${column.key}-${item.line_number}-${index}`}
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
              <Text style={styles.totalLabel}>{section.label || '合計'}:</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.total_cost)}</Text>
            </View>
          </View>
        )
      case 'notes':
        if (!order.notes) return null
        return (
          <View style={styles.section}>
            {section.show_label !== false && (
              <Text style={styles.sectionTitle}>{section.label || '備考'}</Text>
            )}
            <Text>{order.notes}</Text>
          </View>
        )
      case 'footer':
        return (
          <View style={styles.footer}>
            {section.show_label !== false && section.label && (
              <Text style={{ fontWeight: 'bold' }}>{section.label}</Text>
            )}
            <Text>この発注書は {formatDate(order.order_date)} に作成されました。</Text>
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
