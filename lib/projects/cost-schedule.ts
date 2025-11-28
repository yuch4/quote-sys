import type { CostScheduleStatus, ProjectCostSchedule } from '@/types/database'

export interface CostScheduleDraft {
  localId: string
  costMonth: string
  costDate: string
  amount: number
  status: CostScheduleStatus
  notes: string
}

export interface CostScheduleGenerateOptions {
  startMonth: string
  months: number
  totalAmount: number
  costDay: number
  defaultStatus?: CostScheduleStatus
}

const MIN_MONTHS = 1
const MAX_MONTHS = 60
const DEFAULT_STATUS: CostScheduleStatus = '予定'

export const COST_SCHEDULE_STATUSES: CostScheduleStatus[] = ['予定', '確認済', '延期', '計上済']

const createLocalId = () => `cost-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

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

const buildCostDate = (monthKey: string, costDay: number) => {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return ''
  const monthIndex = month - 1
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const day = Math.max(1, Math.min(costDay, daysInMonth))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const generateEvenlyDistributedCostSchedule = (options: CostScheduleGenerateOptions): CostScheduleDraft[] => {
  const { startMonth, totalAmount, costDay } = options
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
      costMonth: monthKey,
      costDate: buildCostDate(monthKey, costDay),
      amount: Number((cents / 100).toFixed(2)),
      status: options.defaultStatus ?? DEFAULT_STATUS,
      notes: '',
    }
  })
}

export const costMonthKeyToDate = (monthKey: string) => {
  if (!monthKey) return null
  const [year, month] = monthKey.split('-')
  if (!year || !month) return null
  return `${year}-${month}-01`
}

export const toMonthInputValue = (value?: string | null) => {
  if (!value) return ''
  return value.slice(0, 7)
}

export const deserializeCostSchedules = (rows: ProjectCostSchedule[]): CostScheduleDraft[] =>
  rows.map((row) => ({
    localId: createLocalId(),
    costMonth: toMonthInputValue(row.cost_month),
    costDate: row.cost_date ?? '',
    amount: Number(row.amount ?? 0),
    status: row.status,
    notes: row.notes ?? '',
  }))

interface CostDraftPayloadOptions {
  projectId: string
  quoteId?: string | null
  purchaseOrderId?: string | null
}

export const costScheduleDraftsToPayload = (options: CostDraftPayloadOptions, drafts: CostScheduleDraft[]) => {
  const { projectId, quoteId = null, purchaseOrderId = null } = options
  return drafts
    .filter((draft) => draft.costMonth && !Number.isNaN(draft.amount))
    .map((draft) => ({
      project_id: projectId,
      quote_id: quoteId,
      purchase_order_id: purchaseOrderId,
      cost_month: costMonthKeyToDate(draft.costMonth),
      cost_date: draft.costDate || null,
      amount: draft.amount,
      status: draft.status,
      notes: draft.notes || null,
    }))
}

export const sumCostScheduleAmounts = (drafts: CostScheduleDraft[]) =>
  drafts.reduce((total, draft) => total + (Number.isFinite(draft.amount) ? draft.amount : 0), 0)
