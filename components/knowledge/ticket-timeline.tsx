'use client'

import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { TicketComment, TicketAttachment } from '@/types/knowledge'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Lock,
  Paperclip,
} from 'lucide-react'
import { AttachmentList } from '@/components/knowledge/file-preview'

interface TicketTimelineProps {
  comments: TicketComment[]
  ticketCreatedAt: string
  ticketCreatedBy: {
    display_name: string
  }
  isCustomerPortal?: boolean
}

export function TicketTimeline({
  comments,
  ticketCreatedAt,
  ticketCreatedBy,
  isCustomerPortal = false,
}: TicketTimelineProps) {
  // 顧客ポータルでは内部コメントを非表示
  const visibleComments = isCustomerPortal
    ? comments.filter((c) => !c.is_internal)
    : comments

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative space-y-0">
      {/* タイムライン線 */}
      <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200" />

      {/* チケット作成イベント */}
      <div className="relative flex gap-4 pb-8">
        <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg ring-4 ring-white">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">チケット作成</span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(ticketCreatedAt), {
                addSuffix: true,
                locale: ja,
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {ticketCreatedBy.display_name} がチケットを作成しました
          </p>
        </div>
      </div>

      {/* コメント */}
      {visibleComments.map((comment, index) => {
        const isInternal = comment.is_internal
        const authorName = comment.user?.display_name || comment.customer_session?.customer_name || '不明'
        const isStaff = !!comment.user_id

        return (
          <div key={comment.id} className="relative flex gap-4 pb-8">
            <div
              className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-4 ring-white',
                isInternal
                  ? 'bg-amber-500 text-white'
                  : isStaff
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback
                  className={cn(
                    isInternal
                      ? 'bg-amber-500 text-white'
                      : isStaff
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-500 text-white'
                  )}
                >
                  {getInitials(authorName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 pt-1">
              <div
                className={cn(
                  'rounded-lg border p-4 shadow-sm transition-all hover:shadow-md',
                  isInternal
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-gray-200'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900">{authorName}</span>
                  {isInternal && (
                    <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-100">
                      <Lock className="h-3 w-3" />
                      社内メモ
                    </Badge>
                  )}
                  {!isStaff && (
                    <Badge variant="outline" className="text-gray-600">
                      顧客
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500 ml-auto">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </div>

                {/* 添付ファイル */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                      <Paperclip className="h-4 w-4" />
                      添付ファイル ({comment.attachments.length})
                    </div>
                    <AttachmentList attachments={comment.attachments} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* コメントがない場合 */}
      {visibleComments.length === 0 && (
        <div className="relative flex gap-4 pb-8">
          <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-500 shadow-lg ring-4 ring-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1 pt-2">
            <p className="text-sm text-gray-500 italic">
              まだコメントはありません
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
