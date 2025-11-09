'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type SalesRep = {
  id: string
  display_name: string | null
}

interface QuoteFiltersProps {
  statusFilter: string
  salesRepFilter: string
  keyword: string
  salesReps: SalesRep[]
  resetHref: string
}

const STATUS_FILTERS = [
  { value: 'all', label: 'すべて' },
  { value: '下書き', label: '下書き' },
  { value: '承認待ち', label: '承認待ち' },
  { value: '承認済み', label: '承認済み' },
  { value: '却下', label: '却下' },
]

export function QuoteFilters({
  statusFilter,
  salesRepFilter,
  keyword,
  salesReps,
  resetHref,
}: QuoteFiltersProps) {
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
  }, [keyword, salesRepFilter, statusFilter])

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
    setLocalKeyword(keyword)
  }, [keyword])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localKeyword === keyword) return
      const trimmed = localKeyword.trim()
      updateParams({ q: trimmed || undefined })
    }, 500)

    return () => clearTimeout(handler)
  }, [localKeyword, keyword])

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="quote_status" className="text-xs font-medium text-gray-500">承認ステータス</label>
        <select
          id="quote_status"
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
        <label htmlFor="quote_sales_rep" className="text-xs font-medium text-gray-500">営業担当</label>
        <select
          id="quote_sales_rep"
          value={salesRepFilter}
          onChange={(event) => updateParams({ sales_rep: event.target.value })}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">すべて</option>
          {salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.display_name ?? '未設定'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 md:col-span-2">
        <label htmlFor="quote_keyword" className="text-xs font-medium text-gray-500">キーワード</label>
        <input
          id="quote_keyword"
          type="text"
          value={localKeyword}
          onChange={(event) => setLocalKeyword(event.target.value)}
          placeholder="見積番号・件名・案件名などで検索"
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="md:col-span-4 flex flex-col gap-2 md:flex-row md:items-end">
        {hasActiveFilters ? (
          <Button asChild type="button" variant="outline" className="w-full md:w-auto">
            <Link href={resetHref} scroll={false}>
              フィルタをリセット
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" className="w-full md:w-auto" disabled>
            フィルタをリセット
          </Button>
        )}
      </div>
    </div>
  )
}
