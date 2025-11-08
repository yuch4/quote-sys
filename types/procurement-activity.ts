export type ProcurementActivityEntity = 'purchase_order' | 'quote' | 'project'

export type ProcurementActivityType =
  | '発注書作成'
  | '発注書承認依頼'
  | '発注書承認'
  | '発注書却下'
  | '発注書スキップ'
  | '発注'
  | '入荷'
  | '見積作成'
  | '見積承認依頼'
  | '見積承認'
  | '見積差戻し'
  | '見積スキップ'
  | '案件活動'
  | 'その他'

export type ProcurementActivityEvent = {
  id: string
  datetime: string
  type: ProcurementActivityType
  entity: ProcurementActivityEntity
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  supplierName?: string | null
  quoteId?: string
  quoteNumber?: string | null
  projectName?: string | null
  projectNumber?: string | null
  projectId?: string
  customerName?: string | null
  actor?: string | null
  notes?: string | null
  title?: string | null
}

export const PROCUREMENT_ACTIVITY_TYPE_META: Record<ProcurementActivityType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  発注書作成: { label: '発注書作成', variant: 'secondary' },
  発注書承認依頼: { label: '発注書承認依頼', variant: 'default' },
  発注書承認: { label: '発注書承認', variant: 'default' },
  発注書却下: { label: '発注書却下', variant: 'destructive' },
  発注書スキップ: { label: '発注書スキップ', variant: 'outline' },
  発注: { label: '発注', variant: 'secondary' },
  入荷: { label: '入荷', variant: 'default' },
  見積作成: { label: '見積作成', variant: 'secondary' },
  見積承認依頼: { label: '見積承認依頼', variant: 'default' },
  見積承認: { label: '見積承認', variant: 'default' },
  見積差戻し: { label: '見積差戻し', variant: 'destructive' },
  見積スキップ: { label: '見積スキップ', variant: 'outline' },
  案件活動: { label: '案件活動', variant: 'secondary' },
  その他: { label: 'その他', variant: 'outline' },
}
