'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { verifyInviteToken, createPortalSession } from '@/lib/knowledge/portal-auth'

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
      // トークン検証
      const { data: invite, error: verifyError } = await verifyInviteToken(token)

      if (verifyError || !invite) {
        setError('招待リンクが無効です')
        return
      }

      // メールアドレス確認
      if (email.toLowerCase() !== customerEmail.toLowerCase()) {
        setError('登録されているメールアドレスと一致しません')
        return
      }

      // セッション作成
      const { data: session, error: sessionError } = await createPortalSession(invite.id)

      if (sessionError || !session) {
        setError('セッションの作成に失敗しました')
        return
      }

      // Cookie にセッショントークンを保存
      document.cookie = `portal_session=${session.session_token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=strict`

      // ポータルホームにリダイレクト
      router.push('/portal')
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
