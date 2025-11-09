import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { deriveProjectStatus } from '@/lib/projects/status'
import { ProjectKanbanBoard } from '@/components/projects/project-kanban'
import { ProjectFilters } from '@/components/projects/project-filters'
import { cn } from '@/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import Link from 'next/link'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

type ProjectSearchParams = Promise<{
  page?: string
  status?: string
  sales_rep?: string
  sort?: string
  q?: string
  view?: string
}>

type ProjectsQuery = PostgrestFilterBuilder<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>

const ITEMS_PER_PAGE = 20
const DEFAULT_SORT = { column: 'created_at', direction: 'desc' as 'asc' | 'desc' }
const SORTABLE_COLUMNS = {
  project_number: { column: 'project_number', label: '案件番号' },
  order_month: { column: 'order_month', label: '受注月' },
  accounting_month: { column: 'accounting_month', label: '計上月' },
  expected_sales: { column: 'expected_sales', label: '見込売上' },
  expected_gross_profit: { column: 'expected_gross_profit', label: '見込粗利' },
  created_at: { column: 'created_at', label: '作成日' },
} as const

const VIEW_OPTIONS = [
  { value: 'kanban', label: 'カンバン' },
  { value: 'list', label: 'リスト' },
] as const

export default async function ProjectsPage(props: {
  searchParams: ProjectSearchParams
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  
  const currentPage = Number(searchParams.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const statusFilter = searchParams.status || 'all'
  const salesRepFilter = searchParams.sales_rep || 'all'
  const rawSort = searchParams.sort || `${DEFAULT_SORT.column}:${DEFAULT_SORT.direction}`
  const [sortColumnParam, sortDirectionParam] = rawSort.split(':')
  const sortDirection = sortDirectionParam === 'asc' ? 'asc' : 'desc'
  const sortColumnKey = (sortColumnParam && sortColumnParam in SORTABLE_COLUMNS
    ? sortColumnParam
    : DEFAULT_SORT.column) as keyof typeof SORTABLE_COLUMNS
  const keyword = (searchParams.q || '').trim()
  const viewMode = searchParams.view === 'list' ? 'list' : 'kanban'
  const resetHref = viewMode === 'kanban' ? '/dashboard/projects' : '/dashboard/projects?view=list'

  const applyFilters = (query: ProjectsQuery) => {
    let nextQuery = query
    if (statusFilter !== 'all') {
      nextQuery = nextQuery.eq('status', statusFilter)
    }
    if (salesRepFilter !== 'all') {
      nextQuery = nextQuery.eq('sales_rep_id', salesRepFilter)
    }
    if (keyword) {
      nextQuery = nextQuery.ilike('project_name', `%${keyword}%`)
    }
    return nextQuery
  }

  // ログインユーザー情報取得
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single()

  // 総件数を取得
  const { count: totalCount } = await applyFilters(
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
  )

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0

  // 案件一覧取得（権限に応じてフィルタリング）
  const selectedSortColumn = SORTABLE_COLUMNS[sortColumnKey]?.column || DEFAULT_SORT.column

  const projectQuery = supabase
    .from('projects')
    .select(`
      *,
      customer:customers(customer_name),
      sales_rep:users!projects_sales_rep_id_fkey(display_name),
      quotes:quotes(
        id,
        quote_number,
        approval_status,
        total_amount,
        created_at
      )
    `)
    .order(selectedSortColumn, {
      ascending: sortDirection === 'asc',
      nullsFirst: false,
    })
    .range(offset, offset + ITEMS_PER_PAGE - 1)

  const { data: projects, error } = await applyFilters(projectQuery)

  const { data: salesReps } = await supabase
    .from('users')
    .select('id, display_name')
    .is('is_active', true)
    .order('display_name', { ascending: true })
  const salesRepOptions = salesReps ?? []

  const { data: kanbanProjects } = await applyFilters(
    supabase
      .from('projects')
      .select(`
        id,
        project_number,
        project_name,
        status,
        expected_sales,
        expected_gross_profit,
        customer:customers(customer_name),
        sales_rep:users!projects_sales_rep_id_fkey(display_name),
        quotes:quotes(approval_status)
      `)
      .order('created_at', { ascending: false })
      .limit(200)
  )

  if (error) {
    console.error('Error fetching projects:', error)
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">案件管理</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">案件の作成・管理</p>
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'リード':
        return 'outline'
      case '見積中': return 'secondary'
      case '受注': return 'default'
      case '計上OK': return 'secondary'
      case '計上済み': return 'default'
      case '失注': return 'destructive'
      case 'キャンセル': return 'outline'
      default: return 'secondary'
    }
  }

  const projectList = (projects || []).map((project) => ({
    ...project,
    derivedStatus: deriveProjectStatus(project),
  }))
  const kanbanProjectList = (kanbanProjects || []).map((project) => ({
    ...project,
    derivedStatus: deriveProjectStatus(project),
  }))

  const formatMonth = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const formatCurrency = (amount?: number | string | null) => {
    if (amount == null) return '-'
    const numeric = typeof amount === 'string' ? Number(amount) : amount
    if (Number.isNaN(numeric)) return '-'
    return `¥${numeric.toLocaleString()}`
  }

  const buildQueryString = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams()
    const baseParams = {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sales_rep: salesRepFilter !== 'all' ? salesRepFilter : undefined,
      sort:
        `${selectedSortColumn}:${sortDirection}` !== `${DEFAULT_SORT.column}:${DEFAULT_SORT.direction}`
          ? `${selectedSortColumn}:${sortDirection}`
          : undefined,
      q: keyword || undefined,
      view: viewMode !== 'kanban' ? viewMode : undefined,
    }
    Object.entries({ ...baseParams, ...params }).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        search.set(key, String(value))
      }
    })
    const queryString = search.toString()
    return queryString ? `?${queryString}` : ''
  }

  const buildSortParam = (columnKey: keyof typeof SORTABLE_COLUMNS) => {
    const current = sortColumnKey === columnKey
    const nextDirection = current && sortDirection === 'asc' ? 'desc' : 'asc'
    return `${SORTABLE_COLUMNS[columnKey].column}:${nextDirection}`
  }

  const getSortIcon = (columnKey: keyof typeof SORTABLE_COLUMNS) => {
    if (sortColumnKey !== columnKey) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">案件管理</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">案件の作成・管理</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="w-full sm:w-auto">新規案件作成</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>案件一覧</CardTitle>
              <CardDescription>
                {viewMode === 'kanban'
                  ? 'ステージ別に最大200件まで表示します'
                  : `登録されている案件情報（全${totalCount}件）`}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm font-medium">
              {VIEW_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={buildQueryString({ page: 1, view: option.value })}
                  className={cn(
                    'rounded-full px-4 py-1.5 transition',
                    viewMode === option.value ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProjectFilters
            statusFilter={statusFilter}
            salesRepFilter={salesRepFilter}
            keyword={keyword}
            salesReps={salesRepOptions}
            resetHref={resetHref}
          />

          {viewMode === 'kanban' ? (
            kanbanProjectList.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm">
                <ProjectKanbanBoard projects={kanbanProjectList} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                表示できる案件がありません。フィルタを見直してください。
              </p>
            )
          ) : projectList.length > 0 ? (
            <>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Link
                        href={buildQueryString({ page: 1, sort: buildSortParam('project_number') })}
                        className="flex items-center gap-1"
                      >
                        {SORTABLE_COLUMNS.project_number.label}
                        <span className="text-xs">{getSortIcon('project_number')}</span>
                      </Link>
                    </TableHead>
                    <TableHead>案件名</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>営業担当</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>
                      <Link
                        href={buildQueryString({ page: 1, sort: buildSortParam('order_month') })}
                        className="flex items-center gap-1"
                      >
                        {SORTABLE_COLUMNS.order_month.label}
                        <span className="text-xs">{getSortIcon('order_month')}</span>
                      </Link>
                    </TableHead>
                    <TableHead>
                      <Link
                        href={buildQueryString({ page: 1, sort: buildSortParam('accounting_month') })}
                        className="flex items-center gap-1"
                      >
                        {SORTABLE_COLUMNS.accounting_month.label}
                        <span className="text-xs">{getSortIcon('accounting_month')}</span>
                      </Link>
                    </TableHead>
                    <TableHead>
                      <Link
                        href={buildQueryString({ page: 1, sort: buildSortParam('expected_sales') })}
                        className="flex items-center gap-1"
                      >
                        {SORTABLE_COLUMNS.expected_sales.label}
                        <span className="text-xs">{getSortIcon('expected_sales')}</span>
                      </Link>
                    </TableHead>
                    <TableHead>
                      <Link
                        href={buildQueryString({ page: 1, sort: buildSortParam('expected_gross_profit') })}
                        className="flex items-center gap-1"
                      >
                        {SORTABLE_COLUMNS.expected_gross_profit.label}
                        <span className="text-xs">{getSortIcon('expected_gross_profit')}</span>
                      </Link>
                    </TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectList.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.project_number}</TableCell>
                      <TableCell>{project.project_name}</TableCell>
                      <TableCell>{project.customer?.customer_name}</TableCell>
                      <TableCell>{project.sales_rep?.display_name}</TableCell>
                      <TableCell>{project.category}</TableCell>
                      <TableCell>{formatMonth(project.order_month)}</TableCell>
                      <TableCell>{formatMonth(project.accounting_month)}</TableCell>
                      <TableCell>{formatCurrency(project.expected_sales)}</TableCell>
                      <TableCell>{formatCurrency(project.expected_gross_profit)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(project.derivedStatus)}>
                          {project.derivedStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <Button variant="outline" size="sm">詳細</Button>
                        </Link>
                        <Link href={`/dashboard/projects/${project.id}/edit`}>
                            <Button variant="outline" size="sm">編集</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* モバイル: カード表示 */}
            <div className="md:hidden space-y-4">
              {projectList.map((project) => (
                <Card key={project.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{project.project_number}</p>
                          <p className="text-sm text-gray-600 mt-1">{project.project_name}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(project.derivedStatus)}>
                          {project.derivedStatus}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">顧客</span>
                          <span className="font-medium">{project.customer?.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">営業担当</span>
                          <span className="font-medium">{project.sales_rep?.display_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">カテゴリ</span>
                          <span className="font-medium">{project.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">受注月</span>
                          <span className="font-medium">{formatMonth(project.order_month)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">計上月</span>
                          <span className="font-medium">{formatMonth(project.accounting_month)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">見込売上</span>
                          <span className="font-medium">{formatCurrency(project.expected_sales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">見込粗利</span>
                          <span className="font-medium">{formatCurrency(project.expected_gross_profit)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">詳細</Button>
                        </Link>
                        <Link href={`/dashboard/projects/${project.id}/edit`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">編集</Button>
                        </Link>
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
                          href={buildQueryString({ page: Math.max(1, currentPage - 1) })}
                          aria-disabled={currentPage === 1}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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
                                href={buildQueryString({ page })}
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
                          href={buildQueryString({ page: Math.min(totalPages, currentPage + 1) })}
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
              登録されている案件がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
