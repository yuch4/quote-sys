import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercentage,
  calculateProfit,
  calculateProfitRate,
  calculateItemAmount,
  calculateQuoteTotal,
  calculateQuoteCost,
  formatDate,
  generateProjectNumber,
  generateQuoteNumber,
  isValidEmail,
  isValidPhoneNumber,
  isValidPostalCode,
} from '@/lib/utils/business'

describe('フォーマット関数', () => {
  describe('formatCurrency', () => {
    it('通貨を正しくフォーマットする', () => {
      expect(formatCurrency(1000)).toBe('¥1,000')
      expect(formatCurrency(1234567)).toBe('¥1,234,567')
      expect(formatCurrency(0)).toBe('¥0')
    })
  })

  describe('formatPercentage', () => {
    it('パーセンテージを正しくフォーマットする', () => {
      expect(formatPercentage(25.5)).toBe('25.5%')
      expect(formatPercentage(100)).toBe('100.0%')
      expect(formatPercentage(0)).toBe('0.0%')
    })
  })

  describe('formatDate', () => {
    it('日付を正しくフォーマットする', () => {
      const date = new Date('2025-01-15')
      expect(formatDate(date)).toBe('2025-01-15')
    })

    it('文字列の日付を正しくフォーマットする', () => {
      expect(formatDate('2025-12-31')).toBe('2025-12-31')
    })
  })
})

describe('計算関数', () => {
  describe('calculateProfit', () => {
    it('粗利を正しく計算する', () => {
      expect(calculateProfit(10000, 7000)).toBe(3000)
      expect(calculateProfit(5000, 5000)).toBe(0)
      expect(calculateProfit(10000, 12000)).toBe(-2000)
    })
  })

  describe('calculateProfitRate', () => {
    it('粗利率を正しく計算する', () => {
      expect(calculateProfitRate(10000, 7000)).toBe(30)
      expect(calculateProfitRate(5000, 4000)).toBe(20)
      expect(calculateProfitRate(10000, 10000)).toBe(0)
    })

    it('売上が0の場合は0を返す', () => {
      expect(calculateProfitRate(0, 5000)).toBe(0)
    })
  })

  describe('calculateItemAmount', () => {
    it('明細金額を正しく計算する', () => {
      expect(calculateItemAmount(10, 1000)).toBe(10000)
      expect(calculateItemAmount(5, 2500)).toBe(12500)
      expect(calculateItemAmount(0, 1000)).toBe(0)
    })
  })

  describe('calculateQuoteTotal', () => {
    it('見積合計金額を正しく計算する', () => {
      const items = [
        { quantity: 10, unit_price: 1000 },
        { quantity: 5, unit_price: 2000 },
        { quantity: 3, unit_price: 1500 },
      ]
      expect(calculateQuoteTotal(items)).toBe(24500)
    })

    it('空の配列の場合は0を返す', () => {
      expect(calculateQuoteTotal([])).toBe(0)
    })
  })

  describe('calculateQuoteCost', () => {
    it('見積合計原価を正しく計算する', () => {
      const items = [
        { quantity: 10, cost_price: 800 },
        { quantity: 5, cost_price: 1500 },
        { quantity: 3, cost_price: undefined },
      ]
      expect(calculateQuoteCost(items)).toBe(15500)
    })

    it('原価なしの明細は無視する', () => {
      const items = [
        { quantity: 10, cost_price: undefined },
        { quantity: 5, cost_price: 1000 },
      ]
      expect(calculateQuoteCost(items)).toBe(5000)
    })
  })
})

describe('番号生成関数', () => {
  describe('generateProjectNumber', () => {
    it('案件番号を正しく生成する', () => {
      expect(generateProjectNumber(2025, 1)).toBe('P-2025-0001')
      expect(generateProjectNumber(2025, 123)).toBe('P-2025-0123')
      expect(generateProjectNumber(2025, 9999)).toBe('P-2025-9999')
    })
  })

  describe('generateQuoteNumber', () => {
    it('見積番号を正しく生成する', () => {
      expect(generateQuoteNumber(2025, 1, 1)).toBe('Q-2025-0001-v1')
      expect(generateQuoteNumber(2025, 123, 2)).toBe('Q-2025-0123-v2')
      expect(generateQuoteNumber(2025, 9999, 10)).toBe('Q-2025-9999-v10')
    })
  })
})

describe('バリデーション関数', () => {
  describe('isValidEmail', () => {
    it('正しいメールアドレスを受け入れる', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@example.co.jp')).toBe(true)
    })

    it('不正なメールアドレスを拒否する', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test @example.com')).toBe(false)
    })
  })

  describe('isValidPhoneNumber', () => {
    it('正しい電話番号を受け入れる', () => {
      expect(isValidPhoneNumber('03-1234-5678')).toBe(true)
      expect(isValidPhoneNumber('0312345678')).toBe(true)
      expect(isValidPhoneNumber('090-1234-5678')).toBe(true)
      expect(isValidPhoneNumber('09012345678')).toBe(true)
    })

    it('不正な電話番号を拒否する', () => {
      expect(isValidPhoneNumber('123-4567-8901')).toBe(false)
      expect(isValidPhoneNumber('03-1234')).toBe(false)
      expect(isValidPhoneNumber('abc-defg-hijk')).toBe(false)
    })
  })

  describe('isValidPostalCode', () => {
    it('正しい郵便番号を受け入れる', () => {
      expect(isValidPostalCode('123-4567')).toBe(true)
      expect(isValidPostalCode('1234567')).toBe(true)
    })

    it('不正な郵便番号を拒否する', () => {
      expect(isValidPostalCode('12-3456')).toBe(false)
      expect(isValidPostalCode('123-456')).toBe(false)
      expect(isValidPostalCode('abc-defg')).toBe(false)
    })
  })
})
