import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deriveProjectStatus } from '@/lib/projects/status'
import { PurchaseOrderCreateDialog } from '@/components/purchase-orders/purchase-order-create-dialog'

type ProjectDetailParams = { id: string }

export default async function ProjectDetailPage({ params }: { params: Promise<ProjectDetailParams> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customers(*),
      sales_rep:users!projects_sales_rep_id_fkey(*),
      quotes:quotes(
        id,
        quote_number,
        approval_status,
        total_amount,
        issue_date,
        created_at,
        purchase_orders:purchase_orders(
          id,
          purchase_order_number,
          status,
          approval_status,
          total_cost,
          created_at,
          supplier:suppliers(supplier_name)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  const { data: suppliersData, error: suppliersError } = await supabase
    .from('suppliers')
    .select('id, supplier_name')
    .eq('is_deleted', false)
    .order('supplier_name', { ascending: true })

  if (suppliersError) {
    console.error('Failed to load suppliers for purchase order creation dialog:', suppliersError)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'リード': return 'outline'
      case '見積中': return 'secondary'
      case '受注': return 'default'
      case '計上OK': return 'secondary'
      case '計上済み': return 'default'
      case '失注': return 'destructive'
      case 'キャンセル': return 'outline'
      default: return 'secondary'
    }
  }

  const getQuoteStatusVariant = (status: string) => {
    switch (status) {
      case '承認済み': return 'default'
      case '承認待ち': return 'secondary'
      case '却下': return 'destructive'
      default: return 'outline'
    }
  }

  const getPurchaseOrderStatusVariant = (status: string) => {
    switch (status) {
      case '発注済': return 'default'
      case '承認待ち':
      case '未発注':
      default:
        return 'secondary'
    }
  }

  const derivedStatus = deriveProjectStatus(project)
  const quotes = project.quotes ?? []
  const suppliers = suppliersData ?? []
  const purchaseOrderQuoteOptions = quotes
    .filter((quote) => quote.approval_status === '承認済み')
    .map((quote) => ({
      id: quote.id,
      quote_number: quote.quote_number,
      project_name: project.project_name || null,
    }))
  const purchaseOrders = quotes.flatMap((quote) =>
    (quote.purchase_orders || []).map((po) => ({
      ...po,
      quote_number: quote.quote_number,
    }))
  )

  const formatCurrency = (amount?: number | string | null) => {
    if (amount == null) return '-'
    const numeric = typeof amount === 'string' ? Number(amount) : amount
    if (Number.isNaN(numeric)) return '-'
    return `¥${numeric.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">案件詳細</h1>
          <p className="text-gray-600 mt-2">{project.project_number}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/projects/${project.id}/edit`}>
            <Button variant="outline">編集</Button>
          </Link>
          <Link href="/dashboard/projects">
            <Button variant="outline">一覧に戻る</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">案件番号</p>
              <p className="text-lg">{project.project_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">ステータス</p>
              <Badge variant={getStatusBadgeVariant(derivedStatus)} className="mt-1">
                {derivedStatus}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">案件名</p>
            <p className="text-lg">{project.project_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">カテゴリ</p>
              <p className="text-lg">{project.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">部門</p>
              <p className="text-lg">{project.department}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">営業担当</p>
            <p className="text-lg">{project.sales_rep?.display_name}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>顧客情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">顧客名</p>
            <p className="text-lg">{project.customer?.customer_name}</p>
          </div>

          {project.customer?.contact_person && (
            <div>
              <p className="text-sm font-medium text-gray-500">担当者</p>
              <p className="text-lg">{project.customer.contact_person}</p>
            </div>
          )}

          {project.customer?.phone && (
            <div>
              <p className="text-sm font-medium text-gray-500">電話番号</p>
              <p className="text-lg">{project.customer.phone}</p>
            </div>
          )}

          {project.customer?.email && (
            <div>
              <p className="text-sm font-medium text-gray-500">メールアドレス</p>
              <p className="text-lg">{project.customer.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>見積一覧</CardTitle>
            <Link href={`/dashboard/quotes/new?project_id=${project.id}`}>
              <Button>見積作成</Button>
            </Link>
          </div>
          <CardDescription>この案件に紐づく見積</CardDescription>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">見積がまだ作成されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>見積番号</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quote_number}</TableCell>
                      <TableCell>
                        <Badge variant={getQuoteStatusVariant(quote.approval_status)}>
                          {quote.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(quote.total_amount)}</TableCell>
                      <TableCell>
                        {quote.issue_date ? new Date(quote.issue_date).toLocaleDateString('ja-JP') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/quotes/${quote.id}`}>
                          <Button variant="outline" size="sm">詳細</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>発注書一覧</CardTitle>
              <CardDescription>案件に紐づく発注書（見積経由）</CardDescription>
            </div>
            <PurchaseOrderCreateDialog quotes={purchaseOrderQuoteOptions} suppliers={suppliers} />
          </div>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">発注書はまだ作成されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>発注書番号</TableHead>
                    <TableHead>紐づく見積</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>承認ステータス</TableHead>
                    <TableHead>仕入先</TableHead>
                    <TableHead>発注金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.purchase_order_number}</TableCell>
                      <TableCell>{order.quote_number}</TableCell>
                      <TableCell>
                        <Badge variant={getPurchaseOrderStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.approval_status === '承認済み' ? 'default' : 'secondary'}>
                          {order.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.supplier?.supplier_name ?? '-'}</TableCell>
                      <TableCell>{formatCurrency(order.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
