'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendQuoteApprovalEmail } from '@/lib/email/send'
import type { ApprovalRouteStep } from '@/types/database'

// 承認依頼を送信
export async function requestApproval(quoteId: string) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'ユーザー情報の取得に失敗しました' }
    }

    const { data: requester } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!requester) {
      return { success: false, message: '利用者情報を取得できませんでした' }
    }

    const { data: quote } = await supabase
      .from('quotes')
      .select('id, approval_status, total_amount, created_by')
      .eq('id', quoteId)
      .single()

    if (!quote) {
      return { success: false, message: '見積情報が見つかりませんでした' }
    }

    if (quote.approval_status !== '下書き') {
      return { success: false, message: '下書き状態の見積のみ承認依頼できます' }
    }

    const requesterIsOwner = quote.created_by === requester.id
    const requesterIsBackOffice = requester.role === '営業事務' || requester.role === '管理者'
    if (!requesterIsOwner && !requesterIsBackOffice) {
      return { success: false, message: 'この見積の承認依頼権限がありません' }
    }

    const totalAmount = Number(quote.total_amount || 0)

    const { data: routesData, error: routesError } = await supabase
      .from('approval_routes')
      .select('id, name, requester_role, min_total_amount, max_total_amount, is_active, steps:approval_route_steps(id, step_order, approver_role, notes)')
      .eq('is_active', true)
      .order('min_total_amount', { ascending: true })

    if (routesError) throw routesError

    const sortedRoutes = (routesData || []).sort((a, b) => {
      const aMin = a.min_total_amount ?? 0
      const bMin = b.min_total_amount ?? 0
      return aMin - bMin
    })

    const matchedRoute = sortedRoutes.find((route) => {
      const matchesRole = !route.requester_role || route.requester_role === requester.role
      const matchesMin = route.min_total_amount == null || totalAmount >= Number(route.min_total_amount)
      const matchesMax = route.max_total_amount == null || totalAmount <= Number(route.max_total_amount)
      return matchesRole && matchesMin && matchesMax
    })

    if (!matchedRoute) {
      return {
        success: false,
        message: '適用可能な承認フローが見つかりません。管理者にお問い合わせください。',
      }
    }

    const steps = [...((matchedRoute.steps || []) as ApprovalRouteStep[])].sort(
      (a, b) => a.step_order - b.step_order
    )

    if (steps.length === 0) {
      return { success: false, message: '承認フローに承認ステップが設定されていません' }
    }

    const { data: existingInstance } = await supabase
      .from('quote_approval_instances')
      .select('id, status')
      .eq('quote_id', quoteId)
      .maybeSingle()

    if (existingInstance && existingInstance.status === 'pending') {
      return { success: false, message: '既に承認依頼が進行中です' }
    }

    let instanceId: string | null = existingInstance?.id ?? null

    if (existingInstance) {
      // 既存のステップをリセット
      await supabase
        .from('quote_approval_instance_steps')
        .delete()
        .eq('instance_id', existingInstance.id)

      const { error: updateInstanceError } = await supabase
        .from('quote_approval_instances')
        .update({
          route_id: matchedRoute.id,
          status: 'pending',
          current_step: steps[0]?.step_order ?? null,
          requested_by: requester.id,
          requested_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', existingInstance.id)

      if (updateInstanceError) throw updateInstanceError
    } else {
      const { data: newInstance, error: insertInstanceError } = await supabase
        .from('quote_approval_instances')
        .insert({
          quote_id: quoteId,
          route_id: matchedRoute.id,
          status: 'pending',
          current_step: steps[0]?.step_order ?? null,
          requested_by: requester.id,
        })
        .select()
        .single()

      if (insertInstanceError) throw insertInstanceError
      instanceId = newInstance.id
    }

    if (!instanceId) {
      return { success: false, message: '承認インスタンスの作成に失敗しました' }
    }

    const stepRows = steps.map((step) => ({
      instance_id: instanceId,
      step_order: step.step_order,
      approver_role: step.approver_role,
      status: 'pending' as const,
    }))

    const { error: insertStepsError } = await supabase
      .from('quote_approval_instance_steps')
      .insert(stepRows)

    if (insertStepsError) throw insertStepsError

    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '承認待ち',
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '下書き')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return {
      success: true,
      message: `${matchedRoute.name} の承認フローに依頼を送信しました`,
    }
  } catch (error) {
    console.error('承認依頼エラー:', error)
    return { success: false, message: '承認依頼の送信に失敗しました' }
  }
}
// 見積を承認
export async function approveQuote(quoteId: string, userId: string) {
  const supabase = await createClient()

  try {
    const { data: approver } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (!approver) {
      return { success: false, message: '承認者情報を取得できませんでした' }
    }

    const { data: instance } = await supabase
      .from('quote_approval_instances')
      .select(`
        id,
        status,
        current_step,
        quote_id,
        steps:quote_approval_instance_steps(
          id,
          step_order,
          approver_role,
          status
        )
      `)
      .eq('quote_id', quoteId)
      .maybeSingle()

    if (!instance || instance.status !== 'pending') {
      return { success: false, message: '承認待ちの承認フローが見つかりませんでした' }
    }

    const orderedSteps = [...(instance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    const currentStep = orderedSteps.find(
      (step) =>
        step.status === 'pending' &&
        step.step_order === (instance.current_step ?? orderedSteps[0]?.step_order)
    )

    if (!currentStep) {
      return { success: false, message: '承認待ちのステップが見つかりませんでした' }
    }

    if (currentStep.approver_role !== approver.role) {
      return { success: false, message: `このステップは${currentStep.approver_role}が承認する必要があります` }
    }

    const { error: stepUpdateError } = await supabase
      .from('quote_approval_instance_steps')
      .update({
        status: 'approved',
        approver_user_id: userId,
        decided_at: new Date().toISOString(),
      })
      .eq('id', currentStep.id)
      .eq('status', 'pending')

    if (stepUpdateError) throw stepUpdateError

    const remainingSteps = orderedSteps.filter(
      (step) => step.step_order > currentStep.step_order && step.status === 'pending'
    )

    if (remainingSteps.length > 0) {
      const nextStep = remainingSteps[0]
      const { error: instanceUpdateError } = await supabase
        .from('quote_approval_instances')
        .update({
          current_step: nextStep.step_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)

      if (instanceUpdateError) throw instanceUpdateError

      revalidatePath(`/dashboard/quotes/${quoteId}`)
      revalidatePath('/dashboard/quotes')

      return {
        success: true,
        message: `承認しました。次の承認者は${nextStep.approver_role}です。`,
      }
    }

    const now = new Date().toISOString()

    const { error: instanceCompleteError } = await supabase
      .from('quote_approval_instances')
      .update({
        status: 'approved',
        current_step: null,
        updated_at: now,
      })
      .eq('id', instance.id)

    if (instanceCompleteError) throw instanceCompleteError

    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({
        approval_status: '承認済み',
        approved_by: userId,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', quoteId)
      .eq('approval_status', '承認待ち')

    if (quoteUpdateError) throw quoteUpdateError

    // TODO: メール通知をAPIルート経由で送信

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '承認が完了しました' }
  } catch (error) {
    console.error('Quote approval error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '承認処理でエラーが発生しました',
    }
  }
}

// 見積を却下
export async function rejectQuote(quoteId: string, userId: string, rejectReason?: string) {
  const supabase = await createClient()

  try {
    const { data: approver } = await supabase
      .from('users')
      .select('id, role, display_name')
      .eq('id', userId)
      .single()

    if (!approver) {
      return { success: false, message: '承認者情報を取得できませんでした' }
    }

    const { data: instance } = await supabase
      .from('quote_approval_instances')
      .select(`
        id,
        status,
        current_step,
        quote_id,
        steps:quote_approval_instance_steps(
          id,
          step_order,
          approver_role,
          status
        )
      `)
      .eq('quote_id', quoteId)
      .maybeSingle()

    if (!instance || instance.status !== 'pending') {
      return { success: false, message: '却下対象の承認フローが見つかりませんでした' }
    }

    const orderedSteps = [...(instance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    const currentStep = orderedSteps.find(
      (step) =>
        step.status === 'pending' &&
        step.step_order === (instance.current_step ?? orderedSteps[0]?.step_order)
    )

    if (!currentStep) {
      return { success: false, message: '却下対象のステップが見つかりませんでした' }
    }

    if (currentStep.approver_role !== approver.role) {
      return { success: false, message: `このステップは${currentStep.approver_role}が処理する必要があります` }
    }

    const now = new Date().toISOString()

    const { error: stepRejectError } = await supabase
      .from('quote_approval_instance_steps')
      .update({
        status: 'rejected',
        approver_user_id: userId,
        decided_at: now,
        notes: rejectReason || null,
      })
      .eq('id', currentStep.id)
      .eq('status', 'pending')

    if (stepRejectError) throw stepRejectError

    const { error: instanceRejectError } = await supabase
      .from('quote_approval_instances')
      .update({
        status: 'rejected',
        current_step: null,
        rejection_reason: rejectReason || null,
        updated_at: now,
      })
      .eq('id', instance.id)

    if (instanceRejectError) throw instanceRejectError

    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({
        approval_status: '却下',
        approved_by: userId,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', quoteId)
      .eq('approval_status', '承認待ち')

    if (quoteUpdateError) throw quoteUpdateError

    if (approver.display_name) {
      sendQuoteApprovalEmail(
        quoteId,
        '却下',
        approver.display_name,
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
    const { data: instance } = await supabase
      .from('quote_approval_instances')
      .select('id')
      .eq('quote_id', quoteId)
      .maybeSingle()

    if (instance) {
      await supabase
        .from('quote_approval_instance_steps')
        .delete()
        .eq('instance_id', instance.id)

      await supabase
        .from('quote_approval_instances')
        .update({
          status: 'cancelled',
          current_step: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)
    }

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
