/**
 * 通貨フォーマット（円記号付き）
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

/**
 * パーセンテージフォーマット
 */
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)}%`
}

/**
 * 粗利計算
 */
export function calculateProfit(totalAmount: number, totalCost: number): number {
  return totalAmount - totalCost
}

/**
 * 粗利率計算
 */
export function calculateProfitRate(totalAmount: number, totalCost: number): number {
  if (totalAmount === 0) return 0
  const profit = calculateProfit(totalAmount, totalCost)
  return (profit / totalAmount) * 100
}

/**
 * 明細金額計算
 */
export function calculateItemAmount(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

/**
 * 見積合計金額計算
 */
export function calculateQuoteTotal(items: Array<{ quantity: number; unit_price: number }>): number {
  return items.reduce((sum, item) => sum + calculateItemAmount(item.quantity, item.unit_price), 0)
}

/**
 * 見積合計原価計算
 */
export function calculateQuoteCost(items: Array<{ quantity: number; cost_price?: number }>): number {
  return items.reduce((sum, item) => {
    if (item.cost_price) {
      return sum + calculateItemAmount(item.quantity, item.cost_price)
    }
    return sum
  }, 0)
}

/**
 * 日付フォーマット（YYYY-MM-DD）
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 案件番号生成（P-YYYY-XXXX）
 */
export function generateProjectNumber(year: number, sequence: number): string {
  return `P-${year}-${String(sequence).padStart(4, '0')}`
}

/**
 * 見積番号生成（Q-YYYY-XXXX-vN）
 */
export function generateQuoteNumber(year: number, sequence: number, version: number): string {
  const base = `Q-${year}-${String(sequence).padStart(4, '0')}`
  return `${base}-v${version}`
}

/**
 * バリデーション: メールアドレス
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * バリデーション: 電話番号（日本）
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{4}$/
  return phoneRegex.test(phone)
}

/**
 * バリデーション: 郵便番号（日本）
 */
export function isValidPostalCode(postalCode: string): boolean {
  const postalCodeRegex = /^\d{3}-?\d{4}$/
  return postalCodeRegex.test(postalCode)
}
