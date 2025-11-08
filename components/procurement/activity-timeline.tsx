'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type {
  ProcurementActivityEvent,
  ProcurementActivityType,
  ProcurementActivityEntity,
} from '@/types/procurement-activity'
import { PROCUREMENT_ACTIVITY_TYPE_META } from '@/types/procurement-activity'

type ActivityTimelineProps = {
  events: ProcurementActivityEvent[]
}

type TypeFilter = ProcurementActivityType | 'all'
type EntityFilter = ProcurementActivityEntity | 'all'

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  ...Object.entries(PROCUREMENT_ACTIVITY_TYPE_META).map(([value, meta]) => ({
    value: value as ProcurementActivityType,
    label: meta.label,
  })),
]

const RANGE_OPTIONS = [
  { value: 'all', label: '期間指定なし' },
  { value: '7', label: '直近7日' },
  { value: '30', label: '直近30日' },
]

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

const ENTITY_LABEL: Record<ProcurementActivityEntity, string> = {
  purchase_order: '発注書',
  quote: '見積',
  project: '案件',
}

export function ProcurementActivityTimeline({ events }: ActivityTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [rangeFilter, setRangeFilter] = useState<string>('all')
  const [keyword, setKeyword] = useState('')

  const supplierOptions = useMemo(() => {
    const names = new Set<string>()
    let hasUnset = false

    events.forEach((event) => {
      if (event.supplierName) {
        names.add(event.supplierName)
      } else {
        hasUnset = true
      }
    })

    const sorted = Array.from(names).sort()
    if (hasUnset) {
      sorted.unshift('未設定')
    }
    return sorted
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter !== 'all' && event.type !== typeFilter) {
        return false
      }

      if (entityFilter !== 'all' && event.entity !== entityFilter) {
        return false
      }

      if (supplierFilter !== 'all') {
        const supplier = event.supplierName ?? '未設定'
        if (supplier !== supplierFilter) {
          return false
        }
      }

      if (rangeFilter !== 'all') {
        const days = Number(rangeFilter)
        const threshold = new Date()
        threshold.setDate(threshold.getDate() - days)
        if (new Date(event.datetime) < threshold) {
          return false
        }
      }

      if (keyword.trim()) {
        const lower = keyword.trim().toLowerCase()
        const target = [
          event.purchaseOrderNumber,
          event.quoteNumber,
          event.projectNumber,
          event.projectName,
          event.customerName,
          event.supplierName,
          event.actor,
          event.notes,
          event.title,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!target.includes(lower)) {
          return false
        }
      }

      return true
    })
  }, [events, typeFilter, entityFilter, supplierFilter, rangeFilter, keyword])

  const resetFilters = () => {
    setTypeFilter('all')
    setEntityFilter('all')
    setSupplierFilter('all')
    setRangeFilter('all')
    setKeyword('')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="space-y-2">
          <Label>イベント種別</Label>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="種別を選択" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>対象</Label>
          <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as EntityFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="対象を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="quote">見積</SelectItem>
              <SelectItem value="purchase_order">発注書</SelectItem>
              <SelectItem value="project">案件</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>仕入先</Label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="仕入先を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {supplierOptions.map((supplier) => (
                <SelectItem key={supplier} value={supplier}>
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>期間</Label>
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="期間を選択" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>キーワード</Label>
          <Input
            placeholder="PO番号 / 見積番号 / メモなど"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600">
          {filteredEvents.length}件表示中（全{events.length}件）
        </p>
        <Button variant="outline" size="sm" onClick={resetFilters}>
          フィルタをリセット
        </Button>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-sm text-gray-500">該当するアクティビティがありません。</p>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event, index) => {
            const date = new Date(event.datetime)
            const identifier = event.purchaseOrderNumber
              ? `PO: ${event.purchaseOrderNumber}`
              : event.quoteNumber
                ? `見積: ${event.quoteNumber}`
                : event.projectNumber
                  ? `案件: ${event.projectNumber}`
                  : event.projectName
                    ? `案件: ${event.projectName}`
                    : '-'

            return (
              <div key={`${event.id}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={PROCUREMENT_ACTIVITY_TYPE_META[event.type].variant}>
                      {PROCUREMENT_ACTIVITY_TYPE_META[event.type].label}
                    </Badge>
                    <Badge variant="outline">{ENTITY_LABEL[event.entity]}</Badge>
                    <span className="text-sm font-medium text-gray-800">{identifier}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {date.toLocaleString('ja-JP', DATE_FORMAT_OPTIONS)}
                  </span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  {event.title ? <p>件名: {event.title}</p> : null}
                  {event.projectName ? <p>案件: {event.projectName}</p> : null}
                  {event.customerName ? <p>顧客: {event.customerName}</p> : null}
                  {event.supplierName ? <p>仕入先: {event.supplierName}</p> : null}
                  {event.actor ? <p>担当: {event.actor}</p> : null}
                  {event.notes ? <p className="text-gray-600 whitespace-pre-wrap">メモ: {event.notes}</p> : null}
                </div>
                {index < filteredEvents.length - 1 ? <Separator className="mt-4" /> : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
