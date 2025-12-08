import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TicketStatusBadge } from '@/components/knowledge/ticket-status-badge'
import { type TicketStatus } from '@/types/knowledge'
import {
  Ticket,
  BookOpen,
  ArrowRight,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

export default async function PortalHomePage() {
  const session = await getPortalSession()

  if (!session) {
    redirect('/portal/login')
  }

  const customerId = session.invite?.customer_id
  const customerName = session.invite?.customer?.name || 'お客様'
  const groupCompanyId = session.invite?.customer?.group_company_id

  const supabase = await createClient()

  // 顧客のチケット取得
  const { data: tickets } = await supabase
    .from('knowledge_tickets')
    .select(`
      id,
      ticket_number,
      subject,
      status,
      priority,
      created_at,
      updated_at
    `)
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false })
    .limit(5)

  // 公開ナレッジ取得
  const { data: articles } = await supabase
    .from('knowledge_base')
    .select('id, title, category, view_count, updated_at')
    .eq('is_published', true)
    .in('visibility', ['customer', 'public'])
    .order('view_count', { ascending: false })
    .limit(5)

  // 統計
  const { data: allTickets } = await supabase
    .from('knowledge_tickets')
    .select('id, status')
    .eq('customer_id', customerId)

  const openCount = allTickets?.filter((t) => 
    ['open', 'in_progress', 'pending'].includes(t.status)
  ).length || 0

  return (
    <div className="space-y-6">
      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-purple-600 to-teal-500 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          こんにちは、{customerName}様
        </h1>
        <p className="text-purple-100">
          カスタマーポータルへようこそ。お問い合わせの確認やナレッジベースの閲覧ができます。
        </p>
      </div>

      {/* クイックステータス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              対応中のチケット
            </CardTitle>
            <Ticket className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{openCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              総チケット数
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {allTickets?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              ナレッジ記事
            </CardTitle>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {articles?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近のチケット */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>最近のお問い合わせ</CardTitle>
                <CardDescription>直近のチケット状況</CardDescription>
              </div>
              <Link href="/portal/tickets">
                <Button variant="ghost" size="sm" className="gap-1">
                  すべて表示
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tickets && tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/portal/tickets/${ticket.id}`}
                    className="block"
                  >
                    <div className="p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{ticket.ticket_number}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(ticket.updated_at), {
                                addSuffix: true,
                                locale: ja,
                              })}
                            </span>
                          </div>
                        </div>
                        <TicketStatusBadge status={ticket.status as TicketStatus} size="sm" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>お問い合わせはまだありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ナレッジベース */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ナレッジベース</CardTitle>
                <CardDescription>よく閲覧されている記事</CardDescription>
              </div>
              <Link href="/portal/knowledge">
                <Button variant="ghost" size="sm" className="gap-1">
                  すべて表示
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {articles && articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/portal/knowledge/${article.id}`}
                    className="block"
                  >
                    <div className="p-3 rounded-lg border hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
                      <p className="font-medium text-gray-900">{article.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {article.category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {article.view_count} 閲覧
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>公開中の記事はありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
