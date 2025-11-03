'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  project_number: string
  project_name: string
}

interface Supplier {
  id: string
  supplier_name: string
}

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

export default function QuoteEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // 見積フォームデータ
  const [projectId, setProjectId] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [version, setVersion] = useState(1)
  const [issueDate, setIssueDate] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')

  // 明細データ
  const [items, setItems] = useState<QuoteItemFormData[]>([])

  // 初期データ読込
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      // 見積データ取得
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          items:quote_items(*)
        `)
        .eq('id', params.id)
        .single()

      if (quoteError || !quote) {
        alert('見積データの取得に失敗しました')
        router.push('/dashboard/quotes')
        return
      }

      // 下書きでない場合は編集不可
      if (quote.approval_status !== '下書き') {
        alert('この見積は編集できません')
        router.push(`/dashboard/quotes/${params.id}`)
        return
      }

      // フォームに設定
      setProjectId(quote.project_id)
      setQuoteNumber(quote.quote_number)
      setVersion(quote.version)
      setIssueDate(quote.issue_date)
      setValidUntil(quote.valid_until || '')
      setNotes(quote.notes || '')

      // 明細データ変換
      const itemsData: QuoteItemFormData[] = quote.items
        .sort((a: any, b: any) => a.line_number - b.line_number)
        .map((item: any) => ({
          line_number: item.line_number,
          product_name: item.product_name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          amount: Number(item.amount),
          supplier_id: item.supplier_id || '',
          cost_price: item.cost_price ? Number(item.cost_price) : 0,
          cost_amount: Number(item.cost_amount),
          gross_profit: Number(item.gross_profit),
          requires_procurement: item.requires_procurement,
        }))

      setItems(itemsData)

      // 案件一覧取得
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, project_number, project_name')
        .order('project_number', { ascending: false })

      setProjects(projectsData || [])

      // 仕入先一覧取得
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .is('is_deleted', false)

      setSuppliers(suppliersData || [])

      setLoading(false)
    } catch (error) {
      console.error('初期データ読込エラー:', error)
      alert('データの読込に失敗しました')
      router.push('/dashboard/quotes')
    }
  }

  // 明細の金額を計算
  const calculateItemAmounts = (item: QuoteItemFormData): QuoteItemFormData => {
    const amount = item.quantity * item.unit_price
    const cost_amount = item.quantity * item.cost_price
    const gross_profit = amount - cost_amount
    return { ...item, amount, cost_amount, gross_profit }
  }

  // 明細の値を更新
  const handleItemChange = (index: number, field: keyof QuoteItemFormData, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    newItems[index] = calculateItemAmounts(newItems[index])
    setItems(newItems)
  }

  // 明細行を追加
  const addItem = () => {
    const newItem: QuoteItemFormData = {
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
    setItems([...items, newItem])
  }

  // 明細行を削除
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    // 行番号を振り直し
    newItems.forEach((item, i) => {
      item.line_number = i + 1
    })
    setItems(newItems)
  }

  // 合計金額を計算
  const calculateTotals = () => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
    const totalCost = items.reduce((sum, item) => sum + item.cost_amount, 0)
    const grossProfit = totalAmount - totalCost
    return { totalAmount, totalCost, grossProfit }
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId || !quoteNumber || !issueDate) {
      alert('必須項目を入力してください')
      return
    }

    if (items.length === 0) {
      alert('明細を1件以上追加してください')
      return
    }

    if (items.some((item) => !item.product_name || item.quantity <= 0 || item.unit_price < 0)) {
      alert('明細の入力内容を確認してください')
      return
    }

    setSubmitting(true)

    try {
      const { totalAmount, totalCost, grossProfit } = calculateTotals()

      // 見積を更新
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          project_id: projectId,
          quote_number: quoteNumber,
          issue_date: issueDate,
          valid_until: validUntil || null,
          total_amount: totalAmount,
          total_cost: totalCost,
          gross_profit: grossProfit,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      if (quoteError) throw quoteError

      // 既存明細を削除
      const { error: deleteError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', params.id)

      if (deleteError) throw deleteError

      // 明細を新規登録
      const itemsData = items.map((item) => ({
        quote_id: params.id,
        line_number: item.line_number,
        product_name: item.product_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        supplier_id: item.supplier_id || null,
        cost_price: item.cost_price || null,
        cost_amount: item.cost_amount,
        gross_profit: item.gross_profit,
        requires_procurement: item.requires_procurement,
      }))

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsData)

      if (itemsError) throw itemsError

      alert('見積を更新しました')
      router.push(`/dashboard/quotes/${params.id}`)
    } catch (error) {
      console.error('見積更新エラー:', error)
      alert('見積の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const totals = calculateTotals()

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
          <h1 className="text-3xl font-bold text-gray-900">見積編集</h1>
          <p className="text-gray-600 mt-2">{quoteNumber}</p>
        </div>
        <Link href={`/dashboard/quotes/${params.id}`}>
          <Button variant="outline">キャンセル</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>見積の基本情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">案件 *</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
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

              <div className="space-y-2">
                <Label htmlFor="quoteNumber">見積番号 *</Label>
                <Input
                  id="quoteNumber"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  required
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">発行日 *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">有効期限</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>バージョン</Label>
                <Input value={`v${version}`} readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="備考を入力"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>明細</CardTitle>
                <CardDescription>見積明細を入力してください</CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline">
                + 明細を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No.</TableHead>
                  <TableHead className="w-[200px]">品名 *</TableHead>
                  <TableHead className="w-[200px]">説明</TableHead>
                  <TableHead className="w-[80px]">数量 *</TableHead>
                  <TableHead className="w-[120px]">単価 *</TableHead>
                  <TableHead className="w-[120px]">金額</TableHead>
                  <TableHead className="w-[180px]">仕入先</TableHead>
                  <TableHead className="w-[120px]">仕入単価</TableHead>
                  <TableHead className="w-[120px]">粗利</TableHead>
                  <TableHead className="w-[80px]">仕入要</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
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
                        placeholder="品名"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="説明"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        required
                        min="1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                        required
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="font-medium">¥{item.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Select
                        value={item.supplier_id}
                        onValueChange={(value) => handleItemChange(index, 'supplier_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="仕入先" />
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
                        value={item.cost_price}
                        onChange={(e) => handleItemChange(index, 'cost_price', Number(e.target.value))}
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="font-medium">¥{item.gross_profit.toLocaleString()}</TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={item.requires_procurement}
                        onChange={(e) => handleItemChange(index, 'requires_procurement', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        削除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>合計金額:</span>
                  <span className="font-medium">¥{totals.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>合計仕入:</span>
                  <span className="font-medium">¥{totals.totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>粗利:</span>
                  <span className="text-green-600">¥{totals.grossProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/quotes/${params.id}`}>
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? '更新中...' : '更新する'}
          </Button>
        </div>
      </form>
    </div>
  )
}
