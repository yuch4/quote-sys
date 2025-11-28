'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MonthlyCostPlanner } from '@/components/projects/cost-schedule-planner'
import type { ProjectCostSchedule } from '@/types/database'
import {
  deserializeCostSchedules,
  costScheduleDraftsToPayload,
  type CostScheduleDraft,
} from '@/lib/projects/cost-schedule'
import { toast } from 'sonner'

interface QuoteCostPlanProps {
  quoteId: string
  projectId: string
  quoteNumber: string
  projectName: string
  totalCost: number
  defaultStartMonth?: string
  initialSchedules: ProjectCostSchedule[]
  isAwarded: boolean
}

export function QuoteCostPlanManager({
  quoteId,
  projectId,
  quoteNumber,
  projectName,
  totalCost,
  defaultStartMonth,
  initialSchedules,
  isAwarded,
}: QuoteCostPlanProps) {
  const router = useRouter()
  const supabase = createClient()

  const initialDrafts = useMemo(() => deserializeCostSchedules(initialSchedules), [initialSchedules])
  const [planState, setPlanState] = useState<{ enabled: boolean; rows: CostScheduleDraft[] }>({
    enabled: initialDrafts.length > 0,
    rows: initialDrafts,
  })
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    setPlanState({
      enabled: initialDrafts.length > 0,
      rows: initialDrafts,
    })
  }, [initialDrafts])

  const formatStatus = () => {
    if (isAwarded) return <Badge variant="default">受注確定</Badge>
    return <Badge variant="outline">未確定</Badge>
  }

  const handleSavePlan = async () => {
    if (!isAwarded) {
      toast.error('受注確定後に仕入計上予定を登録できます')
      return
    }
    if (!planState.enabled || planState.rows.length === 0) {
      toast.error('仕入計上予定を入力してください')
      return
    }

    try {
      setSavingPlan(true)
      const payload = costScheduleDraftsToPayload(
        { projectId, quoteId },
        planState.rows,
      )

      const { error: deleteError } = await supabase
        .from('project_cost_schedules')
        .delete()
        .eq('quote_id', quoteId)
      if (deleteError) throw deleteError

      const { error: insertError } = await supabase
        .from('project_cost_schedules')
        .insert(payload)
      if (insertError) throw insertError

      toast.success('仕入計上予定を保存しました')
      router.refresh()
    } catch (error) {
      console.error('仕入計上予定保存エラー:', error)
      toast.error('仕入計上予定の保存に失敗しました')
    } finally {
      setSavingPlan(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{quoteNumber}</p>
          <p className="text-xs text-gray-500">{projectName}</p>
        </div>
        <div className="flex items-center gap-3">
          {formatStatus()}
        </div>
      </div>

      <div className="rounded-xl border border-dashed p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            受注確定後、仕入原価（{Number(totalCost || 0).toLocaleString()} 円）をもとに仕入計上予定を按分してください。
          </p>
          {!isAwarded && (
            <p className="text-sm text-amber-600">受注確定してから編集できます。</p>
          )}
        </div>
        <MonthlyCostPlanner
          expectedAmount={totalCost}
          defaultStartMonth={defaultStartMonth}
          initialRows={initialDrafts}
          initialEnabled={initialDrafts.length > 0}
          onChange={setPlanState}
          disabled={!isAwarded || savingPlan}
        />
        <Separator />
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSavePlan}
            disabled={!isAwarded || savingPlan || !planState.enabled}
          >
            {savingPlan ? '保存中...' : '仕入計上予定を保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
