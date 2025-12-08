import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTickets, getTicketStats } from '@/lib/knowledge/tickets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketStatusBadge } from '@/components/knowledge/ticket-status-badge'
import { TicketPriorityBadge } from '@/components/knowledge/ticket-priority-badge'
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_BORDER_COLORS,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '@/types/knowledge'
import { Plus, Search, Ticket, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'

interface SearchParams {
  status?: string
  priority?: string
  category?: string
  search?: string
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  
  const tickets = await getTickets({
    status: params.status as TicketStatus | 'all' | undefined,
    priority: params.priority as TicketPriority | 'all' | undefined,
    category: params.category as TicketCategory | 'all' | undefined,
    search: params.search,
  })

  const stats = await getTicketStats()

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">チケット一覧</h1>
          <p className="text-sm text-gray-500 mt-1">
            顧客からの問い合わせを管理します
          </p>
        </div>
        <Link href="/dashboard/knowledge/tickets/new">
          <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4" />
            新規チケット
          </Button>
        </Link>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">未対応</CardTitle>
            <Ticket className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">対応中</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">緊急</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">解決済み</CardTitle>
            <CheckCircle className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{stats.resolved}</div>
          </CardContent>
        </Card>
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
            <Select name="status" defaultValue={params.status || 'all'}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="priority" defaultValue={params.priority || 'all'}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="優先度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="category" defaultValue={params.category || 'all'}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              検索
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* チケット一覧 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[140px]">チケット番号</TableHead>
                <TableHead>件名</TableHead>
                <TableHead className="w-[150px]">顧客/会社</TableHead>
                <TableHead className="w-[130px]">カテゴリ</TableHead>
                <TableHead className="w-[100px]">優先度</TableHead>
                <TableHead className="w-[100px]">ステータス</TableHead>
                <TableHead className="w-[120px]">担当者</TableHead>
                <TableHead className="w-[120px]">作成日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                    チケットがありません
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={cn(
                      'hover:bg-gray-50 cursor-pointer border-l-4',
                      TICKET_PRIORITY_BORDER_COLORS[ticket.priority]
                    )}
                  >
                    <TableCell>
                      <Link
                        href={`/dashboard/knowledge/tickets/${ticket.id}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {ticket.ticket_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/knowledge/tickets/${ticket.id}`}
                        className="font-medium hover:text-blue-600"
                      >
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {ticket.customer?.customer_name ||
                        ticket.group_company?.company_name ||
                        '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {TICKET_CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category}
                    </TableCell>
                    <TableCell>
                      <TicketPriorityBadge priority={ticket.priority} size="sm" />
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {ticket.assigned_user?.display_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
