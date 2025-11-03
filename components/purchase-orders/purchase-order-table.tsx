'use client'

import { useMemo, useState } from 'react'
import { PurchaseOrderEditDialog, type PurchaseOrderEditable } from '@/components/purchase-orders/purchase-order-edit-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type StatusFilter = 'all' | '下書き' | '発注済' | 'キャンセル'

export type PurchaseOrderListItem = PurchaseOrderEditable & {
  created_at: string
  supplier?: {
    id: string
    supplier_name: string | null
  } | null
  quote?: {
    id: string
    quote_number: string
  } | null
}

interface PurchaseOrderTableProps {
  orders: PurchaseOrderListItem[]
}

const statusVariant = {
  下書き: 'outline',
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

export function PurchaseOrderTable({ orders }: PurchaseOrderTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
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
                  <SelectItem value="下書き">下書き</SelectItem>
                  <SelectItem value="発注済">発注済み</SelectItem>
                  <SelectItem value="キャンセル">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>キーワード</Label>
              <Input
                placeholder="仕入先名・発注書番号・見積番号など"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
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
                  <TableHead className="text-right">発注金額</TableHead>
                  <TableHead className="text-right w-[140px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      条件に一致する発注書がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.purchase_order_number}</TableCell>
                      <TableCell>{formatDate(order.order_date)}</TableCell>
                      <TableCell>{order.supplier?.supplier_name || '未設定'}</TableCell>
                      <TableCell>{order.quote?.quote_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(order.total_cost || 0))}</TableCell>
                      <TableCell className="text-right">
                        <PurchaseOrderEditDialog order={order} triggerLabel="詳細・編集" size="sm" />
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
