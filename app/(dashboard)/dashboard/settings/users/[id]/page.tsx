'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/types/database'
import { DepartmentSelect } from '@/components/departments/department-select'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    departmentId: null as string | null,
    departmentName: '',
    role: '営業' as '営業' | '営業事務' | '管理者',
    is_active: true,
  })

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        setError('ユーザー情報の取得に失敗しました')
        return
      }

      setUser(data)
      setFormData({
        email: data.email,
        display_name: data.display_name,
        departmentId: data.department_id,
        departmentName: data.department || '',
        role: data.role,
        is_active: data.is_active,
      })
    }

    fetchUser()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          display_name: formData.display_name,
          department_id: formData.departmentId,
          department: formData.departmentName || null,
          role: formData.role,
          is_active: formData.is_active,
        })
        .eq('id', userId)

      if (error) {
        setError('ユーザーの更新に失敗しました: ' + error.message)
        return
      }

      router.push('/dashboard/settings/users')
      router.refresh()
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!confirm(`このユーザーを${formData.is_active ? '無効化' : '有効化'}してもよろしいですか?`)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ is_active: !formData.is_active })
        .eq('id', userId)

      if (error) {
        setError('ステータスの更新に失敗しました: ' + error.message)
        return
      }

      setFormData({ ...formData, is_active: !formData.is_active })
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

  if (!user) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ユーザー編集</h1>
        <p className="text-gray-600 mt-2">ユーザー情報を編集します</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー情報</CardTitle>
          <CardDescription>必須項目を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">メールアドレスは変更できません</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">表示名 *</Label>
              <Input
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">部門</Label>
              <DepartmentSelect
                value={formData.departmentId}
                onChange={({ id, name }) =>
                  setFormData((prev) => ({
                    ...prev,
                    departmentId: id,
                    departmentName: name ?? '',
                  }))
                }
                disabled={loading}
              />
              {!formData.departmentId && formData.departmentName && (
                <p className="text-xs text-gray-500">現在の部署: {formData.departmentName}（マスタ未割当）</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">役割 *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as '営業' | '営業事務' | '管理者' })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="営業">営業</SelectItem>
                  <SelectItem value="営業事務">営業事務</SelectItem>
                  <SelectItem value="管理者">管理者</SelectItem>
                </SelectContent>
              </Select>
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
                variant={formData.is_active ? 'destructive' : 'default'}
                onClick={handleToggleActive}
                disabled={loading}
              >
                {formData.is_active ? '無効化' : '有効化'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
