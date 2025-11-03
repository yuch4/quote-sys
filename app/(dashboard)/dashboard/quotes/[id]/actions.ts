'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendQuoteApprovalEmail } from '@/lib/email/send'

// 承認依頼を送信
export async function requestApproval(quoteId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '承認待ち',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '下書き')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '承認依頼を送信しました' }
  } catch (error) {
    console.error('承認依頼エラー:', error)
    return { success: false, message: '承認依頼の送信に失敗しました' }
  }
}
// 見積を承認
export async function approveQuote(quoteId: string, userId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '承認済み',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '承認待ち')

    if (error) throw error

    // TODO: メール通知をAPIルート経由で送信

    return { success: true }
  } catch (error) {
    console.error('Quote approval error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// 見積を却下
export async function rejectQuote(quoteId: string, userId: string, rejectReason?: string) {
  const supabase = await createClient()

  try {
    // 承認者情報を取得
    const { data: approverData } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .single()

    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '却下',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '承認待ち')

    if (error) throw error

    // メール通知を送信（非同期、エラーでも処理は継続）
    if (approverData) {
      sendQuoteApprovalEmail(
        quoteId,
        '却下',
        approverData.display_name,
        rejectReason
      ).catch(err => console.error('Email send failed:', err))
    }

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '見積を却下しました' }
  } catch (error) {
    console.error('却下エラー:', error)
    return { success: false, message: '見積の却下に失敗しました' }
  }
}

// 下書きに戻す
export async function returnToDraft(quoteId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '下書き',
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '却下')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '下書きに戻しました' }
  } catch (error) {
    console.error('下書きに戻すエラー:', error)
    return { success: false, message: '下書きに戻す処理に失敗しました' }
  }
}

type CreatePurchaseOrderPayload = {
  quoteId: string
  itemIds: string[]
  orderDate?: string
  combineBySupplier: boolean
  notes?: string
}

const formatDateToISO = (date: string) => {
  const base = new Date(date)
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString()
  }
  return new Date(base.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString()
}

const computeAmount = (quantity: number, unitCost: number | null, costAmount: number | null) => {
  if (costAmount != null) return Number(costAmount)
  if (unitCost != null) return Number(unitCost) * Number(quantity)
  return Number(quantity) * 0
}

export async function createPurchaseOrders(payload: CreatePurchaseOrderPayload) {
  const { quoteId, itemIds, orderDate, combineBySupplier, notes } = payload
  if (!quoteId) {
    return { success: false, message: '見積IDが指定されていません' }
  }
  if (!itemIds || itemIds.length === 0) {
    return { success: false, message: '発注対象の明細が選択されていません' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'ユーザー情報の取得に失敗しました' }
  }

  const effectiveOrderDate = orderDate || new Date().toISOString().split('T')[0]
  const orderedAt = formatDateToISO(effectiveOrderDate)

  const { data: items, error: itemsError } = await supabase
    .from('quote_items')
    .select('id, supplier_id, quantity, cost_price, cost_amount, requires_procurement, procurement_status, product_name')
    .in('id', itemIds)
    .eq('quote_id', quoteId)

  if (itemsError) {
    console.error('Failed to load quote items:', itemsError)
    return { success: false, message: '明細情報の取得に失敗しました' }
  }

  if (!items || items.length !== itemIds.length) {
    return { success: false, message: '選択した明細の取得に失敗しました' }
  }

  const invalidStatus = items.filter(
    (item) => item.procurement_status === '発注済' || !item.requires_procurement
  )
  if (invalidStatus.length > 0) {
    return { success: false, message: '既に発注済み、または仕入不要の明細が含まれています' }
  }

  const missingSupplier = items.filter((item) => !item.supplier_id)
  if (missingSupplier.length > 0) {
    return { success: false, message: '仕入先が未設定の明細があります。先に仕入先を設定してください。' }
  }

  const groups = combineBySupplier
    ? Object.values(
        items.reduce<Record<string, typeof items>>((acc, item) => {
          const key = item.supplier_id as string
          if (!acc[key]) acc[key] = []
          acc[key].push(item)
          return acc
        }, {})
      )
    : items.map((item) => [item])

  const { count } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })

  const baseYear = new Date(effectiveOrderDate).getFullYear()
  let sequence = (count || 0) + 1

  const orderRows = groups.map((group) => {
    const supplierId = group[0].supplier_id as string
    const totalCost = group.reduce(
      (sum, item) => sum + computeAmount(Number(item.quantity || 0), item.cost_price, item.cost_amount),
      0
    )
    const purchaseOrderNumber = `PO-${baseYear}-${String(sequence++).padStart(4, '0')}`

    return {
      quote_id: quoteId,
      supplier_id: supplierId,
      purchase_order_number: purchaseOrderNumber,
      order_date: effectiveOrderDate,
      status: '発注済' as const,
      total_cost: totalCost,
      notes: notes || null,
      created_by: user.id,
    }
  })

  const { data: createdOrders, error: orderError } = await supabase
    .from('purchase_orders')
    .insert(orderRows)
    .select()

  if (orderError) {
    console.error('Failed to create purchase orders:', orderError)
    return { success: false, message: '発注書の作成に失敗しました' }
  }

  const orderItemsPayload = createdOrders.flatMap((order, index) => {
    const group = groups[index]
    return group.map((item) => {
      const quantity = Number(item.quantity || 0)
      const unitCost = item.cost_price != null ? Number(item.cost_price) : quantity === 0 ? 0 : Number(item.cost_amount || 0) / quantity
      return {
        purchase_order_id: order.id,
        quote_item_id: item.id,
        quantity,
        unit_cost: unitCost,
        amount: computeAmount(quantity, item.cost_price, item.cost_amount),
      }
    })
  })

  if (orderItemsPayload.length > 0) {
    const { error: poItemsError } = await supabase
      .from('purchase_order_items')
      .insert(orderItemsPayload)

    if (poItemsError) {
      console.error('Failed to insert purchase order items:', poItemsError)
      return { success: false, message: '発注書の明細登録に失敗しました' }
    }
  }

  const { error: updateItemsError } = await supabase
    .from('quote_items')
    .update({
      procurement_status: '発注済',
      ordered_at: orderedAt,
    })
    .in('id', itemIds)

  if (updateItemsError) {
    console.error('Failed to update quote items:', updateItemsError)
    return { success: false, message: '明細のステータス更新に失敗しました' }
  }

  const logsPayload = items.map((item) => ({
    quote_item_id: item.id,
    action_type: '発注' as const,
    action_date: orderedAt,
    quantity: Number(item.quantity || 0),
    performed_by: user.id,
    notes: notes || null,
  }))

  const { error: logError } = await supabase
    .from('procurement_logs')
    .insert(logsPayload)

  if (logError) {
    console.error('Failed to create procurement logs:', logError)
    return { success: false, message: '発注履歴の登録に失敗しました' }
  }

  revalidatePath(`/dashboard/quotes/${quoteId}`)
  revalidatePath('/dashboard/procurement')
  revalidatePath('/dashboard/procurement/pending')

  return {
    success: true,
    ordersCreated: createdOrders.length,
    message: `${createdOrders.length}件の発注書を作成しました`,
  }
}
