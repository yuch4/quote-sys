'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, CheckCircle2, Clock, PauseCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import type { BillingScheduleStatus, CostScheduleStatus } from '@/types/database'
import { firstRelation } from '@/lib/supabase/relations'

interface User {
  id: string
  role: '営業' | '営業事務' | '管理者'
  display_name: string
}

// 売上計上予定の型
interface BillingScheduleRow {
  id: string
  billing_month: string
  billing_date: string | null
  amount: number
  status: BillingScheduleStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  billed_by: string | null
  billed_at: string | null
  project: {
    id: string
    project_number: string
    project_name: string
    sales_rep_id: string
    sales_rep: {
      id: string
      display_name: string
    } | null
    customer: {
      customer_name: string
    } | null
  }
  quote?: {
    id: string
    quote_number: string
  } | null
}

// 仕入計上予定の型
interface CostScheduleRow {
  id: string
  cost_month: string
  cost_date: string | null
  amount: number
  status: CostScheduleStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  recorded_by: string | null
  recorded_at: string | null
  project: {
    id: string
    project_number: string
    project_name: string
    sales_rep_id: string
    sales_rep: {
      id: string
      display_name: string
    } | null
    customer: {
      customer_name: string
    } | null
  }
  quote?: {
    id: string
    quote_number: string
  } | null
  purchase_order?: {
    id: string
    purchase_order_number: string
  } | null
}

type RawBillingScheduleRow = {
  id: string
  billing_month: string
  billing_date: string | null
  amount: number
  status: BillingScheduleStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  billed_by: string | null
  billed_at: string | null
  project: Array<{
    id: string
    project_number: string
    project_name: string
    sales_rep_id: string
    sales_rep: Array<{ id: string; display_name: string }>
    customer: Array<{ customer_name: string }>
  }>
  quote?: Array<{
    id: string
    quote_number: string
  }>
}

type RawCostScheduleRow = {
  id: string
  cost_month: string
  cost_date: string | null
  amount: number
  status: CostScheduleStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  recorded_by: string | null
  recorded_at: string | null
  project: Array<{
    id: string
    project_number: string
    project_name: string
    sales_rep_id: string
    sales_rep: Array<{ id: string; display_name: string }>
    customer: Array<{ customer_name: string }>
  }>
  quote?: Array<{
    id: string
    quote_number: string
  }>
  purchase_order?: Array<{
    id: string
    purchase_order_number: string
  }>
}

const STATUS_BADGE: Record<BillingScheduleStatus | CostScheduleStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  予定: { label: '予定', variant: 'outline' },
  確認済: { label: '確認済', variant: 'secondary' },
  延期: { label: '延期', variant: 'destructive' },
  計上済: { label: '計上済', variant: 'default' },
}

type ScheduleType = 'billing' | 'cost'

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ScheduleType>('billing')
  
  // 売上計上
  const [billingSchedules, setBillingSchedules] = useState<BillingScheduleRow[]>([])
  // 仕入計上
  const [costSchedules, setCostSchedules] = useState<CostScheduleRow[]>([])
  
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'delayed' | 'done'>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // 延期ダイアログ
  const [delayDialogOpen, setDelayDialogOpen] = useState(false)
  const [delayMonth, setDelayMonth] = useState('')
  const [delayReason, setDelayReason] = useState('')
  const [activeBillingSchedule, setActiveBillingSchedule] = useState<BillingScheduleRow | null>(null)
  const [activeCostSchedule, setActiveCostSchedule] = useState<CostScheduleRow | null>(null)

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, display_name')
      .eq('id', authUser.id)
      .single()

    if (userData) {
      setUser(userData as User)
    }
  }, [router, supabase])

  const loadSchedules = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const startDate = new Date(`${monthFilter}-01T00:00:00`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)

      // 売上計上予定を読み込む
      let billingQuery = supabase
        .from('project_billing_schedules')
        .select(`
          id,
          billing_month,
          billing_date,
          amount,
          status,
          notes,
          confirmed_by,
          confirmed_at,
          billed_by,
          billed_at,
          project:projects!inner(
            id,
            project_number,
            project_name,
            sales_rep_id,
            sales_rep:users!projects_sales_rep_id_fkey(id, display_name),
            customer:customers(customer_name)
          ),
          quote:quotes(id, quote_number)
        `)
        .gte('billing_month', startDate.toISOString().slice(0, 10))
        .lt('billing_month', endDate.toISOString().slice(0, 10))
        .order('billing_month', { ascending: true })

      if (user?.role === '営業') {
        billingQuery = billingQuery.eq('project.sales_rep_id', user.id)
      }

      const { data: billingData, error: billingError } = await billingQuery
      if (billingError) throw billingError

      const normalizedBilling = (billingData as RawBillingScheduleRow[] | null)?.map((raw) => {
        const projectRaw = firstRelation(raw.project)
        if (!projectRaw) {
          return null
        }
        const salesRepRaw = firstRelation(projectRaw.sales_rep)
        const customerRaw = firstRelation(projectRaw.customer)
        const quoteRaw = firstRelation(raw.quote)

        return {
          id: raw.id,
          billing_month: raw.billing_month,
          billing_date: raw.billing_date,
          amount: Number(raw.amount || 0),
          status: raw.status,
          notes: raw.notes,
          confirmed_by: raw.confirmed_by,
          confirmed_at: raw.confirmed_at,
          billed_by: raw.billed_by,
          billed_at: raw.billed_at,
          project: {
            id: projectRaw.id,
            project_number: projectRaw.project_number,
            project_name: projectRaw.project_name,
            sales_rep_id: projectRaw.sales_rep_id,
            sales_rep: salesRepRaw
              ? { id: salesRepRaw.id, display_name: salesRepRaw.display_name }
              : null,
            customer: customerRaw ? { customer_name: customerRaw.customer_name } : null,
          },
          quote: quoteRaw ? { id: quoteRaw.id, quote_number: quoteRaw.quote_number } : null,
        } as BillingScheduleRow
      }).filter((row): row is BillingScheduleRow => row !== null) ?? []

      setBillingSchedules(normalizedBilling)

      // 仕入計上予定を読み込む
      let costQuery = supabase
        .from('project_cost_schedules')
        .select(`
          id,
          cost_month,
          cost_date,
          amount,
          status,
          notes,
          confirmed_by,
          confirmed_at,
          recorded_by,
          recorded_at,
          project:projects!inner(
            id,
            project_number,
            project_name,
            sales_rep_id,
            sales_rep:users!projects_sales_rep_id_fkey(id, display_name),
            customer:customers(customer_name)
          ),
          quote:quotes(id, quote_number),
          purchase_order:purchase_orders(id, purchase_order_number)
        `)
        .gte('cost_month', startDate.toISOString().slice(0, 10))
        .lt('cost_month', endDate.toISOString().slice(0, 10))
        .order('cost_month', { ascending: true })

      if (user?.role === '営業') {
        costQuery = costQuery.eq('project.sales_rep_id', user.id)
      }

      const { data: costData, error: costError } = await costQuery
      if (costError) throw costError

      const normalizedCost = (costData as RawCostScheduleRow[] | null)?.map((raw) => {
        const projectRaw = firstRelation(raw.project)
        if (!projectRaw) {
          return null
        }
        const salesRepRaw = firstRelation(projectRaw.sales_rep)
        const customerRaw = firstRelation(projectRaw.customer)
        const quoteRaw = firstRelation(raw.quote)
        const purchaseOrderRaw = firstRelation(raw.purchase_order)

        return {
          id: raw.id,
          cost_month: raw.cost_month,
          cost_date: raw.cost_date,
          amount: Number(raw.amount || 0),
          status: raw.status,
          notes: raw.notes,
          confirmed_by: raw.confirmed_by,
          confirmed_at: raw.confirmed_at,
          recorded_by: raw.recorded_by,
          recorded_at: raw.recorded_at,
          project: {
            id: projectRaw.id,
            project_number: projectRaw.project_number,
            project_name: projectRaw.project_name,
            sales_rep_id: projectRaw.sales_rep_id,
            sales_rep: salesRepRaw
              ? { id: salesRepRaw.id, display_name: salesRepRaw.display_name }
              : null,
            customer: customerRaw ? { customer_name: customerRaw.customer_name } : null,
          },
          quote: quoteRaw ? { id: quoteRaw.id, quote_number: quoteRaw.quote_number } : null,
          purchase_order: purchaseOrderRaw ? { id: purchaseOrderRaw.id, purchase_order_number: purchaseOrderRaw.purchase_order_number } : null,
        } as CostScheduleRow
      }).filter((row): row is CostScheduleRow => row !== null) ?? []

      setCostSchedules(normalizedCost)
    } catch (error) {
      console.error('計上予定読込エラー:', error)
      toast.error('計上予定の読込に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [monthFilter, supabase, user])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  // 売上計上のフィルタリング
  const filteredBillingSchedules = useMemo(() => {
    return billingSchedules.filter((schedule) => {
      if (onlyMine && user && schedule.project.sales_rep?.id !== user.id) {
        return false
      }

      switch (statusFilter) {
        case 'pending':
          return schedule.status === '予定'
        case 'confirmed':
          return schedule.status === '確認済'
        case 'delayed':
          return schedule.status === '延期'
        case 'done':
          return schedule.status === '計上済'
        default:
          return true
      }
    })
  }, [billingSchedules, onlyMine, statusFilter, user])

  // 仕入計上のフィルタリング
  const filteredCostSchedules = useMemo(() => {
    return costSchedules.filter((schedule) => {
      if (onlyMine && user && schedule.project.sales_rep?.id !== user.id) {
        return false
      }

      switch (statusFilter) {
        case 'pending':
          return schedule.status === '予定'
        case 'confirmed':
          return schedule.status === '確認済'
        case 'delayed':
          return schedule.status === '延期'
        case 'done':
          return schedule.status === '計上済'
        default:
          return true
      }
    })
  }, [costSchedules, onlyMine, statusFilter, user])

  // 売上サマリー
  const billingSummary = useMemo(() => {
    const base = { total: 0, pending: 0, confirmed: 0, delayed: 0, done: 0, amount: 0 }
    return filteredBillingSchedules.reduce((acc, schedule) => {
      acc.total += 1
      acc.amount += schedule.amount
      if (schedule.status === '予定') acc.pending += 1
      if (schedule.status === '確認済') acc.confirmed += 1
      if (schedule.status === '延期') acc.delayed += 1
      if (schedule.status === '計上済') acc.done += 1
      return acc
    }, base)
  }, [filteredBillingSchedules])

  // 仕入サマリー
  const costSummary = useMemo(() => {
    const base = { total: 0, pending: 0, confirmed: 0, delayed: 0, done: 0, amount: 0 }
    return filteredCostSchedules.reduce((acc, schedule) => {
      acc.total += 1
      acc.amount += schedule.amount
      if (schedule.status === '予定') acc.pending += 1
      if (schedule.status === '確認済') acc.confirmed += 1
      if (schedule.status === '延期') acc.delayed += 1
      if (schedule.status === '計上済') acc.done += 1
      return acc
    }, base)
  }, [filteredCostSchedules])

  const formatCurrency = (amount: number) => `¥${Math.round(amount).toLocaleString()}`

  const formatMonth = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  const addMonthValue = (value?: string | null) => {
    if (!value) return ''
    const base = new Date(value)
    if (Number.isNaN(base.getTime())) return ''
    base.setMonth(base.getMonth() + 1)
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
  }

  // 売上計上の延期ダイアログを開く
  const openBillingDelayDialog = (schedule: BillingScheduleRow) => {
    setActiveBillingSchedule(schedule)
    setActiveCostSchedule(null)
    setDelayDialogOpen(true)
    const next = addMonthValue(schedule.billing_month)
    setDelayMonth(next || schedule.billing_month?.slice(0, 7) || monthFilter)
    setDelayReason('')
  }

  // 仕入計上の延期ダイアログを開く
  const openCostDelayDialog = (schedule: CostScheduleRow) => {
    setActiveCostSchedule(schedule)
    setActiveBillingSchedule(null)
    setDelayDialogOpen(true)
    const next = addMonthValue(schedule.cost_month)
    setDelayMonth(next || schedule.cost_month?.slice(0, 7) || monthFilter)
    setDelayReason('')
  }

  // 売上計上の確認処理
  const handleConfirmBillingSchedule = async (schedule: BillingScheduleRow) => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('project_billing_schedules')
        .update({
          status: '確認済',
          confirmed_by: user?.id ?? null,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', schedule.id)

      if (error) throw error
      toast.success('売上計上予定を確認しました')
      loadSchedules()
    } catch (error) {
      console.error('確認処理エラー:', error)
      toast.error('確認処理に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  // 仕入計上の確認処理
  const handleConfirmCostSchedule = async (schedule: CostScheduleRow) => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('project_cost_schedules')
        .update({
          status: '確認済',
          confirmed_by: user?.id ?? null,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', schedule.id)

      if (error) throw error
      toast.success('仕入計上予定を確認しました')
      loadSchedules()
    } catch (error) {
      console.error('確認処理エラー:', error)
      toast.error('確認処理に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  // 売上計上済み処理
  const handleMarkBillingAsBilled = async (schedule: BillingScheduleRow) => {
    try {
      setActionLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('project_billing_schedules')
        .update({
          status: '計上済',
          billed_by: user?.id ?? null,
          billed_at: new Date().toISOString(),
          billing_date: schedule.billing_date || today,
        })
        .eq('id', schedule.id)

      if (error) throw error
      toast.success('売上計上済みに更新しました')
      loadSchedules()
    } catch (error) {
      console.error('計上処理エラー:', error)
      toast.error('計上済みへの更新に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  // 仕入計上済み処理
  const handleMarkCostAsRecorded = async (schedule: CostScheduleRow) => {
    try {
      setActionLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('project_cost_schedules')
        .update({
          status: '計上済',
          recorded_by: user?.id ?? null,
          recorded_at: new Date().toISOString(),
          cost_date: schedule.cost_date || today,
        })
        .eq('id', schedule.id)

      if (error) throw error
      toast.success('仕入計上済みに更新しました')
      loadSchedules()
    } catch (error) {
      console.error('計上処理エラー:', error)
      toast.error('計上済みへの更新に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  // 延期処理（売上・仕入共通）
  const handleDelaySubmit = async () => {
    if (!delayMonth) {
      toast.error('延期後の計上月を入力してください')
      return
    }

    try {
      setActionLoading(true)

      if (activeBillingSchedule) {
        const { error } = await supabase
          .from('project_billing_schedules')
          .update({
            billing_month: `${delayMonth}-01`,
            status: '延期',
            notes: delayReason || activeBillingSchedule.notes,
            confirmed_by: user?.id ?? null,
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', activeBillingSchedule.id)

        if (error) throw error
        toast.success('売上計上月を延期しました')
      } else if (activeCostSchedule) {
        const { error } = await supabase
          .from('project_cost_schedules')
          .update({
            cost_month: `${delayMonth}-01`,
            status: '延期',
            notes: delayReason || activeCostSchedule.notes,
            confirmed_by: user?.id ?? null,
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', activeCostSchedule.id)

        if (error) throw error
        toast.success('仕入計上月を延期しました')
      }

      setDelayDialogOpen(false)
      setActiveBillingSchedule(null)
      setActiveCostSchedule(null)
      loadSchedules()
    } catch (error) {
      console.error('延期処理エラー:', error)
      toast.error('延期処理に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-gray-600">読込中...</p>
      </div>
    )
  }

  const currentSummary = activeTab === 'billing' ? billingSummary : costSummary

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">計上予定管理</h1>
        <p className="text-gray-600">売上・仕入の計上予定を確認し、確定処理を進めます</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Label htmlFor="monthFilter" className="text-sm text-gray-500">対象月</Label>
            <Input
              id="monthFilter"
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="w-48"
            />
          </div>
          {user.role !== '営業' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="onlyMine"
                checked={onlyMine}
                onCheckedChange={(checked) => setOnlyMine(checked === true)}
              />
              <Label htmlFor="onlyMine" className="text-sm text-gray-600">自分の案件のみ表示</Label>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ScheduleType)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            売上計上
            <Badge variant="secondary" className="ml-1">{filteredBillingSchedules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            仕入計上
            <Badge variant="secondary" className="ml-1">{filteredCostSchedules.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">合計金額</CardTitle>
              {activeTab === 'billing' ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${activeTab === 'billing' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(currentSummary.amount)}
              </div>
              <p className="text-xs text-gray-500">
                {activeTab === 'billing' ? '売上予定' : '仕入予定'}合計
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">対象件数</CardTitle>
              <CalendarDays className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentSummary.total}件</div>
              <p className="text-xs text-gray-500">フィルター適用後</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">未確認</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{currentSummary.pending}件</div>
              <p className="text-xs text-gray-500">ステータス: 予定</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">確認済み</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{currentSummary.confirmed}件</div>
              <p className="text-xs text-gray-500">確認済み</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">延期 / 計上済</CardTitle>
              <PauseCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="flex items-baseline gap-4">
              <div>
                <div className="text-lg font-semibold text-blue-600">{currentSummary.delayed}件</div>
                <p className="text-xs text-gray-500">延期</p>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-800">{currentSummary.done}件</div>
                <p className="text-xs text-gray-500">計上済</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ステータスフィルター */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>
            すべて
          </Button>
          <Button variant={statusFilter === 'pending' ? 'default' : 'outline'} onClick={() => setStatusFilter('pending')}>
            未確認
          </Button>
          <Button variant={statusFilter === 'confirmed' ? 'default' : 'outline'} onClick={() => setStatusFilter('confirmed')}>
            確認済み
          </Button>
          <Button variant={statusFilter === 'delayed' ? 'default' : 'outline'} onClick={() => setStatusFilter('delayed')}>
            延期
          </Button>
          <Button variant={statusFilter === 'done' ? 'default' : 'outline'} onClick={() => setStatusFilter('done')}>
            計上済
          </Button>
        </div>

        {/* 売上計上一覧 */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>売上計上予定一覧</CardTitle>
              <CardDescription>営業担当への一斉案内はこの一覧を共有してください</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>計上月</TableHead>
                      <TableHead>見積</TableHead>
                      <TableHead>案件</TableHead>
                      <TableHead>顧客</TableHead>
                      <TableHead>営業担当</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead>更新情報</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBillingSchedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-gray-500">
                          該当する売上計上予定はありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBillingSchedules.map((schedule) => {
                        const badge = STATUS_BADGE[schedule.status]
                        return (
                          <TableRow key={schedule.id}>
                            <TableCell className="font-medium">{formatMonth(schedule.billing_month)}</TableCell>
                            <TableCell>{schedule.quote?.quote_number ?? '-'}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-semibold text-gray-900">{schedule.project.project_name}</p>
                                <p className="text-xs text-gray-500">{schedule.project.project_number}</p>
                              </div>
                            </TableCell>
                            <TableCell>{schedule.project.customer?.customer_name ?? '-'}</TableCell>
                            <TableCell>{schedule.project.sales_rep?.display_name ?? '-'}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(schedule.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {schedule.notes ? (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap max-w-[200px] truncate">{schedule.notes}</p>
                              ) : (
                                <span className="text-xs text-gray-400">未入力</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-gray-500 space-y-1">
                                <p>確認: {formatDateTime(schedule.confirmed_at)}</p>
                                <p>計上: {formatDateTime(schedule.billed_at)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {['予定', '延期'].includes(schedule.status) && user.role === '営業' && (
                                  <Button
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => handleConfirmBillingSchedule(schedule)}
                                  >
                                    予定通り
                                  </Button>
                                )}
                                {schedule.status !== '計上済' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={actionLoading}
                                    onClick={() => openBillingDelayDialog(schedule)}
                                  >
                                    延期/調整
                                  </Button>
                                )}
                                {schedule.status === '確認済' && user.role !== '営業' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    disabled={actionLoading}
                                    onClick={() => handleMarkBillingAsBilled(schedule)}
                                  >
                                    計上済みにする
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 仕入計上一覧 */}
        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <CardTitle>仕入計上予定一覧</CardTitle>
              <CardDescription>仕入れの計上予定を確認・処理します</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>計上月</TableHead>
                      <TableHead>見積</TableHead>
                      <TableHead>発注書</TableHead>
                      <TableHead>案件</TableHead>
                      <TableHead>顧客</TableHead>
                      <TableHead>営業担当</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead>更新情報</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCostSchedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-8 text-center text-gray-500">
                          該当する仕入計上予定はありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCostSchedules.map((schedule) => {
                        const badge = STATUS_BADGE[schedule.status]
                        return (
                          <TableRow key={schedule.id}>
                            <TableCell className="font-medium">{formatMonth(schedule.cost_month)}</TableCell>
                            <TableCell>{schedule.quote?.quote_number ?? '-'}</TableCell>
                            <TableCell>{schedule.purchase_order?.purchase_order_number ?? '-'}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-semibold text-gray-900">{schedule.project.project_name}</p>
                                <p className="text-xs text-gray-500">{schedule.project.project_number}</p>
                              </div>
                            </TableCell>
                            <TableCell>{schedule.project.customer?.customer_name ?? '-'}</TableCell>
                            <TableCell>{schedule.project.sales_rep?.display_name ?? '-'}</TableCell>
                            <TableCell className="text-right font-semibold text-rose-600">{formatCurrency(schedule.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {schedule.notes ? (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap max-w-[200px] truncate">{schedule.notes}</p>
                              ) : (
                                <span className="text-xs text-gray-400">未入力</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-gray-500 space-y-1">
                                <p>確認: {formatDateTime(schedule.confirmed_at)}</p>
                                <p>計上: {formatDateTime(schedule.recorded_at)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {['予定', '延期'].includes(schedule.status) && user.role === '営業' && (
                                  <Button
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => handleConfirmCostSchedule(schedule)}
                                  >
                                    予定通り
                                  </Button>
                                )}
                                {schedule.status !== '計上済' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={actionLoading}
                                    onClick={() => openCostDelayDialog(schedule)}
                                  >
                                    延期/調整
                                  </Button>
                                )}
                                {schedule.status === '確認済' && user.role !== '営業' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    disabled={actionLoading}
                                    onClick={() => handleMarkCostAsRecorded(schedule)}
                                  >
                                    計上済みにする
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 延期ダイアログ */}
      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeBillingSchedule ? '売上計上月の調整' : '仕入計上月の調整'}
            </DialogTitle>
            <DialogDescription>
              計上を延期する場合は移動先の月と理由を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {activeBillingSchedule?.project.project_name ?? activeCostSchedule?.project.project_name ?? ''}
              </p>
              <p className="text-xs text-gray-500">
                現在の計上月: {activeBillingSchedule 
                  ? formatMonth(activeBillingSchedule.billing_month) 
                  : activeCostSchedule 
                    ? formatMonth(activeCostSchedule.cost_month) 
                    : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delayMonth">移動先の計上月 *</Label>
              <Input
                id="delayMonth"
                type="month"
                value={delayMonth}
                onChange={(event) => setDelayMonth(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delayReason">理由 / メモ</Label>
              <Textarea
                id="delayReason"
                rows={3}
                value={delayReason}
                onChange={(event) => setDelayReason(event.target.value)}
                placeholder="次月へスライドする理由などを記入"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelayDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleDelaySubmit} disabled={actionLoading}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
