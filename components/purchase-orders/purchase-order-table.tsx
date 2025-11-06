'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PurchaseOrderEditDialog, type PurchaseOrderEditable } from '@/components/purchase-orders/purchase-order-edit-dialog'
import { PurchaseOrderApprovalActions } from '@/components/purchase-orders/purchase-order-approval-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { ApprovalStatus, PurchaseOrderStatus, PurchaseOrderApprovalInstance } from '@/types/database'

type StatusFilter = 'all' | '未発注' | '発注済' | 'キャンセル'
type ProcurementFilter = 'all' | 'pending' | 'ordered' | 'received'

export type PurchaseOrderListItem = PurchaseOrderEditable & {
  created_at: string
  approval_status: ApprovalStatus
  approval_instance?: PurchaseOrderApprovalInstance | null
  created_by?: string
  supplier?: {
    id: string
    supplier_name: string | null
  } | null
  quote?: {
    id: string
    quote_number: string
  } | null
  procurementSummary: {
    pending: number
    ordered: number
    received: number
    total: number
  }
}

interface PurchaseOrderTableProps {
  orders: PurchaseOrderListItem[]
  currentUser?: {
    id: string
    role: string
  }
}

const statusVariant = {
  未発注: 'outline',
  発注済: 'secondary',
  キャンセル: 'destructive',
} as const

const formatDate = (value: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ja-JP')
}

const formatCurrency = (value: number) => {
  if (Number.isNaN(Number(value))) return '¥0'
  return `¥${Number(value).toLocaleString()}`
}

export function PurchaseOrderTable({ orders, currentUser }: PurchaseOrderTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [procurementFilter, setProcurementFilter] = useState<ProcurementFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem('purchase-order-table-filters')
      if (stored) {
        const { status, procurement, query } = JSON.parse(stored)
        if (status && ['all', '未発注', '発注済', 'キャンセル'].includes(status)) {
          setStatusFilter(status)
        }
        if (procurement && ['all', 'pending', 'ordered', 'received'].includes(procurement)) {
          setProcurementFilter(procurement)
        }
        if (typeof query === 'string') {
          setSearchQuery(query)
        }
      }
    } catch (error) {
      console.warn('failed to restore purchase order filters', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = JSON.stringify({
      status: statusFilter,
      procurement: procurementFilter,
      query: searchQuery,
    })
    window.localStorage.setItem('purchase-order-table-filters', payload)
  }, [statusFilter, procurementFilter, searchQuery])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }

      if (procurementFilter === 'pending' && order.procurementSummary.pending === 0) {
        return false
      }
      if (procurementFilter === 'ordered' && order.procurementSummary.ordered === 0) {
        return false
      }
      if (procurementFilter === 'received' && order.procurementSummary.received === 0) {
        return false
      }

      if (searchQuery.trim()) {
        const keyword = searchQuery.trim().toLowerCase()
        const supplierName = order.supplier?.supplier_name?.toLowerCase() ?? ''
        const quoteNumber = order.quote?.quote_number?.toLowerCase() ?? ''
        const poNumber = order.purchase_order_number.toLowerCase()
        return (
          supplierName.includes(keyword) ||
          quoteNumber.includes(keyword) ||
          poNumber.includes(keyword)
        )
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case '承認済み': return 'default'
      case '承認待ち': return 'secondary'
      case '却下': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>検索・フィルタ</CardTitle>
          <CardDescription>発注書の絞り込み</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="未発注">未発注</SelectItem>
                  <SelectItem value="発注済">発注済み</SelectItem>
                  <SelectItem value="キャンセル">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>明細ステータス</Label>
              <Select value={procurementFilter} onValueChange={(value) => setProcurementFilter(value as ProcurementFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">未発注を含む</SelectItem>
                  <SelectItem value="ordered">発注済みを含む</SelectItem>
                  <SelectItem value="received">入荷済みを含む</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>キーワード</Label>
              <Input
                ref={searchInputRef}
                placeholder="仕入先名・発注書番号・見積番号など"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <p className="text-xs text-gray-500">ショートカット: Ctrl/Cmd + K でクイック検索</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>発注書一覧</CardTitle>
          <CardDescription>全{filteredOrders.length}件の発注書</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>発注書番号</TableHead>
                  <TableHead>発注日</TableHead>
                  <TableHead>仕入先</TableHead>
                  <TableHead>見積番号</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>明細状況</TableHead>
                  <TableHead>承認ステータス</TableHead>
                  <TableHead className="text-right">発注金額</TableHead>
                  <TableHead className="text-right w-[140px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      条件に一致する発注書がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} id={`po-${order.id}`}>
                      <TableCell className="font-medium">{order.purchase_order_number}</TableCell>
                      <TableCell>{formatDate(order.order_date)}</TableCell>
                      <TableCell>{order.supplier?.supplier_name || '未設定'}</TableCell>
                      <TableCell>{order.quote?.quote_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>
                            <Badge variant={order.procurementSummary.pending > 0 ? 'secondary' : 'outline'}>
                              未発注: {order.procurementSummary.pending}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant={order.procurementSummary.ordered > 0 ? 'default' : 'outline'}>
                              発注済: {order.procurementSummary.ordered}
                            </Badge>
                            <Badge variant={order.procurementSummary.received > 0 ? 'default' : 'outline'}>
                              入荷済: {order.procurementSummary.received}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.approval_status)}>
                          {order.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(order.total_cost || 0))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2">
                          {currentUser ? (
                            <PurchaseOrderApprovalActions
                              purchaseOrderId={order.id}
                              approvalStatus={order.approval_status}
                              purchaseOrderStatus={order.status}
                              currentUserId={currentUser.id}
                              currentUserRole={currentUser.role}
                              createdBy={order.created_by || ''}
                              approvalInstance={(Array.isArray(order.approval_instance)
                                ? order.approval_instance[0]
                                : order.approval_instance) || undefined}
                            />
                          ) : null}
                          <PurchaseOrderEditDialog order={order} triggerLabel="詳細・編集" size="sm" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
