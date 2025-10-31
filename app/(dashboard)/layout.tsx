import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
      {/* サイドバー */}
      <aside className="w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-800">見積システム</h1>
        </div>
        <nav className="mt-4">
          <a href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
            ダッシュボード
          </a>
          <a href="/dashboard/projects" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
            案件管理
          </a>
          <a href="/dashboard/quotes" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
            見積管理
          </a>
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">発注管理</p>
            <a href="/dashboard/procurement" className="block px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">
              進捗ダッシュボード
            </a>
            <a href="/dashboard/procurement/pending" className="block px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">
              発注待ち
            </a>
            <a href="/dashboard/procurement/receiving" className="block px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">
              入荷登録
            </a>
          </div>
          <a href="/dashboard/billing" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
            計上管理
          </a>
          <a href="/dashboard/reports" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
            レポート
          </a>
          {userData?.role === '営業事務' || userData?.role === '管理者' ? (
            <>
              <a href="/dashboard/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                設定
              </a>
            </>
          ) : null}
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {userData?.display_name} さん ({userData?.role})
            </h2>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ログアウト
              </button>
            </form>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
