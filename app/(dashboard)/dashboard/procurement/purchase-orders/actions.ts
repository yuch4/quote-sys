'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ApprovalRouteStep, PurchaseOrderApprovalInstance, PurchaseOrderStatus } from '@/types/database'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

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
      approval_status,
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
    if (status === '発注済' && purchaseOrder.approval_status !== '承認済み') {
      return { success: false, message: '承認完了後でないと発注済みに変更できません' }
    }

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

    revalidatePurchaseOrderPaths(purchaseOrder.quote_id)

    return { success: true, message: '発注書を更新しました' }
  } catch (error) {
    console.error('Failed to update purchase order:', error)
    return { success: false, message: '発注書の更新に失敗しました' }
  }
}

const fetchPurchaseOrderWithItems = async (supabase: SupabaseClient, purchaseOrderId: string) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      quote_id,
      total_cost,
      approval_status,
      status,
      created_by,
      supplier_id,
      order_date,
      items:purchase_order_items (
        id,
        quote_item_id,
        quantity,
        unit_cost,
        amount,
        manual_name,
        manual_description
      )
    `)
    .eq('id', purchaseOrderId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch purchase order:', error)
    throw new Error('発注書の取得に失敗しました')
  }

  return data
}

const revalidatePurchaseOrderPaths = (quoteId?: string | null) => {
  if (quoteId) {
    revalidatePath(`/dashboard/quotes/${quoteId}`)
  }
  revalidatePath('/dashboard/procurement')
  revalidatePath('/dashboard/procurement/pending')
  revalidatePath('/dashboard/procurement/receiving')
  revalidatePath('/dashboard/procurement/purchase-orders')
  revalidatePath('/dashboard/approvals')
}

const revertQuoteItemsToPending = async (
  supabase: SupabaseClient,
  purchaseOrder: Awaited<ReturnType<typeof fetchPurchaseOrderWithItems>>
) => {
  const quoteItemIds = (purchaseOrder.items || [])
    .map((item) => item.quote_item_id)
    .filter((id): id is string => Boolean(id))

  if (quoteItemIds.length === 0) {
    return
  }

  const { error } = await supabase
    .from('quote_items')
    .update({ procurement_status: '未発注', ordered_at: null })
    .in('id', quoteItemIds)

  if (error) {
    console.error('Failed to revert quote items to 未発注:', error)
    throw error
  }
}

const generatePurchaseOrderNumber = async (supabase: SupabaseClient, orderDate?: string) => {
  const { count } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })

  const year = orderDate ? new Date(orderDate).getFullYear() : new Date().getFullYear()
  const sequence = (count || 0) + 1
  return `PO-${year}-${String(sequence).padStart(4, '0')}`
}

type ManualPurchaseOrderItemInput = {
  name: string
  description?: string
  quantity: number
  unitCost: number
}

type CreateStandalonePurchaseOrderPayload = {
  supplierId: string
  orderDate?: string
  notes?: string
  items: ManualPurchaseOrderItemInput[]
}

export async function createStandalonePurchaseOrder(payload: CreateStandalonePurchaseOrderPayload) {
  const { supplierId, orderDate, notes, items } = payload

  if (!supplierId) {
    return { success: false, message: '仕入先を選択してください' }
  }

  if (!items || items.length === 0) {
    return { success: false, message: '明細を1件以上入力してください' }
  }

  const invalidItem = items.find((item) => !item.name.trim() || Number(item.quantity) <= 0 || Number(item.unitCost) < 0)
  if (invalidItem) {
    return { success: false, message: '明細の入力内容を確認してください' }
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

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('id', supplierId)
    .eq('is_deleted', false)
    .single()

  if (!supplier) {
    return { success: false, message: '選択した仕入先が見つかりません' }
  }

  const { sqlDate } = normalizeDate(orderDate)
  const purchaseOrderNumber = await generatePurchaseOrderNumber(supabase, sqlDate)
  const sanitizedNotes = notes?.trim() ? notes.trim() : null
  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity)
    const unitCost = Number(item.unitCost)
    return {
      name: item.name.trim(),
      description: item.description?.trim() || null,
      quantity,
      unitCost,
      amount: quantity * unitCost,
    }
  })
  const totalCost = normalizedItems.reduce((sum, item) => sum + item.amount, 0)

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('purchase_orders')
      .insert({
        purchase_order_number: purchaseOrderNumber,
        quote_id: null,
        supplier_id: supplierId,
        order_date: sqlDate,
        status: '未発注',
        approval_status: '下書き',
        total_cost: totalCost,
        notes: sanitizedNotes,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      throw insertError
    }

    const itemsPayload = normalizedItems.map((item) => ({
      purchase_order_id: inserted.id,
      quote_item_id: null,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      amount: item.amount,
      manual_name: item.name,
      manual_description: item.description,
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsPayload)

    if (itemsError) throw itemsError

    revalidatePurchaseOrderPaths(inserted.quote_id)

    return { success: true, message: '発注書を作成しました' }
  } catch (error) {
    console.error('Standalone purchase order creation error:', error)
    return { success: false, message: '発注書の作成に失敗しました' }
  }
}

export async function requestPurchaseOrderApproval(purchaseOrderId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  try {
    const purchaseOrder = await fetchPurchaseOrderWithItems(supabase, purchaseOrderId)

    if (purchaseOrder.approval_status !== '承認待ち' && purchaseOrder.approval_status !== '下書き') {
      return { success: false, message: '承認依頼可能な状態ではありません' }
    }

    const requesterIsOwner = purchaseOrder.created_by === requester.id
    const requesterIsBackOffice = requester.role === '営業事務' || requester.role === '管理者'
    if (!requesterIsOwner && !requesterIsBackOffice) {
      return { success: false, message: 'この発注書の承認依頼権限がありません' }
    }

    const totalCost = Number(purchaseOrder.total_cost || 0)

    const { data: routesData, error: routesError } = await supabase
      .from('approval_routes')
      .select('id, name, requester_role, target_entity, min_total_amount, max_total_amount, is_active, steps:approval_route_steps(id, step_order, approver_role, notes)')
      .eq('is_active', true)
      .eq('target_entity', 'purchase_order')
      .order('min_total_amount', { ascending: true })

    if (routesError) throw routesError

    const sortedRoutes = (routesData || []).sort((a, b) => {
      const aMin = a.min_total_amount ?? 0
      const bMin = b.min_total_amount ?? 0
      return aMin - bMin
    })

    const matchedRoute = sortedRoutes.find((route) => {
      const matchesRole = !route.requester_role || route.requester_role === requester.role
      const matchesMin = route.min_total_amount == null || totalCost >= Number(route.min_total_amount)
      const matchesMax = route.max_total_amount == null || totalCost <= Number(route.max_total_amount)
      return matchesRole && matchesMin && matchesMax
    })

    if (!matchedRoute) {
      return { success: false, message: '該当する承認フローが見つかりません' }
    }

    const steps = [...((matchedRoute.steps || []) as ApprovalRouteStep[])].sort(
      (a, b) => a.step_order - b.step_order
    )

    if (steps.length === 0) {
      return { success: false, message: '承認フローのステップが設定されていません' }
    }

    const { data: existingInstance } = await supabase
      .from('purchase_order_approval_instances')
      .select('id, status')
      .eq('purchase_order_id', purchaseOrderId)
      .maybeSingle()

    if (existingInstance && existingInstance.status === 'pending') {
      return { success: false, message: '既に承認処理が進行中です' }
    }

    let instanceId: string | null = existingInstance?.id ?? null

    if (existingInstance) {
      await supabase
        .from('purchase_order_approval_instance_steps')
        .delete()
        .eq('instance_id', existingInstance.id)

      const { error: updateInstanceError } = await supabase
        .from('purchase_order_approval_instances')
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
        .from('purchase_order_approval_instances')
        .insert({
          purchase_order_id: purchaseOrderId,
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
      throw new Error('承認インスタンスの作成に失敗しました')
    }

    const stepRows = steps.map((step) => ({
      instance_id: instanceId,
      step_order: step.step_order,
      approver_role: step.approver_role,
      status: 'pending' as const,
    }))

    const { error: stepsInsertError } = await supabase
      .from('purchase_order_approval_instance_steps')
      .insert(stepRows)

    if (stepsInsertError) throw stepsInsertError

    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({
        approval_status: '承認待ち',
        status: '未発注',
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)

    if (poUpdateError) throw poUpdateError

    revalidatePurchaseOrderPaths(purchaseOrder.quote_id)

    return {
      success: true,
      message: `${matchedRoute.name} の承認フローに依頼を送信しました`,
    }
  } catch (error) {
    console.error('発注書承認依頼エラー:', error)
    return { success: false, message: '承認依頼の送信に失敗しました' }
  }
}

const fetchPurchaseOrderInstance = async (supabase: SupabaseClient, purchaseOrderId: string) => {
  const { data, error } = await supabase
    .from('purchase_order_approval_instances')
    .select(`
      id,
      status,
      current_step,
      purchase_order_id,
      route:approval_routes(name),
      steps:purchase_order_approval_instance_steps(
        id,
        step_order,
        approver_role,
        status
      )
    `)
    .eq('purchase_order_id', purchaseOrderId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as PurchaseOrderApprovalInstance | null
}

export async function approvePurchaseOrder(purchaseOrderId: string, userId: string) {
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

    const instance = await fetchPurchaseOrderInstance(supabase, purchaseOrderId)

    if (!instance || instance.status !== 'pending') {
      return { success: false, message: '承認待ちのフローが見つかりませんでした' }
    }

    const steps = [...(instance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    const currentStepOrder = instance.current_step ?? (steps[0]?.step_order ?? null)
    const currentStep = steps.find(
      (step) => step.step_order === currentStepOrder && step.status === 'pending'
    )

    if (!currentStep) {
      return { success: false, message: '承認対象のステップが見つかりませんでした' }
    }

    if (currentStep.approver_role !== approver.role) {
      return { success: false, message: `このステップは${currentStep.approver_role}が承認する必要があります` }
    }

    const now = new Date().toISOString()

    const { error: stepUpdateError } = await supabase
      .from('purchase_order_approval_instance_steps')
      .update({
        status: 'approved',
        approver_user_id: userId,
        decided_at: now,
      })
      .eq('id', currentStep.id)
      .eq('status', 'pending')

    if (stepUpdateError) throw stepUpdateError

    const remainingSteps = steps.filter(
      (step) => step.step_order > currentStep.step_order && step.status === 'pending'
    )

    if (remainingSteps.length > 0) {
      const nextStep = remainingSteps[0]
      const { error: instanceUpdateError } = await supabase
        .from('purchase_order_approval_instances')
        .update({
          current_step: nextStep.step_order,
          updated_at: now,
        })
        .eq('id', instance.id)

      if (instanceUpdateError) throw instanceUpdateError

      const purchaseOrder = await fetchPurchaseOrderWithItems(supabase, purchaseOrderId)
      revalidatePurchaseOrderPaths(purchaseOrder.quote_id)

      return {
        success: true,
        message: `承認しました。次の承認者は${nextStep.approver_role}です。`,
      }
    }

    const purchaseOrder = await fetchPurchaseOrderWithItems(supabase, purchaseOrderId)

    const { error: instanceCompleteError } = await supabase
      .from('purchase_order_approval_instances')
      .update({
        status: 'approved',
        current_step: null,
        updated_at: now,
      })
      .eq('id', instance.id)

    if (instanceCompleteError) throw instanceCompleteError

    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({
        approval_status: '承認済み',
        status: '未発注',
        approved_by: userId,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', purchaseOrderId)

    if (poUpdateError) throw poUpdateError

    await revertQuoteItemsToPending(supabase, purchaseOrder)

    revalidatePurchaseOrderPaths(purchaseOrder.quote_id)

    return { success: true, message: '発注書を承認しました' }
  } catch (error) {
    console.error('発注書承認エラー:', error)
    return { success: false, message: error instanceof Error ? error.message : '承認処理に失敗しました' }
  }
}

export async function rejectPurchaseOrder(purchaseOrderId: string, userId: string, rejectReason?: string) {
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

    const instance = await fetchPurchaseOrderInstance(supabase, purchaseOrderId)

    if (!instance || instance.status !== 'pending') {
      return { success: false, message: '却下対象の承認フローが見つかりませんでした' }
    }

    const steps = [...(instance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    const currentStepOrder = instance.current_step ?? (steps[0]?.step_order ?? null)
    const currentStep = steps.find(
      (step) => step.step_order === currentStepOrder && step.status === 'pending'
    )

    if (!currentStep) {
      return { success: false, message: '却下対象のステップが見つかりませんでした' }
    }

    if (currentStep.approver_role !== approver.role) {
      return { success: false, message: `このステップは${currentStep.approver_role}が処理する必要があります` }
    }

    const now = new Date().toISOString()

    const { error: stepRejectError } = await supabase
      .from('purchase_order_approval_instance_steps')
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
      .from('purchase_order_approval_instances')
      .update({
        status: 'rejected',
        current_step: null,
        rejection_reason: rejectReason || null,
        updated_at: now,
      })
      .eq('id', instance.id)

    if (instanceRejectError) throw instanceRejectError

    const purchaseOrder = await fetchPurchaseOrderWithItems(supabase, purchaseOrderId)

    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({
        approval_status: '却下',
        status: '未発注',
        approved_by: userId,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', purchaseOrderId)

    if (poUpdateError) throw poUpdateError

    await revertQuoteItemsToPending(supabase, purchaseOrder)

    revalidatePurchaseOrderPaths(purchaseOrder.quote_id)

    return { success: true, message: '発注書を却下しました' }
  } catch (error) {
    console.error('発注書却下エラー:', error)
    return { success: false, message: error instanceof Error ? error.message : '却下処理に失敗しました' }
  }
}

export async function cancelPurchaseOrderApproval(purchaseOrderId: string) {
  const supabase = await createClient()

  try {
    const purchaseOrder = await fetchPurchaseOrderWithItems(supabase, purchaseOrderId)

    const { data: instance } = await supabase
      .from('purchase_order_approval_instances')
      .select('id')
      .eq('purchase_order_id', purchaseOrderId)
      .maybeSingle()

    if (instance) {
      await supabase
        .from('purchase_order_approval_instance_steps')
        .delete()
        .eq('instance_id', instance.id)

      await supabase
        .from('purchase_order_approval_instances')
        .update({
          status: 'cancelled',
          current_step: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)
    }

    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({
        approval_status: '下書き',
        status: '未発注',
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)

    if (poUpdateError) throw poUpdateError

    await revertQuoteItemsToPending(supabase, purchaseOrder)

    revalidatePurchaseOrderPaths(purchaseOrder.quote_id)

    return { success: true, message: '発注書を下書きに戻しました' }
  } catch (error) {
    console.error('発注書承認キャンセルエラー:', error)
    return { success: false, message: '下書きに戻す処理に失敗しました' }
  }
}
