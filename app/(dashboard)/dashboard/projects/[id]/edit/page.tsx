'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Customer, User, Project, ProjectStatus } from '@/types/database'

const STATUS_OPTIONS: { value: ProjectStatus, label: string }[] = [
  { value: 'リード', label: 'リード (自動)' },
  { value: '見積中', label: '見積中 (自動)' },
  { value: '受注', label: '受注' },
  { value: '計上OK', label: '計上OK' },
  { value: '計上済み', label: '計上済み' },
  { value: '失注', label: '失注' },
  { value: 'キャンセル', label: 'キャンセル' },
]

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesReps, setSalesReps] = useState<User[]>([])
  
  const [formData, setFormData] = useState({
    customer_id: '',
    project_name: '',
    category: '',
    department: '',
    sales_rep_id: '',
    status: 'リード' as ProjectStatus,
    order_month: '',
    accounting_month: '',
    expected_sales: '',
    expected_gross_profit: '',
    contract_probability: 'B',
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // 案件情報取得
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      const toMonthInputValue = (value?: string | null) => {
        if (!value) return ''
        return value.slice(0, 7)
      }

      if (projectData) {
        setProject(projectData)
        setFormData({
          customer_id: projectData.customer_id,
          project_name: projectData.project_name,
          category: projectData.category,
          department: projectData.department,
          sales_rep_id: projectData.sales_rep_id,
          status: projectData.status,
          order_month: toMonthInputValue(projectData.order_month),
          accounting_month: toMonthInputValue(projectData.accounting_month),
          expected_sales: projectData.expected_sales != null ? String(projectData.expected_sales) : '',
          expected_gross_profit: projectData.expected_gross_profit != null ? String(projectData.expected_gross_profit) : '',
          contract_probability: projectData.contract_probability ?? 'B',
        })
      }
      
      // 顧客一覧取得
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .is('is_deleted', false)
        .order('customer_name')
      
      if (customersData) setCustomers(customersData)

      // 営業担当者一覧取得
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .is('is_active', true)
      
      if (usersData) setSalesReps(usersData)
    }
    
    fetchData()
  }, [projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const orderMonthDate = formData.order_month ? `${formData.order_month}-01` : null
      const accountingMonthDate = formData.accounting_month ? `${formData.accounting_month}-01` : null
      const expectedSales = formData.expected_sales ? Number(formData.expected_sales) : null
      const expectedGrossProfit = formData.expected_gross_profit ? Number(formData.expected_gross_profit) : null
      
      const { error } = await supabase
        .from('projects')
        .update({
          customer_id: formData.customer_id,
          project_name: formData.project_name,
          category: formData.category,
          department: formData.department,
          sales_rep_id: formData.sales_rep_id,
          status: formData.status,
          order_month: orderMonthDate,
          accounting_month: accountingMonthDate,
          expected_sales: expectedSales,
          expected_gross_profit: expectedGrossProfit,
          contract_probability: formData.contract_probability,
        })
        .eq('id', projectId)

      if (error) {
        setError('案件の更新に失敗しました: ' + error.message)
        return
      }

      router.push(`/dashboard/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (!project) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">案件編集</h1>
        <p className="text-gray-600 mt-2">{project.project_number}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>案件情報</CardTitle>
          <CardDescription>必須項目を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">顧客 *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_name">案件名 *</Label>
              <Input
                id="project_name"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ *</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">部門 *</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_month">受注月</Label>
                <Input
                  id="order_month"
                  name="order_month"
                  type="month"
                  value={formData.order_month}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accounting_month">計上月</Label>
                <Input
                  id="accounting_month"
                  name="accounting_month"
                  type="month"
                  value={formData.accounting_month}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expected_sales">見込売上</Label>
                <Input
                  id="expected_sales"
                  name="expected_sales"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expected_sales}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_gross_profit">見込粗利</Label>
                <Input
                  id="expected_gross_profit"
                  name="expected_gross_profit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expected_gross_profit}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>契約確度</Label>
              <Select
                value={formData.contract_probability}
                onValueChange={(value) => setFormData({ ...formData, contract_probability: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_PROBABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_rep_id">営業担当 *</Label>
              <Select
                value={formData.sales_rep_id}
                onValueChange={(value) => setFormData({ ...formData, sales_rep_id: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">ステータス *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                リード/見積中は見積承認状況に合わせて自動更新されます。その他のステータスは必要に応じて手動で切り替えてください。
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? '更新中...' : '更新'}
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
        </CardContent>
      </Card>
    </div>
  )
}
const CONTRACT_PROBABILITY_OPTIONS = [
  { value: 'S', label: 'S（ほぼ確定）' },
  { value: 'A', label: 'A（高い）' },
  { value: 'B', label: 'B（中間）' },
  { value: 'C', label: 'C（低い）' },
  { value: 'D', label: 'D（未確定）' },
]
