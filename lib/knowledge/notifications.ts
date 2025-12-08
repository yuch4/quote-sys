import { createClient } from '@/lib/supabase/server'
import type { KnowledgeTicket, TicketComment } from '@/types/knowledge'

type NotificationType =
  | 'チケット作成'
  | 'チケット更新'
  | 'チケット完了'
  | 'チケットコメント'
  | 'チケット担当割当'

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
}

// 通知作成
export async function createNotification(input: CreateNotificationInput) {
  const supabase = await createClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link_url: input.linkUrl,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}

// チケット作成通知
export async function notifyTicketCreated(ticket: KnowledgeTicket) {
  const supabase = await createClient()

  // 営業事務・管理者に通知
  const { data: staffUsers } = await supabase
    .from('users')
    .select('id')
    .in('role', ['営業事務', '管理者'])
    .eq('is_active', true)

  if (staffUsers) {
    for (const user of staffUsers) {
      if (user.id !== ticket.created_by) {
        await createNotification({
          userId: user.id,
          type: 'チケット作成',
          title: '新規チケット',
          message: `[${ticket.ticket_number}] ${ticket.title}`,
          linkUrl: `/dashboard/knowledge/tickets/${ticket.id}`,
        })
      }
    }
  }
}

// チケット担当者割当通知
export async function notifyTicketAssigned(ticket: KnowledgeTicket, assignedBy: string) {
  if (!ticket.assigned_to) return

  await createNotification({
    userId: ticket.assigned_to,
    type: 'チケット担当割当',
    title: 'チケット担当割当',
    message: `[${ticket.ticket_number}] ${ticket.title} の担当者に割り当てられました`,
    linkUrl: `/dashboard/knowledge/tickets/${ticket.id}`,
  })
}

// チケット更新通知
export async function notifyTicketUpdated(
  ticket: KnowledgeTicket,
  updatedBy: string,
  changes: string
) {
  const notifyUsers = new Set<string>()

  // 作成者に通知
  if (ticket.created_by !== updatedBy) {
    notifyUsers.add(ticket.created_by)
  }

  // 担当者に通知
  if (ticket.assigned_to && ticket.assigned_to !== updatedBy) {
    notifyUsers.add(ticket.assigned_to)
  }

  for (const userId of notifyUsers) {
    await createNotification({
      userId,
      type: 'チケット更新',
      title: 'チケット更新',
      message: `[${ticket.ticket_number}] ${ticket.title} - ${changes}`,
      linkUrl: `/dashboard/knowledge/tickets/${ticket.id}`,
    })
  }
}

// チケット完了通知
export async function notifyTicketResolved(ticket: KnowledgeTicket, resolvedBy: string) {
  const notifyUsers = new Set<string>()

  // 作成者に通知
  if (ticket.created_by !== resolvedBy) {
    notifyUsers.add(ticket.created_by)
  }

  for (const userId of notifyUsers) {
    await createNotification({
      userId,
      type: 'チケット完了',
      title: 'チケット解決',
      message: `[${ticket.ticket_number}] ${ticket.title} が解決されました`,
      linkUrl: `/dashboard/knowledge/tickets/${ticket.id}`,
    })
  }
}

// コメント追加通知
export async function notifyCommentAdded(
  ticket: KnowledgeTicket,
  comment: TicketComment,
  commentBy: string
) {
  // 社内メモは通知しない（または担当者のみに通知）
  if (comment.is_internal) {
    if (ticket.assigned_to && ticket.assigned_to !== commentBy) {
      await createNotification({
        userId: ticket.assigned_to,
        type: 'チケットコメント',
        title: '社内メモ追加',
        message: `[${ticket.ticket_number}] ${ticket.title} に社内メモが追加されました`,
        linkUrl: `/dashboard/knowledge/tickets/${ticket.id}`,
      })
    }
    return
  }

  const notifyUsers = new Set<string>()

  // 作成者に通知
  if (ticket.created_by !== commentBy) {
    notifyUsers.add(ticket.created_by)
  }

  // 担当者に通知
  if (ticket.assigned_to && ticket.assigned_to !== commentBy) {
    notifyUsers.add(ticket.assigned_to)
  }

  for (const userId of notifyUsers) {
    await createNotification({
      userId,
      type: 'チケットコメント',
      title: 'コメント追加',
      message: `[${ticket.ticket_number}] ${ticket.title} にコメントが追加されました`,
      linkUrl: `/dashboard/knowledge/tickets/${ticket.id}`,
    })
  }
}
