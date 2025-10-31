import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function QuotesPage() {
  const supabase = await createClient()
  
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
          <CardDescription>登録されている見積情報</CardDescription>
        </CardHeader>
        <CardContent>
          {quotes && quotes.length > 0 ? (
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
