import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP')
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ja-JP')
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, display_name, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    redirect('/dashboard')
  }

  const { data: pendingSteps, error } = await supabase
    .from('quote_approval_instance_steps')
    .select(`
      id,
      step_order,
      status,
      approver_role,
      instance:quote_approval_instances(
        id,
        status,
        current_step,
        requested_at,
        route:approval_routes(name),
        quote:quotes(
          id,
          quote_number,
          issue_date,
          total_amount,
          project:projects(
            project_name,
            project_number,
            customer:customers(customer_name)
          ),
          created_by_user:users!quotes_created_by_fkey(display_name)
        )
      )
    `)
    .eq('status', 'pending')
    .eq('approver_role', currentUser.role)
    .order('step_order', { ascending: true })

  if (error) {
    console.error('Failed to load pending quote approvals:', error)
  }

  const actionableSteps = (pendingSteps || []).filter((step) => {
    const instance = Array.isArray(step.instance) ? step.instance[0] : step.instance
    if (!instance) return false
    if (instance.status !== 'pending') return false
    const currentStepOrder = instance.current_step ?? step.step_order
    return currentStepOrder === step.step_order
  })

  const sortedSteps = actionableSteps.sort((a, b) => {
    const aInstance = Array.isArray(a.instance) ? a.instance[0] : a.instance
    const bInstance = Array.isArray(b.instance) ? b.instance[0] : b.instance
    const aRequested = aInstance?.requested_at ? new Date(aInstance.requested_at).getTime() : 0
    const bRequested = bInstance?.requested_at ? new Date(bInstance.requested_at).getTime() : 0
    return aRequested - bRequested
  })

  const { data: pendingPurchaseOrderSteps, error: poError } = await supabase
    .from('purchase_order_approval_instance_steps')
    .select(`
      id,
      step_order,
      status,
      approver_role,
      instance:purchase_order_approval_instances(
        id,
        status,
        current_step,
        requested_at,
        purchase_order:purchase_orders(
          id,
          purchase_order_number,
          order_date,
          total_cost,
          approval_status,
          quote:quotes(id, quote_number),
          supplier:suppliers(supplier_name),
          created_by
        )
      )
    `)
    .eq('status', 'pending')
    .eq('approver_role', currentUser.role)
    .order('step_order', { ascending: true })

  if (poError) {
    console.error('Failed to load pending purchase order approvals:', poError)
  }

  const actionablePurchaseOrderSteps = (pendingPurchaseOrderSteps || []).filter((step) => {
    const instance = Array.isArray(step.instance) ? step.instance[0] : step.instance
    if (!instance) return false
    if (instance.status !== 'pending') return false
    const currentStepOrder = instance.current_step ?? step.step_order
    return currentStepOrder === step.step_order
  })

  const sortedPurchaseOrderSteps = actionablePurchaseOrderSteps.sort((a, b) => {
    const aInstance = Array.isArray(a.instance) ? a.instance[0] : a.instance
    const bInstance = Array.isArray(b.instance) ? b.instance[0] : b.instance
    const aRequested = aInstance?.requested_at ? new Date(aInstance.requested_at).getTime() : 0
    const bRequested = bInstance?.requested_at ? new Date(bInstance.requested_at).getTime() : 0
    return aRequested - bRequested
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">承認タスク一覧</h1>
          <p className="text-gray-600 mt-2">
            {currentUser.display_name}さん（{currentUser.role}）に割り当てられている承認待ちの見積・発注書を確認できます。
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>承認待ち見積</CardTitle>
          <CardDescription>
            現在の承認者が{currentUser.role}の見積が表示されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSteps.length === 0 ? (
            <div className="py-8 text-center text-gray-500">承認すべき見積はありません。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>見積番号</TableHead>
                  <TableHead>案件名</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>申請者</TableHead>
                  <TableHead>発行日</TableHead>
                  <TableHead>合計金額</TableHead>
                  <TableHead>申請日時</TableHead>
                  <TableHead>承認ステップ</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSteps.map((step) => {
                  const instance = Array.isArray(step.instance) ? step.instance[0] : step.instance
                  const quoteRaw = instance?.quote
                  const quote = Array.isArray(quoteRaw) ? quoteRaw[0] : quoteRaw
                  if (!instance || !quote) return null

                  return (
                    <TableRow key={step.id}>
                      <TableCell className="font-medium">{quote.quote_number}</TableCell>
                      <TableCell>{quote.project?.project_name}</TableCell>
                      <TableCell>{quote.project?.customer?.customer_name}</TableCell>
                      <TableCell>{quote.created_by_user?.display_name || '-'}</TableCell>
                      <TableCell>{formatDate(quote.issue_date)}</TableCell>
                      <TableCell>{formatCurrency(Number(quote.total_amount || 0))}</TableCell>
                      <TableCell>
                        {instance.requested_at ? formatDateTime(instance.requested_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">ステップ{step.step_order}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/quotes/${quote.id}`}>
                          <Button variant="outline" size="sm">
                            詳細へ
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>承認待ち発注書</CardTitle>
          <CardDescription>現在の承認者が{currentUser.role}の発注書が表示されます。</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedPurchaseOrderSteps.length === 0 ? (
            <div className="py-8 text-center text-gray-500">承認すべき発注書はありません。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>発注書番号</TableHead>
                  <TableHead>見積番号</TableHead>
                  <TableHead>仕入先</TableHead>
                  <TableHead>発注日</TableHead>
                  <TableHead>発注金額</TableHead>
                  <TableHead>承認ステータス</TableHead>
                  <TableHead>申請日時</TableHead>
                  <TableHead>承認ステップ</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPurchaseOrderSteps.map((step) => {
                  const instance = Array.isArray(step.instance) ? step.instance[0] : step.instance
                  const purchaseOrderRaw = instance?.purchase_order
                  const purchaseOrder = Array.isArray(purchaseOrderRaw) ? purchaseOrderRaw[0] : purchaseOrderRaw
                  const quote = purchaseOrder?.quote
                  const quoteRecord = Array.isArray(quote) ? quote[0] : quote
                  if (!instance || !purchaseOrder) return null

                  return (
                    <TableRow key={step.id}>
                      <TableCell className="font-medium">{purchaseOrder.purchase_order_number}</TableCell>
                      <TableCell>{quoteRecord?.quote_number || '-'}</TableCell>
                      <TableCell>{purchaseOrder.supplier?.supplier_name || '未設定'}</TableCell>
                      <TableCell>{purchaseOrder.order_date ? formatDate(purchaseOrder.order_date) : '-'}</TableCell>
                      <TableCell>{formatCurrency(Number(purchaseOrder.total_cost || 0))}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            purchaseOrder.approval_status === '承認済み'
                              ? 'default'
                              : purchaseOrder.approval_status === '却下'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {purchaseOrder.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {instance.requested_at ? formatDateTime(instance.requested_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">ステップ{step.step_order}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {quoteRecord?.id ? (
                          <Link href={`/dashboard/quotes/${quoteRecord.id}`}>
                            <Button variant="outline" size="sm">
                              詳細へ
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/dashboard/procurement/purchase-orders#po-${purchaseOrder.id}`}>
                            <Button variant="outline" size="sm">
                              発注書へ
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
