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
]

const procurementItems = [
  {
    name: '進捗ダッシュボード',
    href: '/dashboard/procurement',
    icon: TrendingUp,
  },
  {
    name: '発注待ち',
    href: '/dashboard/procurement/pending',
    icon: ShoppingCart,
  },
  {
    name: '入荷登録',
    href: '/dashboard/procurement/receiving',
    icon: Package,
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
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-800">見積システム</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
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
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="mt-6 px-3">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            発注管理
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
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="mt-6 px-3">
          <div className="space-y-1">
            <Link
              href="/dashboard/billing"
              onClick={handleClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/billing'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
