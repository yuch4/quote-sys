'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  requestPurchaseOrderApproval,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  cancelPurchaseOrderApproval,
} from '@/app/(dashboard)/dashboard/procurement/purchase-orders/actions'
import type { PurchaseOrderApprovalInstance, PurchaseOrderApprovalInstanceStep, ApprovalStatus, PurchaseOrderStatus } from '@/types/database'

interface PurchaseOrderApprovalActionsProps {
  purchaseOrderId: string
  approvalStatus: ApprovalStatus
  purchaseOrderStatus: PurchaseOrderStatus
  currentUserId: string
  currentUserRole: string
  createdBy: string
  approvalInstance?: PurchaseOrderApprovalInstance | null
}

export function PurchaseOrderApprovalActions({
  purchaseOrderId,
  approvalStatus,
  purchaseOrderStatus,
  currentUserId,
  currentUserRole,
  createdBy,
  approvalInstance,
}: PurchaseOrderApprovalActionsProps) {
  const [loading, setLoading] = useState(false)
  const [isTransitioning, startTransition] = useTransition()

  const pendingStep: PurchaseOrderApprovalInstanceStep | undefined = (() => {
    if (!approvalInstance || approvalInstance.status !== 'pending') return undefined
    const steps = [...(approvalInstance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    const currentStepOrder = approvalInstance.current_step ?? (steps[0]?.step_order ?? null)
    return steps.find(
      (step) => step.status === 'pending' && step.step_order === currentStepOrder
    )
  })()

  const isBackOffice = currentUserRole === '営業事務' || currentUserRole === '管理者'
  const pendingApprovalInProgress = approvalInstance?.status === 'pending'
  const route = approvalInstance ? (Array.isArray(approvalInstance.route) ? approvalInstance.route[0] : approvalInstance.route) : null

  const canRequestApproval =
    (approvalStatus === '下書き' || approvalStatus === '却下' || (approvalStatus === '承認待ち' && !pendingApprovalInProgress)) &&
    (currentUserId === createdBy || isBackOffice)

  const canApprove =
    approvalStatus === '承認待ち' &&
    pendingStep != null &&
    pendingStep.approver_role === currentUserRole

  const canReturnToDraft =
    (approvalStatus === '却下' || approvalStatus === '承認待ち') &&
    (currentUserId === createdBy || isBackOffice)

  const handleRequestApproval = async () => {
    startTransition(async () => {
      setLoading(true)
      const result = await requestPurchaseOrderApproval(purchaseOrderId)
      if (result.success) {
        toast.success(result.message)
        toast.message('通知（準備中）', {
          description: '承認者への通知配信は今後拡張予定です。',
        })
      } else {
        toast.error(result.message)
      }
      setLoading(false)
    })
  }

  const handleApprove = async () => {
    startTransition(async () => {
      setLoading(true)
      const result = await approvePurchaseOrder(purchaseOrderId, currentUserId)
      if (result.success) {
        toast.success(result.message)
        toast.message('通知（準備中）', {
          description: '次の承認者へ通知する機能を今後追加予定です。',
        })
      } else {
        toast.error(result.message)
      }
      setLoading(false)
    })
  }

  const handleReject = async () => {
    const reason = window.prompt('却下理由（任意）を入力してください') || undefined
    startTransition(async () => {
      setLoading(true)
      const result = await rejectPurchaseOrder(purchaseOrderId, currentUserId, reason)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      setLoading(false)
    })
  }

  const handleReturnToDraft = async () => {
    if (!confirm('承認フローをリセットして下書きに戻しますか？')) return
    startTransition(async () => {
      setLoading(true)
      const result = await cancelPurchaseOrderApproval(purchaseOrderId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      setLoading(false)
    })
  }

  const statusLabel = (() => {
    switch (approvalStatus) {
      case '下書き': return '下書き'
      case '承認待ち': return '承認待ち'
      case '承認済み': return '承認済み'
      case '却下': return '却下'
      default: return approvalStatus
    }
  })()

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-gray-600">
        承認ステータス: {statusLabel} / 発注ステータス: {purchaseOrderStatus}
        {route?.name ? ` / フロー: ${route.name}` : ''}
        {pendingStep && approvalInstance?.status === 'pending'
          ? ` / 現在の承認担当: ${pendingStep.approver_role}`
          : ''}
      </div>
      <div className="flex gap-2">
        {canRequestApproval && (
          <Button size="sm" disabled={loading || isTransitioning} onClick={handleRequestApproval}>
            承認依頼
          </Button>
        )}

        {canApprove && (
          <>
            <Button size="sm" disabled={loading || isTransitioning} onClick={handleApprove}>
              承認
            </Button>
            <Button size="sm" variant="destructive" disabled={loading || isTransitioning} onClick={handleReject}>
              却下
            </Button>
          </>
        )}

        {canReturnToDraft && (
          <Button size="sm" variant="outline" disabled={loading || isTransitioning} onClick={handleReturnToDraft}>
            下書きに戻す
          </Button>
        )}
      </div>
    </div>
  )
}
