'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface Supplier {
  id: string
  supplier_name: string
}

interface ProcurementItem {
  id: string
  line_number: number
  product_name: string
  description: string | null
  quantity: number
  cost_price: string
  cost_amount: string
  procurement_status: string | null
  quote: {
    quote_number: string
    approval_status: string
    project: {
      project_number: string
      project_name: string
      customer: {
        customer_name: string
      }
    }
  }
  supplier: {
    id: string
    supplier_name: string
  } | null
}

export default function ProcurementPendingPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ProcurementItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // フィルタ状態
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [items, supplierFilter, searchQuery, statusFilter])

  const loadData = async () => {
    try {
      // 仕入先一覧取得
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .eq('is_active', true)
        .order('supplier_name')

      setSuppliers(suppliersData || [])

      // 発注対象明細取得
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
            approval_status,
            project:projects(
              project_number,
              project_name,
              customer:customers(customer_name)
            )
          ),
          supplier:suppliers(id, supplier_name)
        `)
        .eq('requires_procurement', true)
        .eq('quote.approval_status', '承認済み')
        .order('quote.quote_number')
        .order('line_number')

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

    // ステータスフィルタ
    if (statusFilter === 'pending') {
      filtered = filtered.filter(
        (item) => !item.procurement_status || item.procurement_status === '未発注'
      )
    } else if (statusFilter === 'ordered') {
      filtered = filtered.filter((item) => item.procurement_status === '発注済み')
    } else if (statusFilter === 'received') {
      filtered = filtered.filter((item) => item.procurement_status === '入荷済み')
    }

    // 仕入先フィルタ
    if (supplierFilter !== 'all') {
      filtered = filtered.filter((item) => item.supplier?.id === supplierFilter)
    }

    // 検索フィルタ（案件名、品名）
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = filteredItems
        .filter((item) => !item.procurement_status || item.procurement_status === '未発注')
        .map((item) => item.id)
      setSelectedItems(new Set(pendingIds))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkOrder = async () => {
    if (selectedItems.size === 0) {
      alert('発注する明細を選択してください')
      return
    }

    if (!confirm(`${selectedItems.size}件の明細を発注登録しますか？`)) {
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

      const itemIds = Array.from(selectedItems)

      // procurement_logsに発注記録を登録
      const logs = itemIds.map((itemId) => ({
        quote_item_id: itemId,
        action_type: '発注',
        action_date: new Date().toISOString(),
        performed_by: userData.id,
      }))

      const { error: logError } = await supabase.from('procurement_logs').insert(logs)
      if (logError) throw logError

      // quote_itemsのstatusを更新
      const { error: updateError } = await supabase
        .from('quote_items')
        .update({ procurement_status: '発注済み' })
        .in('id', itemIds)

      if (updateError) throw updateError

      alert(`${selectedItems.size}件の明細を発注登録しました`)
      setSelectedItems(new Set())
      await loadData()
    } catch (error) {
      console.error('発注登録エラー:', error)
      alert('発注登録に失敗しました')
    }
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
      '見積番号',
      '行番号',
      '品名',
      '説明',
      '数量',
      '仕入単価',
      '仕入金額',
      '仕入先',
      'ステータス',
    ]

    const rows = filteredItems.map((item) => [
      item.quote.project.project_number,
      item.quote.project.project_name,
      item.quote.project.customer.customer_name,
      item.quote.quote_number,
      item.line_number,
      item.product_name,
      item.description || '',
      item.quantity,
      item.cost_price || 0,
      item.cost_amount,
      item.supplier?.supplier_name || '',
      item.procurement_status || '未発注',
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
    } else if (status === '発注済み') {
      return <Badge variant="secondary">発注済み</Badge>
    } else if (status === '入荷済み') {
      return <Badge variant="default">入荷済み</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
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

  const pendingCount = filteredItems.filter(
    (item) => !item.procurement_status || item.procurement_status === '未発注'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">発注管理</h1>
          <p className="text-gray-600 mt-2">発注待ち: {pendingCount}件</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            CSVエクスポート
          </Button>
          <Button onClick={handleBulkOrder} disabled={selectedItems.size === 0}>
            選択した{selectedItems.size}件を発注
          </Button>
        </div>
      </div>

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
          <CardDescription>{filteredItems.length}件の明細</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      pendingCount > 0 &&
                      selectedItems.size ===
                        filteredItems.filter(
                          (item) => !item.procurement_status || item.procurement_status === '未発注'
                        ).length
                    }
                    onCheckedChange={handleSelectAll}
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
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-gray-500">
                    該当する明細がありません
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isPending = !item.procurement_status || item.procurement_status === '未発注'
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isPending && (
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) =>
                              handleSelectItem(item.id, checked as boolean)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>{item.quote.project.project_number}</TableCell>
                      <TableCell>{item.quote.project.project_name}</TableCell>
                      <TableCell>{item.quote.project.customer.customer_name}</TableCell>
                      <TableCell>{item.quote.quote_number}</TableCell>
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
                      <TableCell className="text-right">
                        {item.cost_price ? formatCurrency(item.cost_price) : '-'}
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
        </CardContent>
      </Card>
    </div>
  )
}
