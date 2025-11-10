'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MonthlyBillingPlanner } from '@/components/projects/billing-schedule-planner'
import type { BillingScheduleDraft, ProjectBillingSchedule } from '@/types/database'
import { deserializeSchedules, scheduleDraftsToPayload } from '@/lib/projects/billing-schedule'
import { toast } from 'sonner'

interface QuoteBillingPlanProps {
  quoteId: string
  projectId: string
  quoteNumber: string
  projectName: string
  totalAmount: number
  defaultStartMonth?: string
  initialSchedules: ProjectBillingSchedule[]
  isAwarded: boolean
}

export function QuoteBillingPlanManager({
  quoteId,
  projectId,
  quoteNumber,
  projectName,
  totalAmount,
  defaultStartMonth,
  initialSchedules,
  isAwarded,
}: QuoteBillingPlanProps) {
  const router = useRouter()
  const supabase = createClient()

  const initialDrafts = useMemo(() => deserializeSchedules(initialSchedules), [initialSchedules])
  const [awarded, setAwarded] = useState(isAwarded)
  const [awardLoading, setAwardLoading] = useState(false)
  const [planState, setPlanState] = useState<{ enabled: boolean; rows: BillingScheduleDraft[] }>({
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
    if (awarded) return <Badge variant="default">受注確定</Badge>
    return <Badge variant="outline">未確定</Badge>
  }

  const handleToggleAward = async () => {
    try {
      setAwardLoading(true)
      const next = !awarded
      const { data: { user } } = await supabase.auth.getUser()
      const awardUserId = user?.id ?? null

      const { error } = await supabase
        .from('quotes')
        .update({
          is_awarded: next,
          awarded_at: next ? new Date().toISOString() : null,
          awarded_by: next ? awardUserId : null,
        })
        .eq('id', quoteId)

      if (error) throw error
      setAwarded(next)
      toast.success(next ? '見積を受注確定にしました' : '受注確定を解除しました')
      router.refresh()
    } catch (error) {
      console.error('受注確定更新エラー:', error)
      toast.error('受注確定フラグの更新に失敗しました')
    } finally {
      setAwardLoading(false)
    }
  }

  const handleSavePlan = async () => {
    if (!awarded) {
      toast.error('受注確定後に計上予定を登録できます')
      return
    }
    if (!planState.enabled || planState.rows.length === 0) {
      toast.error('計上予定を入力してください')
      return
    }

    try {
      setSavingPlan(true)
      const payload = scheduleDraftsToPayload(
        { projectId, quoteId },
        planState.rows,
      )

      const { error: deleteError } = await supabase
        .from('project_billing_schedules')
        .delete()
        .eq('quote_id', quoteId)
      if (deleteError) throw deleteError

      const { error: insertError } = await supabase
        .from('project_billing_schedules')
        .insert(payload)
      if (insertError) throw insertError

      toast.success('計上予定を保存しました')
      router.refresh()
    } catch (error) {
      console.error('計上予定保存エラー:', error)
      toast.error('計上予定の保存に失敗しました')
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
          <Button variant="outline" size="sm" onClick={handleToggleAward} disabled={awardLoading}>
            {awarded ? '未確定に戻す' : '受注確定にする'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-dashed p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            受注確定後、実際の見積金額（{Number(totalAmount || 0).toLocaleString()} 円）をもとに計上予定を按分してください。
          </p>
          {!awarded && (
            <p className="text-sm text-amber-600">受注確定してから編集できます。</p>
          )}
        </div>
        <MonthlyBillingPlanner
          expectedAmount={totalAmount}
          defaultStartMonth={defaultStartMonth}
          initialRows={initialDrafts}
          initialEnabled={initialDrafts.length > 0}
          onChange={setPlanState}
          disabled={!awarded || savingPlan}
        />
        <Separator />
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSavePlan}
            disabled={!awarded || savingPlan || !planState.enabled}
          >
            {savingPlan ? '保存中...' : '計上予定を保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
