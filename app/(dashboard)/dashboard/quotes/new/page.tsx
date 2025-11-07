'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Plus } from 'lucide-react'
import type { Project, Supplier } from '@/types/database'

interface QuoteItemFormData {
  line_number: number
  product_name: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  supplier_id: string
  cost_price: number
  cost_amount: number
  gross_profit: number
  requires_procurement: boolean
}

const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

const getDefaultValidUntil = () => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return formatDateInput(date)
}

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('project_id')
  const defaultIssueDate = formatDateInput(new Date())
  const defaultValidUntil = getDefaultValidUntil()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  const [formData, setFormData] = useState({
    project_id: projectIdParam || '',
    issue_date: defaultIssueDate,
    valid_until: defaultValidUntil,
    notes: '',
  })

  const [items, setItems] = useState<QuoteItemFormData[]>([
    {
      line_number: 1,
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      supplier_id: '',
      cost_price: 0,
      cost_amount: 0,
      gross_profit: 0,
      requires_procurement: false,
    }
  ])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectData) setProjects(projectData)
      
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .is('is_deleted', false)
      
      if (supplierData) setSuppliers(supplierData)
    }
    
    fetchData()
  }, [])

  const calculateItemAmounts = (item: QuoteItemFormData): QuoteItemFormData => {
    const amount = item.quantity * item.unit_price
    const cost_amount = item.quantity * item.cost_price
    const gross_profit = amount - cost_amount
    
    return {
      ...item,
      amount,
      cost_amount,
      gross_profit,
    }
  }

  const handleItemChange = (index: number, field: keyof QuoteItemFormData, value: string | number | boolean) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    }
    
    newItems[index] = calculateItemAmounts(newItems[index])
    setItems(newItems)
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        line_number: items.length + 1,
        product_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        amount: 0,
        supplier_id: '',
        cost_price: 0,
        cost_amount: 0,
        gross_profit: 0,
        requires_procurement: false,
      }
    ])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    const newItems = items.filter((_, i) => i !== index)
    newItems.forEach((item, i) => {
      item.line_number = i + 1
    })
    setItems(newItems)
  }

  const calculateTotals = () => {
    const total_amount = items.reduce((sum, item) => sum + item.amount, 0)
    const total_cost = items.reduce((sum, item) => sum + item.cost_amount, 0)
    const gross_profit = total_amount - total_cost
    
    return { total_amount, total_cost, gross_profit }
  }

  const generateQuoteNumber = async () => {
    const supabase = createClient()
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
    
    const nextNumber = (count || 0) + 1
    return `Q-${year}-${String(nextNumber).padStart(4, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('ユーザー情報が取得できません')
        return
      }

      const quoteNumber = await generateQuoteNumber()
      const totals = calculateTotals()

      // 見積作成
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          project_id: formData.project_id,
          quote_number: quoteNumber,
          version: 1,
          issue_date: formData.issue_date,
          valid_until: formData.valid_until || null,
          total_amount: totals.total_amount,
          total_cost: totals.total_cost,
          gross_profit: totals.gross_profit,
          approval_status: '下書き',
          notes: formData.notes || null,
          created_by: user.id,
        }])
        .select()
        .single()

      if (quoteError || !quoteData) {
        setError('見積の作成に失敗しました: ' + (quoteError?.message || ''))
        return
      }

      // 明細作成
      const itemsData = items.map(item => ({
        quote_id: quoteData.id,
        line_number: item.line_number,
        product_name: item.product_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        supplier_id: item.supplier_id || null,
        cost_price: item.cost_price,
        cost_amount: item.cost_amount,
        gross_profit: item.gross_profit,
        requires_procurement: item.requires_procurement,
        procurement_status: item.requires_procurement ? '未発注' : null,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsData)

      if (itemsError) {
        setError('明細の作成に失敗しました: ' + itemsError.message)
        return
      }

      router.push(`/dashboard/quotes/${quoteData.id}`)
      router.refresh()
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">新規見積作成</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">見積情報を入力してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>見積の基本情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">案件 *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                disabled={loading || !!projectIdParam}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="案件を選択" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number} - {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">発行日 *</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">有効期限</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>明細</CardTitle>
                <CardDescription>商品・サービスの明細を入力してください</CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline" size="sm" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                行追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead className="min-w-[150px]">品名 *</TableHead>
                    <TableHead className="min-w-[150px]">説明</TableHead>
                    <TableHead className="w-[100px]">数量 *</TableHead>
                    <TableHead className="w-[120px]">単価 *</TableHead>
                    <TableHead className="w-[120px]">金額</TableHead>
                    <TableHead className="min-w-[150px]">仕入先</TableHead>
                    <TableHead className="w-[120px]">仕入単価</TableHead>
                    <TableHead className="w-[120px]">粗利</TableHead>
                    <TableHead className="w-[80px]">仕入要</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.line_number}</TableCell>
                      <TableCell>
                        <Input
                          value={item.product_name}
                          onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                          required
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          required
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.supplier_id}
                          onValueChange={(value) => handleItemChange(index, 'supplier_id', value)}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.supplier_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.cost_price}
                          onChange={(e) => handleItemChange(index, 'cost_price', parseFloat(e.target.value) || 0)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.gross_profit)}
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={item.requires_procurement}
                          onChange={(e) => handleItemChange(index, 'requires_procurement', e.target.checked)}
                          disabled={loading}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={loading || items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>合計金額:</span>
                  <span className="font-medium">{formatCurrency(totals.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>合計仕入:</span>
                  <span className="font-medium">{formatCurrency(totals.total_cost)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>粗利:</span>
                  <span>{formatCurrency(totals.gross_profit)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? '作成中...' : '見積作成'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  )
}
