import { createClient } from '@/lib/supabase/server'
import { ActivityList } from '@/components/procurement/activity-list'
import type { ActivityEvent } from '@/types/procurement'

export default async function ProcurementActivityPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      purchase_order_number,
      created_at,
      supplier:suppliers(supplier_name),
      quote:quotes(quote_number),
      approval_instance:purchase_order_approval_instances(
        id,
        requested_at,
        steps:purchase_order_approval_instance_steps(
          id,
          step_order,
          approver_role,
          status,
          decided_at,
          notes,
          approver:users(display_name)
        )
      )
    `)
    .order('created_at', { ascending: false })

  const { data: procurementLogs } = await supabase
    .from('procurement_logs')
    .select(`
      id,
      action_type,
      action_date,
      quantity,
      notes,
      performed_by_user:users(display_name),
      quote_item:quote_items(
        id,
        quote:quotes(quote_number),
        purchase_order_items(
          purchase_order:purchase_orders(
            id,
            purchase_order_number,
            supplier:suppliers(supplier_name)
          )
        )
      )
    `)
    .order('action_date', { ascending: false })
    .limit(200)

  const events: ActivityEvent[] = []

  for (const order of orders ?? []) {
    if (order.created_at) {
      events.push({
        id: `${order.id}-created`,
        datetime: order.created_at,
        type: '作成',
        purchaseOrderId: order.id,
        purchaseOrderNumber: order.purchase_order_number,
        supplierName: order.supplier?.supplier_name ?? null,
        quoteNumber: order.quote?.quote_number ?? null,
      })
    }

    const instance = order.approval_instance && Array.isArray(order.approval_instance)
      ? order.approval_instance[0]
      : order.approval_instance

    if (instance?.requested_at) {
      events.push({
        id: `${order.id}-requested-${instance.id}`,
        datetime: instance.requested_at,
        type: '承認依頼',
        purchaseOrderId: order.id,
        purchaseOrderNumber: order.purchase_order_number,
        supplierName: order.supplier?.supplier_name ?? null,
        quoteNumber: order.quote?.quote_number ?? null,
      })
    }

    const steps = instance?.steps
    if (steps && Array.isArray(steps)) {
      steps.forEach((step) => {
        if (!step.decided_at) {
          return
        }

        let type: ActivityEvent['type'] = 'その他'
        if (step.status === 'approved') type = '承認'
        else if (step.status === 'rejected') type = '却下'
        else if (step.status === 'skipped') type = 'スキップ'

        events.push({
          id: step.id,
          datetime: step.decided_at,
          type,
          purchaseOrderId: order.id,
          purchaseOrderNumber: order.purchase_order_number,
          supplierName: order.supplier?.supplier_name ?? null,
          quoteNumber: order.quote?.quote_number ?? null,
          actor: step.approver?.display_name ?? step.approver_role,
          notes: step.notes ?? undefined,
        })
      })
    }
  }

  for (const log of procurementLogs ?? []) {
    const purchaseOrder = log.quote_item?.purchase_order_items?.[0]?.purchase_order
    if (!purchaseOrder) continue

    const type = log.action_type === '入荷' ? '入荷' : log.action_type === '発注' ? '発注' : 'その他'

    events.push({
      id: log.id,
      datetime: log.action_date,
      type,
      purchaseOrderId: purchaseOrder.id,
      purchaseOrderNumber: purchaseOrder.purchase_order_number,
      supplierName: purchaseOrder.supplier?.supplier_name ?? null,
      quoteNumber: log.quote_item?.quote?.quote_number ?? null,
      actor: log.performed_by_user?.display_name ?? null,
      notes: log.notes ?? undefined,
    })
  }

  const sortedEvents = events
    .filter((event) => Boolean(event.datetime))
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    .slice(0, 200)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">調達アクティビティ</h1>
          <p className="text-gray-600 mt-2">発注書の作成・承認・入荷履歴を時系列で確認できます。</p>
        </div>
      </div>

      <ActivityList events={sortedEvents} />
    </div>
  )
}
