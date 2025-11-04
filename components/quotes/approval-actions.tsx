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
import { requestApproval, approveQuote, rejectQuote, returnToDraft } from '@/app/(dashboard)/dashboard/quotes/[id]/actions'
import type { QuoteApprovalInstance, QuoteApprovalInstanceStep } from '@/types/database'

interface ApprovalActionsProps {
  quoteId: string
  approvalStatus: string
  currentUserId: string
  currentUserRole: string
  createdBy: string
  approvalInstance?: QuoteApprovalInstance | null
}

export function ApprovalActions({
  quoteId,
  approvalStatus,
  currentUserId,
  currentUserRole,
  createdBy,
  approvalInstance,
}: ApprovalActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleRequestApproval = async () => {
    setLoading(true)
    const result = await requestApproval(quoteId)
    alert(result.message)
    setLoading(false)
  }

  const handleApprove = async () => {
    setLoading(true)
    const result = await approveQuote(quoteId, currentUserId)
    const message = result?.message || (result.success ? '承認処理が完了しました' : '承認処理に失敗しました')
    alert(message)
    setLoading(false)
  }

  const handleReject = async () => {
    const reason = window.prompt('却下理由（任意）を入力してください') || undefined
    setLoading(true)
    const result = await rejectQuote(quoteId, currentUserId, reason)
    alert(result.message)
    setLoading(false)
  }

  const handleReturnToDraft = async () => {
    setLoading(true)
    const result = await returnToDraft(quoteId)
    alert(result.message)
    setLoading(false)
  }

  // 営業担当者：下書きの場合のみ承認依頼可能
  const canRequestApproval = approvalStatus === '下書き' && currentUserId === createdBy

  // 営業事務/管理者：承認待ちの場合に承認・却下可能
  const pendingStep: QuoteApprovalInstanceStep | undefined = (() => {
    if (!approvalInstance || approvalInstance.status !== 'pending') return undefined
    const steps = [...(approvalInstance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    return steps.find(
      (step) =>
        step.status === 'pending' &&
        step.step_order === (approvalInstance.current_step ?? steps[0]?.step_order)
    )
  })()

  const canApprove =
    approvalStatus === '承認待ち' &&
    pendingStep != null &&
    pendingStep.approver_role === currentUserRole

  // 作成者：却下された場合に下書きに戻せる
  const canReturnToDraft = approvalStatus === '却下' && currentUserId === createdBy

  const routeName = Array.isArray(approvalInstance?.route)
    ? approvalInstance?.route[0]?.name
    : approvalInstance?.route?.name
  const nextRoleLabel =
    pendingStep && approvalInstance?.status === 'pending'
      ? `現在の承認担当: ${pendingStep.approver_role}`
      : approvalInstance?.status === 'approved'
        ? '承認完了'
        : approvalInstance?.status === 'rejected'
          ? '却下済み'
          : approvalInstance?.status === 'cancelled'
            ? '承認フローはキャンセルされています'
            : undefined
  const missingStepWarning =
    approvalStatus === '承認待ち' &&
    approvalInstance?.status === 'pending' &&
    !pendingStep
      ? '承認ステップが判定できません。フロー設定を確認してください。'
      : undefined

  return (
    <div className="flex gap-2">
      {canRequestApproval && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={loading}>承認依頼</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>承認依頼</AlertDialogTitle>
              <AlertDialogDescription>
                この見積の承認を依頼します。よろしいですか?
                <br />
                承認依頼後は編集できなくなります。
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={loading}>承認</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>見積を承認</AlertDialogTitle>
                <AlertDialogDescription>
                  この見積を承認します。よろしいですか?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove}>承認する</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                却下
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>見積を却下</AlertDialogTitle>
                <AlertDialogDescription>
                  この見積を却下します。よろしいですか?
                  <br />
                  却下後、作成者は下書きに戻して再編集できます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} className="bg-red-600 hover:bg-red-700">
                  却下する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {canReturnToDraft && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={loading}>
              下書きに戻す
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>下書きに戻す</AlertDialogTitle>
              <AlertDialogDescription>
                この見積を下書き状態に戻します。よろしいですか?
                <br />
                下書きに戻すと、再度編集できるようになります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleReturnToDraft}>下書きに戻す</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {routeName && (
        <div className="px-3 py-2 border rounded-md text-sm text-gray-600 bg-muted/50">
          <div className="font-medium text-gray-800">承認フロー: {routeName}</div>
          {nextRoleLabel ? <div>{nextRoleLabel}</div> : null}
          {missingStepWarning ? <div className="text-red-600">{missingStepWarning}</div> : null}
        </div>
      )}
    </div>
  )
}
