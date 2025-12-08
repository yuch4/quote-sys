import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TicketStatusBadge } from '@/components/knowledge/ticket-status-badge'
import { TicketPriorityBadge } from '@/components/knowledge/ticket-priority-badge'
import { TicketTimeline } from '@/components/knowledge/ticket-timeline'
import {
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  type TicketComment,
} from '@/types/knowledge'
import { ArrowLeft, Calendar, User, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

async function getPortalSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('portal_session')?.value

  if (!sessionToken) {
    return null
  }

  const supabase = await createClient()
  
  const { data: session } = await supabase
    .from('customer_portal_sessions')
    .select(`
      *,
      invite:customer_portal_invites(
        customer_id,
        customer:customers(id, name, email, group_company_id)
      )
    `)
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  return session
}

interface PageParams {
  id: string
}

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = await params
  const session = await getPortalSession()

  if (!session) {
    redirect('/portal/login')
  }

  const customerId = session.invite?.customer_id
  const supabase = await createClient()

  // チケット取得（顧客のものかチェック）
  const { data: ticket, error } = await supabase
    .from('knowledge_tickets')
    .select(`
      *,
      assigned_to_user:users!knowledge_tickets_assigned_to_fkey(display_name)
    `)
    .eq('id', id)
    .eq('customer_id', customerId)
    .single()

  if (error || !ticket) {
    notFound()
  }

  // 顧客向けコメントのみ取得（公開コメント）
  const { data: comments } = await supabase
    .from('ticket_comments')
    .select(`
      id,
      content,
      is_internal,
      created_at,
      user:users(display_name)
    `)
    .eq('ticket_id', id)
    .eq('is_internal', false) // 公開コメントのみ
    .order('created_at', { ascending: true })

  // 顧客ポータル用にコメントを変換
  const portalComments: TicketComment[] = (comments || []).map((c) => ({
    id: c.id,
    ticket_id: id,
    user_id: '',
    content: c.content,
    is_internal: false,
    created_at: c.created_at,
    user: c.user as { display_name: string } | null,
  }))

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/portal/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500 font-mono">
              {ticket.ticket_number}
            </span>
            <Badge variant="outline" className="text-xs">
              {TICKET_CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
        </div>
        <div className="flex items-center gap-2">
          <TicketPriorityBadge priority={ticket.priority as TicketPriority} />
          <TicketStatusBadge status={ticket.status as TicketStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 説明 */}
          <Card>
            <CardHeader>
              <CardTitle>お問い合わせ内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">
                  {ticket.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 対応履歴 */}
          <Card>
            <CardHeader>
              <CardTitle>対応履歴</CardTitle>
              <CardDescription>
                担当者からの回答が表示されます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portalComments.length > 0 ? (
                <TicketTimeline comments={portalComments} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>まだ回答がありません</p>
                  <p className="text-sm mt-1">担当者からの回答をお待ちください</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* チケット情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">チケット情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  担当者
                </span>
                <span className="font-medium">
                  {ticket.assigned_to_user?.display_name || '未割当'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  作成日
                </span>
                <span>
                  {format(new Date(ticket.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  更新日
                </span>
                <span>
                  {format(new Date(ticket.updated_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">解決日</span>
                  <span className="text-green-600">
                    {format(new Date(ticket.resolved_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 進捗ステータス */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">進捗状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(['open', 'in_progress', 'pending', 'resolved', 'closed'] as const).map(
                  (status, index) => {
                    const isActive = ticket.status === status
                    const isPast = ['open', 'in_progress', 'pending', 'resolved', 'closed']
                      .indexOf(ticket.status as TicketStatus) >= index
                    
                    return (
                      <div
                        key={status}
                        className={`flex items-center gap-3 ${
                          isActive ? 'text-purple-600 font-medium' : isPast ? 'text-gray-600' : 'text-gray-300'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isActive
                              ? 'bg-purple-600'
                              : isPast
                              ? 'bg-gray-400'
                              : 'bg-gray-200'
                          }`}
                        />
                        <span>
                          {status === 'open' && '受付'}
                          {status === 'in_progress' && '対応中'}
                          {status === 'pending' && '保留'}
                          {status === 'resolved' && '解決'}
                          {status === 'closed' && '完了'}
                        </span>
                      </div>
                    )
                  }
                )}
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500">
            <p>ご不明な点がございましたら</p>
            <p>担当者にお問い合わせください</p>
          </div>
        </div>
      </div>
    </div>
  )
}
