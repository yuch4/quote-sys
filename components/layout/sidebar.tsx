'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ShoppingCart,
  Package,
  TrendingUp,
  CreditCard,
  Settings,
  ClipboardList,
  ClipboardCheck,
  Clock,
} from 'lucide-react'

interface SidebarProps {
  userRole?: string
  onNavigate?: () => void
}

const navigationItems = [
  {
    name: 'ダッシュボード',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '案件管理',
    href: '/dashboard/projects',
    icon: FolderKanban,
  },
  {
    name: '見積管理',
    href: '/dashboard/quotes',
    icon: FileText,
  },
  {
    name: '承認タスク',
    href: '/dashboard/approvals',
    icon: ClipboardCheck,
  },
]

const procurementItems = [
  {
    name: '進捗ダッシュボード',
    href: '/dashboard/procurement',
    icon: TrendingUp,
  },
  {
    name: '発注候補',
    href: '/dashboard/procurement/pending',
    icon: ShoppingCart,
    description: '承認済み見積から発注が必要な明細を確認できます。',
  },
  {
    name: '発注書一覧',
    href: '/dashboard/procurement/purchase-orders',
    icon: ClipboardList,
  },
  {
    name: '入荷登録',
    href: '/dashboard/procurement/receiving',
    icon: Package,
  },
  {
    name: 'アクティビティ管理',
    href: '/dashboard/procurement/activity',
    icon: Clock,
    description: '見積・発注・入荷・案件活動のログを参照できます。',
  },
]

export function Sidebar({ userRole, onNavigate }: SidebarProps) {
  const pathname = usePathname()

  const handleClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#1E2938] text-white">
      <div className="p-6 border-b border-white/10">
        <div className="text-xl font-bold">見積システム</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
        <div className="space-y-1 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="px-3">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
            調達・発注
          </p>
          <div className="space-y-1">
            {procurementItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  )}
                  title={item.description}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="px-3 pb-4">
          <div className="space-y-1">
            <Link
              href="/dashboard/billing"
              onClick={handleClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/billing'
                  ? 'bg-white/15 text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <CreditCard className="h-5 w-5" />
              計上管理
            </Link>
            <Link
              href="/dashboard/reports"
              onClick={handleClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/reports'
                  ? 'bg-white/15 text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <TrendingUp className="h-5 w-5" />
              レポート
            </Link>
            {(userRole === '営業事務' || userRole === '管理者') && (
              <Link
                href="/dashboard/settings"
                onClick={handleClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith('/dashboard/settings')
                    ? 'bg-white/15 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <Settings className="h-5 w-5" />
                設定
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
