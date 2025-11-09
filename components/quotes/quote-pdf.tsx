import path from 'path'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

const FONT_FAMILY = 'NotoSansJP'

const getFontSrc = (fileName: string) => {
  if (typeof window !== 'undefined') {
    return `/fonts/${fileName}`
  }

  return path.join(process.cwd(), 'public', 'fonts', fileName)
}

let fontsRegistered = false

const registerJapaneseFonts = () => {
  if (fontsRegistered) return

  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: getFontSrc('NotoSansJP-Regular.ttf'), fontWeight: 'normal' },
      { src: getFontSrc('NotoSansJP-Bold.ttf'), fontWeight: 'bold' },
    ],
  })

  fontsRegistered = true
}

registerJapaneseFonts()

// PDFスタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  companyInfo: {
    textAlign: 'right',
    marginLeft: 12,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  companyAddress: {
    fontSize: 10,
    marginTop: 4,
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
    fontWeight: 'bold',
    borderBottom: '1pt solid #000',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '0.5pt solid #ddd',
  },
  col1: { width: '7%' },
  col2: { width: '25%' },
  col3: { width: '33%' },
  col4: { width: '10%' },
  col5: { width: '12.5%' },
  col6: { width: '12.5%' },
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
}

export function QuotePDF({ quote, companyInfo }: QuotePDFProps) {
  const formatCurrency = (amount: string) => {
    return `¥${Number(amount).toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>御見積書</Text>
            <Text>見積番号: {quote.quote_number}</Text>
            <Text>バージョン: v{quote.version}</Text>
            <Text>件名: {quote.subject || '（件名未設定）'}</Text>
            <Text>発行日: {formatDate(quote.issue_date)}</Text>
            {quote.valid_until && <Text>有効期限: {formatDate(quote.valid_until)}</Text>}
          </View>
          {(companyInfo.name || companyInfo.address) && (
            <View style={styles.companyInfo}>
              {companyInfo.name && <Text style={styles.companyName}>{companyInfo.name}</Text>}
              {companyInfo.address &&
                companyInfo.address.split('\n').map((line, index) => (
                  <Text key={`address-line-${index}`} style={styles.companyAddress}>
                    {line}
                  </Text>
                ))}
            </View>
          )}
        </View>

        {/* 顧客情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>お客様情報</Text>
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

        {/* 案件情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>案件情報</Text>
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

        {/* 明細テーブル */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>明細</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>No</Text>
              <Text style={styles.col2}>品名</Text>
              <Text style={styles.col3}>説明</Text>
              <Text style={styles.col4}>数量</Text>
              <Text style={styles.col5}>単価</Text>
              <Text style={styles.col6}>金額</Text>
            </View>
            {quote.items
              .sort((a, b) => a.line_number - b.line_number)
              .map((item) => (
                <View key={item.line_number} style={styles.tableRow}>
                  <Text style={styles.col1}>{item.line_number}</Text>
                  <Text style={styles.col2}>{item.product_name}</Text>
                  <Text style={styles.col3}>{item.description || '-'}</Text>
                  <Text style={styles.col4}>{item.quantity}</Text>
                  <Text style={styles.col5}>{formatCurrency(item.unit_price)}</Text>
                  <Text style={styles.col6}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* 合計 */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>小計:</Text>
            <Text style={styles.totalValue}>{formatCurrency(quote.total_amount)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>合計金額:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(quote.total_amount)}</Text>
          </View>
        </View>

        {/* 備考 */}
        {quote.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>備考</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text>本見積書は {formatDate(quote.issue_date)} に発行されました。</Text>
          {quote.valid_until && (
            <Text>有効期限: {formatDate(quote.valid_until)} まで</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}
