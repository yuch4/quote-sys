import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApprovalActions } from '@/components/quotes/approval-actions'
import { PDFGenerateButton } from '@/components/quotes/pdf-generate-button'
import { VersionHistory } from '@/components/quotes/version-history'
import { PurchaseOrderDialog } from '@/components/quotes/purchase-order-dialog'
import { PurchaseOrderEditDialog } from '@/components/purchase-orders/purchase-order-edit-dialog'
import { PurchaseOrderApprovalActions } from '@/components/purchase-orders/purchase-order-approval-actions'
import { QuoteBillingPlanManager } from '@/components/quotes/quote-billing-plan'
import { QuoteCostPlanManager } from '@/components/quotes/quote-cost-plan'
import { firstRelation, ensureArrayRelation } from '@/lib/supabase/relations'
import type {
  Quote,
  QuoteItem,
  PurchaseOrder,
  PurchaseOrderItem,
  QuoteApprovalInstance,
  PurchaseOrderApprovalInstance,
  ApprovalStatus,
  PurchaseOrderStatus,
  ProjectBillingSchedule,
  ProjectCostSchedule,
} from '@/types/database'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type QuoteDetailParams = { id: string }

type Relation<T> = T | T[] | null | undefined

type PurchaseOrderWithRelations = PurchaseOrder & {
  supplier?: Relation<PurchaseOrder['supplier']>
  quote?: Relation<{ id: string; quote_number: string }>
  items?: Array<
    PurchaseOrderItem & {
      quote_item?: Relation<PurchaseOrderItem['quote_item']>
    }
  >
  approval_instance?: Relation<PurchaseOrderApprovalInstance>
}

type QuoteDetailRaw = Quote & {
  project: Relation<Quote['project']>
  items: Array<QuoteItem & { supplier?: Relation<QuoteItem['supplier']> }>
  purchase_orders: Relation<PurchaseOrderWithRelations>
  approval_instance?: Relation<QuoteApprovalInstance>
}

const normalizeApprovalInstance = <T extends QuoteApprovalInstance | PurchaseOrderApprovalInstance>(
  instance: T | T[] | null | undefined
): T | null => {
  const normalized = firstRelation(instance)
  if (!normalized) return null
  return {
    ...normalized,
    steps: ensureArrayRelation(normalized.steps) as NonNullable<T['steps']>,
    route: normalized.route ? firstRelation(normalized.route) ?? normalized.route : normalized.route,
  }
}

const normalizeQuoteDetail = (rawQuote: QuoteDetailRaw) => {
  const project = firstRelation(rawQuote.project)
  if (!project) {
    return null
  }
  const normalizedProject = {
    ...project,
    customer: firstRelation(project.customer),
    sales_rep: firstRelation(project.sales_rep),
  }

  const items = ensureArrayRelation(rawQuote.items).map((item) => ({
    ...item,
    supplier: firstRelation(item.supplier),
  })) as QuoteItem[]

  const purchaseOrders = ensureArrayRelation(rawQuote.purchase_orders).map((order) => ({
    ...order,
    supplier: firstRelation(order.supplier),
    quote: firstRelation(order.quote),
    items: ensureArrayRelation(order.items).map((item) => ({
      ...item,
      quote_item: firstRelation(item.quote_item),
    })) as PurchaseOrderItem[],
    approval_instance: normalizeApprovalInstance<PurchaseOrderApprovalInstance>(order.approval_instance),
  })) as PurchaseOrder[]

  const approvalInstance = normalizeApprovalInstance<QuoteApprovalInstance>(rawQuote.approval_instance)

  return {
    ...rawQuote,
    project: normalizedProject,
    items,
    purchase_orders: purchaseOrders,
    approval_instance: approvalInstance,
  }
}

export default async function QuoteDetailPage({ params }: { params: Promise<QuoteDetailParams> }) {
  const { id } = await params
  const supabase = await createClient()

  // 現在のユーザー情報を取得
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user?.id)
    .single()
  
  const { data: rawQuote, error } = await supabase
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
        supplier:suppliers(id, supplier_name)
      ),
      purchase_orders:purchase_orders(
        *,
        supplier:suppliers(id, supplier_name),
        items:purchase_order_items(
          *,
          quote_item:quote_items(id, line_number, product_name)
        ),
        approval_instance:purchase_order_approval_instances(
          id,
          purchase_order_id,
          route_id,
          status,
          current_step,
          requested_by,
          requested_at,
          updated_at,
          rejection_reason,
          route:approval_routes(
            id,
            name
          ),
          steps:purchase_order_approval_instance_steps(
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
      ),
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
      ),
      created_by_user:users!quotes_created_by_fkey(*),
      approved_by_user:users!quotes_approved_by_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error || !rawQuote) {
    notFound()
  }
  const quote = normalizeQuoteDetail(rawQuote)
  if (!quote) {
    notFound()
  }

  const { data: billingSchedules } = await supabase
    .from('project_billing_schedules')
    .select('*')
    .eq('quote_id', id)
    .order('billing_month', { ascending: true })

  // 仕入計上予定を取得
  const { data: costSchedules } = await supabase
    .from('project_cost_schedules')
    .select('*')
    .eq('quote_id', id)
    .order('cost_month', { ascending: true })

  // バージョン履歴を取得
  const baseNumber = quote.quote_number.split('-v')[0]
  const { data: versionsRaw } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      version,
      issue_date,
      total_amount,
      approval_status,
      created_by_user:users!quotes_created_by_fkey(display_name)
    `)
    .like('quote_number', `${baseNumber}%`)
    .order('version', { ascending: false })

  const versions = ensureArrayRelation(versionsRaw).map((quoteVersion) => ({
    ...quoteVersion,
    created_by_user: firstRelation(quoteVersion.created_by_user) ?? undefined,
  }))

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

  const getStepStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return '承認済み'
      case 'rejected': return '却下'
      case 'skipped': return 'スキップ'
      case 'cancelled': return 'キャンセル'
      case 'pending':
      default:
        return '承認待ち'
    }
  }

  const getStepBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default'
      case 'rejected': return 'destructive'
      case 'skipped': return 'outline'
      case 'cancelled': return 'outline'
      default: return 'secondary'
    }
  }

  const getRoleLabel = (role?: string | null) => {
    if (!role || role === 'all') return '全役職'
    return role
  }

  const quoteItems = (quote.items || []) as QuoteItem[]
  const sortedItems = [...quoteItems].sort((a, b) => a.line_number - b.line_number)
  const pendingProcurementItems = quoteItems.filter(
    (item) => item.requires_procurement && item.procurement_status !== '発注済'
  )
  const purchaseOrders = (quote.purchase_orders || []) as PurchaseOrder[]
  const sortedPurchaseOrders = [...purchaseOrders].sort(
    (a, b) => new Date(b.order_date || '').getTime() - new Date(a.order_date || '').getTime()
  )
  const approvalInstanceRaw = quote.approval_instance as QuoteApprovalInstance | QuoteApprovalInstance[] | null
  const approvalInstance = (Array.isArray(approvalInstanceRaw)
    ? (approvalInstanceRaw[0] ?? null)
    : approvalInstanceRaw ?? null) as QuoteApprovalInstance | null
  const approvalSteps = approvalInstance
    ? [...(approvalInstance.steps || [])].sort((a, b) => a.step_order - b.step_order)
    : []
  const approvalAmountRange = approvalInstance?.route
    ? (() => {
        const min = approvalInstance.route?.min_total_amount != null
          ? Number(approvalInstance.route.min_total_amount)
          : null
        const max = approvalInstance.route?.max_total_amount != null
          ? Number(approvalInstance.route.max_total_amount)
          : null
        if (min == null && max == null) return 'すべて'
        if (min != null && max != null) return `${formatCurrency(min)} ～ ${formatCurrency(max)}`
        if (min != null) return `${formatCurrency(min)} 以上`
        return `${formatCurrency(max!)} 以下`
      })()
    : null

  const quoteDefaultStartMonth =
    quote.project?.accounting_month?.slice(0, 7) ??
    quote.project?.order_month?.slice(0, 7) ??
    quote.issue_date?.slice(0, 7) ??
    undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">見積詳細</h1>
          <p className="text-gray-600 mt-2">{quote.quote_number}</p>
        </div>
        <div className="flex gap-2">
          {quote.project?.id && (
            <Link href={`/dashboard/projects/${quote.project.id}`}>
              <Button variant="secondary">案件詳細</Button>
            </Link>
          )}
          <PDFGenerateButton
            quoteId={quote.id}
            approvalStatus={quote.approval_status}
            pdfUrl={quote.pdf_url}
            pdfGeneratedAt={quote.pdf_generated_at}
          />
          <PurchaseOrderDialog
            quoteId={quote.id}
            quoteNumber={quote.quote_number}
            items={(quote.items || []) as QuoteItem[]}
          />
          <ApprovalActions
            quoteId={quote.id}
            approvalStatus={quote.approval_status}
            currentUserId={currentUser?.id || ''}
            currentUserRole={currentUser?.role || ''}
            createdBy={quote.created_by}
            approvalInstance={approvalInstance || undefined}
          />
          {quote.approval_status === '承認済み' && (
            <Link href={`/dashboard/quotes/${quote.id}/revise`}>
              <Button variant="outline">改訂</Button>
            </Link>
          )}
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

      <Card>
        <CardHeader>
          <CardTitle>売上計上予定</CardTitle>
          <CardDescription>受注確定した見積をもとに月次売上計上予定を管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteBillingPlanManager
            quoteId={quote.id}
            projectId={quote.project_id}
            quoteNumber={quote.quote_number}
            projectName={quote.project?.project_name ?? ''}
            totalAmount={Number(quote.total_amount || 0)}
            defaultStartMonth={quoteDefaultStartMonth}
            initialSchedules={(billingSchedules ?? []) as ProjectBillingSchedule[]}
            isAwarded={quote.is_awarded}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>仕入計上予定</CardTitle>
          <CardDescription>受注確定した見積をもとに月次仕入計上予定を管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteCostPlanManager
            quoteId={quote.id}
            projectId={quote.project_id}
            quoteNumber={quote.quote_number}
            projectName={quote.project?.project_name ?? ''}
            totalCost={Number(quote.total_cost || 0)}
            defaultStartMonth={quoteDefaultStartMonth}
            initialSchedules={(costSchedules ?? []) as ProjectCostSchedule[]}
            isAwarded={quote.is_awarded}
          />
        </CardContent>
      </Card>

      {approvalInstance && (
        <Card>
          <CardHeader>
            <CardTitle>承認フロー状況</CardTitle>
            <CardDescription>
              {approvalInstance.route?.name || '承認フロー'} / ステータス: {getStepStatusLabel(approvalInstance.status)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-800">申請者条件:</span> {getRoleLabel(approvalInstance.route?.requester_role)}
              </div>
              <div>
                <span className="font-medium text-gray-800">対象金額:</span> {approvalAmountRange || 'すべて'}
              </div>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">順序</TableHead>
                    <TableHead>承認者ロール</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>承認者</TableHead>
                    <TableHead>承認日時</TableHead>
                    <TableHead>メモ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalSteps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        承認ステップがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalSteps.map((step) => (
                      <TableRow key={step.id}>
                        <TableCell>{step.step_order}</TableCell>
                        <TableCell>{step.approver_role}</TableCell>
                        <TableCell>
                          <Badge variant={getStepBadgeVariant(step.status)}>
                            {getStepStatusLabel(step.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{step.approver?.display_name || '-'}</TableCell>
                        <TableCell>
                          {step.decided_at ? new Date(step.decided_at).toLocaleString('ja-JP') : '-'}
                        </TableCell>
                        <TableCell>{step.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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

            <div>
              <p className="text-sm font-medium text-gray-500">件名</p>
              <p className="text-lg">{quote.subject || '-'}</p>
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
                <TableHead className="text-center">調達状況</TableHead>
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
                  <TableCell className="text-center">
                    {item.requires_procurement ? (
                      <Badge variant={
                        item.procurement_status === '入荷済'
                          ? 'default'
                          : item.procurement_status === '発注済'
                            ? 'secondary'
                            : 'outline'
                      }>
                        {item.procurement_status || '未発注'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">対象外</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle>発注書</CardTitle>
          <CardDescription>見積に紐づく発注書一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              発注書はまだ作成されていません（未発注の明細: {pendingProcurementItems.length}件）
            </p>
          ) : (
            <Table>
              <TableHeader>
        <TableRow>
          <TableHead>発注書番号</TableHead>
          <TableHead>仕入先</TableHead>
          <TableHead>発注日</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>承認ステータス</TableHead>
          <TableHead className="text-right">発注金額</TableHead>
          <TableHead>対象明細</TableHead>
          <TableHead className="text-right w-[240px]">操作</TableHead>
        </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPurchaseOrders.map((order) => {
                  const orderItems = (order.items || []) as PurchaseOrderItem[]
                  const approvalInstanceRaw = order.approval_instance as PurchaseOrderApprovalInstance | PurchaseOrderApprovalInstance[] | null
                  const approvalInstance = Array.isArray(approvalInstanceRaw)
                    ? approvalInstanceRaw[0] ?? null
                    : approvalInstanceRaw ?? null
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.purchase_order_number}</TableCell>
                      <TableCell>{order.supplier?.supplier_name || '未設定'}</TableCell>
                      <TableCell>
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === '発注済' ? 'secondary' : 'outline'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.approval_status === '承認済み'
                              ? 'default'
                              : order.approval_status === '承認待ち'
                                ? 'secondary'
                                : order.approval_status === '却下'
                                  ? 'destructive'
                                  : 'outline'
                          }
                        >
                          {order.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{Number(order.total_cost || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {orderItems.map((item) => {
                            const label = item.quote_item
                              ? `行${item.quote_item.line_number}: ${item.quote_item.product_name}`
                              : item.manual_name || 'カスタム明細'
                            const description = item.manual_description
                            return (
                              <div key={item.id} className="text-sm text-gray-600">
                                {label}
                                {description ? <div className="text-xs text-gray-500">{description}</div> : null}
                              </div>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <PurchaseOrderApprovalActions
                            purchaseOrderId={order.id}
                            approvalStatus={order.approval_status as ApprovalStatus}
                            purchaseOrderStatus={order.status as PurchaseOrderStatus}
                            currentUserId={currentUser?.id || ''}
                            currentUserRole={currentUser?.role || ''}
                            createdBy={order.created_by}
                            approvalInstance={approvalInstance || undefined}
                          />
                          <PurchaseOrderEditDialog
                            order={{
                              id: order.id,
                              purchase_order_number: order.purchase_order_number,
                              order_date: order.order_date,
                              status: order.status,
                              approval_status: order.approval_status,
                              total_cost: Number(order.total_cost || 0),
                              notes: order.notes,
                              supplier: order.supplier ?? null,
                              quote: order.quote
                                ? {
                                    id: order.quote.id,
                                    quote_number: order.quote.quote_number,
                                  }
                                : null,
                              items: orderItems.map((item) => ({
                                id: item.id,
                                quantity: Number(item.quantity || 0),
                                unit_cost: Number(item.unit_cost || 0),
                                amount: Number(item.amount || 0),
                                manual_name: item.manual_name,
                                manual_description: item.manual_description,
                                quote_item: item.quote_item
                                  ? {
                                      id: item.quote_item.id,
                                      line_number: item.quote_item.line_number,
                                      product_name: item.quote_item.product_name,
                                    }
                                  : null,
                              })),
                            }}
                            triggerLabel="編集"
                            size="sm"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VersionHistory currentQuoteId={quote.id} versions={versions ?? []} />
    </div>
  )
}
