'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { GroupCompanyManager } from '@/components/settings/group-company-manager'

export default function GroupCompanyListPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ensureAuthorized = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: userRecord } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', authUser.id)
        .single()

      if (!userRecord || (userRecord.role !== '営業事務' && userRecord.role !== '管理者')) {
        toast.error('グループ会社管理は営業事務・管理者のみ利用できます')
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    ensureAuthorized()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">グループ管理</p>
        <h1 className="text-3xl font-bold text-gray-900">グループ会社一覧</h1>
        <p className="mt-2 text-gray-600">一覧から直接、登録・編集・詳細確認・削除まで行えます。</p>
      </div>
      <GroupCompanyManager showInsights={false} showSimulator={false} />
    </div>
  )
}
