'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Customer, User, Project } from '@/types/database'

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
    status: '見積中' as '見積中' | '受注' | '失注' | 'キャンセル',
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
      
      if (projectData) {
        setProject(projectData)
        setFormData({
          customer_id: projectData.customer_id,
          project_name: projectData.project_name,
          category: projectData.category,
          department: projectData.department,
          sales_rep_id: projectData.sales_rep_id,
          status: projectData.status,
        })
      }
      
      // 顧客一覧取得
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .is('is_deleted', false)
        .order('customer_name')
      
      if (customerData) setCustomers(customerData)
      
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
      
      const { error } = await supabase
        .from('projects')
        .update({
          customer_id: formData.customer_id,
          project_name: formData.project_name,
          category: formData.category,
          department: formData.department,
          sales_rep_id: formData.sales_rep_id,
          status: formData.status,
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
                onValueChange={(value) => setFormData({ ...formData, status: value as '見積中' | '受注' | '失注' | 'キャンセル' })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="見積中">見積中</SelectItem>
                  <SelectItem value="受注">受注</SelectItem>
                  <SelectItem value="失注">失注</SelectItem>
                  <SelectItem value="キャンセル">キャンセル</SelectItem>
                </SelectContent>
              </Select>
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
