import { createClient } from '@/lib/supabase/server'
import { PurchaseOrderTable } from '@/components/purchase-orders/purchase-order-table'
import { PurchaseOrderCreateDialog } from '@/components/purchase-orders/purchase-order-create-dialog'
import type { ApprovalRoute, ApprovalRouteStep, PurchaseOrderApprovalInstance, PurchaseOrderApprovalInstanceStep, PurchaseOrderListItem, PurchaseOrderStatus } from '@/types/database'
import { firstRelation, ensureArrayRelation } from '@/lib/supabase/relations'

type QuoteOption = {
  id: string
  quote_number: string
  project_name: string | null
}

const normalizeStatus = (status: string | null): PurchaseOrderStatus => {
  switch (status) {
    case '発注済':
    case 'キャンセル':
    case '未発注':
      return status
    default:
      return '未発注'
  }
}

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentUser: { id: string; role: string } | undefined
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (userData) {
      currentUser = { id: userData.id, role: userData.role }
    }
  }

  const { data: orders, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      purchase_order_number,
      order_date,
      status,
      approval_status,
      created_by,
      total_cost,
      notes,
      pdf_url,
      pdf_generated_at,
      created_at,
      quote:quotes(id, quote_number),
      supplier:suppliers(id, supplier_name),
      items:purchase_order_items(
        id,
        quantity,
        unit_cost,
        amount,
        manual_name,
        manual_description,
        quote_item:quote_items(
          id,
          line_number,
          product_name,
          procurement_status
        )
      ),
      approval_instance:purchase_order_approval_instances(
        id,
        status,
        current_step,
        requested_at,
        route:approval_routes(name),
        steps:purchase_order_approval_instance_steps(
          id,
          step_order,
          approver_role,
          status,
          decided_at,
          notes,
          approver:users(id, display_name)
        )
      )
    `)
    .order('order_date', { ascending: false })

  if (error) {
    console.error('Failed to load purchase orders:', error)
    return <p className="text-sm text-destructive">発注書の取得に失敗しました。</p>
  }

  const { data: quotesData } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      approval_status,
      project:projects(project_name)
    `)
    .order('issue_date', { ascending: false })

  const quoteOptions: QuoteOption[] =
    (quotesData || [])
      .filter((quote) => quote.approval_status === '承認済み')
      .map((quote) => {
        const project = firstRelation(quote.project)
        return {
          id: quote.id,
          quote_number: quote.quote_number,
          project_name: project?.project_name ?? null,
        }
      })

  const { data: suppliersData } = await supabase
    .from('suppliers')
    .select('id, supplier_name')
    .eq('is_deleted', false)
    .order('supplier_name', { ascending: true })

  const suppliers = suppliersData || []

  const normalized: PurchaseOrderListItem[] = (orders || []).map((order) => {
    const approvalInstanceRaw = firstRelation(order.approval_instance)
    const supplier = firstRelation(order.supplier)
    const quoteRecord = firstRelation(order.quote)

    const approvalInstance = approvalInstanceRaw
      ? {
          ...approvalInstanceRaw,
          purchase_order_id: approvalInstanceRaw.purchase_order_id,
          route_id: approvalInstanceRaw.route_id,
          requested_by: approvalInstanceRaw.requested_by,
          updated_at: approvalInstanceRaw.updated_at,
          rejection_reason: approvalInstanceRaw.rejection_reason,
          route: firstRelation(approvalInstanceRaw.route),
          steps: ensureArrayRelation(approvalInstanceRaw.steps).map((step) => ({
            ...step,
            approver: firstRelation(step.approver) ?? undefined,
          })),
        }
      : null

    const procurementStats = (order.items || []).reduce(
      (acc, item) => {
        let status: '未発注' | '発注済' | '入荷済' = '未発注'

        if (item.quote_item?.procurement_status === '発注済' || item.quote_item?.procurement_status === '入荷済') {
          status = item.quote_item.procurement_status as '発注済' | '入荷済'
        } else if (!item.quote_item?.procurement_status && order.status === '発注済') {
          status = '発注済'
        }

        if (status === '発注済') acc.ordered += 1
        else if (status === '入荷済') acc.received += 1
        else acc.pending += 1

        acc.total += 1
        return acc
      },
      { pending: 0, ordered: 0, received: 0, total: 0 }
    )

    return {
      id: order.id,
      purchase_order_number: order.purchase_order_number,
      order_date: order.order_date,
      status: normalizeStatus(order.status),
      approval_status: order.approval_status,
      approval_instance: approvalInstance,
      total_cost: Number(order.total_cost || 0),
      notes: order.notes,
      pdf_url: order.pdf_url,
      pdf_generated_at: order.pdf_generated_at,
      created_at: order.created_at,
      created_by: order.created_by,
      supplier,
      quote: quoteRecord,
      items: ensureArrayRelation(order.items).map((item) => ({
        id: item.id,
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unit_cost || 0),
        amount: Number(item.amount || 0),
        manual_name: item.manual_name,
        manual_description: item.manual_description,
        quote_item: (() => {
          const quoteItem = firstRelation(item.quote_item)
          if (!quoteItem) return null
          return {
            id: quoteItem.id,
            line_number: quoteItem.line_number,
            product_name: quoteItem.product_name,
            procurement_status: quoteItem.procurement_status || null,
          }
        })(),
      })),
      procurementSummary: procurementStats,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">発注書管理</h1>
          <p className="text-gray-600 mt-2">発注書の作成・承認・管理</p>
        </div>
        <PurchaseOrderCreateDialog quotes={quoteOptions} suppliers={suppliers} />
      </div>
      <PurchaseOrderTable orders={normalized} currentUser={currentUser} />
    </div>
  )
}
