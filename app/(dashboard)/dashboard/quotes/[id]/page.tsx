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

  // 粗利率に応じた色を取得
  const getProfitRateColor = (rate: number) => {
    if (rate >= 30) return 'text-emerald-600'
    if (rate >= 20) return 'text-green-600'
    if (rate >= 10) return 'text-amber-600'
    return 'text-red-600'
  }

  const profitRate = quote.total_amount > 0 
    ? (Number(quote.gross_profit) / Number(quote.total_amount)) * 100 
    : 0

  // ステータスに応じたスタイル
  const getStatusStyle = (status: string) => {
    switch (status) {
      case '承認済み':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case '承認待ち':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case '却下':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 page-enter">
      {/* ヘッダー */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
        
        <div className="relative flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <svg className="h-6 w-6 text-turquoise-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{quote.quote_number}</h1>
                <p className="text-sm text-slate-300">v{quote.version} | {formatDate(quote.issue_date)}</p>
              </div>
            </div>
            <p className="text-lg text-white/90">{quote.subject || quote.project?.project_name || '-'}</p>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${getStatusStyle(quote.approval_status)}`}>
                {quote.approval_status === '承認済み' && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {quote.approval_status === '承認待ち' && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                )}
                {quote.approval_status}
              </span>
              {quote.is_awarded && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/20 px-3 py-1 text-sm font-medium text-gold">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  受注確定
                </span>
              )}
            </div>
          </div>
          
          {/* 金額サマリー */}
          <div className="text-right">
            <p className="text-sm text-slate-400">合計金額</p>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(Number(quote.total_amount))}</p>
            <div className="mt-2 flex items-center justify-end gap-3 text-sm">
              <span className="text-slate-400">粗利</span>
              <span className="font-semibold text-emerald-400">{formatCurrency(Number(quote.gross_profit))}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                profitRate >= 30 ? 'bg-emerald-500/20 text-emerald-300' :
                profitRate >= 20 ? 'bg-green-500/20 text-green-300' :
                profitRate >= 10 ? 'bg-amber-500/20 text-amber-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {profitRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* アクションバー */}
      <div className="flex items-center justify-between rounded-xl border-0 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {quote.project?.customer?.customer_name}
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {quote.project?.sales_rep?.display_name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {quote.project?.id && (
            <Link href={`/dashboard/projects/${quote.project.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                案件詳細
              </Button>
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
              <Button variant="outline" size="sm" className="gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                改訂
              </Button>
            </Link>
          )}
          {quote.approval_status === '下書き' && (
            <Link href={`/dashboard/quotes/${quote.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編集
              </Button>
            </Link>
          )}
          <Link href="/dashboard/quotes">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              一覧
            </Button>
          </Link>
        </div>
      </div>

      {/* 売上・仕入計上予定 - 2カラム */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">売上計上予定</CardTitle>
                <CardDescription className="text-xs">月次売上計上予定を管理</CardDescription>
              </div>
            </div>
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

        <Card className="border-0 shadow-lg card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">仕入計上予定</CardTitle>
                <CardDescription className="text-xs">月次仕入計上予定を管理</CardDescription>
              </div>
            </div>
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
      </div>

      {approvalInstance && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base">{approvalInstance.route?.name || '承認フロー'}</CardTitle>
                  <CardDescription className="text-xs">
                    対象金額: {approvalAmountRange || 'すべて'}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={getStepBadgeVariant(approvalInstance.status)} className="text-xs">
                {getStepStatusLabel(approvalInstance.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* ステップインジケーター */}
            <div className="flex items-center justify-between mb-6 px-4">
              {approvalSteps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      step.status === 'approved' 
                        ? 'border-emerald-500 bg-emerald-500 text-white' 
                        : step.status === 'rejected'
                        ? 'border-red-500 bg-red-500 text-white'
                        : step.status === 'pending' && approvalInstance.current_step === step.step_order
                        ? 'border-amber-500 bg-amber-50 text-amber-600 animate-pulse'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}>
                      {step.status === 'approved' ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step.status === 'rejected' ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{step.step_order}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium text-slate-700">{step.approver_role}</p>
                      {step.approver?.display_name && (
                        <p className="text-xs text-slate-500">{step.approver.display_name}</p>
                      )}
                    </div>
                  </div>
                  {index < approvalSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 ${
                      step.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            
            {/* 承認履歴テーブル */}
            <div className="rounded-lg border bg-slate-50/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60px] text-xs">順序</TableHead>
                    <TableHead className="text-xs">承認者ロール</TableHead>
                    <TableHead className="text-xs">ステータス</TableHead>
                    <TableHead className="text-xs">承認者</TableHead>
                    <TableHead className="text-xs">承認日時</TableHead>
                    <TableHead className="text-xs">メモ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalSteps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        承認ステップがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalSteps.map((step) => (
                      <TableRow key={step.id} className="hover:bg-white/50">
                        <TableCell className="text-sm font-medium">{step.step_order}</TableCell>
                        <TableCell className="text-sm">{step.approver_role}</TableCell>
                        <TableCell>
                          <Badge variant={getStepBadgeVariant(step.status)} className="text-xs">
                            {getStepStatusLabel(step.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{step.approver?.display_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {step.decided_at ? new Date(step.decided_at).toLocaleString('ja-JP') : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{step.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 基本情報 & 金額情報 - 2カラム */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-lg card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="text-base">基本情報</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">見積番号</p>
                  <p className="text-lg font-semibold mt-1">{quote.quote_number}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">件名</p>
                  <p className="text-base mt-1">{quote.subject || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">発行日</p>
                  <p className="text-base mt-1">{formatDate(quote.issue_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">作成者</p>
                  <p className="text-base mt-1">{quote.created_by_user?.display_name}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">バージョン</p>
                  <p className="text-lg font-semibold mt-1">v{quote.version}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">有効期限</p>
                  <p className="text-base mt-1">{quote.valid_until ? formatDate(quote.valid_until) : '-'}</p>
                </div>
                {quote.approved_by_user && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">承認者</p>
                    <p className="text-base mt-1">{quote.approved_by_user.display_name}</p>
                    <p className="text-xs text-muted-foreground">{quote.approved_at ? formatDate(quote.approved_at) : ''}</p>
                  </div>
                )}
                {quote.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">備考</p>
                    <p className="text-sm mt-1 text-muted-foreground">{quote.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg card-hover bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="text-base">金額情報</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800 text-white">
              <p className="text-xs text-slate-400 uppercase tracking-wider">合計金額</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(Number(quote.total_amount))}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wider">合計仕入金額</p>
              <p className="text-xl font-semibold mt-1 text-slate-700">{formatCurrency(Number(quote.total_cost))}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 uppercase tracking-wider">粗利</p>
                  <p className={`text-2xl font-bold mt-1 ${getProfitRateColor(profitRate)}`}>
                    {formatCurrency(Number(quote.gross_profit))}
                  </p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  profitRate >= 30 ? 'bg-emerald-100' :
                  profitRate >= 20 ? 'bg-green-100' :
                  profitRate >= 10 ? 'bg-amber-100' :
                  'bg-red-100'
                }`}>
                  <span className={`text-lg font-bold ${getProfitRateColor(profitRate)}`}>
                    {profitRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 案件情報 */}
      <Card className="border-0 shadow-lg card-hover">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <CardTitle className="text-base">案件情報</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">案件番号</p>
              <p className="text-base font-medium mt-1">{quote.project?.project_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">案件名</p>
              <p className="text-base mt-1">{quote.project?.project_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">顧客名</p>
              <p className="text-base mt-1">{quote.project?.customer?.customer_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">営業担当</p>
              <p className="text-base mt-1">{quote.project?.sales_rep?.display_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 見積明細 */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">見積明細</CardTitle>
                <CardDescription className="text-xs">{sortedItems.length}件の明細</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-slate-50/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-100/50">
                  <TableHead className="w-[50px] text-xs font-semibold">No.</TableHead>
                  <TableHead className="text-xs font-semibold">品名</TableHead>
                  <TableHead className="text-xs font-semibold">説明</TableHead>
                  <TableHead className="text-right text-xs font-semibold">数量</TableHead>
                  <TableHead className="text-right text-xs font-semibold">単価</TableHead>
                  <TableHead className="text-right text-xs font-semibold">金額</TableHead>
                  <TableHead className="text-xs font-semibold">仕入先</TableHead>
                  <TableHead className="text-right text-xs font-semibold">仕入単価</TableHead>
                  <TableHead className="text-right text-xs font-semibold">粗利</TableHead>
                  <TableHead className="text-center text-xs font-semibold">調達</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, index) => {
                  const itemProfitRate = Number(item.amount) > 0 
                    ? (Number(item.gross_profit) / Number(item.amount)) * 100 
                    : 0
                  return (
                    <TableRow key={item.id} className={`hover:bg-white/80 ${index % 2 === 0 ? 'bg-white/40' : ''}`}>
                      <TableCell className="text-sm font-medium text-muted-foreground">{item.line_number}</TableCell>
                      <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatCurrency(Number(item.unit_price))}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatCurrency(Number(item.amount))}</TableCell>
                      <TableCell className="text-sm">{item.supplier?.supplier_name || '-'}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {item.cost_price ? formatCurrency(Number(item.cost_price)) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-semibold tabular-nums ${getProfitRateColor(itemProfitRate)}`}>
                            {formatCurrency(Number(item.gross_profit))}
                          </span>
                          <span className="text-xs text-muted-foreground">{itemProfitRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.requires_procurement ? (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              item.procurement_status === '入荷済'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.procurement_status === '発注済'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {item.procurement_status || '未発注'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 合計サマリー */}
          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">合計金額</span>
                <span className="font-medium tabular-nums">{formatCurrency(Number(quote.total_amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">合計仕入</span>
                <span className="font-medium tabular-nums">{formatCurrency(Number(quote.total_cost))}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">粗利</span>
                  <div className="text-right">
                    <span className={`text-xl font-bold tabular-nums ${getProfitRateColor(profitRate)}`}>
                      {formatCurrency(Number(quote.gross_profit))}
                    </span>
                    <span className={`ml-2 text-sm ${getProfitRateColor(profitRate)}`}>
                      ({profitRate.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 発注書一覧 */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">発注書</CardTitle>
                <CardDescription className="text-xs">
                  {purchaseOrders.length > 0 
                    ? `${purchaseOrders.length}件の発注書` 
                    : `未発注の明細: ${pendingProcurementItems.length}件`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-1">発注書はまだ作成されていません</p>
              <p className="text-sm text-muted-foreground">未発注の明細: {pendingProcurementItems.length}件</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-slate-50/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-100/50">
                    <TableHead className="text-xs font-semibold">発注書番号</TableHead>
                    <TableHead className="text-xs font-semibold">仕入先</TableHead>
                    <TableHead className="text-xs font-semibold">発注日</TableHead>
                    <TableHead className="text-xs font-semibold">ステータス</TableHead>
                    <TableHead className="text-xs font-semibold">承認</TableHead>
                    <TableHead className="text-right text-xs font-semibold">発注金額</TableHead>
                    <TableHead className="text-xs font-semibold">対象明細</TableHead>
                    <TableHead className="text-right text-xs font-semibold w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {sortedPurchaseOrders.map((order, index) => {
                  const orderItems = (order.items || []) as PurchaseOrderItem[]
                  const approvalInstanceRaw = order.approval_instance as PurchaseOrderApprovalInstance | PurchaseOrderApprovalInstance[] | null
                  const approvalInstance = Array.isArray(approvalInstanceRaw)
                    ? approvalInstanceRaw[0] ?? null
                    : approvalInstanceRaw ?? null
                  return (
                    <TableRow key={order.id} className={`hover:bg-white/80 ${index % 2 === 0 ? 'bg-white/40' : ''}`}>
                      <TableCell className="font-medium text-sm">{order.purchase_order_number}</TableCell>
                      <TableCell className="text-sm">{order.supplier?.supplier_name || '未設定'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            order.status === '発注済' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            order.approval_status === '承認済み'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.approval_status === '承認待ち'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : order.approval_status === '却下'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {order.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        ¥{Number(order.total_cost || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 max-w-[200px]">
                          {orderItems.slice(0, 2).map((item) => {
                            const label = item.quote_item
                              ? `#${item.quote_item.line_number} ${item.quote_item.product_name}`
                              : item.manual_name || 'カスタム明細'
                            return (
                              <p key={item.id} className="text-xs text-muted-foreground truncate">
                                {label}
                              </p>
                            )
                          })}
                          {orderItems.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              他{orderItems.length - 2}件
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
            </div>
          )}
        </CardContent>
      </Card>

      <VersionHistory currentQuoteId={quote.id} versions={versions ?? []} />
    </div>
  )
}
