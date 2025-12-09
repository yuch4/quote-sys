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
  lastActivityDate?: string | null
  daysSinceLastActivity?: number | null
  agingBackground?: string | null
  agingBorder?: string | null
  agingState?: 'safe' | 'warning' | 'danger' | 'none'
  customer?: { customer_name?: string | null } | null
  sales_rep?: { display_name?: string | null } | null
}

type ActivityAgingSettings = {
  warning_days: number
  danger_days: number
  safe_color: string
  warning_color: string
  danger_color: string
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

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ja-JP')
}

const formatDaysAgo = (days?: number | null) => {
  if (days == null) return '履歴なし'
  if (days === 0) return '本日'
  return `${days}日前`
}

const getAgingColors = (days: number | null | undefined, settings: ActivityAgingSettings) => {
  if (days == null) {
    return { backgroundColor: 'transparent', borderColor: 'transparent', state: 'none' as const }
  }
  if (days > settings.danger_days) {
    return { backgroundColor: settings.danger_color, borderColor: settings.danger_color, state: 'danger' as const }
  }
  if (days > settings.warning_days) {
    return { backgroundColor: settings.warning_color, borderColor: settings.warning_color, state: 'warning' as const }
  }
  return { backgroundColor: settings.safe_color, borderColor: settings.safe_color, state: 'safe' as const }
}

const normalizeStatus = (value?: string | null): KanbanStatus => {
  if (value && STATUS_SET.has(value)) {
    return value as KanbanStatus
  }
  return DEFAULT_STATUS
}

export function ProjectKanbanBoard({
  projects,
  activitySettings,
}: {
  projects: KanbanProject[]
  activitySettings: ActivityAgingSettings
}) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">案件パイプライン</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ドラッグ&ドロップでステータスを更新（{totalVisibleProjects}件）
          </p>
        </div>
        {isPending && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[oklch(0.65_0.12_195_/_0.1)] text-[oklch(0.45_0.18_195)]">
            <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.12_195)] animate-pulse" />
            <span className="text-xs font-medium">更新中...</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-5 min-w-[1100px]">
          {grouped.map((column, columnIndex) => {
            // ステータスごとの色設定
            const statusColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
              'リード': { bg: 'from-slate-50 to-slate-100/50', border: 'border-slate-200', text: 'text-slate-700', accent: 'bg-slate-500' },
              '見積中': { bg: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500' },
              '受注': { bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'bg-emerald-500' },
              '計上OK': { bg: 'from-violet-50 to-violet-100/50', border: 'border-violet-200', text: 'text-violet-700', accent: 'bg-violet-500' },
              '計上済み': { bg: 'from-cyan-50 to-cyan-100/50', border: 'border-cyan-200', text: 'text-cyan-700', accent: 'bg-cyan-500' },
              '失注': { bg: 'from-rose-50 to-rose-100/50', border: 'border-rose-200', text: 'text-rose-700', accent: 'bg-rose-500' },
              'キャンセル': { bg: 'from-gray-50 to-gray-100/50', border: 'border-gray-300', text: 'text-gray-600', accent: 'bg-gray-500' },
            }
            const colors = statusColors[column.value] || statusColors['リード']
            
            return (
            <section 
              key={column.value} 
              className="flex-1 min-w-[280px] max-w-[360px]"
              style={{ animationDelay: `${columnIndex * 0.05}s` }}
            >
              <div
                className={cn(
                  'h-full rounded-2xl border bg-gradient-to-b transition-all duration-300',
                  colors.bg,
                  colors.border,
                  dragOverStatus === column.value 
                    ? 'ring-2 ring-[oklch(0.65_0.12_195)] border-[oklch(0.65_0.12_195_/_0.5)] shadow-lg shadow-[oklch(0.65_0.12_195_/_0.15)]' 
                    : 'shadow-sm hover:shadow-md'
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
                {/* Column Header */}
                <div className="p-4 border-b border-black/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-3 h-3 rounded-full', colors.accent)} />
                      <h3 className={cn('text-sm font-bold', colors.text)}>{column.label}</h3>
                    </div>
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-bold',
                      column.stats.count > 0 
                        ? `${colors.accent} text-white` 
                        : 'bg-gray-200 text-gray-500'
                    )}>
                      {column.stats.count}
                    </span>
                  </div>
                  
                  {/* Stats Summary */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">売上</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {formatStatCurrency(column.stats.totalSales)}
                      </p>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">粗利</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {formatStatCurrency(column.stats.totalGrossProfit)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {column.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[180px] rounded-xl border-2 border-dashed border-gray-200/80 bg-white/40">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">案件なし</p>
                    </div>
                  ) : (
                    column.items.map((project, projectIndex) => {
                      const agingColors = project.agingBackground
                        ? {
                            backgroundColor: project.agingBackground,
                            borderColor: project.agingBorder ?? project.agingBackground,
                            state: project.agingState ?? 'none',
                          }
                        : getAgingColors(project.daysSinceLastActivity ?? null, activitySettings)
                      
                      // 契約確度バッジの色
                      const probabilityColors: Record<string, string> = {
                        'S': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        'A': 'bg-blue-100 text-blue-700 border-blue-200',
                        'B': 'bg-amber-100 text-amber-700 border-amber-200',
                        'C': 'bg-orange-100 text-orange-700 border-orange-200',
                        'D': 'bg-gray-100 text-gray-600 border-gray-200',
                      }
                      
                      return (
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
                          'group rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing select-none',
                          'hover:shadow-lg hover:-translate-y-0.5 hover:border-[oklch(0.65_0.12_195_/_0.4)]',
                          draggingId === project.id && 'opacity-60 ring-2 ring-[oklch(0.65_0.12_195)] scale-[1.02] shadow-xl rotate-1'
                        )}
                        style={{
                          animationDelay: `${projectIndex * 0.03}s`,
                          ...(agingColors.state === 'danger' ? { 
                            borderLeftWidth: '4px',
                            borderLeftColor: 'oklch(0.55 0.22 25)',
                          } : agingColors.state === 'warning' ? {
                            borderLeftWidth: '4px',
                            borderLeftColor: 'oklch(0.75 0.15 85)',
                          } : {})
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                {project.project_number ?? '未採番'}
                              </span>
                              {project.contract_probability && (
                                <span className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                                  probabilityColors[project.contract_probability] || probabilityColors['D']
                                )}>
                                  {project.contract_probability}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/dashboard/projects/${project.id}`}
                              className="mt-1.5 block text-sm font-semibold text-foreground hover:text-[oklch(0.45_0.18_195)] transition-colors line-clamp-2 leading-snug"
                            >
                              {project.project_name ?? '案件名未設定'}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                              {project.customer?.customer_name ?? '顧客未設定'}
                            </p>
                          </div>
                          
                          {/* Activity Indicator */}
                          <div className="flex flex-col items-end gap-1">
                            {agingColors.state === 'danger' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                要対応
                              </span>
                            )}
                            {agingColors.state === 'warning' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[oklch(0.80_0.15_85_/_0.15)] text-[oklch(0.55_0.15_85)] text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.75_0.15_85)]" />
                                注意
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDaysAgo(project.daysSinceLastActivity)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Financial Info */}
                        <div className="mt-3 p-2.5 rounded-lg bg-gradient-to-br from-muted/30 to-muted/50 border border-border/50">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground text-[10px]">売上</span>
                              <p className="font-bold text-foreground">{formatCurrency(project.expected_sales)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px]">粗利</span>
                              <p className="font-bold text-[oklch(0.55_0.18_145)]">{formatCurrency(project.expected_gross_profit)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px]">受注予定</span>
                              <p className="font-medium text-foreground">{formatMonth(project.order_month)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px]">計上予定</span>
                              <p className="font-medium text-foreground">{formatMonth(project.accounting_month)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[100px]">
                            {project.sales_rep?.display_name ?? '担当未設定'}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link 
                              href={`/dashboard/projects/${project.id}`}
                              className="px-2 py-1 text-[10px] font-medium text-[oklch(0.45_0.18_195)] hover:bg-[oklch(0.65_0.12_195_/_0.1)] rounded-md transition-colors"
                            >
                              詳細
                            </Link>
                            <Link 
                              href={`/dashboard/projects/${project.id}/edit`}
                              className="px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            >
                              編集
                            </Link>
                            <ProjectActivityEntryButton
                              projectId={project.id}
                              projectNumber={project.project_number}
                              projectName={project.project_name}
                              customerName={project.customer?.customer_name}
                              label="活動"
                              variant="ghost"
                              size="sm"
                            />
                          </div>
                        </div>
                      </article>
                      )
                    })
                  )}
                </div>
              </div>
            </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
