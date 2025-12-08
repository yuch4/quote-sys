'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PortalAuthFormProps {
  token: string
  customerEmail: string
}

export function PortalAuthForm({ token, customerEmail }: PortalAuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState(customerEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '認証に失敗しました')
        return
      }

      // ポータルホームにリダイレクト
      router.push('/portal')
      router.refresh()
    } catch {
      setError('認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレスを確認</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@company.com"
          required
        />
        <p className="text-xs text-gray-500">
          登録されているメールアドレスを入力してください
        </p>
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={loading}
      >
        {loading ? 'ログイン中...' : 'ポータルにアクセス'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        ログインすることで、お問い合わせチケットの確認と
        ナレッジベースの閲覧が可能になります。
      </p>
    </form>
  )
}
