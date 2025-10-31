'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Customer } from '@/types/database'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    customer_code: '',
    customer_name: '',
    customer_name_kana: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    contact_person: '',
  })

  useEffect(() => {
    const fetchCustomer = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (error) {
        setError('顧客情報の取得に失敗しました')
        return
      }

      setCustomer(data)
      setFormData({
        customer_code: data.customer_code,
        customer_name: data.customer_name,
        customer_name_kana: data.customer_name_kana || '',
        postal_code: data.postal_code || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        contact_person: data.contact_person || '',
      })
    }

    fetchCustomer()
  }, [customerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('customers')
        .update({
          customer_code: formData.customer_code,
          customer_name: formData.customer_name,
          customer_name_kana: formData.customer_name_kana || null,
          postal_code: formData.postal_code || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          contact_person: formData.contact_person || null,
        })
        .eq('id', customerId)

      if (error) {
        setError('顧客の更新に失敗しました: ' + error.message)
        return
      }

      router.push('/dashboard/settings/customers')
      router.refresh()
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この顧客を削除してもよろしいですか?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', customerId)

      if (error) {
        setError('顧客の削除に失敗しました: ' + error.message)
        return
      }

      router.push('/dashboard/settings/customers')
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

  if (!customer) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">顧客編集</h1>
        <p className="text-gray-600 mt-2">顧客情報を編集します</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>顧客情報</CardTitle>
          <CardDescription>必須項目を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_code">顧客コード *</Label>
                <Input
                  id="customer_code"
                  name="customer_code"
                  value={formData.customer_code}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_name">顧客名 *</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name_kana">顧客名カナ</Label>
              <Input
                id="customer_name_kana"
                name="customer_name_kana"
                value={formData.customer_name_kana}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">郵便番号</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  placeholder="123-4567"
                  value={formData.postal_code}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="03-1234-5678"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">担当者名</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-4 justify-between">
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
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                削除
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
