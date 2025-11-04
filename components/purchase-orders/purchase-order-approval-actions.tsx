'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
    setLoading(true)
    const result = await requestPurchaseOrderApproval(purchaseOrderId)
    alert(result.message)
    setLoading(false)
  }

  const handleApprove = async () => {
    setLoading(true)
    const result = await approvePurchaseOrder(purchaseOrderId, currentUserId)
    alert(result.message)
    setLoading(false)
  }

  const handleReject = async () => {
    const reason = window.prompt('却下理由（任意）を入力してください') || undefined
    setLoading(true)
    const result = await rejectPurchaseOrder(purchaseOrderId, currentUserId, reason)
    alert(result.message)
    setLoading(false)
  }

  const handleReturnToDraft = async () => {
    if (!confirm('承認フローをリセットして下書きに戻しますか？')) return
    setLoading(true)
    const result = await cancelPurchaseOrderApproval(purchaseOrderId)
    alert(result.message)
    setLoading(false)
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={loading}>
                承認依頼
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>発注書の承認依頼</AlertDialogTitle>
                <AlertDialogDescription>
                  この発注書の承認フローを開始します。よろしいですか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleRequestApproval}>承認依頼を送信</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canApprove && (
          <>
            <Button size="sm" disabled={loading} onClick={handleApprove}>
              承認
            </Button>
            <Button size="sm" variant="destructive" disabled={loading} onClick={handleReject}>
              却下
            </Button>
          </>
        )}

        {canReturnToDraft && (
          <Button size="sm" variant="outline" disabled={loading} onClick={handleReturnToDraft}>
            下書きに戻す
          </Button>
        )}
      </div>
    </div>
  )
}
