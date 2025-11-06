'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Package, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import { ProcurementAlertReminder } from '@/components/procurement/alert-reminder'

interface DashboardStats {
  totalPending: number
  totalOrdered: number
  totalReceived: number
  alertCount: number
}

type DashboardItemSource = 'quote' | 'standalone'

type ProcurementStatus = '未発注' | '発注済' | '入荷済'

interface DashboardItem {
  id: string
  source: DashboardItemSource
  product_name: string
  description: string | null
  quantity: number
  procurement_status: ProcurementStatus
  project_number: string
  project_name: string
  customer_name: string
  quote_number: string
  purchase_order_number: string | null
  supplier_name: string | null
  cost_amount: number
  order_date: string | null
  procurement_logs: Array<{
    action_type: string
    action_date: string
  }>
}

interface SupplierSummary {
  supplier_name: string
  pending_count: number
  ordered_count: number
  total_cost: number
}

export default function ProcurementDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    totalOrdered: 0,
    totalReceived: 0,
    alertCount: 0,
  })
  const [orderedItems, setOrderedItems] = useState<DashboardItem[]>([])
  const [alertItems, setAlertItems] = useState<DashboardItem[]>([])
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const alertSummaries = useMemo(() => {
    return alertItems.map((item) => ({
      id: item.id,
      productName: item.product_name,
      supplierName: item.supplier_name,
      daysElapsed: item.order_date ? getDaysElapsed(item.order_date) : 0,
      purchaseOrderNumber: item.purchase_order_number || item.quote_number,
    }))
  }, [alertItems])

  const loadDashboardData = async () => {
    try {
      // 見積紐付きの仕入明細を取得
      const { data: quoteItemsData, error: quoteItemsError } = await supabase
        .from('quote_items')
        .select(`
          id,
          product_name,
          description,
          quantity,
          cost_amount,
          procurement_status,
          ordered_at,
          quote:quotes!inner(
            quote_number,
            approval_status,
            project:projects(
              project_number,
              project_name,
              customer:customers(customer_name)
            )
          ),
          supplier:suppliers(supplier_name),
          procurement_logs(action_type, action_date)
        `)
        .is('requires_procurement', true)
        .eq('quote.approval_status', '承認済み')

      if (quoteItemsError) throw quoteItemsError

      const quoteItems: DashboardItem[] = (quoteItemsData || []).map((item) => {
        const normalizedStatus: ProcurementStatus =
          item.procurement_status === '発注済' || item.procurement_status === '入荷済'
            ? (item.procurement_status as ProcurementStatus)
            : '未発注'

        const orderLogDate = item.procurement_logs?.find((log: any) => log.action_type === '発注')?.action_date

        return {
          id: item.id,
          source: 'quote',
          product_name: item.product_name,
          description: item.description,
          quantity: Number(item.quantity || 0),
          procurement_status: normalizedStatus,
          project_number: item.quote.project.project_number,
          project_name: item.quote.project.project_name,
          customer_name: item.quote.project.customer.customer_name,
          quote_number: item.quote.quote_number,
          purchase_order_number: null,
          supplier_name: item.supplier?.supplier_name ?? null,
          cost_amount: Number(item.cost_amount || 0),
          order_date: orderLogDate || item.ordered_at || null,
          procurement_logs: item.procurement_logs || [],
        }
      })

      // 単独発注書（見積と紐づかない発注書）の明細を取得
      const { data: standaloneOrders, error: standaloneError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          purchase_order_number,
          status,
          order_date,
          supplier:suppliers(supplier_name),
          items:purchase_order_items(
            id,
            quantity,
            amount,
            manual_name,
            manual_description,
            quote_item_id
          )
        `)
        .is('quote_id', null)
        .neq('status', 'キャンセル')

      if (standaloneError) throw standaloneError

      const standaloneItems: DashboardItem[] = (standaloneOrders || []).flatMap((order) => {
        const normalizedStatus: ProcurementStatus = order.status === '発注済' ? '発注済' : '未発注'

        return (order.items || [])
          .filter((item) => !item.quote_item_id)
          .map((item) => ({
            id: `${order.id}:${item.id}`,
            source: 'standalone' as const,
            product_name: item.manual_name || 'カスタム明細',
            description: item.manual_description || null,
            quantity: Number(item.quantity || 0),
            procurement_status: normalizedStatus,
            project_number: '-',
            project_name: '単独発注',
            customer_name: '-',
            quote_number: '-',
            purchase_order_number: order.purchase_order_number,
            supplier_name: order.supplier?.supplier_name ?? null,
            cost_amount: item.amount != null ? Number(item.amount) : 0,
            order_date: order.order_date ?? null,
            procurement_logs: [],
          }))
      })

      const combinedItems = [...quoteItems, ...standaloneItems]

      const pendingItems = combinedItems.filter((item) => item.procurement_status === '未発注')
      const orderedItemsList = combinedItems.filter((item) => item.procurement_status === '発注済')
      const receivedItems = combinedItems.filter((item) => item.procurement_status === '入荷済')

      const alerts = orderedItemsList.filter((item) => {
        if (!item.order_date) return false
        const targetDate = new Date(item.order_date)
        if (Number.isNaN(targetDate.getTime())) return false
        const today = new Date()
        const daysElapsed = Math.floor(
          (today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysElapsed >= 14
      })

      setStats({
        totalPending: pendingItems.length,
        totalOrdered: orderedItemsList.length,
        totalReceived: receivedItems.length,
        alertCount: alerts.length,
      })

      const orderedItemsSorted = [...orderedItemsList].sort((a, b) => {
        const dateA = a.order_date ? new Date(a.order_date).getTime() : 0
        const dateB = b.order_date ? new Date(b.order_date).getTime() : 0
        return dateB - dateA
      })

      setOrderedItems(orderedItemsSorted)
      setAlertItems(alerts)

      const supplierMap = new Map<string, SupplierSummary>()

      combinedItems.forEach((item) => {
        const supplierName = item.supplier_name || '未設定'
        if (!supplierMap.has(supplierName)) {
          supplierMap.set(supplierName, {
            supplier_name: supplierName,
            pending_count: 0,
            ordered_count: 0,
            total_cost: 0,
          })
        }

        const summary = supplierMap.get(supplierName)!

        if (item.procurement_status === '未発注') {
          summary.pending_count++
        } else if (item.procurement_status === '発注済') {
          summary.ordered_count++
        }

        summary.total_cost += Number(item.cost_amount || 0)
      })

      const sortedSummary = Array.from(supplierMap.values()).sort(
        (a, b) => b.pending_count + b.ordered_count - (a.pending_count + a.ordered_count)
      )

      setSupplierSummary(sortedSummary)

      setLoading(false)
    } catch (error) {
      console.error('ダッシュボードデータ読込エラー:', error)
      alert('データの読込に失敗しました')
      setLoading(false)
    }
  }

  function getDaysElapsed(dateString: string) {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 0
    const today = new Date()
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getElapsedBadge = (days: number) => {
    if (days < 7) {
      return <Badge variant="outline">{days}日</Badge>
    } else if (days < 14) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          {days}日
        </Badge>
      )
    } else {
      return <Badge variant="destructive">{days}日</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>読込中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">発注・入荷 進捗ダッシュボード</h1>
        <p className="text-gray-600 mt-2">発注・入荷状況の概要</p>
      </div>

      <ProcurementAlertReminder alerts={alertSummaries} />

      {/* 統計カード */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未発注</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPending}件</div>
            <p className="text-xs text-gray-600 mt-1">
              <Link href="/dashboard/procurement/pending" className="text-blue-600 hover:underline">
                発注候補一覧へ →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">発注済み（未入荷）</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalOrdered}件</div>
            <p className="text-xs text-gray-600 mt-1">
              <Link href="/dashboard/procurement/receiving" className="text-blue-600 hover:underline">
                入荷登録へ →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">入荷済み</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalReceived}件</div>
            <p className="text-xs text-gray-600 mt-1">今月の入荷完了数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">長期未入荷</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.alertCount}件</div>
            <p className="text-xs text-gray-600 mt-1">14日以上経過</p>
          </CardContent>
        </Card>
      </div>

      {/* アラート：長期未入荷 */}
      {alertItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              要確認：長期未入荷明細
            </CardTitle>
            <CardDescription>発注から14日以上経過している明細があります</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>案件名</TableHead>
                  <TableHead>品名</TableHead>
                  <TableHead>仕入先</TableHead>
                  <TableHead>発注日</TableHead>
                  <TableHead>経過日数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertItems.slice(0, 5).map((item) => {
                  const orderDate = item.order_date
                  const daysElapsed = orderDate ? getDaysElapsed(orderDate) : 0

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.project_name}</TableCell>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.supplier_name || '-'}</TableCell>
                      <TableCell>
                        {orderDate ? new Date(orderDate).toLocaleDateString('ja-JP') : '-'}
                      </TableCell>
                      <TableCell>{orderDate ? getElapsedBadge(daysElapsed) : '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {alertItems.length > 5 && (
              <p className="text-sm text-gray-600 mt-4 text-center">
                他 {alertItems.length - 5} 件
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 仕入先別サマリー */}
      <Card>
        <CardHeader>
          <CardTitle>仕入先別サマリー</CardTitle>
          <CardDescription>仕入先ごとの発注状況</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>仕入先</TableHead>
                <TableHead className="text-right">未発注</TableHead>
                <TableHead className="text-right">発注済み</TableHead>
                <TableHead className="text-right">合計明細数</TableHead>
                <TableHead className="text-right">合計仕入金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                supplierSummary.map((summary, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{summary.supplier_name}</TableCell>
                    <TableCell className="text-right">
                      {summary.pending_count > 0 ? (
                        <Badge variant="outline">{summary.pending_count}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {summary.ordered_count > 0 ? (
                        <Badge variant="secondary">{summary.ordered_count}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {summary.pending_count + summary.ordered_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(summary.total_cost)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 最近の発注済み明細 */}
      <Card>
        <CardHeader>
          <CardTitle>最近発注した明細</CardTitle>
          <CardDescription>発注済み・未入荷の明細（最新10件）</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件番号</TableHead>
                <TableHead>案件名</TableHead>
                <TableHead>品名</TableHead>
                <TableHead>仕入先</TableHead>
                <TableHead>発注日</TableHead>
                <TableHead>経過日数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    発注済みの明細がありません
                  </TableCell>
                </TableRow>
              ) : (
                orderedItems.slice(0, 10).map((item) => {
                  const orderDate = item.order_date
                  const daysElapsed = orderDate ? getDaysElapsed(orderDate) : 0

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.project_number}</TableCell>
                      <TableCell>{item.project_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.description ? (
                            <p className="text-sm text-gray-500">{item.description}</p>
                          ) : null}
                          {item.source === 'standalone' && item.purchase_order_number ? (
                            <p className="text-xs text-gray-500">
                              発注書番号: {item.purchase_order_number}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{item.supplier_name || '-'}</TableCell>
                      <TableCell>
                        {orderDate ? new Date(orderDate).toLocaleDateString('ja-JP') : '-'}
                      </TableCell>
                      <TableCell>{orderDate ? getElapsedBadge(daysElapsed) : '-'}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          {orderedItems.length > 10 && (
            <div className="mt-4 text-center">
              <Link href="/dashboard/procurement/receiving">
                <span className="text-sm text-blue-600 hover:underline">
                  すべて表示 ({orderedItems.length}件) →
                </span>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
