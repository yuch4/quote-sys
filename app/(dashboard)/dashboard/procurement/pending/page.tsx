'use client'

import { useEffect, useMemo, useState, useTransition, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { createPurchaseOrders } from '@/app/(dashboard)/dashboard/quotes/[id]/actions'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { firstRelation, ensureArrayRelation } from '@/lib/supabase/relations'

const ITEMS_PER_PAGE = 20

interface Supplier {
  id: string
  supplier_name: string
}

type ProcurementItemSource = 'quote' | 'standalone'

type ProcurementStatus = '未発注' | '発注済' | '入荷済'

interface ProcurementItem {
  id: string
  source: ProcurementItemSource
  procurement_status: ProcurementStatus
  quote_id: string | null
  project_number: string
  project_name: string
  customer_name: string
  quote_number: string
  purchase_order_id: string | null
  purchase_order_number: string | null
  line_number: number | null
  product_name: string
  description: string | null
  quantity: number
  cost_price: number | null
  cost_amount: number | null
  supplier: {
    id: string | null
    supplier_name: string | null
  } | null
  selectable: boolean
  order_date?: string | null
}

type QuoteItemRow = {
  id: string
  quote_id: string | null
  line_number: number | null
  product_name: string
  description: string | null
  quantity: number | null
  cost_price: number | null
  cost_amount: number | null
  procurement_status: ProcurementStatus | null
  quote: Array<{
    quote_number: string
    approval_status: string
    project: Array<{
      project_number: string
      project_name: string
      customer: Array<{ customer_name: string }>
    }>
  }>
  supplier: Array<{ id: string | null; supplier_name: string | null }>
}

type StandaloneOrderRow = {
  id: string
  purchase_order_number: string | null
  status: ProcurementStatus | null
  order_date: string | null
  supplier: Array<{ id: string | null; supplier_name: string | null }>
  items: Array<{
    id: string
    quantity: number | null
    unit_cost: number | null
    amount: number | null
    manual_name: string | null
    manual_description: string | null
    quote_item_id: string | null
  }>
}

export default function ProcurementPendingPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ProcurementItem[]>([])
  const [paginatedItems, setPaginatedItems] = useState<ProcurementItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isCreating, startCreateTransition] = useTransition()

  // フィルタ状態
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')

  const selectedQuoteItems = useMemo(
    () => items.filter((item) => selectedItems.has(item.id) && item.source === 'quote'),
    [items, selectedItems]
  )

  const hasStandaloneSelection = useMemo(
    () => items.some((item) => selectedItems.has(item.id) && item.source === 'standalone'),
    [items, selectedItems]
  )

  const selectedQuoteId = selectedQuoteItems.length > 0 ? selectedQuoteItems[0].quote_id : null
  const selectedQuoteNumber = selectedQuoteItems.length > 0 ? selectedQuoteItems[0].quote_number : ''
  const selectedProjectName = selectedQuoteItems.length > 0 ? selectedQuoteItems[0].project_name : ''
  const selectedProjectNumber = selectedQuoteItems.length > 0 ? selectedQuoteItems[0].project_number : ''

  const selectedSupplierSummary = useMemo(() => {
    const summary = new Map<string, { count: number }>()
    selectedQuoteItems.forEach((item) => {
      const key = item.supplier?.supplier_name || '未設定'
      if (!summary.has(key)) {
        summary.set(key, { count: 0 })
      }
      summary.get(key)!.count += 1
    })
    return Array.from(summary.entries())
  }, [selectedQuoteItems])

  const canCreatePurchaseOrder = useMemo(() => {
    if (hasStandaloneSelection || selectedQuoteItems.length === 0 || !selectedQuoteId) {
      return false
    }
    const uniqueQuoteIds = new Set(selectedQuoteItems.map((item) => item.quote_id))
    return uniqueQuoteIds.size === 1 && uniqueQuoteIds.has(selectedQuoteId)
  }, [hasStandaloneSelection, selectedQuoteItems, selectedQuoteId])

  const handleOpenCreateDialog = () => {
    if (selectedQuoteItems.length === 0) {
      alert('発注書を作成する明細を選択してください。')
      return
    }

    if (hasStandaloneSelection) {
      alert('単独発注書の明細はここから作成できません。見積に紐づく明細を選択してください。')
      return
    }

    const uniqueQuoteIds = new Set(selectedQuoteItems.map((item) => item.quote_id))
    if (uniqueQuoteIds.size !== 1 || !selectedQuoteId) {
      alert('同じ案件（見積）に紐づく明細のみ選択してください。')
      return
    }

    setOrderDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setCreateDialogOpen(true)
  }

  const handleCreatePurchaseOrders = () => {
    if (selectedQuoteItems.length === 0 || !selectedQuoteId) {
      alert('発注書を作成する対象が選択されていません。')
      return
    }

    startCreateTransition(async () => {
      try {
        const result = await createPurchaseOrders({
          quoteId: selectedQuoteId,
          itemIds: selectedQuoteItems.map((item) => item.id),
          orderDate,
          combineBySupplier: true,
          notes: notes.trim() || undefined,
        })

        if (result.success) {
          alert(result.message || '発注書を作成しました')
          setCreateDialogOpen(false)
          setSelectedItems(new Set())
          setOrderDate(new Date().toISOString().split('T')[0])
          setNotes('')
          setLoading(true)
          await loadData()
        } else {
          alert(result.message || '発注書の作成に失敗しました')
        }
      } catch (error) {
        console.error('発注書作成エラー:', error)
        alert('発注書の作成に失敗しました')
      }
    })
  }

  const loadData = useCallback(async () => {
    try {
      // 仕入先一覧取得
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .is('is_deleted', false)

      setSuppliers(suppliersData || [])

      // 見積紐付きの発注対象明細取得
      const { data: quoteItemsData, error: quoteItemsError } = await supabase
        .from('quote_items')
        .select(`
          id,
          quote_id,
          line_number,
          product_name,
          description,
          quantity,
          cost_price,
          cost_amount,
          procurement_status,
          quote:quotes!inner(
            quote_number,
            approval_status,
            project:projects(
              project_number,
              project_name,
              customer:customers(customer_name)
            )
          ),
          supplier:suppliers(id, supplier_name)
        `)
        .is('requires_procurement', true)
        .eq('quote.approval_status', '承認済み')

      if (quoteItemsError) throw quoteItemsError

      const quoteItemsRaw = (quoteItemsData || []) as QuoteItemRow[]

      const quoteItems: ProcurementItem[] = []

      for (const item of quoteItemsRaw) {
        const quoteRecord = firstRelation(item.quote)
        const project = quoteRecord ? firstRelation(quoteRecord.project) : null
        const customer = project ? firstRelation(project.customer) : null
        const supplier = firstRelation(item.supplier)

        if (!quoteRecord || !project || !customer) {
          continue
        }

        const normalizedStatus: ProcurementStatus =
          item.procurement_status === '発注済' || item.procurement_status === '入荷済'
            ? (item.procurement_status as ProcurementStatus)
            : '未発注'

        quoteItems.push({
          id: item.id,
          source: 'quote',
          procurement_status: normalizedStatus,
          quote_id: item.quote_id,
          project_number: project.project_number,
          project_name: project.project_name,
          customer_name: customer.customer_name,
          quote_number: quoteRecord.quote_number,
          purchase_order_id: null,
          purchase_order_number: null,
          line_number: item.line_number ?? null,
          product_name: item.product_name,
          description: item.description,
          quantity: Number(item.quantity || 0),
          cost_price: item.cost_price != null ? Number(item.cost_price) : null,
          cost_amount: item.cost_amount != null ? Number(item.cost_amount) : null,
          supplier: supplier ? { id: supplier.id, supplier_name: supplier.supplier_name } : null,
          selectable: true,
          order_date: null,
        })
      }

      // 単独発注書（見積紐付きでない発注書）
      const { data: standaloneOrders, error: standaloneError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          purchase_order_number,
          status,
          order_date,
          supplier:suppliers(id, supplier_name),
          items:purchase_order_items(
            id,
            quantity,
            unit_cost,
            amount,
            manual_name,
            manual_description,
            quote_item_id
          )
        `)
        .is('quote_id', null)
        .neq('status', 'キャンセル')

      if (standaloneError) throw standaloneError

      const standaloneRows = (standaloneOrders || []) as StandaloneOrderRow[]

      const standaloneItems: ProcurementItem[] = standaloneRows.flatMap((order) => {
        const normalizedStatus: ProcurementStatus = order.status === '発注済' ? '発注済' : '未発注'
        const supplier = firstRelation(order.supplier)

        return ensureArrayRelation(order.items)
          .filter((item) => !item.quote_item_id)
          .map((item) => ({
            id: `${order.id}:${item.id}`,
            source: 'standalone' as const,
            procurement_status: normalizedStatus,
            quote_id: null,
            project_number: '-',
            project_name: '単独発注',
            customer_name: '-',
            quote_number: '-',
            purchase_order_id: order.id,
            purchase_order_number: order.purchase_order_number,
            line_number: null,
            product_name: item.manual_name || 'カスタム明細',
            description: item.manual_description || null,
            quantity: Number(item.quantity || 0),
            cost_price: item.unit_cost != null ? Number(item.unit_cost) : null,
            cost_amount: item.amount != null ? Number(item.amount) : null,
            supplier: supplier
              ? { id: supplier.id, supplier_name: supplier.supplier_name }
              : null,
            selectable: false,
            order_date: order.order_date ?? null,
          }))
      })

      setItems([...quoteItems, ...standaloneItems])
      setLoading(false)
    } catch (error) {
      console.error('データ読込エラー:', error)
      alert('データの読込に失敗しました')
      setLoading(false)
    }
  }, [supabase])

  const applyFilters = useCallback(() => {
    let filtered = [...items]

    // ステータスフィルタ
    if (statusFilter === 'pending') {
      filtered = filtered.filter((item) => item.procurement_status === '未発注')
    } else if (statusFilter === 'ordered') {
      filtered = filtered.filter((item) => item.procurement_status === '発注済')
    } else if (statusFilter === 'received') {
      filtered = filtered.filter((item) => item.procurement_status === '入荷済')
    }

    // 仕入先フィルタ
    if (supplierFilter !== 'all') {
      filtered = filtered.filter((item) => item.supplier?.id === supplierFilter)
    }

    // 検索フィルタ（案件名、品名）
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) => {
          const targets = [
            item.project_number,
            item.project_name,
            item.customer_name,
            item.quote_number,
            item.purchase_order_number ?? '',
            item.product_name,
            item.description ?? '',
            item.supplier?.supplier_name ?? '',
          ]
          return targets.some((value) => value.toLowerCase().includes(query))
        }
      )
    }

    setFilteredItems(filtered)

    // ページネーション処理
    const total = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    setTotalPages(total)

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    setPaginatedItems(filtered.slice(startIndex, endIndex))
  }, [currentPage, items, searchQuery, statusFilter, supplierFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingSelectableIds = filteredItems
        .filter((item) => item.selectable && item.procurement_status === '未発注')
        .map((item) => item.id)
      setSelectedItems(new Set(pendingSelectableIds))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const target = items.find((item) => item.id === itemId)
    if (!target?.selectable) {
      return
    }

    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert('エクスポートするデータがありません')
      return
    }

    // CSVデータ作成
    const headers = [
      '案件番号',
      '案件名',
      '顧客名',
      '見積番号/発注書番号',
      '品名',
      '説明',
      '数量',
      '仕入単価',
      '仕入金額',
      '仕入先',
      'ステータス',
    ]

    const rows = filteredItems.map((item) => [
      item.project_number,
      item.project_name,
      item.customer_name,
      item.source === 'quote' ? item.quote_number : (item.purchase_order_number ?? '-'),
      item.product_name,
      item.description || '',
      item.quantity,
      item.cost_price ?? 0,
      item.cost_amount ?? 0,
      item.supplier?.supplier_name || '',
      item.procurement_status,
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `発注リスト_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string | null) => {
    if (!status || status === '未発注') {
      return <Badge variant="outline">未発注</Badge>
    } else if (status === '発注済') {
      return <Badge variant="secondary">発注済み</Badge>
    } else if (status === '入荷済') {
      return <Badge variant="default">入荷済み</Badge>
    } else if (status === 'キャンセル') {
      return <Badge variant="destructive">キャンセル</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const formatCurrency = (amount: number | string | null | undefined) => {
    return `¥${Number(amount ?? 0).toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>読込中...</p>
      </div>
    )
  }

  const pendingCount = filteredItems.filter((item) => item.procurement_status === '未発注').length
  const selectablePendingIds = filteredItems
    .filter((item) => item.selectable && item.procurement_status === '未発注')
    .map((item) => item.id)
  const allSelectablePendingSelected =
    selectablePendingIds.length > 0 &&
    selectablePendingIds.every((id) => selectedItems.has(id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">発注候補</h1>
          <p className="text-gray-600 mt-2">発注が必要な明細: {pendingCount}件</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            CSVエクスポート
          </Button>
          <Button onClick={handleOpenCreateDialog} disabled={!canCreatePurchaseOrder || isCreating}>
            選択した{selectedQuoteItems.length}件で発注書を作成
          </Button>
        </div>
      </div>
      {filteredItems.some((item) => !item.selectable) && (
        <p className="text-xs text-gray-500">
          単独発注書は一覧に表示されますが、一括発注の対象外です（発注ステータスのみ管理できます）。
        </p>
      )}
      {!hasStandaloneSelection && selectedQuoteItems.length > 0 && !canCreatePurchaseOrder && (
        <p className="text-xs text-red-600">
          同じ案件（見積）に紐づく明細のみ選択してください。
        </p>
      )}


      <Dialog open={createDialogOpen} onOpenChange={(open) => !isCreating && setCreateDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>発注書を作成</DialogTitle>
            <DialogDescription>
              案件: {selectedProjectNumber || '-'} {selectedProjectName || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 space-y-1">
              <p>対象見積: {selectedQuoteNumber || '-'}</p>
              <p>選択明細: {selectedQuoteItems.length}件</p>
              {selectedSupplierSummary.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">仕入先ごとの明細数</p>
                  <ul className="mt-1 space-y-1">
                    {selectedSupplierSummary.map(([supplierName, info]) => (
                      <li key={supplierName}>
                        {supplierName}: {info.count}件
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>発注日</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>備考</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="仕入先へ共有したい内容があれば記入してください"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              キャンセル
            </Button>
            <Button onClick={handleCreatePurchaseOrders} disabled={isCreating}>
              {isCreating ? '作成中...' : '発注書を作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>フィルタ</CardTitle>
          <CardDescription>発注対象明細の絞り込み</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">未発注</SelectItem>
                  <SelectItem value="ordered">発注済み</SelectItem>
                  <SelectItem value="received">入荷済み</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>仕入先</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>検索</Label>
              <Input
                placeholder="案件名、品名、顧客名で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>発注対象明細</CardTitle>
          <CardDescription>全{filteredItems.length}件の明細（{currentPage}/{totalPages}ページ）</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelectablePendingSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={selectablePendingIds.length === 0}
                  />
                </TableHead>
                <TableHead>案件番号</TableHead>
                <TableHead>案件名</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>見積番号</TableHead>
                <TableHead>品名</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>仕入先</TableHead>
                <TableHead className="text-right">仕入単価</TableHead>
                <TableHead className="text-right">仕入金額</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-gray-500">
                    該当する明細がありません
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  const isPending = item.procurement_status === '未発注'
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isPending && item.selectable ? (
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) =>
                              handleSelectItem(item.id, checked as boolean)
                            }
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>{item.project_number}</TableCell>
                      <TableCell>{item.project_name}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell>
                        {item.source === 'quote'
                          ? item.quote_number
                          : item.purchase_order_number ?? '-'}
                        {item.source === 'standalone' ? (
                          <div className="text-xs text-muted-foreground">単独発注</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.source === 'quote' && item.line_number != null
                              ? `行${item.line_number}: ${item.product_name}`
                              : item.product_name}
                          </p>
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
                      <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell>{item.supplier?.supplier_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.cost_price != null ? formatCurrency(item.cost_price) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.cost_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.procurement_status)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={`?page=${currentPage - 1}`}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  {[...Array(totalPages)].map((_, i) => {
                    const pageNumber = i + 1
                    const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1
                    const isFirstTwo = pageNumber <= 2
                    const isLastTwo = pageNumber > totalPages - 2
                    const shouldShow = isNearCurrent || isFirstTwo || isLastTwo

                    if (!shouldShow) {
                      if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <span className="px-2">...</span>
                          </PaginationItem>
                        )
                      }
                      return null
                    }

                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href={`?page=${pageNumber}`}
                          isActive={pageNumber === currentPage}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href={`?page=${currentPage + 1}`}
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
