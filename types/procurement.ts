export type ActivityEvent = {
  id: string
  datetime: string
  type: '作成' | '承認依頼' | '承認' | '却下' | 'スキップ' | '発注' | '入荷' | 'その他'
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  supplierName?: string | null
  quoteNumber?: string | null
  actor?: string | null
  notes?: string | null
}

export type EventTypeFilter = 'all' | ActivityEvent['type']

export const EVENT_TYPE_OPTIONS: Array<{ value: EventTypeFilter; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: '作成', label: '発注書作成' },
  { value: '承認依頼', label: '承認依頼' },
  { value: '承認', label: '承認' },
  { value: '却下', label: '却下' },
  { value: 'スキップ', label: '承認スキップ' },
  { value: '発注', label: '発注' },
  { value: '入荷', label: '入荷' },
  { value: 'その他', label: 'その他' },
] as const

export const VALID_EVENT_TYPES = EVENT_TYPE_OPTIONS.map((opt) => opt.value)
