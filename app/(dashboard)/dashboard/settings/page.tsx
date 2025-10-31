'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  created_at: string
}

interface Customer {
  id: string
  customer_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

interface Supplier {
  id: string
  supplier_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

type DialogMode = 'create' | 'edit'
type DataType = 'user' | 'customer' | 'supplier'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // データ
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [dialogType, setDialogType] = useState<DataType>('customer')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // フォーム
  const [formData, setFormData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAllData()
    }
  }, [currentUser])

  const loadCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userData) {
      if (userData.role !== '営業事務' && userData.role !== '管理者') {
        alert('この機能は営業事務・管理者のみ利用できます')
        router.push('/dashboard')
        return
      }
      setCurrentUser(userData)
    }
  }

  const loadAllData = async () => {
    try {
      const [usersRes, customersRes, suppliersRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
      ])

      if (usersRes.data) setUsers(usersRes.data)
      if (customersRes.data) setCustomers(customersRes.data)
      if (suppliersRes.data) setSuppliers(suppliersRes.data)

      setLoading(false)
    } catch (error) {
      console.error('データ読込エラー:', error)
      alert('データの読込に失敗しました')
      setLoading(false)
    }
  }

  const handleOpenDialog = (type: DataType, mode: DialogMode, id?: string) => {
    setDialogType(type)
    setDialogMode(mode)
    setSelectedId(id || null)

    if (mode === 'edit' && id) {
      let data: any = null
      if (type === 'user') {
        data = users.find((u) => u.id === id)
      } else if (type === 'customer') {
        data = customers.find((c) => c.id === id)
      } else if (type === 'supplier') {
        data = suppliers.find((s) => s.id === id)
      }
      setFormData(data || {})
    } else {
      setFormData({})
    }

    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      if (dialogType === 'user') {
        await handleUserSubmit()
      } else if (dialogType === 'customer') {
        await handleCustomerSubmit()
      } else if (dialogType === 'supplier') {
        await handleSupplierSubmit()
      }

      alert(dialogMode === 'create' ? '登録しました' : '更新しました')
      setDialogOpen(false)
      loadAllData()
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUserSubmit = async () => {
    if (!formData.email || !formData.display_name || !formData.role) {
      throw new Error('必須項目を入力してください')
    }

    if (dialogMode === 'create') {
      // ユーザー作成はSupabase Authを使用
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password || 'TempPass123!',
        options: {
          data: {
            display_name: formData.display_name,
            role: formData.role,
          },
        },
      })

      if (error) throw error

      // usersテーブルに手動で追加（通常はトリガーで自動追加）
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: formData.email,
          display_name: formData.display_name,
          role: formData.role,
        })
      }
    } else {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: formData.display_name,
          role: formData.role,
        })
        .eq('id', selectedId)

      if (error) throw error
    }
  }

  const handleCustomerSubmit = async () => {
    if (!formData.customer_name) {
      throw new Error('顧客名を入力してください')
    }

    const data = {
      customer_name: formData.customer_name,
      contact_person: formData.contact_person || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
    }

    if (dialogMode === 'create') {
      const { error } = await supabase.from('customers').insert(data)
      if (error) throw error
    } else {
      const { error } = await supabase.from('customers').update(data).eq('id', selectedId)
      if (error) throw error
    }
  }

  const handleSupplierSubmit = async () => {
    if (!formData.supplier_name) {
      throw new Error('仕入先名を入力してください')
    }

    const data = {
      supplier_name: formData.supplier_name,
      contact_person: formData.contact_person || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
    }

    if (dialogMode === 'create') {
      const { error } = await supabase.from('suppliers').insert(data)
      if (error) throw error
    } else {
      const { error } = await supabase.from('suppliers').update(data).eq('id', selectedId)
      if (error) throw error
    }
  }

  const handleDelete = async (type: DataType, id: string) => {
    if (!confirm('本当に削除しますか？')) return

    try {
      let error
      if (type === 'user') {
        const { error: delError } = await supabase.from('users').delete().eq('id', id)
        error = delError
      } else if (type === 'customer') {
        const { error: delError } = await supabase.from('customers').delete().eq('id', id)
        error = delError
      } else if (type === 'supplier') {
        const { error: delError } = await supabase.from('suppliers').delete().eq('id', id)
        error = delError
      }

      if (error) throw error

      alert('削除しました')
      loadAllData()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました（関連データが存在する可能性があります）')
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設定・マスタ管理</h1>
        <p className="text-gray-600 mt-2">ユーザー・顧客・仕入先のマスタデータ管理</p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList>
          <TabsTrigger value="customers">顧客マスタ</TabsTrigger>
          <TabsTrigger value="suppliers">仕入先マスタ</TabsTrigger>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
        </TabsList>

        {/* 顧客マスタ */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>顧客マスタ</CardTitle>
                  <CardDescription>顧客情報の登録・編集・削除</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('customer', 'create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  新規登録
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客名</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>住所</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.contact_person || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.address || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog('customer', 'edit', customer.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete('customer', customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 仕入先マスタ */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>仕入先マスタ</CardTitle>
                  <CardDescription>仕入先情報の登録・編集・削除</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('supplier', 'create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  新規登録
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>仕入先名</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>住所</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                        <TableCell>{supplier.contact_person || '-'}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>{supplier.address || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog('supplier', 'edit', supplier.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete('supplier', supplier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ユーザー管理 */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ユーザー管理</CardTitle>
                  <CardDescription>システムユーザーの登録・編集・削除</CardDescription>
                </div>
                {currentUser?.role === '管理者' && (
                  <Button onClick={() => handleOpenDialog('user', 'create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規登録
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>氏名</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>権限</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('ja-JP')}</TableCell>
                        <TableCell>
                          {currentUser?.role === '管理者' && user.id !== currentUser.id && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDialog('user', 'edit', user.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete('user', user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 編集・登録ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'user' && (dialogMode === 'create' ? 'ユーザー新規登録' : 'ユーザー編集')}
              {dialogType === 'customer' && (dialogMode === 'create' ? '顧客新規登録' : '顧客編集')}
              {dialogType === 'supplier' && (dialogMode === 'create' ? '仕入先新規登録' : '仕入先編集')}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' ? '新しい情報を入力してください' : '情報を編集してください'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogType === 'user' && (
              <>
                {dialogMode === 'create' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="display_name">氏名 *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name || ''}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">権限 *</Label>
                  <Select
                    value={formData.role || ''}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="権限を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="営業">営業</SelectItem>
                      <SelectItem value="営業事務">営業事務</SelectItem>
                      <SelectItem value="管理者">管理者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(dialogType === 'customer' || dialogType === 'supplier') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {dialogType === 'customer' ? '顧客名' : '仕入先名'} *
                  </Label>
                  <Input
                    id="name"
                    value={
                      dialogType === 'customer'
                        ? formData.customer_name || ''
                        : formData.supplier_name || ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [dialogType === 'customer' ? 'customer_name' : 'supplier_name']:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">担当者</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person || ''}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メール</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">住所</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : dialogMode === 'create' ? '登録' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
