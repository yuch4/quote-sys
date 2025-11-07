'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type ProfileFormProps = {
  initialData: {
    id: string
    display_name: string
    department: string | null
    email: string
    role: string | null
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState({
    display_name: initialData.display_name || '',
    department: initialData.department || '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const trimmedName = formState.display_name.trim()
      const trimmedDepartment = formState.department.trim()

      const { error } = await supabase
        .from('users')
        .update({
          display_name: trimmedName,
          department: trimmedDepartment ? trimmedDepartment : null,
        })
        .eq('id', initialData.id)

      if (error) {
        throw error
      }

      // Supabase Authのメタデータも更新してヘッダー表示などと同期
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: trimmedName },
      })

      if (authError) {
        console.error('Authメタデータ更新エラー:', authError)
      }

      toast.success('プロフィールを更新しました')
      router.refresh()
    } catch (error) {
      console.error('プロフィール更新エラー:', error)
      toast.error('プロフィールの更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">氏名</Label>
        <Input
          id="display_name"
          name="display_name"
          value={formState.display_name}
          onChange={handleChange}
          disabled={submitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">部署</Label>
        <Input
          id="department"
          name="department"
          placeholder="例: 営業部"
          value={formState.department}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input id="email" value={initialData.email} disabled readOnly />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">権限</Label>
        <Input id="role" value={initialData.role || '未設定'} disabled readOnly />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? '保存中…' : '保存する'}
        </Button>
      </div>
    </form>
  )
}
