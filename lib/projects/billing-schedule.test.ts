import { describe, it, expect } from 'vitest'
import {
  generateEvenlyDistributedSchedule,
  billingMonthKeyToDate,
  toMonthInputValue,
  deserializeSchedules,
  scheduleDraftsToPayload,
  sumScheduleAmounts,
  type BillingScheduleDraft,
} from './billing-schedule'

describe('billing-schedule', () => {
  describe('generateEvenlyDistributedSchedule', () => {
    it('均等按分で売上計上スケジュールを生成する', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 3,
        totalAmount: 300000,
        billingDay: 31,
      })

      expect(result).toHaveLength(3)
      expect(result[0].billingMonth).toBe('2025-01')
      expect(result[0].amount).toBe(100000)
      expect(result[1].billingMonth).toBe('2025-02')
      expect(result[1].amount).toBe(100000)
      expect(result[2].billingMonth).toBe('2025-03')
      expect(result[2].amount).toBe(100000)
    })

    it('割り切れない金額を均等按分する（端数処理）', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 3,
        totalAmount: 100000,
        billingDay: 15,
      })

      expect(result).toHaveLength(3)
      // 100000円を3分割: 33333.33, 33333.33, 33333.34
      expect(result[0].amount).toBe(33333.34) // 最初の月に端数を寄せる
      expect(result[1].amount).toBe(33333.33)
      expect(result[2].amount).toBe(33333.33)

      // 合計が元の金額と一致することを確認
      const total = result.reduce((sum, item) => sum + item.amount, 0)
      expect(total).toBeCloseTo(100000, 2)
    })

    it('1ヶ月のみのスケジュールを生成する', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-06',
        months: 1,
        totalAmount: 500000,
        billingDay: 20,
      })

      expect(result).toHaveLength(1)
      expect(result[0].billingMonth).toBe('2025-06')
      expect(result[0].amount).toBe(500000)
      expect(result[0].billingDate).toBe('2025-06-20')
    })

    it('年を跨ぐスケジュールを生成する', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-11',
        months: 4,
        totalAmount: 400000,
        billingDay: 25,
      })

      expect(result).toHaveLength(4)
      expect(result[0].billingMonth).toBe('2025-11')
      expect(result[1].billingMonth).toBe('2025-12')
      expect(result[2].billingMonth).toBe('2026-01')
      expect(result[3].billingMonth).toBe('2026-02')
    })

    it('2月の日付を正しく処理する（閏年でない）', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-02',
        months: 1,
        totalAmount: 100000,
        billingDay: 31,
      })

      expect(result).toHaveLength(1)
      expect(result[0].billingDate).toBe('2025-02-28') // 2月は28日まで
    })

    it('2月の日付を正しく処理する（閏年）', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2024-02',
        months: 1,
        totalAmount: 100000,
        billingDay: 31,
      })

      expect(result).toHaveLength(1)
      expect(result[0].billingDate).toBe('2024-02-29') // 閏年の2月は29日まで
    })

    it('月末日を指定した場合に各月の最終日を設定する', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 3,
        totalAmount: 300000,
        billingDay: 31,
      })

      expect(result[0].billingDate).toBe('2025-01-31') // 1月は31日
      expect(result[1].billingDate).toBe('2025-02-28') // 2月は28日
      expect(result[2].billingDate).toBe('2025-03-31') // 3月は31日
    })

    it('境界値: 最小月数（1ヶ月）', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 1,
        totalAmount: 100000,
        billingDay: 1,
      })

      expect(result).toHaveLength(1)
    })

    it('境界値: 最大月数（60ヶ月）', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 60,
        totalAmount: 6000000,
        billingDay: 15,
      })

      expect(result).toHaveLength(60)
    })

    it('境界値: 月数が0以下の場合は1ヶ月に補正する', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 0,
        totalAmount: 100000,
        billingDay: 1,
      })

      expect(result).toHaveLength(1)
    })

    it('境界値: 月数が60を超える場合は60ヶ月に補正する', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 100,
        totalAmount: 10000000,
        billingDay: 1,
      })

      expect(result).toHaveLength(60)
    })

    it('異常系: 金額が0の場合は空配列を返す', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 3,
        totalAmount: 0,
        billingDay: 15,
      })

      expect(result).toHaveLength(0)
    })

    it('異常系: 金額が負の場合は空配列を返す', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 3,
        totalAmount: -100000,
        billingDay: 15,
      })

      expect(result).toHaveLength(0)
    })

    it('異常系: 開始月が空の場合は空配列を返す', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '',
        months: 3,
        totalAmount: 100000,
        billingDay: 15,
      })

      expect(result).toHaveLength(0)
    })

    it('計上日が1日の場合', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 2,
        totalAmount: 200000,
        billingDay: 1,
      })

      expect(result[0].billingDate).toBe('2025-01-01')
      expect(result[1].billingDate).toBe('2025-02-01')
    })

    it('デフォルトステータスが設定される', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 1,
        totalAmount: 100000,
        billingDay: 15,
      })

      expect(result[0].status).toBe('確認済')
    })

    it('カスタムステータスを設定できる', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 1,
        totalAmount: 100000,
        billingDay: 15,
        defaultStatus: '予定',
      })

      expect(result[0].status).toBe('予定')
    })

    it('localIdが一意に生成される', () => {
      const result = generateEvenlyDistributedSchedule({
        startMonth: '2025-01',
        months: 3,
        totalAmount: 300000,
        billingDay: 15,
      })

      const localIds = result.map((item) => item.localId)
      const uniqueIds = new Set(localIds)
      expect(uniqueIds.size).toBe(3) // すべて一意
    })
  })

  describe('billingMonthKeyToDate', () => {
    it('月キーを日付文字列に変換する', () => {
      expect(billingMonthKeyToDate('2025-01')).toBe('2025-01-01')
      expect(billingMonthKeyToDate('2025-12')).toBe('2025-12-01')
    })

    it('1桁の月をゼロパディングして変換する', () => {
      expect(billingMonthKeyToDate('2025-1')).toBe('2025-1-01')
    })

    it('空文字列の場合はnullを返す', () => {
      expect(billingMonthKeyToDate('')).toBeNull()
    })

    it('不正なフォーマットの場合はnullを返す', () => {
      expect(billingMonthKeyToDate('invalid')).toBeNull()
      expect(billingMonthKeyToDate('2025')).toBeNull()
    })
  })

  describe('toMonthInputValue', () => {
    it('日付文字列を月入力値に変換する', () => {
      expect(toMonthInputValue('2025-01-15')).toBe('2025-01')
      expect(toMonthInputValue('2025-12-31')).toBe('2025-12')
    })

    it('既に月形式の場合はそのまま返す', () => {
      expect(toMonthInputValue('2025-01')).toBe('2025-01')
    })

    it('nullの場合は空文字列を返す', () => {
      expect(toMonthInputValue(null)).toBe('')
    })

    it('undefinedの場合は空文字列を返す', () => {
      expect(toMonthInputValue(undefined)).toBe('')
    })

    it('空文字列の場合は空文字列を返す', () => {
      expect(toMonthInputValue('')).toBe('')
    })
  })

  describe('deserializeSchedules', () => {
    it('データベース行を下書きに変換する', () => {
      const rows = [
        {
          id: '1',
          project_id: 'proj1',
          billing_month: '2025-01-01',
          billing_date: '2025-01-31',
          amount: 100000,
          status: '確認済' as const,
          notes: 'テスト備考',
        },
      ]

      const result = deserializeSchedules(rows)

      expect(result).toHaveLength(1)
      expect(result[0].billingMonth).toBe('2025-01')
      expect(result[0].billingDate).toBe('2025-01-31')
      expect(result[0].amount).toBe(100000)
      expect(result[0].status).toBe('確認済')
      expect(result[0].notes).toBe('テスト備考')
    })

    it('空の配列を処理する', () => {
      const result = deserializeSchedules([])
      expect(result).toHaveLength(0)
    })
  })

  describe('scheduleDraftsToPayload', () => {
    it('下書きをペイロードに変換する', () => {
      const drafts: BillingScheduleDraft[] = [
        {
          localId: 'local1',
          billingMonth: '2025-01',
          billingDate: '2025-01-31',
          amount: 100000,
          status: '確認済',
          notes: 'テスト',
        },
      ]

      const result = scheduleDraftsToPayload(
        { projectId: 'proj1', quoteId: 'quote1' },
        drafts
      )

      expect(result).toHaveLength(1)
      expect(result[0].project_id).toBe('proj1')
      expect(result[0].quote_id).toBe('quote1')
      expect(result[0].billing_month).toBe('2025-01-01')
      expect(result[0].billing_date).toBe('2025-01-31')
      expect(result[0].amount).toBe(100000)
    })

    it('quoteIdがnullの場合', () => {
      const drafts: BillingScheduleDraft[] = [
        {
          localId: 'local1',
          billingMonth: '2025-01',
          billingDate: '2025-01-31',
          amount: 100000,
          status: '確認済',
          notes: '',
        },
      ]

      const result = scheduleDraftsToPayload({ projectId: 'proj1' }, drafts)

      expect(result[0].quote_id).toBeNull()
    })

    it('不正なデータをフィルタリングする', () => {
      const drafts: BillingScheduleDraft[] = [
        {
          localId: 'local1',
          billingMonth: '',
          billingDate: '2025-01-31',
          amount: 100000,
          status: '確認済',
          notes: '',
        },
        {
          localId: 'local2',
          billingMonth: '2025-02',
          billingDate: '2025-02-28',
          amount: NaN,
          status: '確認済',
          notes: '',
        },
        {
          localId: 'local3',
          billingMonth: '2025-03',
          billingDate: '2025-03-31',
          amount: 100000,
          status: '確認済',
          notes: '',
        },
      ]

      const result = scheduleDraftsToPayload({ projectId: 'proj1' }, drafts)

      expect(result).toHaveLength(1)
      expect(result[0].billing_month).toBe('2025-03-01')
    })
  })

  describe('sumScheduleAmounts', () => {
    it('スケジュールの金額を合計する', () => {
      const drafts: BillingScheduleDraft[] = [
        {
          localId: 'local1',
          billingMonth: '2025-01',
          billingDate: '2025-01-31',
          amount: 100000,
          status: '確認済',
          notes: '',
        },
        {
          localId: 'local2',
          billingMonth: '2025-02',
          billingDate: '2025-02-28',
          amount: 200000,
          status: '確認済',
          notes: '',
        },
        {
          localId: 'local3',
          billingMonth: '2025-03',
          billingDate: '2025-03-31',
          amount: 300000,
          status: '確認済',
          notes: '',
        },
      ]

      expect(sumScheduleAmounts(drafts)).toBe(600000)
    })

    it('空の配列の場合は0を返す', () => {
      expect(sumScheduleAmounts([])).toBe(0)
    })

    it('NaNを含む場合は無視する', () => {
      const drafts: BillingScheduleDraft[] = [
        {
          localId: 'local1',
          billingMonth: '2025-01',
          billingDate: '2025-01-31',
          amount: 100000,
          status: '確認済',
          notes: '',
        },
        {
          localId: 'local2',
          billingMonth: '2025-02',
          billingDate: '2025-02-28',
          amount: NaN,
          status: '確認済',
          notes: '',
        },
      ]

      expect(sumScheduleAmounts(drafts)).toBe(100000)
    })
  })
})
