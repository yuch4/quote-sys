'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateProjectStatus } from '@/app/(dashboard)/dashboard/projects/actions'
import { ProjectActivityEntryButton } from '@/components/projects/project-activity-entry'

const KANBAN_STATUSES = [
  { value: 'リード', label: 'リード' },
  { value: '見積中', label: '見積中' },
  { value: '受注', label: '受注' },
  { value: '計上OK', label: '計上OK' },
  { value: '計上済み', label: '計上済み' },
  { value: '失注', label: '失注' },
  { value: 'キャンセル', label: 'キャンセル' },
] as const

type KanbanStatus = (typeof KANBAN_STATUSES)[number]['value']
const DEFAULT_STATUS: KanbanStatus = 'リード'
const STATUS_SET = new Set<string>(KANBAN_STATUSES.map((status) => status.value))

export type KanbanProject = {
  id: string
  project_number?: string | null
  project_name?: string | null
  derivedStatus?: string | null
  status?: string | null
  expected_sales?: number | string | null
  expected_gross_profit?: number | string | null
  order_month?: string | null
  accounting_month?: string | null
  contract_probability?: 'S' | 'A' | 'B' | 'C' | 'D' | null
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

const formatContractProbability = (value?: string | null) => {
  switch (value) {
    case 'S': return 'S（ほぼ確定）'
    case 'A': return 'A（高い）'
    case 'B': return 'B（中間）'
    case 'C': return 'C（低い）'
    case 'D': return 'D（未確定）'
    default: return '-'
  }
}

const formatMonth = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

const normalizeStatus = (value?: string | null): KanbanStatus => {
  if (value && STATUS_SET.has(value)) {
    return value as KanbanStatus
  }
  return DEFAULT_STATUS
}

export function ProjectKanbanBoard({ projects }: { projects: KanbanProject[] }) {
  const [projectState, setProjectState] = useState(projects)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<KanbanStatus | null>(null)
  const [isPending, startTransition] = useTransition()
  const previousStateRef = useRef(projects)

  useEffect(() => {
    setProjectState(projects)
    previousStateRef.current = projects
  }, [projects])

  const grouped = useMemo(() => {
    return KANBAN_STATUSES.map((status) => {
      const items = projectState.filter((project) => normalizeStatus(project.derivedStatus ?? project.status) === status.value)

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
  }, [projectState])

  const totalVisibleProjects = grouped.reduce((sum, column) => sum + column.stats.count, 0)

  const handleDrop = (status: KanbanStatus) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOverStatus(null)
    if (!draggingId) return

    const projectId = draggingId
    setDraggingId(null)

    const currentProject = projectState.find((project) => project.id === projectId)
    if (!currentProject) return

    const currentStatus = normalizeStatus(currentProject.derivedStatus ?? currentProject.status)
    if (currentStatus === status) {
      return
    }

    setProjectState((prev) => {
      previousStateRef.current = prev
      return prev.map((project) =>
        project.id === projectId
          ? { ...project, derivedStatus: status, status }
          : project
      )
    })

    startTransition(async () => {
      const result = await updateProjectStatus({ projectId, status })
      if (!result?.success) {
        setProjectState(previousStateRef.current)
        toast.error(result?.message ?? 'ステータスの更新に失敗しました。')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">案件カンバン</h2>
          <p className="text-sm text-gray-500">
            ステージ別の進捗と金額感を確認できます（{totalVisibleProjects}件）
          </p>
        </div>
        {isPending && (
          <p className="text-xs text-teal-700">ステータスを更新中...</p>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-4 min-w-[960px]">
          {grouped.map((column) => (
            <section key={column.value} className="flex-1 min-w-[260px] max-w-[340px]">
              <div
                className={cn(
                  'h-full rounded-3xl border bg-white p-5 shadow-sm transition',
                  dragOverStatus === column.value ? 'border-teal-400 ring-2 ring-teal-200' : 'border-gray-200'
                )}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setDragOverStatus(column.value)}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget as Node | null
                  if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                    setDragOverStatus(null)
                  }
                }}
                onDrop={handleDrop(column.value)}
              >
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

                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 min-h-[120px]">
                  {column.items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
                      案件なし
                    </div>
                  ) : (
                    column.items.map((project) => (
                      <article
                        key={project.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          setDraggingId(project.id)
                        }}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setDragOverStatus(null)
                        }}
                        className={cn(
                          'rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] transition hover:border-blue-200 cursor-grab active:cursor-grabbing select-none',
                          draggingId === project.id && 'opacity-70 ring-1 ring-teal-200'
                        )}
                      >
                        <p className="text-xs text-gray-400">{project.project_number ?? '未採番'}</p>
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="mt-0.5 block text-sm font-semibold text-blue-600 hover:underline line-clamp-2"
                        >
                          {project.project_name ?? '案件名未設定'}
                        </Link>
                        <p className="mt-2 text-xs text-gray-500">
                          {project.customer?.customer_name ?? '顧客未設定'}
                        </p>
                        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-gray-600 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">予定売上</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(project.expected_sales)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">予定粗利</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(project.expected_gross_profit)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">契約確度</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatContractProbability(project.contract_probability)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">受注予定</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatMonth(project.order_month)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">計上予定</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatMonth(project.accounting_month)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                          <span>{project.sales_rep?.display_name ?? '担当未設定'}</span>
                          <div className="flex items-center gap-3 font-semibold text-blue-600 text-xs">
                            <Link href={`/dashboard/projects/${project.id}`}>詳細</Link>
                            <span className="text-gray-300">/</span>
                            <Link href={`/dashboard/projects/${project.id}/edit`}>編集</Link>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <ProjectActivityEntryButton
                            projectId={project.id}
                            projectNumber={project.project_number}
                            projectName={project.project_name}
                            customerName={project.customer?.customer_name}
                            label="活動登録"
                            variant="ghost"
                            size="sm"
                          />
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
