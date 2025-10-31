'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  role: string
  display_name: string
}

interface BillableProject {
  project_id: string
  project_number: string
  project_name: string
  customer_name: string
  quote_number: string
  quote_id: string
  total_amount: number
  total_cost: number
  profit: number
  profit_rate: number
  all_received: boolean
  sales_rep: string
  billing_request?: {
    id: string
    billing_date: string
    notes: string
    status: string
    created_at: string
  }
}

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<BillableProject[]>([])
  const [selectedProject, setSelectedProject] = useState<BillableProject | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // 申請フォーム
  const [billingDate, setBillingDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // フィルター
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadBillableProjects()
    }
  }, [user])

  const loadUser = async () => {
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
      setUser(userData)
    }
  }

  const loadBillableProjects = async () => {
    try {
      // 全案件の見積を取得
      let query = supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          total_amount,
          total_cost,
          approval_status,
          project:projects!inner(
            id,
            project_number,
            project_name,
            customer:customers(customer_name),
            sales_rep:users!projects_sales_rep_id_fkey(display_name)
          ),
          quote_items(
            id,
            requires_procurement,
            procurement_status
          ),
          billing_requests(
            id,
            billing_date,
            notes,
            status,
            created_at
          )
        `)
        .eq('approval_status', '承認済み')
        .order('created_at', { ascending: false })

      // 営業担当の場合は自分の案件のみ
      if (user?.role === '営業') {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        query = query.eq('project.sales_rep_id', authUser?.id)
      }

      const { data, error } = await query

      if (error) throw error

      // 全明細が入荷済みかチェック
      const billableProjects: BillableProject[] = (data || [])
        .map((quote: any) => {
          const procurementItems = quote.quote_items.filter((item: any) => item.requires_procurement)
          const allReceived = procurementItems.length === 0 || 
            procurementItems.every((item: any) => item.procurement_status === '入荷済み')

          const totalAmount = Number(quote.total_amount)
          const totalCost = Number(quote.total_cost)
          const profit = totalAmount - totalCost
          const profitRate = totalAmount > 0 ? (profit / totalAmount) * 100 : 0

          return {
            project_id: quote.project.id,
            project_number: quote.project.project_number,
            project_name: quote.project.project_name,
            customer_name: quote.project.customer.customer_name,
            quote_number: quote.quote_number,
            quote_id: quote.id,
            total_amount: totalAmount,
            total_cost: totalCost,
            profit,
            profit_rate: profitRate,
            all_received: allReceived,
            sales_rep: quote.project.sales_rep.display_name,
            billing_request: quote.billing_requests[0] || undefined,
          }
        })
        .filter((project: BillableProject) => project.all_received) // 入荷済みのみ

      setProjects(billableProjects)
      setLoading(false)
    } catch (error) {
      console.error('計上可能案件読込エラー:', error)
      alert('データの読込に失敗しました')
      setLoading(false)
    }
  }

  const handleOpenDialog = (project: BillableProject) => {
    setSelectedProject(project)
    setBillingDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setDialogOpen(true)
  }

  const handleSubmitRequest = async () => {
    if (!selectedProject || !billingDate) {
      alert('計上日を入力してください')
      return
    }

    setSubmitting(true)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('認証エラー')

      const { error } = await supabase.from('billing_requests').insert({
        quote_id: selectedProject.quote_id,
        requested_by: authUser.id,
        billing_date: billingDate,
        notes: notes || null,
        status: '申請中',
      })

      if (error) throw error

      alert('計上申請を送信しました')
      setDialogOpen(false)
      setSelectedProject(null)
      loadBillableProjects()
    } catch (error) {
      console.error('計上申請エラー:', error)
      alert('計上申請に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (billingRequestId: string) => {
    if (!confirm('この計上申請を承認しますか？')) return

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('認証エラー')

      const { error } = await supabase
        .from('billing_requests')
        .update({
          status: '承認済み',
          approved_by: authUser.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', billingRequestId)

      if (error) throw error

      alert('計上申請を承認しました')
      loadBillableProjects()
    } catch (error) {
      console.error('承認エラー:', error)
      alert('承認に失敗しました')
    }
  }

  const handleReject = async (billingRequestId: string) => {
    const reason = prompt('差戻し理由を入力してください')
    if (!reason) return

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('認証エラー')

      const { error } = await supabase
        .from('billing_requests')
        .update({
          status: '差戻し',
          approved_by: authUser.id,
          approved_at: new Date().toISOString(),
          notes: reason,
        })
        .eq('id', billingRequestId)

      if (error) throw error

      alert('計上申請を差戻しました')
      loadBillableProjects()
    } catch (error) {
      console.error('差戻しエラー:', error)
      alert('差戻しに失敗しました')
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) {
      return <Badge variant="outline">未申請</Badge>
    }
    switch (status) {
      case '申請中':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">申請中</Badge>
      case '承認済み':
        return <Badge variant="default" className="bg-green-100 text-green-800">承認済み</Badge>
      case '差戻し':
        return <Badge variant="destructive">差戻し</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredProjects = projects.filter((project) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'ready') return !project.billing_request
    if (statusFilter === 'pending') return project.billing_request?.status === '申請中'
    if (statusFilter === 'approved') return project.billing_request?.status === '承認済み'
    if (statusFilter === 'rejected') return project.billing_request?.status === '差戻し'
    return true
  })

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>読込中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">計上管理</h1>
        <p className="text-gray-600 mt-2">入荷完了案件の計上申請・承認</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">計上可能</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projects.filter((p) => !p.billing_request).length}件
            </div>
            <p className="text-xs text-gray-600 mt-1">未申請の案件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">申請中</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {projects.filter((p) => p.billing_request?.status === '申請中').length}件
            </div>
            <p className="text-xs text-gray-600 mt-1">承認待ち</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認済み</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter((p) => p.billing_request?.status === '承認済み').length}件
            </div>
            <p className="text-xs text-gray-600 mt-1">今月の計上数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">差戻し</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {projects.filter((p) => p.billing_request?.status === '差戻し').length}件
            </div>
            <p className="text-xs text-gray-600 mt-1">要修正</p>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
        >
          全て
        </Button>
        <Button
          variant={statusFilter === 'ready' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('ready')}
        >
          未申請
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('pending')}
        >
          申請中
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('approved')}
        >
          承認済み
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('rejected')}
        >
          差戻し
        </Button>
      </div>

      {/* 案件一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>計上可能案件一覧</CardTitle>
          <CardDescription>全明細が入荷済みの案件</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件番号</TableHead>
                <TableHead>案件名</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>営業担当</TableHead>
                <TableHead className="text-right">売上金額</TableHead>
                <TableHead className="text-right">粗利</TableHead>
                <TableHead className="text-right">粗利率</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500">
                    該当する案件がありません
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.project_id}>
                    <TableCell className="font-medium">{project.project_number}</TableCell>
                    <TableCell>{project.project_name}</TableCell>
                    <TableCell>{project.customer_name}</TableCell>
                    <TableCell>{project.sales_rep}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(project.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(project.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          project.profit_rate >= 20
                            ? 'text-green-600 font-medium'
                            : project.profit_rate >= 10
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }
                      >
                        {formatPercentage(project.profit_rate)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(project.billing_request?.status)}</TableCell>
                    <TableCell>
                      {!project.billing_request && user?.role === '営業' && (
                        <Button size="sm" onClick={() => handleOpenDialog(project)}>
                          申請
                        </Button>
                      )}
                      {project.billing_request?.status === '申請中' &&
                        (user?.role === '営業事務' || user?.role === '管理者') && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(project.billing_request!.id)}
                            >
                              承認
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(project.billing_request!.id)}
                            >
                              差戻し
                            </Button>
                          </div>
                        )}
                      {project.billing_request?.status === '差戻し' && user?.role === '営業' && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(project)}>
                          再申請
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 申請ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>計上申請</DialogTitle>
            <DialogDescription>計上日と備考を入力してください</DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">案件: {selectedProject.project_name}</p>
                <p className="text-sm text-gray-600">
                  売上金額: {formatCurrency(selectedProject.total_amount)}
                </p>
                <p className="text-sm text-gray-600">
                  粗利: {formatCurrency(selectedProject.profit)} (
                  {formatPercentage(selectedProject.profit_rate)})
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_date">計上日 *</Label>
                <Input
                  id="billing_date"
                  type="date"
                  value={billingDate}
                  onChange={(e) => setBillingDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備考</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="特記事項があれば入力してください"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? '送信中...' : '申請'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
