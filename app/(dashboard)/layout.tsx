import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { UserMenu } from '@/components/layout/user-menu'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'

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
    <div className="flex h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      {/* デスクトップサイドバー */}
      <aside className="hidden lg:flex lg:flex-col h-full w-72 bg-gradient-to-b from-[oklch(0.20_0.04_250)] via-[oklch(0.22_0.045_250)] to-[oklch(0.18_0.04_255)] text-white shadow-2xl shadow-black/20 border-r border-white/5">
        <Sidebar userRole={userData?.role} />
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 md:px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MobileSidebar userRole={userData?.role} />
              <div className="hidden sm:block">
                <h2 className="text-base font-semibold text-foreground">
                  {userData?.display_name}
                </h2>
                <p className="text-xs text-muted-foreground">{userData?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <NotificationBell userId={user.id} />
              <div className="w-px h-8 bg-border hidden md:block" />
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
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
          <div className="mb-4">
            <BreadcrumbNav />
          </div>
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
