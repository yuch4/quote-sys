import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TicketStatusBadge } from '@/components/knowledge/ticket-status-badge'
import { TicketPriorityBadge } from '@/components/knowledge/ticket-priority-badge'
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '@/types/knowledge'
import { Search, Ticket, ArrowLeft, Clock, Filter } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
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

interface SearchParams {
  status?: string
  search?: string
}

export default async function PortalTicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const session = await getPortalSession()

  if (!session) {
    redirect('/portal/login')
  }

  const customerId = session.invite?.customer_id
  const supabase = await createClient()

  let query = supabase
    .from('knowledge_tickets')
    .select(`
      id,
      ticket_number,
      subject,
      status,
      priority,
      category,
      created_at,
      updated_at
    `)
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params.search) {
    query = query.or(`subject.ilike.%${params.search}%,ticket_number.ilike.%${params.search}%`)
  }

  const { data: tickets } = await query

  // 統計
  const { data: allTickets } = await supabase
    .from('knowledge_tickets')
    .select('id, status')
    .eq('customer_id', customerId)

  const statusCounts = {
    all: allTickets?.length || 0,
    open: allTickets?.filter((t) => t.status === 'open').length || 0,
    in_progress: allTickets?.filter((t) => t.status === 'in_progress').length || 0,
    pending: allTickets?.filter((t) => t.status === 'pending').length || 0,
    resolved: allTickets?.filter((t) => t.status === 'resolved').length || 0,
    closed: allTickets?.filter((t) => t.status === 'closed').length || 0,
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">お問い合わせ一覧</h1>
          <p className="text-sm text-gray-500 mt-1">
            これまでのお問い合わせを確認できます
          </p>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  name="search"
                  placeholder="チケット番号、件名で検索..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'open', 'in_progress', 'pending', 'resolved', 'closed'] as const).map(
                (status) => (
                  <Link
                    key={status}
                    href={`/portal/tickets?status=${status}${params.search ? `&search=${params.search}` : ''}`}
                  >
                    <Badge
                      variant={params.status === status || (!params.status && status === 'all') ? 'default' : 'outline'}
                      className="cursor-pointer"
                    >
                      {status === 'all' ? 'すべて' : TICKET_STATUS_LABELS[status]}
                      <span className="ml-1 text-xs">({statusCounts[status]})</span>
                    </Badge>
                  </Link>
                )
              )}
            </div>
            <Button type="submit" variant="secondary" className="gap-2">
              <Search className="h-4 w-4" />
              検索
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* チケット一覧 */}
      {tickets && tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/portal/tickets/${ticket.id}`}
              className="block"
            >
              <Card className="hover:border-purple-300 hover:shadow-sm transition-all">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500 font-mono">
                          {ticket.ticket_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {TICKET_CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          作成: {format(new Date(ticket.created_at), 'yyyy/MM/dd', { locale: ja })}
                        </span>
                        <span>
                          更新: {formatDistanceToNow(new Date(ticket.updated_at), {
                            addSuffix: true,
                            locale: ja,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <TicketStatusBadge status={ticket.status as TicketStatus} />
                      <TicketPriorityBadge priority={ticket.priority as TicketPriority} size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {params.search || params.status
                ? '条件に一致するチケットがありません'
                : 'お問い合わせはまだありません'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
