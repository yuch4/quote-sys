'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PurchaseOrderStatus } from '@/types/database'

type UpdatePurchaseOrderPayload = {
  purchaseOrderId: string
  orderDate?: string
  status: PurchaseOrderStatus
  notes?: string | null
}

const normalizeDate = (date?: string, fallback?: string) => {
  const target = date ?? fallback
  if (!target) {
    const now = new Date()
    return {
      sqlDate: now.toISOString().split('T')[0],
      isoDateTime: now.toISOString(),
    }
  }

  const parsed = new Date(target)
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date()
    return {
      sqlDate: now.toISOString().split('T')[0],
      isoDateTime: now.toISOString(),
    }
  }

  const yyyyMmDd = parsed.toISOString().split('T')[0]
  const isoDateTime = new Date(`${yyyyMmDd}T00:00:00.000Z`).toISOString()

  return { sqlDate: yyyyMmDd, isoDateTime }
}

export async function updatePurchaseOrder(payload: UpdatePurchaseOrderPayload) {
  const { purchaseOrderId, orderDate, status, notes } = payload

  if (!purchaseOrderId) {
    return { success: false, message: '発注書IDが指定されていません' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'ユーザー情報の取得に失敗しました' }
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    return { success: false, message: '利用者情報を取得できませんでした' }
  }

  const { data: purchaseOrder, error: fetchError } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      quote_id,
      status,
      order_date,
      items:purchase_order_items (
        id,
        quote_item_id,
        quantity
      )
    `)
    .eq('id', purchaseOrderId)
    .single()

  if (fetchError || !purchaseOrder) {
    console.error('Failed to load purchase order:', fetchError)
    return { success: false, message: '発注書の取得に失敗しました' }
  }

  const { sqlDate, isoDateTime } = normalizeDate(orderDate, purchaseOrder.order_date ?? undefined)

  try {
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        order_date: sqlDate,
        status,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)

    if (updateError) throw updateError

    const quoteItemIds = (purchaseOrder.items || []).map((item) => item.quote_item_id)

    if (quoteItemIds.length > 0) {
      if (status === '発注済') {
        const { error: itemUpdateError } = await supabase
          .from('quote_items')
          .update({
            procurement_status: '発注済',
            ordered_at: isoDateTime,
          })
          .in('id', quoteItemIds)

        if (itemUpdateError) throw itemUpdateError

        const statusChangedToOrdered = purchaseOrder.status !== '発注済'
        if (statusChangedToOrdered && (purchaseOrder.items || []).length > 0) {
          const { error: logError } = await supabase.from('procurement_logs').insert(
            (purchaseOrder.items || []).map((item) => ({
              quote_item_id: item.quote_item_id,
              action_type: '発注' as const,
              action_date: isoDateTime,
              quantity: Number(item.quantity || 0),
              performed_by: currentUser.id,
              notes: notes?.trim() || null,
            }))
          )

          if (logError) throw logError
        }
      } else {
        const { error: itemResetError } = await supabase
          .from('quote_items')
          .update({
            procurement_status: '未発注',
            ordered_at: null,
          })
          .in('id', quoteItemIds)

        if (itemResetError) throw itemResetError
      }
    }

    revalidatePath(`/dashboard/quotes/${purchaseOrder.quote_id}`)
    revalidatePath('/dashboard/procurement')
    revalidatePath('/dashboard/procurement/pending')
    revalidatePath('/dashboard/procurement/receiving')
    revalidatePath('/dashboard/procurement/purchase-orders')

    return { success: true, message: '発注書を更新しました' }
  } catch (error) {
    console.error('Failed to update purchase order:', error)
    return { success: false, message: '発注書の更新に失敗しました' }
  }
}
