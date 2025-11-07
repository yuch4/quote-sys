'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { ProcurementActivityEvent, ProcurementActivityType } from '@/types/procurement-activity'

type ActivityTimelineProps = {
  events: ProcurementActivityEvent[]
}

type TypeFilter = ProcurementActivityType | 'all'

const TYPE_OPTIONS: { value: 'all' | ProcurementActivityType; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: '作成', label: '発注書作成' },
  { value: '承認依頼', label: '承認依頼' },
  { value: '承認', label: '承認' },
  { value: '却下', label: '却下' },
  { value: 'スキップ', label: '承認スキップ' },
  { value: '発注', label: '発注' },
  { value: '入荷', label: '入荷' },
  { value: 'その他', label: 'その他' },
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

const typeVariant: Record<ProcurementActivityType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  作成: 'secondary',
  承認依頼: 'default',
  承認: 'default',
  却下: 'destructive',
  スキップ: 'outline',
  発注: 'secondary',
  入荷: 'default',
  その他: 'outline',
}

const typeLabel: Record<ProcurementActivityType, string> = {
  作成: '発注書作成',
  承認依頼: '承認依頼',
  承認: '承認',
  却下: '却下',
  スキップ: '承認スキップ',
  発注: '発注',
  入荷: '入荷',
  その他: 'その他',
}

export function ProcurementActivityTimeline({ events }: ActivityTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [rangeFilter, setRangeFilter] = useState<string>('all')
  const [keyword, setKeyword] = useState('')

  const supplierOptions = useMemo(() => {
    const names = new Set<string>()
    events.forEach((event) => {
      if (event.supplierName) {
        names.add(event.supplierName)
      }
    })
    return Array.from(names).sort()
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter !== 'all' && event.type !== typeFilter) {
        return false
      }

      if (supplierFilter !== 'all') {
        if ((event.supplierName ?? '未設定') !== supplierFilter) {
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
          event.supplierName,
          event.actor,
          event.notes,
        ]
          .filter(Boolean)
          .join(' ') // join ensures spaces between
          .toLowerCase()

        if (!target.includes(lower)) {
          return false
        }
      }

      return true
    })
  }, [events, typeFilter, supplierFilter, rangeFilter, keyword])

  const resetFilters = () => {
    setTypeFilter('all')
    setSupplierFilter('all')
    setRangeFilter('all')
    setKeyword('')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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

        <div className="space-y-2">
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
            return (
              <div key={`${event.id}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={typeVariant[event.type]}>{typeLabel[event.type]}</Badge>
                    <span className="text-sm font-medium text-gray-800">
                      {event.purchaseOrderNumber ? `PO: ${event.purchaseOrderNumber}` : '-'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {date.toLocaleString('ja-JP', DATE_FORMAT_OPTIONS)}
                  </span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  {event.supplierName ? <p>仕入先: {event.supplierName}</p> : null}
                  {event.quoteNumber ? <p>見積番号: {event.quoteNumber}</p> : null}
                  {event.actor ? <p>担当: {event.actor}</p> : null}
                  {event.notes ? <p className="text-gray-600">メモ: {event.notes}</p> : null}
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
