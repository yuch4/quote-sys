'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type SalesRep = {
  id: string
  display_name: string | null
}

interface ProjectFiltersProps {
  statusFilter: string
  salesRepFilter: string
  keyword: string
  salesReps: SalesRep[]
  resetHref: string
}

const STATUS_FILTERS = [
  { value: 'all', label: 'すべて' },
  { value: 'リード', label: 'リード' },
  { value: '見積中', label: '見積中' },
  { value: '受注', label: '受注' },
  { value: '計上OK', label: '計上OK' },
  { value: '計上済み', label: '計上済み' },
  { value: '失注', label: '失注' },
  { value: 'キャンセル', label: 'キャンセル' },
]

export function ProjectFilters({
  statusFilter,
  salesRepFilter,
  keyword,
  salesReps,
  resetHref,
}: ProjectFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [localKeyword, setLocalKeyword] = useState(keyword)

  const hasActiveFilters = useMemo(() => {
    const trimmed = keyword.trim()
    return (
      statusFilter !== 'all' ||
      salesRepFilter !== 'all' ||
      Boolean(trimmed)
    )
  }, [keyword, statusFilter, salesRepFilter])

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    params.set('page', '1')

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localKeyword === keyword) return
      const trimmed = localKeyword.trim()
      updateParams({ q: trimmed || undefined })
    }, 500)

    return () => clearTimeout(handler)
  }, [localKeyword, keyword])

  return (
    <div className="grid gap-4 md:grid-cols-5 lg:grid-cols-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-gray-500">ステータス</label>
        <select
          id="status"
          value={statusFilter}
          onChange={(event) => updateParams({ status: event.target.value })}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sales_rep" className="text-xs font-medium text-gray-500">営業担当</label>
        <select
          id="sales_rep"
          value={salesRepFilter}
          onChange={(event) => updateParams({ sales_rep: event.target.value })}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">すべて</option>
          {salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.display_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
        <label htmlFor="keyword" className="text-xs font-medium text-gray-500">キーワード</label>
        <input
          id="keyword"
          type="text"
          value={localKeyword}
          onChange={(event) => setLocalKeyword(event.target.value)}
          placeholder="案件名で検索"
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:col-span-2 lg:col-span-1">
        {hasActiveFilters ? (
          <Button asChild type="button" variant="outline" className="w-full md:flex-1">
            <Link href={resetHref} scroll={false}>
              リセット
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" className="w-full md:flex-1" disabled>
            リセット
          </Button>
        )}
      </div>
    </div>
  )
}
