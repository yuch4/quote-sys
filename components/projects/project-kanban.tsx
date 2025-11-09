'use client'

import Link from 'next/link'

const KANBAN_STATUSES = [
  { value: 'リード', label: 'リード' },
  { value: '見積中', label: '見積中' },
  { value: '受注', label: '受注' },
  { value: '計上OK', label: '計上OK' },
  { value: '計上済み', label: '計上済み' },
  { value: '失注', label: '失注' },
  { value: 'キャンセル', label: 'キャンセル' },
] as const

export type KanbanProject = {
  id: string
  project_number?: string | null
  project_name?: string | null
  derivedStatus?: string | null
  status?: string | null
  expected_sales?: number | string | null
  expected_gross_profit?: number | string | null
  customer?: { customer_name?: string | null } | null
  sales_rep?: { display_name?: string | null } | null
}

const formatCurrencyValue = (value?: number | string | null) => {
  if (value == null) return '0'
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '0'
  return Math.round(numeric).toLocaleString()
}

const formatCurrency = (value?: number | string | null) => `¥${formatCurrencyValue(value)}`

const formatStatCurrency = (value: number) => `¥${Math.round(value).toLocaleString()}`

const getInitial = (text?: string | null) => {
  if (!text) return '案件'
  return text.trim().slice(0, 2)
}

export function ProjectKanbanBoard({ projects }: { projects: KanbanProject[] }) {
  const grouped = KANBAN_STATUSES.map((status) => {
    const items = projects.filter((project) => {
      const derived = project.derivedStatus ?? project.status ?? 'リード'
      return derived === status.value
    })

    const totalSales = items.reduce((sum, item) => {
      const numeric = typeof item.expected_sales === 'string'
        ? Number(item.expected_sales)
        : item.expected_sales ?? 0
      return sum + (Number.isNaN(numeric) ? 0 : numeric)
    }, 0)

    const totalGrossProfit = items.reduce((sum, item) => {
      const numeric = typeof item.expected_gross_profit === 'string'
        ? Number(item.expected_gross_profit)
        : item.expected_gross_profit ?? 0
      return sum + (Number.isNaN(numeric) ? 0 : numeric)
    }, 0)

    return {
      ...status,
      items,
      stats: {
        count: items.length,
        totalSales,
        totalGrossProfit,
      },
    }
  })

  const totalVisibleProjects = grouped.reduce((sum, column) => sum + column.stats.count, 0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">案件カンバン</h2>
        <p className="text-sm text-gray-500">
          ステージ別の進捗と金額感を確認できます（{totalVisibleProjects}件）
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-4 min-w-[960px]">
          {grouped.map((column) => (
            <section key={column.value} className="flex-1 min-w-[260px] max-w-[340px]">
              <div className="h-full rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-gray-900">{column.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">{column.stats.count}件</p>
                </div>
                <div className="mt-3 space-y-1 rounded-2xl bg-slate-50 p-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">予定売上合計</span>
                    <span className="font-semibold text-gray-900">
                      {formatStatCurrency(column.stats.totalSales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">予定粗利合計</span>
                    <span className="font-semibold text-gray-900">
                      {formatStatCurrency(column.stats.totalGrossProfit)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  {column.items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
                      案件なし
                    </div>
                  ) : (
                    column.items.map((project) => (
                      <article
                        key={project.id}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] transition hover:border-blue-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                            {getInitial(project.project_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">{project.project_number ?? '未採番'}</p>
                            <Link
                              href={`/dashboard/projects/${project.id}`}
                              className="mt-0.5 block text-sm font-semibold text-blue-600 hover:underline line-clamp-2"
                            >
                              {project.project_name ?? '案件名未設定'}
                            </Link>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {project.customer?.customer_name ?? '顧客未設定'}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-gray-500">
                          <div>
                            <p>見込売上</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(project.expected_sales)}
                            </p>
                          </div>
                          <div>
                            <p>見込粗利</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(project.expected_gross_profit)}
                            </p>
                          </div>
                          <div className="col-span-2 flex items-center justify-between pt-1 text-[11px] uppercase tracking-wide text-gray-400">
                            <span>{project.sales_rep?.display_name ?? '担当未設定'}</span>
                            <div className="flex items-center gap-3 font-semibold text-blue-600">
                              <Link href={`/dashboard/projects/${project.id}`}>詳細</Link>
                              <span className="text-gray-300">/</span>
                              <Link href={`/dashboard/projects/${project.id}/edit`}>編集</Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
