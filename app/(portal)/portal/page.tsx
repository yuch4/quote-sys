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
  Sparkles,
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
    <div className="space-y-8">
      {/* ウェルカムセクション */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(0.22_0.04_250)] via-[oklch(0.28_0.05_245)] to-[oklch(0.20_0.06_255)] p-8 md:p-10 text-white shadow-2xl shadow-black/10">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[oklch(0.65_0.12_195_/_0.4)] to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-[oklch(0.75_0.12_85_/_0.3)] to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
        </div>
        <div className="relative flex items-start gap-6">
          <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm items-center justify-center border border-white/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              こんにちは、{customerName}様
            </h1>
            <p className="text-white/70 text-lg max-w-xl">
              カスタマーポータルへようこそ。お問い合わせの確認やナレッジベースの閲覧ができます。
            </p>
          </div>
        </div>
      </div>

      {/* クイックステータス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.12_195_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              対応中のチケット
            </CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.65_0.12_195_/_0.1)]">
              <Ticket className="h-5 w-5 text-[oklch(0.55_0.18_195)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[oklch(0.55_0.18_195)]">{openCount}</div>
            <p className="text-xs text-muted-foreground mt-1">オープン状態</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.18_145_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総チケット数
            </CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.65_0.18_145_/_0.1)]">
              <MessageSquare className="h-5 w-5 text-[oklch(0.55_0.18_145)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[oklch(0.55_0.18_145)]">
              {allTickets?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">累計お問い合わせ</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.75_0.12_85_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ナレッジ記事
            </CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.75_0.12_85_/_0.1)]">
              <BookOpen className="h-5 w-5 text-[oklch(0.65_0.15_85)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[oklch(0.65_0.15_85)]">
              {articles?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">公開中の記事</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近のチケット */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">最近のお問い合わせ</CardTitle>
                <CardDescription>直近のチケット状況</CardDescription>
              </div>
              <Link href="/portal/tickets">
                <Button variant="ghost" size="sm" className="gap-2 text-[oklch(0.55_0.18_195)] hover:text-[oklch(0.45_0.18_195)] hover:bg-[oklch(0.65_0.12_195_/_0.1)]">
                  すべて表示
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {tickets && tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket, index) => (
                  <Link
                    key={ticket.id}
                    href={`/portal/tickets/${ticket.id}`}
                    className="block"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="p-4 rounded-xl border border-border/50 hover:border-[oklch(0.65_0.12_195_/_0.5)] hover:bg-muted/50 transition-all duration-200 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate group-hover:text-[oklch(0.55_0.18_195)] transition-colors">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="font-mono">{ticket.ticket_number}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Ticket className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">お問い合わせはまだありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ナレッジベース */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">ナレッジベース</CardTitle>
                <CardDescription>よく閲覧されている記事</CardDescription>
              </div>
              <Link href="/portal/knowledge">
                <Button variant="ghost" size="sm" className="gap-2 text-[oklch(0.65_0.15_85)] hover:text-[oklch(0.55_0.15_85)] hover:bg-[oklch(0.75_0.12_85_/_0.1)]">
                  すべて表示
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {articles && articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/portal/knowledge/${article.id}`}
                    className="block"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="p-4 rounded-xl border border-border/50 hover:border-[oklch(0.75_0.12_85_/_0.5)] hover:bg-muted/50 transition-all duration-200 group">
                      <p className="font-semibold text-foreground group-hover:text-[oklch(0.55_0.15_85)] transition-colors">{article.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs bg-muted/50">
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">公開中の記事はありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
