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
import { CalendarDays, CheckCircle2, Clock, PauseCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { BillingScheduleStatus } from '@/types/database'

interface User {
  id: string
  role: '営業' | '営業事務' | '管理者'
  display_name: string
}

interface ScheduleRow {
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

const STATUS_BADGE: Record<BillingScheduleStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  予定: { label: '予定', variant: 'outline' },
  確認済: { label: '確認済', variant: 'secondary' },
  延期: { label: '延期', variant: 'destructive' },
  計上済: { label: '計上済', variant: 'default' },
}

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'delayed' | 'done'>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [delayDialogOpen, setDelayDialogOpen] = useState(false)
  const [delayMonth, setDelayMonth] = useState('')
  const [delayReason, setDelayReason] = useState('')
  const [activeSchedule, setActiveSchedule] = useState<ScheduleRow | null>(null)

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

      let query = supabase
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
        .order('project_number', { ascending: true, foreignTable: 'projects' })

      if (user?.role === '営業') {
        query = query.eq('project.sales_rep_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error

      setSchedules((data as ScheduleRow[]) || [])
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

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
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
  }, [schedules, onlyMine, statusFilter, user])

  const summary = useMemo(() => {
    const base = { total: 0, pending: 0, confirmed: 0, delayed: 0, done: 0 }
    return filteredSchedules.reduce((acc, schedule) => {
      acc.total += 1
      if (schedule.status === '予定') acc.pending += 1
      if (schedule.status === '確認済') acc.confirmed += 1
      if (schedule.status === '延期') acc.delayed += 1
      if (schedule.status === '計上済') acc.done += 1
      return acc
    }, base)
  }, [filteredSchedules])

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

  const openDelayDialog = (schedule: ScheduleRow) => {
    setActiveSchedule(schedule)
    setDelayDialogOpen(true)
    const current = schedule.billing_month?.slice(0, 7)
    const next = addMonthValue(schedule.billing_month)
    setDelayMonth(next || current || monthFilter)
    setDelayReason('')
  }

  const addMonthValue = (value?: string | null) => {
    if (!value) return ''
    const base = new Date(value)
    if (Number.isNaN(base.getTime())) return ''
    base.setMonth(base.getMonth() + 1)
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
  }

  const handleConfirmSchedule = async (schedule: ScheduleRow) => {
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
      toast.success('計上予定を確認しました')
      loadSchedules()
    } catch (error) {
      console.error('確認処理エラー:', error)
      toast.error('確認処理に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkAsBilled = async (schedule: ScheduleRow) => {
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
      toast.success('計上済みに更新しました')
      loadSchedules()
    } catch (error) {
      console.error('計上処理エラー:', error)
      toast.error('計上済みへの更新に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelaySubmit = async () => {
    if (!activeSchedule || !delayMonth) {
      toast.error('延期後の計上月を入力してください')
      return
    }

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('project_billing_schedules')
        .update({
          billing_month: `${delayMonth}-01`,
          status: '延期',
          notes: delayReason || activeSchedule.notes,
          confirmed_by: user?.id ?? null,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', activeSchedule.id)

      if (error) throw error

      toast.success('計上月を延期しました')
      setDelayDialogOpen(false)
      setActiveSchedule(null)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">計上予定管理</h1>
        <p className="text-gray-600">営業担当と共有しながら計上の確認と確定を進めます</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">対象件数</CardTitle>
            <CalendarDays className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}件</div>
            <p className="text-xs text-gray-500">フィルター適用後の合計</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未確認</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.pending}件</div>
            <p className="text-xs text-gray-500">ステータス: 予定</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">確認済み</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{summary.confirmed}件</div>
            <p className="text-xs text-gray-500">営業確認済み</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">延期 / 計上済</CardTitle>
            <PauseCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="flex items-baseline gap-4">
            <div>
              <div className="text-lg font-semibold text-blue-600">{summary.delayed}件</div>
              <p className="text-xs text-gray-500">延期</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">{summary.done}件</div>
              <p className="text-xs text-gray-500">計上済</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>計上予定一覧</CardTitle>
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
                {filteredSchedules.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-gray-500">
                      該当する計上予定はありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchedules.map((schedule) => {
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
                        <TableCell className="text-right font-semibold">{formatCurrency(schedule.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {schedule.notes ? (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
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
                                onClick={() => handleConfirmSchedule(schedule)}
                              >
                                予定通り
                              </Button>
                            )}
                            {schedule.status !== '計上済' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading}
                                onClick={() => openDelayDialog(schedule)}
                              >
                                延期/調整
                              </Button>
                            )}
                            {schedule.status === '確認済' && user.role !== '営業' && (
                              <Button
                                size="sm"
                                variant="default"
                                disabled={actionLoading}
                                onClick={() => handleMarkAsBilled(schedule)}
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

      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>計上月の調整</DialogTitle>
            <DialogDescription>
              計上を延期する場合は移動先の月と理由を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {activeSchedule?.project.project_name ?? ''}
              </p>
              <p className="text-xs text-gray-500">
                現在の計上月: {activeSchedule ? formatMonth(activeSchedule.billing_month) : '-'}
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
