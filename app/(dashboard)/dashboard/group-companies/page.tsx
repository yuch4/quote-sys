'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { GroupCompanyManager } from '@/components/settings/group-company-manager'

interface User {
  id: string
  role: string
}

export default function GroupCompaniesPage() {
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
    <div className="space-y-6 page-enter">
      {/* ヘッダー */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-800 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
        
        <div className="relative flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <svg className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">グループ会社CRM</h1>
                <p className="text-sm text-indigo-200">Group Company Management</p>
              </div>
            </div>
            <p className="max-w-lg text-sm text-white/80">
              グループ会社の属性情報とシステム利用状況を横断管理。IT資産の可視化・セキュリティ統制の一元管理が可能です。
            </p>
          </div>
          
          {/* 装飾的な要素 */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col items-center gap-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <svg className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs text-indigo-200">セキュリティ</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <svg className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="text-xs text-indigo-200">システム棚卸</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <svg className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs text-indigo-200">グループ連携</span>
            </div>
          </div>
        </div>
      </div>

      <GroupCompanyManager />
    </div>
  )
}
