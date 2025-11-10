'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BILLING_SCHEDULE_STATUSES,
  type BillingScheduleDraft,
  generateEvenlyDistributedSchedule,
  sumScheduleAmounts,
} from '@/lib/projects/billing-schedule'

type PlannerChangeHandler = (state: {
  enabled: boolean
  rows: BillingScheduleDraft[]
}) => void

interface MonthlyBillingPlannerProps {
  expectedAmount: number
  defaultStartMonth?: string
  initialRows?: BillingScheduleDraft[]
  initialEnabled?: boolean
  disabled?: boolean
  onChange?: PlannerChangeHandler
}

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '¥0'
  return `¥${Math.round(value).toLocaleString()}`
}

const generateLocalId = () => `plan-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

const addMonthValue = (value: string, offset = 1) => {
  if (!value) return ''
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return ''
  const date = new Date(year, month - 1 + offset, 1)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  return `${nextYear}-${nextMonth}`
}

const shiftDateValue = (value: string, offset = 1) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function MonthlyBillingPlanner({
  expectedAmount,
  defaultStartMonth,
  initialRows = [],
  initialEnabled,
  disabled = false,
  onChange,
}: MonthlyBillingPlannerProps) {
  const [enabled, setEnabled] = useState(initialEnabled ?? initialRows.length > 0)
  const [config, setConfig] = useState({
    startMonth: initialRows[0]?.billingMonth || defaultStartMonth || '',
    months: initialRows.length || 12,
    billingDay: initialRows[0]?.billingDate ? Number(initialRows[0].billingDate.slice(8, 10)) || 25 : 25,
    totalAmount: initialRows.length > 0 ? sumScheduleAmounts(initialRows) : expectedAmount || 0,
  })
  const [rows, setRows] = useState<BillingScheduleDraft[]>(initialRows)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const [totalDirty, setTotalDirty] = useState(initialRows.length > 0)
  const [hydrated, setHydrated] = useState(initialRows.length > 0)

  const hydrateFromInitialRows = useCallback(() => {
    if (initialRows.length > 0) {
      setRows(initialRows)
      setEnabled(initialEnabled ?? true)
      setConfig((prev) => ({
        startMonth: initialRows[0]?.billingMonth || prev.startMonth || defaultStartMonth || '',
        months: initialRows.length,
        billingDay: initialRows[0]?.billingDate ? Number(initialRows[0].billingDate.slice(8, 10)) || prev.billingDay : prev.billingDay,
        totalAmount: sumScheduleAmounts(initialRows),
      }))
      setTotalDirty(true)
      setHydrated(true)
    }
  }, [defaultStartMonth, initialEnabled, initialRows])

  useEffect(() => {
    if (!hydrated && initialRows.length > 0) {
      hydrateFromInitialRows()
    }
  }, [hydrateFromInitialRows, hydrated, initialRows.length])

  const ensureStartMonth = useCallback(() => {
    if (!config.startMonth && defaultStartMonth) {
      setConfig((prev) => (prev.startMonth ? prev : { ...prev, startMonth: defaultStartMonth }))
    }
  }, [config.startMonth, defaultStartMonth])

  useEffect(() => {
    ensureStartMonth()
  }, [ensureStartMonth])

  const syncExpectedAmount = useCallback(() => {
    if (totalDirty) return
    setConfig((prev) => ({ ...prev, totalAmount: expectedAmount || 0 }))
  }, [expectedAmount, totalDirty])

  useEffect(() => {
    syncExpectedAmount()
  }, [syncExpectedAmount])

  useEffect(() => {
    onChange?.({ enabled, rows })
  }, [enabled, onChange, rows])

  useEffect(() => {
    if (!enabled) {
      setPlannerError(null)
    }
  }, [enabled])

  const plannedTotal = useMemo(() => sumScheduleAmounts(rows), [rows])
  const diffFromExpected = useMemo(() => {
    if (!expectedAmount) return null
    return plannedTotal - expectedAmount
  }, [expectedAmount, plannedTotal])

  const handleGenerate = () => {
    if (!config.startMonth) {
      setPlannerError('計上開始月を入力してください')
      return
    }
    if (!config.totalAmount || config.totalAmount <= 0) {
      setPlannerError('見込売上（総額）を入力してください')
      return
    }

    const generated = generateEvenlyDistributedSchedule({
      startMonth: config.startMonth,
      months: config.months,
      totalAmount: config.totalAmount,
      billingDay: config.billingDay,
    })
    if (generated.length === 0) {
      setPlannerError('プレビューを生成できませんでした。入力内容をご確認ください。')
      return
    }
    setRows(generated)
    setPlannerError(null)
    setEnabled(true)
  }

  const updateRow = (localId: string, changes: Partial<BillingScheduleDraft>) => {
    setRows((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...changes } : row)))
  }

  const handleDeleteRow = (localId: string) => {
    setRows((prev) => prev.filter((row) => row.localId !== localId))
  }

  const handleAddRow = () => {
    if (rows.length === 0) {
      const seedMonth = config.startMonth || defaultStartMonth || ''
      if (!seedMonth) {
        setPlannerError('追加する前に開始月を設定してください')
        return
      }
      const seeds = generateEvenlyDistributedSchedule({
        startMonth: seedMonth,
        months: 1,
        totalAmount: config.totalAmount || expectedAmount || 0,
        billingDay: config.billingDay,
      })
      if (seeds.length === 0) {
        setPlannerError('行を追加できませんでした。入力内容をご確認ください。')
        return
      }
      setRows(seeds)
      setPlannerError(null)
      return
    }

    const lastRow = rows[rows.length - 1]
    const nextMonth = addMonthValue(lastRow.billingMonth) || config.startMonth || defaultStartMonth || ''
    if (!nextMonth) {
      setPlannerError('追加する前に開始月を設定してください')
      return
    }

    const nextRow = {
      ...lastRow,
      localId: generateLocalId(),
      billingMonth: nextMonth,
      billingDate: lastRow.billingDate ? shiftDateValue(lastRow.billingDate) : '',
    }
    setRows((prev) => [...prev, nextRow])
    setPlannerError(null)
  }

  const handleClearRows = () => {
    setRows([])
    setPlannerError(null)
  }

  const plannerSummary = useMemo(() => {
    const plannedText = formatCurrency(plannedTotal)
    if (diffFromExpected == null) return plannedText
    const diffText = diffFromExpected === 0
      ? '（契約額と一致）'
      : `（受注見込との差額 ${diffFromExpected > 0 ? '+' : ''}${formatCurrency(diffFromExpected)}）`
    return `${plannedText} ${diffText}`
  }, [diffFromExpected, plannedTotal])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox
          id="auto-billing"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="auto-billing" className="text-base font-semibold">
            月次計上予定を自動生成
          </Label>
          <p className="text-sm text-gray-500">
            受注時に12ヶ月へ均等配分した請求予定を作成し、対象月ごとに日付や金額を微調整できます。
          </p>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startMonth">計上開始月</Label>
              <Input
                id="startMonth"
                type="month"
                value={config.startMonth}
                onChange={(event) => setConfig((prev) => ({ ...prev, startMonth: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">計上期間（月数）</Label>
              <Input
                id="months"
                type="number"
                min={1}
                max={60}
                value={config.months}
                onChange={(event) => setConfig((prev) => ({ ...prev, months: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingDay">請求予定日（毎月）</Label>
              <Input
                id="billingDay"
                type="number"
                min={1}
                max={31}
                value={config.billingDay}
                onChange={(event) => setConfig((prev) => ({ ...prev, billingDay: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">
                按分対象の総額
                <span className="ml-2 text-xs text-gray-500">(見込売上が自動反映)</span>
              </Label>
              <Input
                id="totalAmount"
                type="number"
                value={config.totalAmount}
                onChange={(event) => {
                  setTotalDirty(true)
                  setConfig((prev) => ({ ...prev, totalAmount: Number(event.target.value) }))
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleGenerate}>
              {rows.length > 0 ? '再計算して上書き' : 'プレビューを生成'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClearRows} disabled={rows.length === 0}>
              行をクリア
            </Button>
            <Button type="button" variant="outline" onClick={handleAddRow}>
              行を追加
            </Button>
            {plannerError && <p className="text-sm text-red-600">{plannerError}</p>}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
              プレビューを生成すると、対象月ごとの請求予定日・金額をここで確認できます。
              行を追加して端数や特別対応月だけを個別に調整することも可能です。
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-600">計上予定合計: <span className="font-semibold text-gray-900">{plannerSummary}</span></p>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">対象月</TableHead>
                      <TableHead className="w-[160px]">請求予定日</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead className="w-[140px]">ステータス</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.localId}>
                        <TableCell>
                          <Input
                            type="month"
                            value={row.billingMonth}
                            onChange={(event) => updateRow(row.localId, { billingMonth: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.billingDate}
                            onChange={(event) => updateRow(row.localId, { billingDate: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.amount}
                            onChange={(event) =>
                              updateRow(row.localId, { amount: Number(event.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.status}
                            onValueChange={(value) => updateRow(row.localId, { status: value as typeof row.status })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BILLING_SCHEDULE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.notes}
                            onChange={(event) => updateRow(row.localId, { notes: event.target.value })}
                            placeholder="備考"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(row.localId)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export type { BillingScheduleDraft }
