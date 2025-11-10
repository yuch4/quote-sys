import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProcurementActivityTimeline } from '@/components/procurement/activity-timeline'
import type { ProcurementActivityEvent } from '@/types/procurement-activity'
import { firstRelation, ensureArrayRelation } from '@/lib/supabase/relations'

export default async function ProcurementActivityPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      purchase_order_number,
      created_at,
      supplier:suppliers(supplier_name),
      quote:quotes(
        id,
        quote_number,
        project:projects(
          id,
          project_number,
          project_name,
          customer:customers(customer_name)
        )
      ),
      approval_instance:purchase_order_approval_instances(
        id,
        requested_at,
        requested_by,
        requested_by_user:users!purchase_order_approval_instances_requested_by_fkey(display_name),
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
        quote:quotes(
          id,
          quote_number,
          project:projects(
            id,
            project_number,
            project_name,
            customer:customers(customer_name)
          )
        ),
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

  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      created_at,
      project:projects(
        id,
        project_number,
        project_name,
        customer:customers(customer_name)
      ),
      created_by_user:users!quotes_created_by_fkey(display_name),
      approval_instance:quote_approval_instances(
        id,
        requested_at,
        requested_by,
        requested_by_user:users!quote_approval_instances_requested_by_fkey(display_name),
        steps:quote_approval_instance_steps(
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

  const { data: projectActivities } = await supabase
    .from('project_activities')
    .select(`
      id,
      activity_date,
      subject,
      details,
      next_action,
      next_action_due_date,
      created_at,
      project:projects(
        id,
        project_number,
        project_name,
        customer:customers(customer_name)
      ),
      created_by_user:users(display_name)
    `)
    .order('activity_date', { ascending: false })
    .limit(200)

  const events: ProcurementActivityEvent[] = []

  for (const order of orders ?? []) {
    const supplier = firstRelation(order.supplier)
    const quote = firstRelation(order.quote)
    const project = quote ? firstRelation(quote.project) : null
    const customer = project ? firstRelation(project.customer) : null
    const approvalInstance = firstRelation(order.approval_instance)

    if (order.created_at) {
      events.push({
        id: `${order.id}-created`,
        datetime: order.created_at,
        type: '発注書作成',
        entity: 'purchase_order',
        purchaseOrderId: order.id,
        purchaseOrderNumber: order.purchase_order_number,
        supplierName: supplier?.supplier_name ?? null,
        quoteNumber: quote?.quote_number ?? null,
        quoteId: quote?.id ?? undefined,
        projectName: project?.project_name ?? null,
        projectNumber: project?.project_number ?? null,
        customerName: customer?.customer_name ?? null,
      })
    }

    const requestedByUser = approvalInstance ? firstRelation(approvalInstance.requested_by_user) : null

    if (approvalInstance?.requested_at) {
      events.push({
        id: `${order.id}-requested-${approvalInstance.id}`,
        datetime: approvalInstance.requested_at,
        type: '発注書承認依頼',
        entity: 'purchase_order',
        purchaseOrderId: order.id,
        purchaseOrderNumber: order.purchase_order_number,
        supplierName: supplier?.supplier_name ?? null,
        quoteNumber: quote?.quote_number ?? null,
        quoteId: quote?.id ?? undefined,
        projectName: project?.project_name ?? null,
        projectNumber: project?.project_number ?? null,
        customerName: customer?.customer_name ?? null,
        actor: requestedByUser?.display_name ?? undefined,
      })
    }

    const steps = ensureArrayRelation(approvalInstance?.steps)
    if (steps.length > 0) {
      steps.forEach((step) => {
        if (!step.decided_at) {
          return
        }

        let type: ProcurementActivityEvent['type'] = 'その他'
        if (step.status === 'approved') type = '発注書承認'
        else if (step.status === 'rejected') type = '発注書却下'
        else if (step.status === 'skipped') type = '発注書スキップ'

        const approverUser = firstRelation(step.approver)

        events.push({
          id: step.id,
          datetime: step.decided_at,
          type,
          entity: 'purchase_order',
          purchaseOrderId: order.id,
          purchaseOrderNumber: order.purchase_order_number,
          supplierName: supplier?.supplier_name ?? null,
          quoteNumber: quote?.quote_number ?? null,
          quoteId: quote?.id ?? undefined,
          projectName: project?.project_name ?? null,
          projectNumber: project?.project_number ?? null,
          customerName: customer?.customer_name ?? null,
          actor: approverUser?.display_name ?? step.approver_role,
          notes: step.notes ?? undefined,
        })
      })
    }
  }

  for (const log of procurementLogs ?? []) {
    const quoteItem = firstRelation(log.quote_item)
    const poItem = quoteItem ? firstRelation(quoteItem.purchase_order_items) : null
    const purchaseOrder = poItem ? firstRelation(poItem.purchase_order) : null
    const logQuote = quoteItem ? firstRelation(quoteItem.quote) : null
    const logProject = logQuote ? firstRelation(logQuote.project) : null
    const logCustomer = logProject ? firstRelation(logProject.customer) : null

    if (!purchaseOrder) continue

    const type = log.action_type === '入荷' ? '入荷' : log.action_type === '発注' ? '発注' : 'その他'

    events.push({
      id: log.id,
      datetime: log.action_date,
      type,
      entity: 'purchase_order',
      purchaseOrderId: purchaseOrder.id,
      purchaseOrderNumber: purchaseOrder.purchase_order_number,
      supplierName: firstRelation(purchaseOrder.supplier)?.supplier_name ?? null,
      quoteId: logQuote?.id ?? undefined,
      quoteNumber: logQuote?.quote_number ?? null,
      projectName: logProject?.project_name ?? null,
      projectNumber: logProject?.project_number ?? null,
      customerName: logCustomer?.customer_name ?? null,
      actor: log.performed_by_user?.display_name ?? null,
      notes: log.notes ?? undefined,
    })
  }

  for (const quote of quotes ?? []) {
    const project = quote.project ? firstRelation(quote.project) : null
    const customer = project ? firstRelation(project.customer) : null
    const approvalInstance = firstRelation(quote.approval_instance)

    if (quote.created_at) {
      events.push({
        id: `${quote.id}-quote-created`,
        datetime: quote.created_at,
        type: '見積作成',
        entity: 'quote',
        quoteId: quote.id,
        quoteNumber: quote.quote_number,
        projectName: project?.project_name ?? null,
        projectNumber: project?.project_number ?? null,
        customerName: customer?.customer_name ?? null,
        actor: quote.created_by_user?.display_name ?? null,
      })
    }

    if (approvalInstance?.requested_at) {
      events.push({
        id: `${quote.id}-quote-requested-${approvalInstance.id}`,
        datetime: approvalInstance.requested_at,
        type: '見積承認依頼',
        entity: 'quote',
        quoteId: quote.id,
        quoteNumber: quote.quote_number,
        projectName: project?.project_name ?? null,
        projectNumber: project?.project_number ?? null,
        customerName: customer?.customer_name ?? null,
        actor: approvalInstance.requested_by_user?.display_name ?? null,
      })
    }

    const steps = ensureArrayRelation(approvalInstance?.steps)
    if (steps.length > 0) {
      steps.forEach((step) => {
        if (!step.decided_at) {
          return
        }

        let type: ProcurementActivityEvent['type'] = 'その他'
        if (step.status === 'approved') type = '見積承認'
        else if (step.status === 'rejected') type = '見積差戻し'
        else if (step.status === 'skipped') type = '見積スキップ'

        events.push({
          id: `${quote.id}-quote-step-${step.id}`,
          datetime: step.decided_at,
          type,
          entity: 'quote',
          quoteId: quote.id,
          quoteNumber: quote.quote_number,
          projectName: project?.project_name ?? null,
          projectNumber: project?.project_number ?? null,
          customerName: customer?.customer_name ?? null,
          actor: step.approver?.display_name ?? step.approver_role,
          notes: step.notes ?? undefined,
        })
      })
    }
  }

  for (const activity of projectActivities ?? []) {
    const project = activity.project ? firstRelation(activity.project) : null
    const customer = project ? firstRelation(project.customer) : null
    if (!project) continue
    events.push({
      id: activity.id,
      datetime: activity.activity_date ?? activity.created_at,
      type: '案件活動',
      entity: 'project',
      projectId: project.id,
      projectNumber: project.project_number ?? null,
      projectName: project.project_name ?? null,
      customerName: customer?.customer_name ?? null,
      actor: activity.created_by_user?.display_name ?? null,
      title: activity.subject,
      notes: [activity.details, activity.next_action ? `次回: ${activity.next_action}${activity.next_action_due_date ? ` (${activity.next_action_due_date})` : ''}` : null]
        .filter(Boolean)
        .join('\n') || undefined,
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
          <h1 className="text-3xl font-bold text-gray-900">アクティビティ管理</h1>
          <p className="text-gray-600 mt-2">
            見積・発注・入荷・案件活動など、すべての操作ログを時系列で確認できます。
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最新アクティビティ</CardTitle>
          <CardDescription>全操作ログ（直近200件）</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-gray-500">表示できるアクティビティがありません。</p>
          ) : (
            <ProcurementActivityTimeline events={sortedEvents} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
