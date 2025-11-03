'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createPurchaseOrders } from '@/app/(dashboard)/dashboard/quotes/[id]/actions'
import type { QuoteItem } from '@/types/database'

type OrderableItem = Pick<
  QuoteItem,
  'id' | 'line_number' | 'product_name' | 'quantity' | 'cost_price' | 'cost_amount' | 'requires_procurement' | 'procurement_status'
> & {
  supplier?: { id: string | null; supplier_name: string | null }
}

interface PurchaseOrderDialogProps {
  quoteId: string
  quoteNumber: string
  items: OrderableItem[]
}

export function PurchaseOrderDialog({ quoteId, quoteNumber, items }: PurchaseOrderDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [combineBySupplier, setCombineBySupplier] = useState(true)
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const orderableItems = useMemo(
    () =>
      items.filter(
        (item) => item.requires_procurement && item.procurement_status !== '発注済'
      ),
    [items]
  )

  const toggleItem = (itemId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(itemId)
      } else {
        next.delete(itemId)
      }
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const allSelectable = orderableItems.filter((item) => item.supplier?.id)
      setSelected(new Set(allSelectable.map((item) => item.id)))
    } else {
      setSelected(new Set())
    }
  }

  const handleCreate = () => {
    if (selected.size === 0) {
      toast.error('発注する明細を選択してください')
      return
    }

    startTransition(async () => {
      const result = await createPurchaseOrders({
        quoteId,
        itemIds: Array.from(selected),
        orderDate,
        combineBySupplier,
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        setNotes('')
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const selectedSupplierCount = useMemo(() => {
    const supplierSet = new Set<string>()
    orderableItems.forEach((item) => {
      if (selected.has(item.id) && item.supplier?.id) {
        supplierSet.add(item.supplier.id)
      }
    })
    return supplierSet.size
  }, [orderableItems, selected])

  const missingSupplierCount = useMemo(
    () => orderableItems.filter((item) => !item.supplier?.id).length,
    [orderableItems]
  )

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) {
      const selectable = orderableItems.filter((item) => item.supplier?.id)
      setSelected(new Set(selectable.map((item) => item.id)))
    } else {
      setSelected(new Set())
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={orderableItems.length === 0}>
          発注書を作成
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>発注書を作成</DialogTitle>
          <DialogDescription>
            見積 {quoteNumber} の仕入対象明細から発注書を作成します。
          </DialogDescription>
        </DialogHeader>

        {orderableItems.length === 0 ? (
          <p className="text-sm text-gray-600">
            仕入先が設定された未発注の明細がありません。
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderDate">発注日</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Checkbox
                    checked={combineBySupplier}
                    onCheckedChange={(value) => setCombineBySupplier(Boolean(value))}
                  />
                  同一仕入先の明細をまとめる
                </Label>
                <p className="text-xs text-gray-500">
                  {combineBySupplier
                    ? `発注書は仕入先ごとに ${selectedSupplierCount} 件生成されます。`
                    : '明細ごとに個別の発注書を作成します。'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                placeholder="発注書に残したいメモがあれば入力してください"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {missingSupplierCount > 0 && (
              <p className="text-xs text-red-600">
                仕入先が未設定の明細が {missingSupplierCount} 件あります。仕入先を設定すると選択できるようになります。
              </p>
            )}

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      selected.size > 0 &&
                      selected.size === orderableItems.filter((item) => item.supplier?.id).length
                    }
                    onCheckedChange={(value) => toggleAll(Boolean(value))}
                  />
                </TableHead>
                    <TableHead>行番号</TableHead>
                    <TableHead>品名</TableHead>
                    <TableHead>仕入先</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">仕入原価</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderableItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={(value) => toggleItem(item.id, Boolean(value))}
                          disabled={!item.supplier?.id}
                        />
                      </TableCell>
                      <TableCell>{item.line_number}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>
                        {item.supplier?.supplier_name || (
                          <span className="text-red-600 text-sm">仕入先未設定</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ¥{Number(item.cost_amount ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreate} disabled={isPending || selected.size === 0}>
            {isPending ? '作成中...' : '発注書を作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
