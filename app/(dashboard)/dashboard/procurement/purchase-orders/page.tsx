import { createClient } from '@/lib/supabase/server'
import { PurchaseOrderTable } from '@/components/purchase-orders/purchase-order-table'
import type { PurchaseOrderListItem } from '@/components/purchase-orders/purchase-order-table'

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      purchase_order_number,
      order_date,
      status,
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
      )
    `)
    .order('order_date', { ascending: false })

  if (error) {
    console.error('Failed to load purchase orders:', error)
    return <p className="text-sm text-destructive">発注書の取得に失敗しました。</p>
  }

  const normalized: PurchaseOrderListItem[] = (orders || []).map((order) => ({
    id: order.id,
    purchase_order_number: order.purchase_order_number,
    order_date: order.order_date,
    status: order.status,
    total_cost: Number(order.total_cost || 0),
    notes: order.notes,
    created_at: order.created_at,
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
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">発注書管理</h1>
        <p className="text-gray-600 mt-2">作成済みの発注書の一覧と編集</p>
      </div>
      <PurchaseOrderTable orders={normalized} />
    </div>
  )
}
