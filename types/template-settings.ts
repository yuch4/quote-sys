/**
 * PDFテンプレート設定の型定義
 * フォームで設定可能な項目を定義
 */

export interface TemplateSettings {
  // ページ設定
  page: {
    size: 'A4' | 'A3' | 'B4' | 'B5'
    orientation: 'portrait' | 'landscape'
    marginTop: number
    marginBottom: number
    marginLeft: number
    marginRight: number
  }

  // ヘッダー設定
  header: {
    showLogo: boolean
    logoPosition: 'left' | 'center' | 'right'
    logoMaxHeight: number
    titleText: string
    titleFontSize: number
    titlePosition: 'left' | 'center' | 'right'
    showQuoteNumber: boolean
    showIssueDate: boolean
    showValidDate: boolean
  }

  // 顧客情報設定
  customer: {
    show: boolean
    position: 'left' | 'right'
    showCustomerName: boolean
    showAddress: boolean
    showContactPerson: boolean
    showHonorific: boolean // 「御中」「様」
    fontSize: number
  }

  // 自社情報設定
  company: {
    show: boolean
    position: 'left' | 'right'
    showCompanyName: boolean
    showAddress: boolean
    showRepName: boolean
    showStampArea: boolean
    stampSize: number
    fontSize: number
  }

  // 金額サマリー設定
  summary: {
    show: boolean
    position: 'top' | 'bottom' | 'both'
    showSubtotal: boolean
    showTax: boolean
    showTotal: boolean
    highlightTotal: boolean
    totalFontSize: number
  }

  // 明細テーブル設定
  table: {
    fontSize: number
    headerBgColor: string
    headerTextColor: string
    showRowNumber: boolean
    showItemName: boolean
    showDescription: boolean
    showQuantity: boolean
    showUnit: boolean
    showUnitPrice: boolean
    showAmount: boolean
    showSupplier: boolean
    alternateRowColor: boolean
    alternateRowBgColor: string
    borderColor: string
    borderWidth: number
  }

  // 備考設定
  notes: {
    show: boolean
    position: 'bottom'
    fontSize: number
    maxLines: number
  }

  // フッター設定
  footer: {
    show: boolean
    showPageNumber: boolean
    customText: string
    fontSize: number
  }

  // スタイル設定
  style: {
    fontFamily: string
    baseFontSize: number
    primaryColor: string
    textColor: string
    borderRadius: number
  }
}

/**
 * デフォルト設定
 */
export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  page: {
    size: 'A4',
    orientation: 'portrait',
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
  },
  header: {
    showLogo: false,
    logoPosition: 'left',
    logoMaxHeight: 50,
    titleText: '御見積書',
    titleFontSize: 24,
    titlePosition: 'center',
    showQuoteNumber: true,
    showIssueDate: true,
    showValidDate: true,
  },
  customer: {
    show: true,
    position: 'left',
    showCustomerName: true,
    showAddress: true,
    showContactPerson: true,
    showHonorific: true,
    fontSize: 14,
  },
  company: {
    show: true,
    position: 'right',
    showCompanyName: true,
    showAddress: true,
    showRepName: true,
    showStampArea: true,
    stampSize: 60,
    fontSize: 11,
  },
  summary: {
    show: true,
    position: 'top',
    showSubtotal: true,
    showTax: true,
    showTotal: true,
    highlightTotal: true,
    totalFontSize: 18,
  },
  table: {
    fontSize: 10,
    headerBgColor: '#f3f4f6',
    headerTextColor: '#374151',
    showRowNumber: true,
    showItemName: true,
    showDescription: true,
    showQuantity: true,
    showUnit: true,
    showUnitPrice: true,
    showAmount: true,
    showSupplier: false,
    alternateRowColor: false,
    alternateRowBgColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  notes: {
    show: true,
    position: 'bottom',
    fontSize: 10,
    maxLines: 5,
  },
  footer: {
    show: true,
    showPageNumber: true,
    customText: '',
    fontSize: 9,
  },
  style: {
    fontFamily: "'Noto Sans JP', sans-serif",
    baseFontSize: 11,
    primaryColor: '#2563eb',
    textColor: '#1f2937',
    borderRadius: 0,
  },
}

/**
 * 設定をJSON文字列として保存
 */
export function serializeSettings(settings: TemplateSettings): string {
  return JSON.stringify(settings)
}

/**
 * JSON文字列から設定を復元（デフォルト値でマージ）
 */
export function deserializeSettings(json: string | null): TemplateSettings {
  if (!json) return DEFAULT_TEMPLATE_SETTINGS

  try {
    const parsed = JSON.parse(json)
    return mergeWithDefaults(parsed, DEFAULT_TEMPLATE_SETTINGS)
  } catch {
    return DEFAULT_TEMPLATE_SETTINGS
  }
}

/**
 * 部分的な設定をデフォルト値でマージ
 */
function mergeWithDefaults<T extends Record<string, unknown>>(
  partial: Partial<T>,
  defaults: T
): T {
  const result = { ...defaults }

  for (const key in partial) {
    if (partial[key] !== undefined) {
      if (
        typeof partial[key] === 'object' &&
        partial[key] !== null &&
        !Array.isArray(partial[key])
      ) {
        result[key] = mergeWithDefaults(
          partial[key] as Record<string, unknown>,
          defaults[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>]
      } else {
        result[key] = partial[key] as T[Extract<keyof T, string>]
      }
    }
  }

  return result
}
