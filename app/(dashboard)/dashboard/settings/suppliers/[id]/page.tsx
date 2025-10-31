'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Supplier } from '@/types/database'

export default function EditSupplierPage() {
  const router = useRouter()
  const params = useParams()
  const supplierId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    supplier_code: '',
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    payment_terms: '',
  })

  useEffect(() => {
    const fetchSupplier = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single()

      if (error) {
        setError('仕入先情報の取得に失敗しました')
        return
      }

      setSupplier(data)
      setFormData({
        supplier_code: data.supplier_code,
        supplier_name: data.supplier_name,
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        email: data.email || '',
        payment_terms: data.payment_terms || '',
      })
    }

    fetchSupplier()
  }, [supplierId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('suppliers')
        .update({
          supplier_code: formData.supplier_code,
          supplier_name: formData.supplier_name,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          payment_terms: formData.payment_terms || null,
        })
        .eq('id', supplierId)

      if (error) {
        setError('仕入先の更新に失敗しました: ' + error.message)
        return
      }

      router.push('/dashboard/settings/suppliers')
      router.refresh()
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この仕入先を削除してもよろしいですか?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('suppliers')
        .update({ is_deleted: true })
        .eq('id', supplierId)

      if (error) {
        setError('仕入先の削除に失敗しました: ' + error.message)
        return
      }

      router.push('/dashboard/settings/suppliers')
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

  if (!supplier) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">仕入先編集</h1>
        <p className="text-gray-600 mt-2">仕入先情報を編集します</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>仕入先情報</CardTitle>
          <CardDescription>必須項目を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_code">仕入先コード *</Label>
                <Input
                  id="supplier_code"
                  name="supplier_code"
                  value={formData.supplier_code}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_name">仕入先名 *</Label>
                <Input
                  id="supplier_name"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="payment_terms">支払条件</Label>
                <Input
                  id="payment_terms"
                  name="payment_terms"
                  placeholder="月末締め翌月末払い"
                  value={formData.payment_terms}
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
