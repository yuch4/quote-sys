import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deriveProjectStatus } from '@/lib/projects/status'
import { PurchaseOrderCreateDialog } from '@/components/purchase-orders/purchase-order-create-dialog'
import { ProjectActivityForm } from '@/components/procurement/project-activity-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  const { data: projectActivities, error: projectActivitiesError } = await supabase
    .from('project_activities')
    .select(`
      id,
      activity_date,
      subject,
      details,
      next_action,
      next_action_due_date,
      created_at,
      created_by_user:users(display_name)
    `)
    .eq('project_id', id)
    .order('activity_date', { ascending: false })
    .limit(50)

  if (projectActivitiesError) {
    console.error('Failed to load project activities:', projectActivitiesError)
  }

  const { data: billingSchedulesData, error: billingSchedulesError } = await supabase
    .from('project_billing_schedules')
    .select('*')
    .eq('project_id', id)
    .order('billing_month', { ascending: true })

  if (billingSchedulesError) {
    console.error('Failed to load billing schedules:', billingSchedulesError)
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

  const getBillingScheduleStatusVariant = (status: string) => {
    switch (status) {
      case '請求済':
        return 'default'
      case '確定':
        return 'secondary'
      default:
        return 'outline'
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
  const projectActivityRecords = projectActivities ?? []
  const projectActivityFormOptions = [
    {
      id: project.id,
      projectNumber: project.project_number ?? '',
      projectName: project.project_name ?? '(名称未設定)',
      customerName: project.customer?.customer_name ?? null,
    },
  ]
  const billingSchedules = billingSchedulesData ?? []
  const billingTotalAmount = billingSchedules.reduce(
    (total, schedule) => total + Number(schedule.amount ?? 0),
    0,
  )
  const billingDiffFromExpected =
    project.expected_sales != null ? billingTotalAmount - Number(project.expected_sales) : null

  const formatCurrency = (amount?: number | string | null) => {
    if (amount == null) return '-'
    const numeric = typeof amount === 'string' ? Number(amount) : amount
    if (Number.isNaN(numeric)) return '-'
    return `¥${numeric.toLocaleString()}`
  }

  const formatMonth = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const formatActivityDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('ja-JP')
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

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">基本情報/顧客情報</TabsTrigger>
          <TabsTrigger value="activities">活動履歴</TabsTrigger>
          <TabsTrigger value="quotes">見積/発注</TabsTrigger>
          <TabsTrigger value="billing">計上予定</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">受注月</p>
                  <p className="text-lg">{formatMonth(project.order_month)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">計上月</p>
                  <p className="text-lg">{formatMonth(project.accounting_month)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">営業担当</p>
                <p className="text-lg">{project.sales_rep?.display_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">見込売上</p>
                  <p className="text-lg">{formatCurrency(project.expected_sales)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">見込粗利</p>
                  <p className="text-lg">{formatCurrency(project.expected_gross_profit)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">契約確度</p>
                  <p className="text-lg">{formatContractProbability(project.contract_probability)}</p>
                </div>
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
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1">
                <CardTitle>活動履歴</CardTitle>
                <CardDescription>この案件に紐づく活動記録と共有メモ</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">履歴一覧</h3>
                  {projectActivityRecords.length === 0 ? (
                    <p className="text-sm text-gray-500">活動はまだ登録されていません。</p>
                  ) : (
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {projectActivityRecords.map((activity) => (
                        <div key={activity.id} className="rounded-lg border px-4 py-3 space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatActivityDate(activity.activity_date)}</span>
                              <span>{activity.created_by_user?.display_name ?? '-'}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{activity.subject}</p>
                            {activity.details ? (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{activity.details}</p>
                            ) : null}
                            {(activity.next_action || activity.next_action_due_date) && (
                              <div className="rounded-lg bg-slate-50 p-3 text-xs text-gray-600 space-y-1">
                                <p className="font-semibold text-gray-800">次回アクション</p>
                                {activity.next_action ? <p>{activity.next_action}</p> : null}
                                {activity.next_action_due_date ? (
                                  <p className="text-gray-500">期限: {formatActivityDate(activity.next_action_due_date)}</p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">新規登録</h3>
                  <ProjectActivityForm projects={projectActivityFormOptions} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>月次計上予定</CardTitle>
              <CardDescription>自動按分された請求・計上予定を閲覧し、計上準備状況を把握できます。</CardDescription>
            </CardHeader>
            <CardContent>
              {billingSchedules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  計上予定はまだ登録されていません。案件編集から自動生成できます。
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 rounded-lg border bg-slate-50 p-4 text-sm text-gray-700 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">計上予定合計</p>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(billingTotalAmount)}</p>
                    </div>
                    {project.expected_sales != null && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">見込売上</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(project.expected_sales)}</p>
                        <p
                          className={`text-xs font-medium ${
                            billingDiffFromExpected === 0
                              ? 'text-gray-600'
                              : billingDiffFromExpected && billingDiffFromExpected > 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                          }`}
                        >
                          {billingDiffFromExpected === 0
                            ? '見込売上と一致'
                            : billingDiffFromExpected != null
                              ? `差額 ${billingDiffFromExpected > 0 ? '+' : ''}${formatCurrency(Math.abs(billingDiffFromExpected))}`
                              : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>対象月</TableHead>
                          <TableHead>請求予定日</TableHead>
                          <TableHead>金額</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead>備考</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingSchedules.map((schedule) => (
                          <TableRow key={schedule.id}>
                            <TableCell>{formatMonth(schedule.billing_month)}</TableCell>
                            <TableCell>{formatActivityDate(schedule.billing_date)}</TableCell>
                            <TableCell>{formatCurrency(schedule.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={getBillingScheduleStatusVariant(schedule.status)}>
                                {schedule.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{schedule.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
  const formatContractProbability = (value?: string | null) => {
    switch (value) {
      case 'S': return 'S（ほぼ確定）'
      case 'A': return 'A（高い）'
      case 'B': return 'B（中間）'
      case 'C': return 'C（低い）'
      case 'D': return 'D（未確定）'
      default: return '-'
    }
  }
