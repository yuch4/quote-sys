import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import Link from 'next/link'

const ITEMS_PER_PAGE = 20

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const supabase = await createClient()
  
  const currentPage = Number(searchParams.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // 総件数を取得
  const { count: totalCount } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      *,
      project:projects(
        project_number,
        project_name,
        customer:customers(customer_name)
      ),
      created_by_user:users!quotes_created_by_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1)

  if (error) {
    console.error('Error fetching quotes:', error)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">見積管理</h1>
          <p className="text-gray-600 mt-2">見積の作成・管理</p>
        </div>
        <Link href="/dashboard/quotes/new">
          <Button>新規見積作成</Button>
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
          {quotes && quotes.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>見積番号</TableHead>
                    <TableHead>案件名</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead>合計金額</TableHead>
                    <TableHead>粗利</TableHead>
                    <TableHead>承認状況</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quote_number}</TableCell>
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

              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={`?page=${Math.max(1, currentPage - 1)}`}
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
                                href={`?page=${page}`}
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
                          href={`?page=${Math.min(totalPages, currentPage + 1)}`}
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
