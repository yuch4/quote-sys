import { createClient } from '@/lib/supabase/server'
import { getTicketStats } from '@/lib/knowledge/tickets'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TicketStatusBadge } from '@/components/knowledge/ticket-status-badge'
import { TicketPriorityBadge } from '@/components/knowledge/ticket-priority-badge'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_BORDER_COLORS,
  type TicketCategory,
} from '@/types/knowledge'
import {
  Ticket,
  BookOpen,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default async function KnowledgeDashboardPage() {
  const supabase = await createClient()

  // 統計データ取得
  const stats = await getTicketStats()

  // 最近のチケット取得
  const { data: recentTickets } = await supabase
    .from('knowledge_tickets')
    .select(`
      *,
      customer:customers(customer_name),
      group_company:group_companies(company_name),
      assigned_user:users!knowledge_tickets_assigned_to_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // 緊急・高優先度チケット
  const { data: urgentTickets } = await supabase
    .from('knowledge_tickets')
    .select(`
      *,
      customer:customers(customer_name),
      group_company:group_companies(company_name)
    `)
    .in('priority', ['urgent', 'high'])
    .not('status', 'in', '("resolved","closed")')
    .order('created_at', { ascending: false })
    .limit(5)

  // 最近のナレッジ記事
  const { data: recentKnowledge } = await supabase
    .from('knowledge_base')
    .select('id, title, category, view_count, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ナレッジ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            顧客からの問い合わせとナレッジベースを管理します
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/knowledge/tickets/new">
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4" />
              新規チケット
            </Button>
          </Link>
          <Link href="/dashboard/knowledge/base/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              新規ナレッジ
            </Button>
          </Link>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">未対応</CardTitle>
            <Ticket className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.open}</div>
            <p className="text-xs text-gray-500 mt-1">件の問い合わせ</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">対応中</CardTitle>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.in_progress}</div>
            <p className="text-xs text-gray-500 mt-1">件が進行中</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">緊急</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
            <p className="text-xs text-gray-500 mt-1">件の緊急案件</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">解決済み</CardTitle>
            <CheckCircle className="h-5 w-5 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">{stats.resolved}</div>
            <p className="text-xs text-gray-500 mt-1">件が解決</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-gray-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">合計</CardTitle>
            <TrendingUp className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-700">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">件の累計</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 緊急・高優先度チケット */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                要対応チケット
              </CardTitle>
              <CardDescription>緊急・高優先度の未解決チケット</CardDescription>
            </div>
            <Link href="/dashboard/knowledge/tickets?priority=urgent">
              <Button variant="ghost" size="sm">
                すべて表示
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {urgentTickets && urgentTickets.length > 0 ? (
              <div className="space-y-3">
                {urgentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/knowledge/tickets/${ticket.id}`}
                    className={cn(
                      'block p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors',
                      TICKET_PRIORITY_BORDER_COLORS[ticket.priority as keyof typeof TICKET_PRIORITY_BORDER_COLORS]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-sm text-gray-500">
                          {ticket.customer?.customer_name || ticket.group_company?.company_name || '未設定'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <TicketPriorityBadge priority={ticket.priority} size="sm" />
                        <TicketStatusBadge status={ticket.status} size="sm" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                緊急・高優先度のチケットはありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* 最近のチケット */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-500" />
                最近のチケット
              </CardTitle>
              <CardDescription>新しく作成されたチケット</CardDescription>
            </div>
            <Link href="/dashboard/knowledge/tickets">
              <Button variant="ghost" size="sm">
                すべて表示
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTickets && recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/knowledge/tickets/${ticket.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-500">
                            {ticket.ticket_number}
                          </span>
                          <TicketStatusBadge status={ticket.status} size="sm" />
                        </div>
                        <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: ja,
                          })}
                          {ticket.assigned_user && (
                            <span> · 担当: {ticket.assigned_user.display_name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                チケットはまだありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* 人気のナレッジ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                ナレッジベース
              </CardTitle>
              <CardDescription>よく閲覧されているナレッジ記事</CardDescription>
            </div>
            <Link href="/dashboard/knowledge/base">
              <Button variant="ghost" size="sm">
                すべて表示
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentKnowledge && recentKnowledge.length > 0 ? (
              <div className="space-y-3">
                {recentKnowledge.map((article) => (
                  <Link
                    key={article.id}
                    href={`/dashboard/knowledge/base/${article.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{article.title}</p>
                        <p className="text-sm text-gray-500">
                          {TICKET_CATEGORY_LABELS[article.category as TicketCategory] || article.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
                        <Users className="h-4 w-4" />
                        {article.view_count}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                ナレッジ記事はまだありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* クイックリンク */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              クイックアクセス
            </CardTitle>
            <CardDescription>よく使う機能へのショートカット</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/knowledge/tickets?status=open">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <Ticket className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium">未対応チケット</p>
                    <p className="text-xs text-gray-500">{stats.open}件</p>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/knowledge/tickets?status=in_progress">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">対応中</p>
                    <p className="text-xs text-gray-500">{stats.in_progress}件</p>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/knowledge/analytics">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  <div className="text-left">
                    <p className="font-medium">分析レポート</p>
                    <p className="text-xs text-gray-500">統計・傾向</p>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/knowledge/base">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <BookOpen className="h-5 w-5 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">ナレッジ一覧</p>
                    <p className="text-xs text-gray-500">記事管理</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
