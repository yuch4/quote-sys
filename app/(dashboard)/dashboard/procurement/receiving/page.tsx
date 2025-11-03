'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Supplier {
  id: string
  supplier_name: string
}

interface OrderedItem {
  id: string
  line_number: number
  product_name: string
  description: string | null
  quantity: number
  cost_price: string
  cost_amount: string
  procurement_status: string
  quote: {
    quote_number: string
    project: {
      project_number: string
      project_name: string
      customer: {
        customer_name: string
      }
      sales_rep: {
        display_name: string
        email: string
      }
    }
  }
  supplier: {
    supplier_name: string
  } | null
  procurement_logs: Array<{
    action_type: string
    action_date: string
  }>
}

export default function ReceivingPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<OrderedItem[]>([])
  const [filteredItems, setFilteredItems] = useState<OrderedItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // フィルタ状態
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 入荷登録ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OrderedItem | null>(null)
  const [receivingDate, setReceivingDate] = useState('')
  const [receivingQuantity, setReceivingQuantity] = useState(0)
  const [receivingNotes, setReceivingNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [items, supplierFilter, searchQuery])

  const loadData = async () => {
    try {
      // 仕入先一覧取得
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .is('is_deleted', false)

      setSuppliers(suppliersData || [])

      // 発注済み・未入荷の明細取得
      const { data: itemsData, error } = await supabase
        .from('quote_items')
        .select(`
          id,
          line_number,
          product_name,
          description,
          quantity,
          cost_price,
          cost_amount,
          procurement_status,
          quote:quotes!inner(
            quote_number,
            project:projects(
              project_number,
              project_name,
              customer:customers(customer_name),
              sales_rep:users!projects_sales_rep_id_fkey(display_name, email)
            )
          ),
          supplier:suppliers(supplier_name),
          procurement_logs(action_type, action_date)
        `)
        .is('requires_procurement', true)
        .eq('procurement_status', '発注済')

      if (error) throw error

      setItems(itemsData as any || [])
      setLoading(false)
    } catch (error) {
      console.error('データ読込エラー:', error)
      alert('データの読込に失敗しました')
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...items]

    // 仕入先フィルタ
    if (supplierFilter !== 'all') {
      filtered = filtered.filter((item) => item.supplier?.supplier_name === supplierFilter)
    }

    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.quote.project.project_name.toLowerCase().includes(query) ||
          item.product_name.toLowerCase().includes(query) ||
          item.quote.project.customer.customer_name.toLowerCase().includes(query)
      )
    }

    setFilteredItems(filtered)
  }

  const openReceivingDialog = (item: OrderedItem) => {
    setSelectedItem(item)
    setReceivingDate(new Date().toISOString().split('T')[0])
    setReceivingQuantity(item.quantity)
    setReceivingNotes('')
    setDialogOpen(true)
  }

  const handleReceiving = async () => {
    if (!selectedItem || !receivingDate) {
      alert('必須項目を入力してください')
      return
    }

    if (receivingQuantity <= 0 || receivingQuantity > selectedItem.quantity) {
      alert('入荷数量が不正です')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single()

      if (!userData) throw new Error('ユーザー情報の取得に失敗しました')

      // procurement_logsに入荷記録を登録
      const { error: logError } = await supabase.from('procurement_logs').insert({
        quote_item_id: selectedItem.id,
        action_type: '入荷',
        action_date: receivingDate,
        quantity: receivingQuantity,
        notes: receivingNotes || null,
        performed_by: userData.id,
      })

      if (logError) throw logError

      // quote_itemsのstatusを更新（全数入荷の場合のみ）
      if (receivingQuantity === selectedItem.quantity) {
        const { error: updateError } = await supabase
          .from('quote_items')
          .update({ procurement_status: '入荷済' })
          .eq('id', selectedItem.id)

        if (updateError) throw updateError
      }

      alert('入荷登録が完了しました')
      setDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('入荷登録エラー:', error)
      alert('入荷登録に失敗しました')
    }
  }

  const getDaysElapsed = (orderDate: string) => {
    const order = new Date(orderDate)
    const today = new Date()
    const diff = Math.floor((today.getTime() - order.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getElapsedBadge = (days: number) => {
    if (days < 7) {
      return <Badge variant="outline">{days}日経過</Badge>
    } else if (days < 14) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{days}日経過</Badge>
    } else {
      return <Badge variant="destructive">{days}日経過</Badge>
    }
  }

  const formatCurrency = (amount: string) => {
    return `¥${Number(amount).toLocaleString()}`
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">入荷管理</h1>
          <p className="text-gray-600 mt-2">発注済み・未入荷: {filteredItems.length}件</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>フィルタ</CardTitle>
          <CardDescription>発注済み明細の絞り込み</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>仕入先</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.supplier_name}>
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
          <CardTitle>発注済み明細</CardTitle>
          <CardDescription>{filteredItems.length}件の明細</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件番号</TableHead>
                <TableHead>案件名</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>品名</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>仕入先</TableHead>
                <TableHead>発注日</TableHead>
                <TableHead>経過日数</TableHead>
                <TableHead>営業担当</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500">
                    該当する明細がありません
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const orderLog = item.procurement_logs.find((log) => log.action_type === '発注')
                  const orderDate = orderLog?.action_date || ''
                  const daysElapsed = orderDate ? getDaysElapsed(orderDate) : 0

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.quote.project.project_number}</TableCell>
                      <TableCell>{item.quote.project.project_name}</TableCell>
                      <TableCell>{item.quote.project.customer.customer_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.supplier?.supplier_name || '-'}</TableCell>
                      <TableCell>
                        {orderDate ? new Date(orderDate).toLocaleDateString('ja-JP') : '-'}
                      </TableCell>
                      <TableCell>{orderDate && getElapsedBadge(daysElapsed)}</TableCell>
                      <TableCell>{item.quote.project.sales_rep.display_name}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openReceivingDialog(item)}>
                          入荷登録
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 入荷登録ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入荷登録</DialogTitle>
            <DialogDescription>
              {selectedItem && (
                <>
                  {selectedItem.quote.project.project_name} - {selectedItem.product_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>発注数量</Label>
                  <Input value={selectedItem.quantity} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>仕入先</Label>
                  <Input value={selectedItem.supplier?.supplier_name || '-'} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receivingDate">入荷日 *</Label>
                  <Input
                    id="receivingDate"
                    type="date"
                    value={receivingDate}
                    onChange={(e) => setReceivingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receivingQuantity">入荷数量 *</Label>
                  <Input
                    id="receivingQuantity"
                    type="number"
                    value={receivingQuantity}
                    onChange={(e) => setReceivingQuantity(Number(e.target.value))}
                    min="1"
                    max={selectedItem.quantity}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivingNotes">備考</Label>
                <Input
                  id="receivingNotes"
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="入荷に関する備考"
                />
              </div>

              {receivingQuantity < selectedItem.quantity && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 部分入荷です。残り{selectedItem.quantity - receivingQuantity}
                    個は未入荷として残ります。
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleReceiving}>入荷登録</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
