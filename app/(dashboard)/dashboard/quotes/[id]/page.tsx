import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      project:projects(
        *,
        customer:customers(*),
        sales_rep:users!projects_sales_rep_id_fkey(*)
      ),
      items:quote_items(
        *,
        supplier:suppliers(supplier_name)
      ),
      created_by_user:users!quotes_created_by_fkey(*),
      approved_by_user:users!quotes_approved_by_fkey(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !quote) {
    notFound()
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
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  // 明細を行番号順にソート
  const sortedItems = quote.items?.sort((a, b) => a.line_number - b.line_number) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">見積詳細</h1>
          <p className="text-gray-600 mt-2">{quote.quote_number}</p>
        </div>
        <div className="flex gap-2">
          {quote.approval_status === '下書き' && (
            <Link href={`/dashboard/quotes/${quote.id}/edit`}>
              <Button variant="outline">編集</Button>
            </Link>
          )}
          <Link href="/dashboard/quotes">
            <Button variant="outline">一覧に戻る</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">見積番号</p>
                <p className="text-lg">{quote.quote_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">バージョン</p>
                <p className="text-lg">v{quote.version}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">発行日</p>
                <p className="text-lg">{formatDate(quote.issue_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">有効期限</p>
                <p className="text-lg">{quote.valid_until ? formatDate(quote.valid_until) : '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">承認状況</p>
              <Badge variant={getApprovalStatusBadgeVariant(quote.approval_status)} className="mt-1">
                {quote.approval_status}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">作成者</p>
              <p className="text-lg">{quote.created_by_user?.display_name}</p>
            </div>

            {quote.approved_by_user && (
              <div>
                <p className="text-sm font-medium text-gray-500">承認者</p>
                <p className="text-lg">{quote.approved_by_user.display_name}</p>
                <p className="text-sm text-gray-500">{quote.approved_at ? formatDate(quote.approved_at) : ''}</p>
              </div>
            )}

            {quote.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">備考</p>
                <p className="text-lg">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>金額情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">合計金額</p>
              <p className="text-2xl font-bold">{formatCurrency(Number(quote.total_amount))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">合計仕入金額</p>
              <p className="text-xl">{formatCurrency(Number(quote.total_cost))}</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-500">粗利</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(Number(quote.gross_profit))}</p>
              <p className="text-sm text-gray-500">
                粗利率: {quote.total_amount > 0 ? ((Number(quote.gross_profit) / Number(quote.total_amount)) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>案件情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">案件番号</p>
              <p className="text-lg">{quote.project?.project_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">案件名</p>
              <p className="text-lg">{quote.project?.project_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">顧客名</p>
              <p className="text-lg">{quote.project?.customer?.customer_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">営業担当</p>
              <p className="text-lg">{quote.project?.sales_rep?.display_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>明細</CardTitle>
          <CardDescription>見積明細一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No.</TableHead>
                <TableHead>品名</TableHead>
                <TableHead>説明</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">単価</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>仕入先</TableHead>
                <TableHead className="text-right">仕入単価</TableHead>
                <TableHead className="text-right">粗利</TableHead>
                <TableHead className="text-center">仕入要</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.line_number}</TableCell>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.description || '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(item.amount))}</TableCell>
                  <TableCell>{item.supplier?.supplier_name || '-'}</TableCell>
                  <TableCell className="text-right">{item.cost_price ? formatCurrency(Number(item.cost_price)) : '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(item.gross_profit))}</TableCell>
                  <TableCell className="text-center">
                    {item.requires_procurement ? (
                      <Badge variant="secondary">要</Badge>
                    ) : (
                      <Badge variant="outline">不要</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>合計金額:</span>
                <span className="font-medium">{formatCurrency(Number(quote.total_amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>合計仕入:</span>
                <span className="font-medium">{formatCurrency(Number(quote.total_cost))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>粗利:</span>
                <span className="text-green-600">{formatCurrency(Number(quote.gross_profit))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
