'use client'

import type { ComponentType } from 'react'
import { useMemo, useState } from 'react'
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
  Building2,
  ListChecks,
  ChevronDown,
  BookOpen,
  Ticket,
  FileQuestion,
  BarChart3,
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
]

export function Sidebar({ userRole, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [procurementMenuOpen, setProcurementMenuOpen] = useState(() => pathname.startsWith('/dashboard/procurement'))
  const [groupMenuOpen, setGroupMenuOpen] = useState(() => pathname.startsWith('/dashboard/group-companies'))
  const [knowledgeMenuOpen, setKnowledgeMenuOpen] = useState(() => pathname.startsWith('/dashboard/knowledge'))

  const groupMenuItems = useMemo(
    () => [
      {
        name: 'ダッシュボード',
        href: '/dashboard/group-companies',
        icon: Building2,
      },
      {
        name: 'グループ会社一覧',
        href: '/dashboard/group-companies/list',
        icon: ListChecks,
      },
    ],
    [],
  )

  const knowledgeMenuItems = useMemo(
    () => [
      {
        name: 'ダッシュボード',
        href: '/dashboard/knowledge',
        icon: BookOpen,
      },
      {
        name: 'チケット一覧',
        href: '/dashboard/knowledge/tickets',
        icon: Ticket,
      },
      {
        name: 'ナレッジベース',
        href: '/dashboard/knowledge/base',
        icon: FileQuestion,
      },
      {
        name: '分析',
        href: '/dashboard/knowledge/analytics',
        icon: BarChart3,
      },
    ],
    [],
  )

  const handleClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  const renderNavLink = (
    href: string,
    label: string,
    icon: ComponentType<{ className?: string }>,
    isActive: boolean,
    title?: string,
  ) => {
    const Icon = icon
    return (
      <Link
        key={href}
        href={href}
        onClick={handleClick}
        title={title}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-gradient-to-r from-[oklch(0.65_0.12_195)] to-[oklch(0.55_0.15_195)] text-white shadow-lg shadow-cyan-500/20'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )}
      >
        <Icon className={cn('h-5 w-5 transition-transform', isActive ? 'scale-110' : '')} />
        {label}
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.12_195)] to-[oklch(0.55_0.18_195)] flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-tight">Quote System</div>
            <div className="text-xs text-white/50">見積管理システム</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">メイン</p>
          {navigationItems.map((item) =>
            renderNavLink(item.href, item.name, item.icon, pathname === item.href)
          )}
        </div>

        {/* Procurement Section */}
        <div>
          <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">調達</p>
          <div className="rounded-xl bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setProcurementMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-[oklch(0.65_0.12_195)]" />
                調達・発注
              </span>
              <ChevronDown
                className={cn('h-4 w-4 text-white/50 transition-transform duration-200', procurementMenuOpen ? 'rotate-180' : 'rotate-0')}
              />
            </button>
            {procurementMenuOpen && (
              <div className="border-t border-white/10 py-2 px-2 space-y-1">
                {procurementItems.map((item) => (
                  <div key={item.href}>
                    {renderNavLink(
                      item.href,
                      item.name,
                      item.icon,
                      pathname === item.href,
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reports & Billing */}
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">レポート</p>
          {renderNavLink('/dashboard/billing', '計上管理', CreditCard, pathname === '/dashboard/billing')}
          {renderNavLink('/dashboard/reports', 'レポート', TrendingUp, pathname === '/dashboard/reports')}
        </div>
          
        {/* Knowledge Management */}
        <div>
          <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">ナレッジ</p>
          <div className="rounded-xl bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setKnowledgeMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-[oklch(0.75_0.12_85)]" />
                ナレッジ管理
              </span>
              <ChevronDown
                className={cn('h-4 w-4 text-white/50 transition-transform duration-200', knowledgeMenuOpen ? 'rotate-180' : 'rotate-0')}
              />
            </button>
            {knowledgeMenuOpen && (
              <div className="border-t border-white/10 py-2 px-2 space-y-1">
                {knowledgeMenuItems.map((item) => (
                  <div key={item.href}>
                    {renderNavLink(
                      item.href,
                      item.name,
                      item.icon,
                      pathname === item.href || pathname.startsWith(item.href + '/'),
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Section */}
        {(userRole === '営業事務' || userRole === '管理者') && (
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">管理</p>
            <div className="rounded-xl bg-white/5 overflow-hidden mb-2">
              <button
                type="button"
                onClick={() => setGroupMenuOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-[oklch(0.65_0.18_145)]" />
                  グループ管理
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 text-white/50 transition-transform duration-200', groupMenuOpen ? 'rotate-180' : 'rotate-0')}
                />
              </button>
              {groupMenuOpen && (
                <div className="border-t border-white/10 py-2 px-2 space-y-1">
                  {groupMenuItems.map((item) => (
                    <div key={item.href}>
                      {renderNavLink(
                        item.href,
                        item.name,
                        item.icon,
                        pathname === item.href,
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {renderNavLink(
              '/dashboard/settings',
              '設定',
              Settings,
              pathname.startsWith('/dashboard/settings'),
            )}
          </div>
        )}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/30 text-center">
          © {new Date().getFullYear()} Quote System
        </div>
      </div>
    </div>
  )
}
