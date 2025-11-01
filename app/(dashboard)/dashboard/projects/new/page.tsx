'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Customer, User } from '@/types/database'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesReps, setSalesReps] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  
  // 顧客登録ダイアログ
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerFormData, setCustomerFormData] = useState({
    customer_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  })
  const [savingCustomer, setSavingCustomer] = useState(false)
  
  const [formData, setFormData] = useState({
    customer_id: '',
    project_name: '',
    category: '',
    department: '',
    sales_rep_id: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // 現在のユーザーID取得
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        setFormData(prev => ({ ...prev, sales_rep_id: user.id }))
      }
      
      // 顧客一覧取得
      await loadCustomers()
      
      // 営業担当者一覧取得
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('display_name')
      
      if (usersData) setSalesReps(usersData)
    }
    
    fetchData()
  }, [])

  const loadCustomers = async () => {
    const supabase = createClient()
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('is_deleted', false)
      .order('customer_name')
    
    if (customerData) setCustomers(customerData)
  }

  const handleSaveCustomer = async () => {
    if (!customerFormData.customer_name) {
      toast.error('顧客名を入力してください')
      return
    }

    setSavingCustomer(true)

    try {
      const supabase = createClient()
      
      // 顧客コードを自動生成
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
      const nextNumber = (count || 0) + 1
      const customerCode = `CUS-${String(nextNumber).padStart(5, '0')}`

      const { data, error } = await supabase
        .from('customers')
        .insert({
          customer_code: customerCode,
          customer_name: customerFormData.customer_name,
          contact_person: customerFormData.contact_person || null,
          email: customerFormData.email || null,
          phone: customerFormData.phone || null,
          address: customerFormData.address || null,
        })
        .select()
        .single()

      if (error) throw error

      // 顧客リストを再読込
      await loadCustomers()

      // 新規顧客を選択状態にする
      if (data) {
        setFormData(prev => ({ ...prev, customer_id: data.id }))
      }

      // ダイアログを閉じる
      setCustomerDialogOpen(false)
      setCustomerFormData({
        customer_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      })

      toast.success('顧客を登録しました')
    } catch (err) {
      console.error('顧客登録エラー:', err)
      toast.error('顧客の登録に失敗しました')
    } finally {
      setSavingCustomer(false)
    }
  }

  const generateProjectNumber = async () => {
    const supabase = createClient()
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    const nextNumber = (count || 0) + 1
    return `PRJ-${year}-${String(nextNumber).padStart(4, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const projectNumber = await generateProjectNumber()
      
      const { error } = await supabase
        .from('projects')
        .insert([{
          project_number: projectNumber,
          customer_id: formData.customer_id,
          project_name: formData.project_name,
          category: formData.category,
          department: formData.department,
          sales_rep_id: formData.sales_rep_id,
          status: '見積中',
        }])

      if (error) {
        toast.error('案件の登録に失敗しました: ' + error.message)
        return
      }

      toast.success('案件を登録しました')
      router.push('/dashboard/projects')
      router.refresh()
    } catch (err) {
      toast.error('予期しないエラーが発生しました')
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">新規案件作成</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">案件情報を入力してください</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>案件情報</CardTitle>
          <CardDescription>必須項目を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customer_id">顧客 *</Label>
                <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      新規顧客登録
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>顧客新規登録</DialogTitle>
                      <DialogDescription>
                        新しい顧客情報を入力してください
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer_name">顧客名 *</Label>
                        <Input
                          id="customer_name"
                          value={customerFormData.customer_name}
                          onChange={(e) =>
                            setCustomerFormData({ ...customerFormData, customer_name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_person">担当者</Label>
                        <Input
                          id="contact_person"
                          value={customerFormData.contact_person}
                          onChange={(e) =>
                            setCustomerFormData({ ...customerFormData, contact_person: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">メール</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerFormData.email}
                          onChange={(e) =>
                            setCustomerFormData({ ...customerFormData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">電話番号</Label>
                        <Input
                          id="phone"
                          value={customerFormData.phone}
                          onChange={(e) =>
                            setCustomerFormData({ ...customerFormData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">住所</Label>
                        <Input
                          id="address"
                          value={customerFormData.address}
                          onChange={(e) =>
                            setCustomerFormData({ ...customerFormData, address: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomerDialogOpen(false)}
                      >
                        キャンセル
                      </Button>
                      <Button type="button" onClick={handleSaveCustomer} disabled={savingCustomer}>
                        {savingCustomer ? '登録中...' : '登録'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="顧客を選択" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ *</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="例: オフィス機器"
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
                  placeholder="例: 営業部"
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
                  <SelectValue placeholder="営業担当を選択" />
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

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? '登録中...' : '登録'}
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
