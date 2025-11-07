'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2 } from 'lucide-react'
import { createPurchaseOrders } from '@/app/(dashboard)/dashboard/quotes/[id]/actions'
import { createStandalonePurchaseOrder } from '@/app/(dashboard)/dashboard/procurement/purchase-orders/actions'
import type { QuoteItem } from '@/types/database'

type QuoteOption = {
  id: string
  quote_number: string
  project_name: string | null
}

type OrderableItem = Pick<
  QuoteItem,
  'id' | 'line_number' | 'product_name' | 'quantity' | 'cost_price' | 'cost_amount' | 'requires_procurement' | 'procurement_status'
> & {
  supplier?: { id: string | null; supplier_name: string | null }
}

interface PurchaseOrderCreateDialogProps {
  quotes: QuoteOption[]
  suppliers: { id: string; supplier_name: string }[]
}

type ManualItem = {
  id: string
  name: string
  description: string
  quantity: string
  unitCost: string
}

const createManualItem = (): ManualItem => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  name: '',
  description: '',
  quantity: '1',
  unitCost: '0',
})

export function PurchaseOrderCreateDialog({ quotes, suppliers }: PurchaseOrderCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'quote' | 'manual'>('quote')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [items, setItems] = useState<OrderableItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [combineBySupplier, setCombineBySupplier] = useState(true)
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [orderTitle, setOrderTitle] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [manualSupplierId, setManualSupplierId] = useState('')
  const [manualItems, setManualItems] = useState<ManualItem[]>([createManualItem()])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!open) {
      setMode('quote')
      setSelectedQuoteId('')
      setItems([])
      setSelectedItems(new Set())
      setCombineBySupplier(true)
      setOrderDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setOrderTitle('')
      setContactInfo('')
      setManualSupplierId('')
      setManualItems([createManualItem()])
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (quotes.length === 0 && suppliers.length > 0) {
        setMode('manual')
      } else if (quotes.length > 0) {
        setMode('quote')
      }
    }
  }, [open, quotes.length, suppliers.length])

  useEffect(() => {
    if (mode === 'manual') {
      setSelectedQuoteId('')
      setItems([])
      setSelectedItems(new Set())
    }
  }, [mode])

  useEffect(() => {
    if (!open || mode !== 'quote' || !selectedQuoteId) return

    const fetchItems = async () => {
      setLoadingItems(true)
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          id,
          line_number,
          product_name,
          quantity,
          cost_price,
          cost_amount,
          requires_procurement,
          procurement_status,
          supplier:suppliers(id, supplier_name)
        `)
        .eq('quote_id', selectedQuoteId)

      if (error) {
        console.error('Failed to load quote items:', error)
        toast.error('明細の読込に失敗しました')
        setItems([])
        setSelectedItems(new Set())
        setLoadingItems(false)
        return
      }

      const orderable = (data || []).filter(
        (item) =>
          item.requires_procurement &&
          item.procurement_status !== '発注済' &&
          item.supplier?.id
      ) as OrderableItem[]
      setItems(orderable)
      setSelectedItems(new Set(orderable.map((item) => item.id)))
      setLoadingItems(false)
    }

    fetchItems()
  }, [open, mode, selectedQuoteId, supabase])

  const toggleItem = (itemId: string, checked: boolean) => {
    setSelectedItems((prev) => {
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
      const selectable = items.filter((item) => item.supplier?.id)
      setSelectedItems(new Set(selectable.map((item) => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const selectedSupplierCount = useMemo(() => {
    const supplierSet = new Set<string>()
    items.forEach((item) => {
      if (selectedItems.has(item.id) && item.supplier?.id) {
        supplierSet.add(item.supplier.id)
      }
    })
    return supplierSet.size
  }, [items, selectedItems])

  const missingSupplierCount = useMemo(
    () => items.filter((item) => !item.supplier?.id).length,
    [items]
  )

  const manualItemsTotal = useMemo(() =>
    manualItems.reduce((sum, item) => {
      const quantity = Number(item.quantity)
      const unitCost = Number(item.unitCost)
      if (Number.isNaN(quantity) || Number.isNaN(unitCost)) return sum
      return sum + quantity * unitCost
    }, 0),
  [manualItems])

  const manualItemsValid = useMemo(() =>
    manualItems.length > 0 && manualItems.every((item) => {
      const quantity = Number(item.quantity)
      const unitCost = Number(item.unitCost)
      return item.name.trim() !== '' && quantity > 0 && unitCost >= 0
    }),
  [manualItems])

  const disableStandaloneCreate =
    mode === 'manual' && (!manualSupplierId || !manualItemsValid || manualItemsTotal <= 0)

  const disableQuoteCreate =
    !selectedQuoteId || selectedItems.size === 0 || loadingItems || items.length === 0

  const handleCreate = () => {
    const assembledNotes = [
      orderTitle.trim() ? `件名: ${orderTitle.trim()}` : null,
      contactInfo.trim() ? `連絡先: ${contactInfo.trim()}` : null,
      notes.trim() || null,
    ]
      .filter(Boolean)
      .join('\n') || undefined

    if (mode === 'quote') {
      if (!selectedQuoteId) {
        toast.error('対象の見積を選択してください')
        return
      }

      if (selectedItems.size === 0) {
        toast.error('発注する明細を選択してください')
        return
      }

      startTransition(async () => {
        const result = await createPurchaseOrders({
          quoteId: selectedQuoteId,
          itemIds: Array.from(selectedItems),
          orderDate,
          combineBySupplier,
          notes: assembledNotes,
        })

        if (result.success) {
          toast.success(result.message)
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.message)
        }
      })
    } else {
      if (!manualSupplierId) {
        toast.error('仕入先を選択してください')
        return
      }

      if (!manualItemsValid) {
        toast.error('明細の入力内容を確認してください')
        return
      }

      startTransition(async () => {
        const result = await createStandalonePurchaseOrder({
          supplierId: manualSupplierId,
          orderDate,
          notes: assembledNotes,
          items: manualItems.map((item) => ({
            name: item.name.trim(),
            description: item.description.trim() || undefined,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
          })),
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
  }

  const selectedQuote = mode === 'quote' ? quotes.find((quote) => quote.id === selectedQuoteId) : undefined
  const disableTrigger = quotes.length === 0 && suppliers.length === 0

  const updateManualItem = (id: string, field: keyof ManualItem, value: string) => {
    setManualItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeManualItem = (id: string) => {
    setManualItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disableTrigger}>新規発注書</Button>
      </DialogTrigger>
      <DialogContent size="wide" className="w-[90vw] max-w-none">
        <DialogHeader>
          <DialogTitle>発注書を作成</DialogTitle>
          <DialogDescription>
            見積から発注書を生成するか、見積に紐づかない発注書を新規に作成できます。
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'quote' | 'manual')} className="mt-4 space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="quote" disabled={quotes.length === 0}>見積から作成</TabsTrigger>
            <TabsTrigger value="manual" disabled={suppliers.length === 0}>新規作成</TabsTrigger>
          </TabsList>

          <TabsContent value="quote" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>対象見積</Label>
                <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                  <SelectTrigger>
                    <SelectValue placeholder={quotes.length === 0 ? '利用可能な見積がありません' : '見積を選択してください'} />
                  </SelectTrigger>
                  <SelectContent>
                    {quotes.length === 0 ? (
                      <SelectItem value="disabled" disabled>
                        利用可能な見積がありません
                      </SelectItem>
                    ) : (
                      quotes.map((quote) => (
                        <SelectItem key={quote.id} value={quote.id}>
                          {quote.quote_number}
                          {quote.project_name ? `（${quote.project_name}）` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>発注日</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
            </div>

            {selectedQuote ? (
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-gray-700">
                <p className="font-medium">案件情報</p>
                <p>案件名: {selectedQuote.project_name || '未設定'}</p>
                <p>見積番号: {selectedQuote.quote_number}</p>
              </div>
            ) : null}

            {selectedQuote ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                        ? `仕入先ごとに ${selectedSupplierCount} 件の発注書を生成します。`
                        : '明細ごとに個別の発注書を作成します。'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>備考</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="発注書に残したいメモがあれば入力してください"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>件名 / 用途</Label>
                    <Input
                      value={orderTitle}
                      onChange={(event) => setOrderTitle(event.target.value)}
                      placeholder="例: プロジェクトA 用途"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>連絡先・担当メモ</Label>
                    <Input
                      value={contactInfo}
                      onChange={(event) => setContactInfo(event.target.value)}
                      placeholder="例: 担当: 山田 / 03-xxxx-xxxx"
                    />
                  </div>
                </div>

                {missingSupplierCount > 0 && (
                  <p className="text-xs text-red-600">
                    仕入先が未設定の明細が {missingSupplierCount} 件あります。仕入先を設定してから発注できます。
                  </p>
                )}

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              selectedItems.size > 0 &&
                              selectedItems.size === items.filter((item) => item.supplier?.id).length
                            }
                            onCheckedChange={(value) => toggleAll(Boolean(value))}
                            disabled={loadingItems || items.length === 0}
                          />
                        </TableHead>
                        <TableHead>明細</TableHead>
                        <TableHead>仕入先</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead className="text-right">仕入単価</TableHead>
                        <TableHead className="text-right">仕入金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingItems ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            読み込み中...
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            発注可能な明細がありません
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => {
                          const isSelectable = Boolean(item.supplier?.id)
                          const isSelected = selectedItems.has(item.id)
                          const unitCost =
                            item.cost_price != null
                              ? Number(item.cost_price)
                              : item.cost_amount != null && Number(item.quantity || 0) !== 0
                                ? Number(item.cost_amount) / Number(item.quantity || 1)
                                : 0
                          const amount =
                            item.cost_amount != null
                              ? Number(item.cost_amount)
                              : unitCost * Number(item.quantity || 0)

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(value) => toggleItem(item.id, Boolean(value))}
                                  disabled={!isSelectable}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    行{item.line_number}: {item.product_name}
                                  </span>
                                  {!isSelectable && (
                                    <span className="text-xs text-red-500">仕入先未設定</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{item.supplier?.supplier_name || '-'}</TableCell>
                              <TableCell className="text-right">{Number(item.quantity || 0)}</TableCell>
                              <TableCell className="text-right">
                                ¥{unitCost.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ¥{amount.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {quotes.length === 0
                  ? '承認済みの見積がありません。先に見積を作成・承認してください。'
                  : '対象の見積を選択すると発注可能な明細が表示されます。'}
              </p>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>仕入先</Label>
                <Select value={manualSupplierId} onValueChange={setManualSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={suppliers.length === 0 ? '仕入先が登録されていません' : '仕入先を選択してください'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <SelectItem value="disabled" disabled>
                        仕入先が登録されていません
                      </SelectItem>
                    ) : (
                      suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.supplier_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>発注日</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>件名 / 用途</Label>
                <Input
                  value={orderTitle}
                  onChange={(event) => setOrderTitle(event.target.value)}
                  placeholder="例: 単独発注（テストプロジェクト）"
                />
              </div>
              <div className="space-y-2">
                <Label>連絡先・担当メモ</Label>
                <Input
                  value={contactInfo}
                  onChange={(event) => setContactInfo(event.target.value)}
                  placeholder="連絡先や納品先担当などを入力"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>備考</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="発注書に残したいメモがあれば入力してください"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>明細</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualItems((prev) => [...prev, createManualItem()])}
                >
                  <Plus className="h-4 w-4 mr-2" /> 行を追加
                </Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>品名</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">単価</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          明細を追加してください
                        </TableCell>
                      </TableRow>
                    ) : (
                      manualItems.map((item, index) => {
                        const quantity = Number(item.quantity)
                        const unitCost = Number(item.unitCost)
                        const amount = Number.isNaN(quantity) || Number.isNaN(unitCost) ? 0 : quantity * unitCost
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={item.name}
                                onChange={(e) => updateManualItem(item.id, 'name', e.target.value)}
                                placeholder="品名"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) => updateManualItem(item.id, 'description', e.target.value)}
                                placeholder="説明 (任意)"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateManualItem(item.id, 'quantity', e.target.value)}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => updateManualItem(item.id, 'unitCost', e.target.value)}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              ¥{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeManualItem(item.id)}
                                disabled={manualItems.length === 1}
                                aria-label={`明細${index + 1}を削除`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end text-sm text-gray-600">
                合計金額: <span className="font-semibold ml-2">¥{manualItemsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isPending || (mode === 'quote' ? disableQuoteCreate : disableStandaloneCreate)}
          >
            {isPending ? '作成中...' : '発注書を作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
