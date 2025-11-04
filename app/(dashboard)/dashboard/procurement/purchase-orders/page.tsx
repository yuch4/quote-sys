import { createClient } from '@/lib/supabase/server'
import { PurchaseOrderTable } from '@/components/purchase-orders/purchase-order-table'
import type { PurchaseOrderListItem } from '@/components/purchase-orders/purchase-order-table'

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
      created_at,
      quote:quotes(id, quote_number),
      supplier:suppliers(id, supplier_name),
      items:purchase_order_items(
        id,
        quantity,
        unit_cost,
        amount,
        quote_item:quote_items(
          id,
          line_number,
          product_name
        )
      ),
      approval_instance:purchase_order_approval_instances(
        id,
        status,
        current_step,
        route:approval_routes(name),
        steps:purchase_order_approval_instance_steps(
          id,
          step_order,
          approver_role,
          status,
          approver:users(id, display_name)
        )
      )
    `)
    .order('order_date', { ascending: false })

  if (error) {
    console.error('Failed to load purchase orders:', error)
    return <p className="text-sm text-destructive">発注書の取得に失敗しました。</p>
  }

  const normalized: PurchaseOrderListItem[] = (orders || []).map((order) => {
    const approvalInstanceRaw = order.approval_instance
    const approvalInstance = Array.isArray(approvalInstanceRaw)
      ? approvalInstanceRaw[0] ?? null
      : approvalInstanceRaw ?? null

    return {
      id: order.id,
      purchase_order_number: order.purchase_order_number,
      order_date: order.order_date,
      status: order.status,
      approval_status: order.approval_status,
      approval_instance: approvalInstance,
      total_cost: Number(order.total_cost || 0),
      notes: order.notes,
      created_at: order.created_at,
      created_by: order.created_by,
      supplier: order.supplier,
      quote: order.quote,
      items: (order.items || []).map((item) => ({
        id: item.id,
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unit_cost || 0),
        amount: Number(item.amount || 0),
        quote_item: item.quote_item
          ? {
              id: item.quote_item.id,
              line_number: item.quote_item.line_number,
              product_name: item.quote_item.product_name,
            }
          : null,
      })),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">発注書管理</h1>
        <p className="text-gray-600 mt-2">作成済みの発注書の一覧と編集</p>
      </div>
      <PurchaseOrderTable orders={normalized} currentUser={currentUser} />
    </div>
  )
}
