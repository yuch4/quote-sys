'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { updatePurchaseOrder } from '@/app/(dashboard)/dashboard/procurement/purchase-orders/actions'
import type { PurchaseOrderStatus } from '@/types/database'

type PurchaseOrderItemSummary = {
  id: string
  quantity: number
  unit_cost: number
  amount: number
  manual_name?: string | null
  manual_description?: string | null
  quote_item?: {
    id: string
    line_number: number
    product_name: string
  } | null
}

export type PurchaseOrderEditable = {
  id: string
  purchase_order_number: string
  order_date: string | null
  status: PurchaseOrderStatus
  approval_status?: '下書き' | '承認待ち' | '承認済み' | '却下'
  total_cost: number
  notes: string | null
  created_by?: string
  quote?: {
    id: string
    quote_number: string
  } | null
  supplier?: {
    id: string
    supplier_name: string | null
  } | null
  items?: PurchaseOrderItemSummary[]
}

interface PurchaseOrderEditDialogProps {
  order: PurchaseOrderEditable
  triggerLabel?: string
  size?: 'default' | 'sm'
}

const statusBadgeVariant: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  下書き: 'outline',
  発注済: 'secondary',
  キャンセル: 'destructive',
}

const formatCurrency = (value: number) => {
  if (Number.isNaN(Number(value))) return '¥0'
  return `¥${Number(value).toLocaleString()}`
}

export function PurchaseOrderEditDialog({
  order,
  triggerLabel = '編集',
  size = 'default',
}: PurchaseOrderEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [orderDate, setOrderDate] = useState(() => {
    if (!order.order_date) return ''
    return new Date(order.order_date).toISOString().split('T')[0]
  })
  const [status, setStatus] = useState<PurchaseOrderStatus>(order.status)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [isPending, startTransition] = useTransition()

  const totalAmount = useMemo(() => {
    if (!order.items) return Number(order.total_cost || 0)
    return order.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [order.items, order.total_cost])

  const approvalStatusLabel = order.approval_status || '下書き'

  const resetForm = () => {
    setOrderDate(order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '')
    setStatus(order.status)
    setNotes(order.notes ?? '')
  }

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      resetForm()
    }
  }

  const handleSubmit = () => {
    if (!orderDate && status === '発注済') {
      toast.error('発注済みにする場合は発注日を入力してください')
      return
    }

    startTransition(async () => {
      const result = await updatePurchaseOrder({
        purchaseOrderId: order.id,
        orderDate: orderDate || undefined,
        status,
        notes,
      })

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const supplierName = order.supplier?.supplier_name || '未設定'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size={size} variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>発注書を編集</DialogTitle>
          <DialogDescription>
            {order.purchase_order_number}（仕入先: {supplierName}）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-gray-600 flex justify-between">
            <span>承認ステータス: {approvalStatusLabel}</span>
            <span>発注ステータス: {order.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>発注日</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as PurchaseOrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="下書き">下書き</SelectItem>
                  <SelectItem value="発注済">発注済み</SelectItem>
                  <SelectItem value="キャンセル">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>メモ</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="仕入先との調整事項などを記録できます"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>対象明細</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">仕入単価</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.items || []).map((item) => {
                  const title = item.quote_item
                    ? `行${item.quote_item.line_number}: ${item.quote_item.product_name}`
                    : item.manual_name || 'カスタム明細'
                  const description = item.quote_item
                    ? item.manual_description || ''
                    : item.manual_description || ''

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{title}</span>
                          {description ? (
                            <span className="text-sm text-gray-600">{description}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{Number(item.quantity || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.unit_cost || 0))}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(item.amount || 0))}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="flex justify-between px-4 py-3 border-t bg-muted/50">
              <span className="text-sm text-gray-600">発注金額</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-4 py-3 bg-muted/40">
            <div>
              <p className="text-sm text-gray-600">現在のステータス</p>
              <Badge variant={statusBadgeVariant[status]}>{status}</Badge>
            </div>
            {order.quote ? (
              <div className="text-sm text-right">
                <p className="text-gray-600">紐づく見積</p>
                <p className="font-medium">{order.quote.quote_number}</p>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '更新中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
