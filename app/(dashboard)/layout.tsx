import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" richColors />
      
      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex md:w-64 bg-white border-r">
        <Sidebar userRole={userData?.role} />
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="bg-white border-b px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MobileSidebar userRole={userData?.role} />
              <h2 className="text-sm md:text-lg font-semibold text-gray-800">
                <span className="hidden sm:inline">{userData?.display_name} さん ({userData?.role})</span>
                <span className="sm:hidden">{userData?.display_name}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <NotificationBell userId={user.id} />
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-xs md:text-sm text-gray-600 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
