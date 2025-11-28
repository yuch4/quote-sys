'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// パス名から日本語ラベルへのマッピング
const pathLabels: Record<string, string> = {
  dashboard: 'ダッシュボード',
  projects: '案件管理',
  quotes: '見積管理',
  approvals: '承認タスク',
  procurement: '調達・発注',
  pending: '発注候補',
  'purchase-orders': '発注書一覧',
  receiving: '入荷登録',
  activity: 'アクティビティ',
  billing: '計上管理',
  reports: 'レポート',
  'group-companies': 'グループ管理',
  list: '一覧',
  settings: '設定',
  customers: '顧客管理',
  suppliers: '仕入先管理',
  users: 'ユーザー管理',
  profile: 'プロフィール',
  new: '新規作成',
  edit: '編集',
  revise: '改訂',
}

interface BreadcrumbItem {
  label: string
  href: string
  isCurrentPage: boolean
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // パスを分割 (空の要素を除去)
  const segments = pathname.split('/').filter(Boolean)
  
  // ダッシュボードのみの場合は空配列を返す
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return []
  }

  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    
    // ダッシュボードは「ホーム」アイコンで表示するためスキップ
    if (segment === 'dashboard' && i === 0) {
      continue
    }

    // 動的パラメータ（UUID等）かどうかを判定
    const isDynamicSegment = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
                             /^\d+$/.test(segment)

    let label: string
    if (isDynamicSegment) {
      // 動的セグメントの場合、親のコンテキストに基づいてラベルを設定
      const parentSegment = segments[i - 1]
      if (parentSegment === 'quotes') {
        label = '見積詳細'
      } else if (parentSegment === 'projects') {
        label = '案件詳細'
      } else if (parentSegment === 'customers') {
        label = '顧客詳細'
      } else if (parentSegment === 'suppliers') {
        label = '仕入先詳細'
      } else if (parentSegment === 'users') {
        label = 'ユーザー詳細'
      } else {
        label = '詳細'
      }
    } else {
      label = pathLabels[segment] || segment
    }

    breadcrumbs.push({
      label,
      href: currentPath,
      isCurrentPage: i === segments.length - 1,
    })
  }

  return breadcrumbs
}

interface BreadcrumbProps {
  className?: string
}

export function Breadcrumb({ className }: BreadcrumbProps) {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  // ダッシュボードトップの場合はパンくずを表示しない
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="パンくずリスト"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {/* ホームアイコン */}
        <li className="flex items-center">
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label="ダッシュボードへ"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {/* パンくず項目 */}
        {breadcrumbs.map((item, index) => (
          <Fragment key={item.href}>
            <li className="flex items-center text-gray-400" aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </li>
            <li className="flex items-center">
              {item.isCurrentPage ? (
                <span
                  className="font-medium text-gray-900 px-1"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors px-1 py-0.5 rounded hover:bg-gray-100"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
