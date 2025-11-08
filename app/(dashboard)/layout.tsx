import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { UserMenu } from '@/components/layout/user-menu'

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
      <aside className="hidden lg:flex lg:flex-col h-full w-64 bg-[#1E2938] text-white shadow-lg">
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
              <UserMenu
                userId={user.id}
                name={userData?.display_name ?? 'ユーザー'}
                email={userData?.email ?? user.email ?? ''}
                role={userData?.role}
              />
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
