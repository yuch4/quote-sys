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

    it('負の金額を正しくフォーマットする', () => {
      expect(formatCurrency(-1000)).toBe('¥-1,000')
      expect(formatCurrency(-1234567)).toBe('¥-1,234,567')
    })

    it('小数点以下を含む金額を正しくフォーマットする', () => {
      expect(formatCurrency(1000.5)).toBe('¥1,000.5')
      expect(formatCurrency(1234567.89)).toBe('¥1,234,567.89')
    })

    it('極端に大きな金額を処理する', () => {
      expect(formatCurrency(999999999999)).toBe('¥999,999,999,999')
    })

    it('極端に小さな金額を処理する', () => {
      expect(formatCurrency(0.01)).toBe('¥0.01')
      expect(formatCurrency(0.001)).toBe('¥0.001')
    })
  })

  describe('formatPercentage', () => {
    it('パーセンテージを正しくフォーマットする', () => {
      expect(formatPercentage(25.5)).toBe('25.5%')
      expect(formatPercentage(100)).toBe('100.0%')
      expect(formatPercentage(0)).toBe('0.0%')
    })

    it('負のパーセンテージを正しくフォーマットする', () => {
      expect(formatPercentage(-10.5)).toBe('-10.5%')
      expect(formatPercentage(-100)).toBe('-100.0%')
    })

    it('小数点以下を1桁に丸める', () => {
      expect(formatPercentage(33.333333)).toBe('33.3%')
      expect(formatPercentage(66.666666)).toBe('66.7%')
    })

    it('極端に大きなパーセンテージを処理する', () => {
      expect(formatPercentage(1000)).toBe('1000.0%')
      expect(formatPercentage(9999.99)).toBe('10000.0%')
    })

    it('極端に小さなパーセンテージを処理する', () => {
      expect(formatPercentage(0.001)).toBe('0.0%')
      expect(formatPercentage(0.05)).toBe('0.1%')
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

    it('1桁の月と日をゼロパディングする', () => {
      expect(formatDate('2025-01-01')).toBe('2025-01-01')
      expect(formatDate('2025-09-05')).toBe('2025-09-05')
    })

    it('閏年の日付を正しく処理する', () => {
      expect(formatDate('2024-02-29')).toBe('2024-02-29')
    })

    it('年末の日付を正しく処理する', () => {
      expect(formatDate('2025-12-31')).toBe('2025-12-31')
    })

    it('年始の日付を正しく処理する', () => {
      expect(formatDate('2025-01-01')).toBe('2025-01-01')
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

    it('負の粗利を正しく計算する（赤字）', () => {
      expect(calculateProfit(5000, 8000)).toBe(-3000)
      expect(calculateProfit(0, 1000)).toBe(-1000)
    })

    it('極端に大きな金額で計算する', () => {
      expect(calculateProfit(999999999, 500000000)).toBe(499999999)
    })

    it('小数点以下を含む金額で計算する', () => {
      expect(calculateProfit(10000.50, 7000.25)).toBe(3000.25)
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

    it('負の粗利率を正しく計算する（赤字）', () => {
      expect(calculateProfitRate(10000, 15000)).toBe(-50)
      expect(calculateProfitRate(5000, 10000)).toBe(-100)
    })

    it('100%を超える粗利率を正しく計算する', () => {
      expect(calculateProfitRate(10000, 0)).toBe(100)
      expect(calculateProfitRate(10000, 1000)).toBe(90)
    })

    it('小数点以下を含む粗利率を計算する', () => {
      expect(calculateProfitRate(10000, 6666.67)).toBeCloseTo(33.33, 1)
    })
  })

  describe('calculateItemAmount', () => {
    it('明細金額を正しく計算する', () => {
      expect(calculateItemAmount(10, 1000)).toBe(10000)
      expect(calculateItemAmount(5, 2500)).toBe(12500)
      expect(calculateItemAmount(0, 1000)).toBe(0)
    })

    it('数量が0の場合は0を返す', () => {
      expect(calculateItemAmount(0, 5000)).toBe(0)
    })

    it('単価が0の場合は0を返す', () => {
      expect(calculateItemAmount(10, 0)).toBe(0)
    })

    it('小数点以下を含む計算を正しく行う', () => {
      expect(calculateItemAmount(3, 333.33)).toBeCloseTo(999.99, 2)
      expect(calculateItemAmount(7, 142.857142857)).toBeCloseTo(1000, 1)
    })

    it('大きな数量と単価で計算する', () => {
      expect(calculateItemAmount(1000, 10000)).toBe(10000000)
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

    it('単一の明細を計算する', () => {
      const items = [{ quantity: 1, unit_price: 5000 }]
      expect(calculateQuoteTotal(items)).toBe(5000)
    })

    it('0円の明細を含む場合', () => {
      const items = [
        { quantity: 10, unit_price: 1000 },
        { quantity: 5, unit_price: 0 },
        { quantity: 0, unit_price: 2000 },
      ]
      expect(calculateQuoteTotal(items)).toBe(10000)
    })

    it('多数の明細を計算する', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        quantity: 1,
        unit_price: 100,
      }))
      expect(calculateQuoteTotal(items)).toBe(10000)
    })

    it('小数点以下を含む明細を計算する', () => {
      const items = [
        { quantity: 3, unit_price: 333.33 },
        { quantity: 2, unit_price: 500.01 },
      ]
      expect(calculateQuoteTotal(items)).toBeCloseTo(2000.01, 2)
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

    it('すべての明細に原価がない場合は0を返す', () => {
      const items = [
        { quantity: 10, cost_price: undefined },
        { quantity: 5, cost_price: undefined },
      ]
      expect(calculateQuoteCost(items)).toBe(0)
    })

    it('原価が0の明細を含む場合', () => {
      const items = [
        { quantity: 10, cost_price: 1000 },
        { quantity: 5, cost_price: 0 },
      ]
      expect(calculateQuoteCost(items)).toBe(10000)
    })

    it('小数点以下を含む原価を計算する', () => {
      const items = [
        { quantity: 3, cost_price: 333.33 },
        { quantity: 2, cost_price: 500.01 },
      ]
      expect(calculateQuoteCost(items)).toBeCloseTo(2000.01, 2)
    })

    it('空の配列の場合は0を返す', () => {
      expect(calculateQuoteCost([])).toBe(0)
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

    it('4桁を超える連番を処理する', () => {
      expect(generateProjectNumber(2025, 10000)).toBe('P-2025-10000')
      expect(generateProjectNumber(2025, 99999)).toBe('P-2025-99999')
    })

    it('連番が1の場合はゼロパディングする', () => {
      expect(generateProjectNumber(2025, 1)).toBe('P-2025-0001')
    })

    it('異なる年度で生成する', () => {
      expect(generateProjectNumber(2024, 1)).toBe('P-2024-0001')
      expect(generateProjectNumber(2026, 1)).toBe('P-2026-0001')
    })
  })

  describe('generateQuoteNumber', () => {
    it('見積番号を正しく生成する', () => {
      expect(generateQuoteNumber(2025, 1, 1)).toBe('Q-2025-0001-v1')
      expect(generateQuoteNumber(2025, 123, 2)).toBe('Q-2025-0123-v2')
      expect(generateQuoteNumber(2025, 9999, 10)).toBe('Q-2025-9999-v10')
    })

    it('初版（v1）を生成する', () => {
      expect(generateQuoteNumber(2025, 1, 1)).toBe('Q-2025-0001-v1')
    })

    it('改訂版（v2以降）を生成する', () => {
      expect(generateQuoteNumber(2025, 1, 2)).toBe('Q-2025-0001-v2')
      expect(generateQuoteNumber(2025, 1, 3)).toBe('Q-2025-0001-v3')
      expect(generateQuoteNumber(2025, 1, 99)).toBe('Q-2025-0001-v99')
    })

    it('4桁を超える連番とバージョンを処理する', () => {
      expect(generateQuoteNumber(2025, 10000, 100)).toBe('Q-2025-10000-v100')
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

    it('様々な有効なメールアドレス形式を受け入れる', () => {
      expect(isValidEmail('simple@example.com')).toBe(true)
      expect(isValidEmail('very.common@example.com')).toBe(true)
      expect(isValidEmail('disposable.style.email.with+symbol@example.com')).toBe(true)
      expect(isValidEmail('x@example.com')).toBe(true)
      expect(isValidEmail('example@s.example')).toBe(true)
    })

    it('様々な無効なメールアドレス形式を拒否する', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('plainaddress')).toBe(false)
      expect(isValidEmail('@no-local.org')).toBe(false)
      expect(isValidEmail('no-at.com')).toBe(false)
      expect(isValidEmail('no-tld@domain')).toBe(false)
      expect(isValidEmail('two@@example.com')).toBe(false)
      expect(isValidEmail('spaces in@example.com')).toBe(false)
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

    it('様々な有効な電話番号形式を受け入れる', () => {
      // 現在の正規表現 /^0\d{1,4}-?\d{1,4}-?\d{4}$/ に合致する形式のみテスト
      expect(isValidPhoneNumber('050-1234-5678')).toBe(true)
      expect(isValidPhoneNumber('0501234567')).toBe(true)
      expect(isValidPhoneNumber('06-1234-5678')).toBe(true)
      expect(isValidPhoneNumber('0612345678')).toBe(true)
      expect(isValidPhoneNumber('0798-12-3456')).toBe(true)
    })

    it('様々な無効な電話番号形式を拒否する', () => {
      expect(isValidPhoneNumber('')).toBe(false)
      expect(isValidPhoneNumber('123')).toBe(false)
      expect(isValidPhoneNumber('12345678901234567890')).toBe(false)
      expect(isValidPhoneNumber('1-234-5678')).toBe(false)
      expect(isValidPhoneNumber('+81-3-1234-5678')).toBe(false)
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

    it('様々な有効な郵便番号形式を受け入れる', () => {
      expect(isValidPostalCode('100-0001')).toBe(true)
      expect(isValidPostalCode('1000001')).toBe(true)
      expect(isValidPostalCode('999-9999')).toBe(true)
      expect(isValidPostalCode('9999999')).toBe(true)
    })

    it('様々な無効な郵便番号形式を拒否する', () => {
      expect(isValidPostalCode('')).toBe(false)
      expect(isValidPostalCode('123')).toBe(false)
      expect(isValidPostalCode('12345678')).toBe(false)
      expect(isValidPostalCode('1234-567')).toBe(false)
      expect(isValidPostalCode('12-34567')).toBe(false)
      expect(isValidPostalCode('a23-4567')).toBe(false)
      expect(isValidPostalCode('123-456a')).toBe(false)
    })
  })
})
