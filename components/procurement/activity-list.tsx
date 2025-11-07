'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ActivityEvent, EventTypeFilter } from '@/types/procurement'
import { EVENT_TYPE_OPTIONS, VALID_EVENT_TYPES } from '@/types/procurement'

interface ActivityListProps {
  events: ActivityEvent[]
}

const typeVariant: Record<ActivityEvent['type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  作成: 'secondary',
  承認依頼: 'default',
  承認: 'default',
  却下: 'destructive',
  スキップ: 'outline',
  発注: 'secondary',
  入荷: 'default',
  その他: 'outline',
}

const typeLabel: Record<ActivityEvent['type'], string> = {
  作成: '発注書作成',
  承認依頼: '承認依頼',
  承認: '承認',
  却下: '却下',
  スキップ: '承認スキップ',
  発注: '発注',
  入荷: '入荷',
  その他: 'その他',
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

export function ActivityList({ events }: ActivityListProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // localStorageからフィルター状態を復元
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem('activity-list-filters')
      if (stored) {
        const { eventType, query } = JSON.parse(stored)
        if (eventType && VALID_EVENT_TYPES.includes(eventType)) {
          setEventTypeFilter(eventType)
        }
        if (typeof query === 'string') {
          setSearchQuery(query)
        }
      }
    } catch (error) {
      console.warn('Failed to restore activity list filters', error)
    }
  }, [])

  // フィルター状態をlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = JSON.stringify({
      eventType: eventTypeFilter,
      query: searchQuery,
    })
    window.localStorage.setItem('activity-list-filters', payload)
  }, [eventTypeFilter, searchQuery])

  // キーボードショートカット (Ctrl/Cmd + K)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // フィルタリング処理
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // イベントタイプでフィルター
      if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) {
        return false
      }

      // キーワード検索
      if (searchQuery.trim()) {
        const keyword = searchQuery.trim().toLowerCase()
        const poNumber = event.purchaseOrderNumber?.toLowerCase() ?? ''
        const supplierName = event.supplierName?.toLowerCase() ?? ''
        const quoteNumber = event.quoteNumber?.toLowerCase() ?? ''
        const actor = event.actor?.toLowerCase() ?? ''
        
        return (
          poNumber.includes(keyword) ||
          supplierName.includes(keyword) ||
          quoteNumber.includes(keyword) ||
          actor.includes(keyword)
        )
      }

      return true
    })
  }, [events, eventTypeFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* フィルタリングUI */}
      <Card>
        <CardHeader>
          <CardTitle>検索・フィルタ</CardTitle>
          <CardDescription>アクティビティの絞り込み</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>イベントタイプ</Label>
              <Select value={eventTypeFilter} onValueChange={(value) => setEventTypeFilter(value as EventTypeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-search">キーワード</Label>
              <Input
                id="activity-search"
                ref={searchInputRef}
                placeholder="発注書番号・仕入先名・見積番号・担当者名など"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="アクティビティを検索"
              />
              <p className="text-xs text-gray-500" aria-label="キーボードショートカット: コントロールまたはコマンドキー + K でクイック検索">
                ショートカット: Ctrl/Cmd + K でクイック検索
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクティビティ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>最新アクティビティ</CardTitle>
          <CardDescription>全{filteredEvents.length}件のイベント</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-gray-500">条件に一致するアクティビティがありません。</p>
          ) : (
            <div className="space-y-6">
              {filteredEvents.map((event) => {
                const date = new Date(event.datetime)
                const isLastEvent = filteredEvents[filteredEvents.length - 1]?.id === event.id
                return (
                  <div key={event.id} className="space-y-2">
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
                    {!isLastEvent ? <Separator className="mt-4" /> : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
