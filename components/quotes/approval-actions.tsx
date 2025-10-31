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

interface ApprovalActionsProps {
  quoteId: string
  approvalStatus: string
  currentUserId: string
  currentUserRole: string
  createdBy: string
}

export function ApprovalActions({
  quoteId,
  approvalStatus,
  currentUserId,
  currentUserRole,
  createdBy,
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
    alert(result.message)
    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    const result = await rejectQuote(quoteId, currentUserId)
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
  const canApprove = approvalStatus === '承認待ち' && (currentUserRole === '営業事務' || currentUserRole === '管理者')

  // 作成者：却下された場合に下書きに戻せる
  const canReturnToDraft = approvalStatus === '却下' && currentUserId === createdBy

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
    </div>
  )
}
