/**
 * HTML/CSSテンプレートエンジン
 * Handlebarsを使用してテンプレートにデータを差し込む
 */

import Handlebars from 'handlebars'
import type { QuotePDFData, QuotePDFItem } from '@/types/pdf-templates'

// 許可された変数キーのリスト（セキュリティ対策）
const ALLOWED_QUOTE_KEYS = [
  'quoteNo',
  'issuedAt',
  'validUntil',
  'subject',
  'customerName',
  'customerPostalCode',
  'customerAddress',
  'customerPhone',
  'projectNumber',
  'projectName',
  'salesRepName',
  'items',
  'subtotal',
  'taxAmount',
  'total',
  'notes',
  'companyName',
  'companyAddress',
  'companyLogoUrl',
  'stamps',
]

// カスタムヘルパー登録
Handlebars.registerHelper('formatCurrency', function (value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '¥0'
  return `¥${num.toLocaleString('ja-JP')}`
})

Handlebars.registerHelper('formatDate', function (value: string | Date, format?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  
  if (format === 'long') {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
})

Handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
  return a === b
})

Handlebars.registerHelper('gt', function (a: number, b: number) {
  return a > b
})

Handlebars.registerHelper('lt', function (a: number, b: number) {
  return a < b
})

Handlebars.registerHelper('add', function (a: number, b: number) {
  return a + b
})

Handlebars.registerHelper('multiply', function (a: number, b: number) {
  return a * b
})

Handlebars.registerHelper('ifCond', function (
  this: unknown,
  v1: unknown,
  operator: string,
  v2: unknown,
  options: Handlebars.HelperOptions
) {
  switch (operator) {
    case '==':
      return v1 == v2 ? options.fn(this) : options.inverse(this)
    case '===':
      return v1 === v2 ? options.fn(this) : options.inverse(this)
    case '!=':
      return v1 != v2 ? options.fn(this) : options.inverse(this)
    case '!==':
      return v1 !== v2 ? options.fn(this) : options.inverse(this)
    case '<':
      return (v1 as number) < (v2 as number) ? options.fn(this) : options.inverse(this)
    case '<=':
      return (v1 as number) <= (v2 as number) ? options.fn(this) : options.inverse(this)
    case '>':
      return (v1 as number) > (v2 as number) ? options.fn(this) : options.inverse(this)
    case '>=':
      return (v1 as number) >= (v2 as number) ? options.fn(this) : options.inverse(this)
    case '&&':
      return v1 && v2 ? options.fn(this) : options.inverse(this)
    case '||':
      return v1 || v2 ? options.fn(this) : options.inverse(this)
    default:
      return options.inverse(this)
  }
})

// 備考の改行を<br>に変換
Handlebars.registerHelper('nl2br', function (text: string) {
  if (!text) return ''
  return new Handlebars.SafeString(
    Handlebars.escapeExpression(text).replace(/\n/g, '<br>')
  )
})

// 住所の改行を<br>に変換（エスケープなし）
Handlebars.registerHelper('addressBr', function (text: string) {
  if (!text) return ''
  return new Handlebars.SafeString(text.replace(/\n/g, '<br>'))
})

/**
 * HTMLからscriptタグと危険な属性を除去
 */
function sanitizeHTML(html: string): string {
  // scriptタグを除去
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // on*イベントハンドラを除去
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
  
  // javascript: URLを除去
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
  
  return sanitized
}

/**
 * テンプレートにデータを差し込んでHTMLを生成
 */
export function renderTemplate(
  htmlTemplate: string,
  cssTemplate: string | null,
  data: QuotePDFData
): string {
  // テンプレートをサニタイズ
  const sanitizedHtml = sanitizeHTML(htmlTemplate)
  
  // Handlebarsでコンパイル
  const template = Handlebars.compile(sanitizedHtml)
  
  // データをフィルタリング（許可されたキーのみ）
  const filteredData: Record<string, unknown> = {}
  for (const key of ALLOWED_QUOTE_KEYS) {
    if (key in data) {
      filteredData[key] = (data as unknown as Record<string, unknown>)[key]
    }
  }
  
  // HTMLを生成
  const renderedHtml = template(filteredData)
  
  // CSSを埋め込んだ完全なHTMLを構築
  const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4;
      margin: 15mm 10mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #333;
      margin: 0;
      padding: 0;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
    }
    
    /* 改ページ制御 */
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    
    ${cssTemplate || ''}
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`

  return fullHtml
}

/**
 * 見積データをPDF用データ構造に変換
 */
export function convertQuoteToPDFData(
  quote: {
    quote_number: string
    version: number
    issue_date: string
    valid_until: string | null
    subject: string | null
    total_amount: string | number
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
    items: Array<{
      line_number: number
      product_name: string
      description: string | null
      quantity: number | string
      unit_price: string | number
      amount: string | number
    }>
  },
  companyInfo: { name: string; address: string }
): QuotePDFData {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const items: QuotePDFItem[] = quote.items
    .sort((a, b) => a.line_number - b.line_number)
    .map((item) => ({
      lineNumber: item.line_number,
      productName: item.product_name,
      description: item.description || undefined,
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
      unitPrice: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
      amount: typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount,
    }))

  const total = typeof quote.total_amount === 'string' 
    ? parseFloat(quote.total_amount) 
    : quote.total_amount

  return {
    quoteNo: quote.quote_number,
    issuedAt: formatDate(quote.issue_date),
    validUntil: quote.valid_until ? formatDate(quote.valid_until) : undefined,
    subject: quote.subject || undefined,
    customerName: quote.project.customer.customer_name,
    customerPostalCode: quote.project.customer.postal_code || undefined,
    customerAddress: quote.project.customer.address || undefined,
    customerPhone: quote.project.customer.phone || undefined,
    projectNumber: quote.project.project_number,
    projectName: quote.project.project_name,
    salesRepName: quote.project.sales_rep.display_name,
    items,
    subtotal: total,
    total,
    notes: quote.notes || undefined,
    companyName: companyInfo.name,
    companyAddress: companyInfo.address,
  }
}
