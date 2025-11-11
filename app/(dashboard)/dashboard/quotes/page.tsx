import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { QuoteFilters } from '@/components/quotes/quote-filters'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import Link from 'next/link'
import type { ApprovalStatus, QuoteApprovalInstance } from '@/types/database'

const ITEMS_PER_PAGE = 20
const APPROVAL_STATUSES: ApprovalStatus[] = ['下書き', '承認待ち', '承認済み', '却下']

type QuoteSearchParams = Promise<{
  page?: string
  status?: string
  sales_rep?: string
  q?: string
}>

type FilterableQuery = {
  eq: (column: string, value: unknown) => FilterableQuery
  ilike: (column: string, pattern: string) => FilterableQuery
  or: (filters: string, options?: { foreignTable?: string }) => FilterableQuery
}

export default async function QuotesPage(props: {
  searchParams: QuoteSearchParams
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  
  const currentPage = Number(searchParams.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const statusParam = searchParams.status
  const salesRepFilter = searchParams.sales_rep || 'all'
  const keyword = (searchParams.q || '').trim()

  type StatusFilter = 'all' | ApprovalStatus
  let statusFilter: StatusFilter = 'all'
  if (statusParam && APPROVAL_STATUSES.includes(statusParam as ApprovalStatus)) {
    statusFilter = statusParam as ApprovalStatus
  }

  const sanitizeKeyword = (value: string) => {
    return value.replace(/[%]/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const applyFilters = <T,>(query: T): T => {
    let nextQuery: FilterableQuery = query as unknown as FilterableQuery
    if (statusFilter !== 'all') {
      nextQuery = nextQuery.eq('approval_status', statusFilter)
    }
    if (salesRepFilter !== 'all') {
      nextQuery = nextQuery.eq('project.sales_rep_id', salesRepFilter)
    }
    if (keyword) {
      const sanitized = sanitizeKeyword(keyword)
      if (sanitized) {
        const likePattern = `%${sanitized}%`
        nextQuery = nextQuery.or([
          `quote_number.ilike.${likePattern}`,
          `subject.ilike.${likePattern}`,
          `project.project_name.ilike.${likePattern}`,
          `project.project_number.ilike.${likePattern}`,
          `project.customer.customer_name.ilike.${likePattern}`,
        ].join(','))
      }
    }
    return nextQuery as unknown as T
  }

  // 総件数を取得
  const { count: totalCount } = await applyFilters(
    supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
  )

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0

  const { data: quotes, error } = await applyFilters(
    supabase
      .from('quotes')
      .select(`
        *,
        project:projects(
          project_number,
          project_name,
          sales_rep_id,
          customer:customers(customer_name),
          sales_rep:users!projects_sales_rep_id_fkey(id, display_name)
        ),
        created_by_user:users!quotes_created_by_fkey(display_name),
        approval_instance:quote_approval_instances(
          id,
          quote_id,
          route_id,
          status,
          current_step,
          requested_by,
          requested_at,
          updated_at,
          rejection_reason,
          route:approval_routes(
            id,
            name,
            requester_role,
            min_total_amount,
            max_total_amount
          ),
          steps:quote_approval_instance_steps(
            id,
            instance_id,
            step_order,
            approver_role,
            status,
            approver_user_id,
            decided_at,
            notes,
            approver:users(id, display_name)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1)
  )

  const { data: salesReps } = await supabase
    .from('users')
    .select('id, display_name')
    .is('is_active', true)
    .order('display_name', { ascending: true })

  const salesRepOptions = salesReps ?? []

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (salesRepFilter !== 'all') params.set('sales_rep', salesRepFilter)
    if (keyword) params.set('q', keyword)
    return `?${params.toString()}`
  }

  if (error) {
    console.error('Error fetching quotes:', error)
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">見積管理</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">見積の作成・管理</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <p className="text-red-600 font-medium">データの読み込みに失敗しました</p>
              <p className="text-sm text-gray-600">エラー: {error.message}</p>
              <p className="text-sm text-gray-500">管理者にお問い合わせください</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getApprovalStatusBadgeVariant = (status: string) => {
    switch (status) {
      case '下書き': return 'outline'
      case '承認待ち': return 'secondary'
      case '承認済み': return 'default'
      case '却下': return 'destructive'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  type QuoteWithApproval = {
    approval_instance?: QuoteApprovalInstance | QuoteApprovalInstance[] | null
    approval_status: ApprovalStatus
  }

  const getApprovalInstance = (quote: QuoteWithApproval) => {
    const raw = quote.approval_instance
    if (!raw) return null
    return Array.isArray(raw) ? (raw[0] ?? null) : raw
  }

  const getCurrentApproverLabel = (quote: QuoteWithApproval) => {
    const instance = getApprovalInstance(quote)
    if (!instance) {
      return quote.approval_status === '承認待ち' ? '未設定' : '-'
    }

    if (instance.status !== 'pending') {
      return instance.status === 'approved'
        ? '承認完了'
        : instance.status === 'rejected'
          ? '却下済み'
          : '保留なし'
    }

    const steps = Array.isArray(instance.steps) ? [...instance.steps] : []
    steps.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
    const currentStepOrder = instance.current_step ?? (steps[0]?.step_order ?? null)
    const currentStep = steps.find((step) => step.step_order === currentStepOrder && step.status === 'pending')

    if (!currentStep) {
      return '要確認'
    }

    const approverName = currentStep.approver?.display_name
    const roleLabel = currentStep.approver_role
    const displayName = approverName ? `${roleLabel} (${approverName})` : roleLabel
    const route = Array.isArray(instance.route) ? instance.route[0] : instance.route
    const routeName = route?.name
    return routeName ? `${displayName} / ${routeName}` : displayName
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">見積管理</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">見積の作成・管理</p>
        </div>
        <Link href="/dashboard/quotes/new">
          <Button className="w-full sm:w-auto">新規見積作成</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>見積一覧</CardTitle>
          <CardDescription>
            登録されている見積情報（全{totalCount}件）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuoteFilters
            statusFilter={statusFilter}
            salesRepFilter={salesRepFilter}
            keyword={keyword}
            salesReps={salesRepOptions}
            resetHref="/dashboard/quotes"
          />
          {quotes && quotes.length > 0 ? (
            <>
              {/* デスクトップ: テーブル表示 */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>見積番号</TableHead>
                      <TableHead>件名</TableHead>
                      <TableHead>案件名</TableHead>
                      <TableHead>顧客名</TableHead>
                      <TableHead>発行日</TableHead>
                      <TableHead>合計金額</TableHead>
                      <TableHead>粗利</TableHead>
                      <TableHead>承認状況</TableHead>
                      <TableHead>現在の承認者</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.quote_number}</TableCell>
                        <TableCell>{quote.subject || '-'}</TableCell>
                        <TableCell>{quote.project?.project_name}</TableCell>
                        <TableCell>{quote.project?.customer?.customer_name}</TableCell>
                        <TableCell>{formatDate(quote.issue_date)}</TableCell>
                        <TableCell>{formatCurrency(Number(quote.total_amount))}</TableCell>
                        <TableCell>{formatCurrency(Number(quote.gross_profit))}</TableCell>
                        <TableCell>
                          <Badge variant={getApprovalStatusBadgeVariant(quote.approval_status)}>
                            {quote.approval_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{getCurrentApproverLabel(quote)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/dashboard/quotes/${quote.id}`}>
                              <Button variant="outline" size="sm">詳細</Button>
                            </Link>
                            {quote.approval_status === '下書き' && (
                              <Link href={`/dashboard/quotes/${quote.id}/edit`}>
                                <Button variant="outline" size="sm">編集</Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* モバイル: カード表示 */}
              <div className="md:hidden space-y-4">
                {quotes.map((quote) => (
                    <Card key={quote.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{quote.quote_number}</p>
                            <p className="text-sm text-gray-600 mt-1">{quote.subject || '-'}</p>
                            <p className="text-xs text-gray-500">{quote.project?.project_name}</p>
                            </div>
                          <Badge variant={getApprovalStatusBadgeVariant(quote.approval_status)}>
                            {quote.approval_status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">顧客</span>
                            <span className="font-medium">{quote.project?.customer?.customer_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">発行日</span>
                            <span className="font-medium">{formatDate(quote.issue_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">合計金額</span>
                            <span className="font-semibold text-lg">{formatCurrency(Number(quote.total_amount))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">粗利</span>
                            <span className="font-medium">{formatCurrency(Number(quote.gross_profit))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">現在の承認者</span>
                            <span className="font-medium text-right max-w-[60%]">
                              {getCurrentApproverLabel(quote)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Link href={`/dashboard/quotes/${quote.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">詳細</Button>
                          </Link>
                          {quote.approval_status === '下書き' && (
                            <Link href={`/dashboard/quotes/${quote.id}/edit`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">編集</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={buildPageHref(Math.max(1, currentPage - 1))}
                          aria-disabled={currentPage === 1}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // 最初の2ページ、最後の2ページ、現在のページの前後1ページを表示
                        if (
                          page === 1 ||
                          page === 2 ||
                          page === totalPages - 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href={buildPageHref(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <span className="px-4">...</span>
                            </PaginationItem>
                          )
                        }
                        return null
                      })}
                      
                      <PaginationItem>
                        <PaginationNext
                          href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                          aria-disabled={currentPage === totalPages}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              登録されている見積がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
