export type ProcurementActivityType =
  | '作成'
  | '承認依頼'
  | '承認'
  | '却下'
  | 'スキップ'
  | '発注'
  | '入荷'
  | 'その他'

export type ProcurementActivityEvent = {
  id: string
  datetime: string
  type: ProcurementActivityType
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  supplierName?: string | null
  quoteNumber?: string | null
  actor?: string | null
  notes?: string | null
}
