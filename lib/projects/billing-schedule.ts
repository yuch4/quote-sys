import type { BillingScheduleStatus, ProjectBillingSchedule } from '@/types/database'

export interface BillingScheduleDraft {
  localId: string
  billingMonth: string
  billingDate: string
  amount: number
  status: BillingScheduleStatus
  notes: string
}

export interface BillingScheduleGenerateOptions {
  startMonth: string
  months: number
  totalAmount: number
  billingDay: number
  defaultStatus?: BillingScheduleStatus
}

const MIN_MONTHS = 1
const MAX_MONTHS = 60
const DEFAULT_STATUS: BillingScheduleStatus = '予定'

export const BILLING_SCHEDULE_STATUSES: BillingScheduleStatus[] = ['予定', '確定', '請求済']

const createLocalId = () => `plan-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

const clampMonths = (months: number) => {
  if (Number.isNaN(months) || months < MIN_MONTHS) return MIN_MONTHS
  if (months > MAX_MONTHS) return MAX_MONTHS
  return Math.floor(months)
}

const getMonthKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const addMonths = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  const date = new Date(year, month - 1 + offset, 1)
  return getMonthKey(date)
}

const getDaysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate()

const buildBillingDate = (monthKey: string, billingDay: number) => {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return ''
  const monthIndex = month - 1
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const day = Math.max(1, Math.min(billingDay, daysInMonth))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const generateEvenlyDistributedSchedule = (options: BillingScheduleGenerateOptions): BillingScheduleDraft[] => {
  const { startMonth, totalAmount, billingDay } = options
  if (!startMonth || totalAmount <= 0) return []

  const months = clampMonths(options.months)
  const totalCents = Math.round(totalAmount * 100)
  const base = Math.floor(totalCents / months)
  const remainder = totalCents - base * months

  return Array.from({ length: months }).map((_, index) => {
    const monthKey = addMonths(startMonth, index)
    const extraCent = index < remainder ? 1 : 0
    const cents = base + extraCent
    return {
      localId: createLocalId(),
      billingMonth: monthKey,
      billingDate: buildBillingDate(monthKey, billingDay),
      amount: Number((cents / 100).toFixed(2)),
      status: options.defaultStatus ?? DEFAULT_STATUS,
      notes: '',
    }
  })
}

export const billingMonthKeyToDate = (monthKey: string) => {
  if (!monthKey) return null
  const [year, month] = monthKey.split('-')
  if (!year || !month) return null
  return `${year}-${month}-01`
}

export const toMonthInputValue = (value?: string | null) => {
  if (!value) return ''
  return value.slice(0, 7)
}

export const deserializeSchedules = (rows: ProjectBillingSchedule[]): BillingScheduleDraft[] =>
  rows.map((row) => ({
    localId: createLocalId(),
    billingMonth: toMonthInputValue(row.billing_month),
    billingDate: row.billing_date ?? '',
    amount: Number(row.amount ?? 0),
    status: row.status,
    notes: row.notes ?? '',
  }))

export const scheduleDraftsToPayload = (projectId: string, drafts: BillingScheduleDraft[]) =>
  drafts
    .filter((draft) => draft.billingMonth && !Number.isNaN(draft.amount))
    .map((draft) => ({
      project_id: projectId,
      billing_month: billingMonthKeyToDate(draft.billingMonth),
      billing_date: draft.billingDate || null,
      amount: draft.amount,
      status: draft.status,
      notes: draft.notes || null,
    }))

export const sumScheduleAmounts = (drafts: BillingScheduleDraft[]) =>
  drafts.reduce((total, draft) => total + (Number.isFinite(draft.amount) ? draft.amount : 0), 0)
