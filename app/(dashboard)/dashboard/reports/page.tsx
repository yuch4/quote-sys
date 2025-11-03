'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { BarChart3, TrendingUp, DollarSign, Target, Award, Download, Calendar as CalendarIcon, Users, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'

interface User {
  id: string
  display_name: string
  role: string
}

interface SalesReport {
  sales_rep_id: string
  sales_rep_name: string
  total_projects: number
  approved_quotes: number
  total_sales: number
  total_cost: number
  total_profit: number
  average_profit_rate: number
  billed_count: number
  pending_billing_count: number
}

interface ProjectSummary {
  project_number: string
  project_name: string
  customer_name: string
  quote_status: string
  total_amount: number
  total_cost: number
  profit: number
  profit_rate: number
  billing_status: string
  category?: string
}

interface CustomerReport {
  customer_id: string
  customer_name: string
  total_projects: number
  total_sales: number
  total_profit: number
  average_profit_rate: number
}

interface CategoryReport {
  category: string
  total_projects: number
  total_sales: number
  total_profit: number
  average_profit_rate: number
}

type PeriodType = 'month' | 'quarter' | 'year' | 'custom'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [salesReports, setSalesReports] = useState<SalesReport[]>([])
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [customerReports, setCustomerReports] = useState<CustomerReport[]>([])
  const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [users, setUsers] = useState<User[]>([])
  const [monthlySalesData, setMonthlySalesData] = useState<any[]>([])

  // 期間フィルター
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()))

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadReportData()
    }
  }, [currentUser, selectedUserId, startDate, endDate])

  // 期間タイプが変更された時に開始日・終了日を自動設定
  useEffect(() => {
    const now = new Date()
    switch (periodType) {
      case 'month':
        setStartDate(startOfMonth(now))
        setEndDate(endOfMonth(now))
        break
      case 'quarter':
        setStartDate(startOfQuarter(now))
        setEndDate(endOfQuarter(now))
        break
      case 'year':
        setStartDate(startOfYear(now))
        setEndDate(endOfYear(now))
        break
      case 'custom':
        // カスタムの場合は変更しない
        break
    }
  }, [periodType])

  const loadCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, display_name, role')
      .eq('id', authUser.id)
      .single()

    if (userData) {
      setCurrentUser(userData)
      
      // 営業事務・管理者の場合は全ユーザーリスト取得
      if (userData.role === '営業事務' || userData.role === '管理者') {
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, display_name, role')
        if (allUsers) setUsers(allUsers)
      }
    }
  }

  const loadReportData = async () => {
    try {
      if (!startDate || !endDate) return

      // 案件データ取得（期間フィルター追加）
      let query = supabase
        .from('projects')
        .select(`
          id,
          project_number,
          project_name,
          category,
          customer_id,
          customer:customers(id, customer_name),
          sales_rep:users!projects_sales_rep_id_fkey(id, display_name),
          quotes(
            id,
            quote_number,
            approval_status,
            total_amount,
            total_cost,
            created_at,
            quote_items(
              requires_procurement,
              procurement_status
            ),
            billing_requests(
              status
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      // 営業の場合は自分の案件のみ
      if (currentUser?.role === '営業') {
        query = query.eq('sales_rep_id', currentUser.id)
      } else if (selectedUserId !== 'all') {
        query = query.eq('sales_rep_id', selectedUserId)
      }

      const { data: projects, error } = await query

      if (error) throw error

      // 営業担当別サマリー作成
      const salesMap = new Map<string, SalesReport>()
      // 顧客別サマリー作成
      const customerMap = new Map<string, CustomerReport>()
      // カテゴリ別サマリー作成
      const categoryMap = new Map<string, CategoryReport>()

      projects?.forEach((project: any) => {
        const salesRepId = project.sales_rep.id
        const salesRepName = project.sales_rep.display_name
        const customerId = project.customer.id
        const customerName = project.customer.customer_name
        const category = project.category || '未分類'

        // 営業担当別集計
        if (!salesMap.has(salesRepId)) {
          salesMap.set(salesRepId, {
            sales_rep_id: salesRepId,
            sales_rep_name: salesRepName,
            total_projects: 0,
            approved_quotes: 0,
            total_sales: 0,
            total_cost: 0,
            total_profit: 0,
            average_profit_rate: 0,
            billed_count: 0,
            pending_billing_count: 0,
          })
        }

        // 顧客別集計
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName,
            total_projects: 0,
            total_sales: 0,
            total_profit: 0,
            average_profit_rate: 0,
          })
        }

        // カテゴリ別集計
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            total_projects: 0,
            total_sales: 0,
            total_profit: 0,
            average_profit_rate: 0,
          })
        }

        const salesReport = salesMap.get(salesRepId)!
        const customerReport = customerMap.get(customerId)!
        const categoryReport = categoryMap.get(category)!

        salesReport.total_projects++
        customerReport.total_projects++
        categoryReport.total_projects++

        // 承認済み見積がある案件のみカウント
        const approvedQuote = project.quotes.find((q: any) => q.approval_status === '承認済み')
        if (approvedQuote) {
          const amount = Number(approvedQuote.total_amount)
          const cost = Number(approvedQuote.total_cost)
          const profit = amount - cost

          salesReport.approved_quotes++
          salesReport.total_sales += amount
          salesReport.total_cost += cost
          salesReport.total_profit += profit

          customerReport.total_sales += amount
          customerReport.total_profit += profit

          categoryReport.total_sales += amount
          categoryReport.total_profit += profit

          // 計上状況チェック
          const billingRequest = approvedQuote.billing_requests[0]
          if (billingRequest?.status === '承認済み') {
            salesReport.billed_count++
          } else {
            // 全明細入荷済みかチェック
            const procurementItems = approvedQuote.quote_items.filter((item: any) => item.requires_procurement)
            const allReceived = procurementItems.length === 0 || 
              procurementItems.every((item: any) => item.procurement_status === '入荷済')
            if (allReceived) {
              salesReport.pending_billing_count++
            }
          }
        }
      })

      // 粗利率計算
      salesMap.forEach((report) => {
        if (report.total_sales > 0) {
          report.average_profit_rate = (report.total_profit / report.total_sales) * 100
        }
      })

      customerMap.forEach((report) => {
        if (report.total_sales > 0) {
          report.average_profit_rate = (report.total_profit / report.total_sales) * 100
        }
      })

      categoryMap.forEach((report) => {
        if (report.total_sales > 0) {
          report.average_profit_rate = (report.total_profit / report.total_sales) * 100
        }
      })

      const reports = Array.from(salesMap.values()).sort((a, b) => b.total_sales - a.total_sales)
      const customers = Array.from(customerMap.values()).sort((a, b) => b.total_sales - a.total_sales)
      const categories = Array.from(categoryMap.values()).sort((a, b) => b.total_sales - a.total_sales)

      setSalesReports(reports)
      setCustomerReports(customers)
      setCategoryReports(categories)

      // 案件サマリー作成
      const summaries: ProjectSummary[] = []
      projects?.forEach((project: any) => {
        const approvedQuote = project.quotes.find((q: any) => q.approval_status === '承認済み')
        if (approvedQuote) {
          const totalAmount = Number(approvedQuote.total_amount)
          const totalCost = Number(approvedQuote.total_cost)
          const profit = totalAmount - totalCost
          const profitRate = totalAmount > 0 ? (profit / totalAmount) * 100 : 0

          let billingStatus = '未計上'
          const billingRequest = approvedQuote.billing_requests[0]
          if (billingRequest) {
            billingStatus = billingRequest.status === '承認済み' ? '計上済み' : billingRequest.status
          }

          summaries.push({
            project_number: project.project_number,
            project_name: project.project_name,
            customer_name: project.customer.customer_name,
            quote_status: approvedQuote.approval_status,
            total_amount: totalAmount,
            total_cost: totalCost,
            profit,
            profit_rate: profitRate,
            billing_status: billingStatus,
            category: project.category || '未分類',
          })
        }
      })

      setProjectSummaries(summaries)

      // 月次売上推移データ作成
      await loadMonthlySalesData()

      setLoading(false)
    } catch (error) {
      console.error('レポートデータ読込エラー:', error)
      toast.error('データの読込に失敗しました')
      setLoading(false)
    }
  }

  const loadMonthlySalesData = async () => {
    try {
      if (!startDate || !endDate) return

      // 期間内の月ごとにデータを集計
      const monthlyData = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      
      while (currentMonth <= end) {
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59)

        let query = supabase
          .from('quotes')
          .select('total_amount, total_cost, project:projects!inner(sales_rep_id)')
          .eq('approval_status', '承認済み')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())

        if (currentUser?.role === '営業') {
          query = query.eq('project.sales_rep_id', currentUser.id)
        } else if (selectedUserId !== 'all') {
          query = query.eq('project.sales_rep_id', selectedUserId)
        }

        const { data } = await query

        const totalSales = data?.reduce((sum, q) => sum + Number(q.total_amount || 0), 0) || 0
        const totalCost = data?.reduce((sum, q) => sum + Number(q.total_cost || 0), 0) || 0
        const profit = totalSales - totalCost

        monthlyData.push({
          month: format(currentMonth, 'yyyy/MM', { locale: ja }),
          売上: Math.round(totalSales),
          粗利: Math.round(profit),
        })

        // 次の月へ
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      }

      setMonthlySalesData(monthlyData)
    } catch (error) {
      console.error('月次データ読込エラー:', error)
    }
  }

  // CSVエクスポート関数
  const exportToCSV = () => {
    try {
      // CSVヘッダー
      const headers = [
        '案件番号',
        '案件名',
        '顧客名',
        'カテゴリ',
        '売上金額',
        '仕入原価',
        '粗利',
        '粗利率(%)',
        '計上状況',
      ]

      // CSVデータ作成
      const rows = projectSummaries.map((summary) => [
        summary.project_number,
        summary.project_name,
        summary.customer_name,
        summary.category || '',
        summary.total_amount,
        summary.total_cost,
        summary.profit,
        summary.profit_rate.toFixed(1),
        summary.billing_status,
      ])

      // CSV文字列に変換
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      // BOMを追加してShift_JISとして扱う
      const bom = new Uint8Array([0xef, 0xbb, 0xbf])
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      // ダウンロードリンク作成
      const link = document.createElement('a')
      link.href = url
      const fileName = `レポート_${format(new Date(), 'yyyyMMdd_HHmmss', { locale: ja })}.csv`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('CSVファイルをダウンロードしました')
    } catch (error) {
      console.error('CSVエクスポートエラー:', error)
      toast.error('CSVエクスポートに失敗しました')
    }
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`
  }

  const getTotalStats = () => {
    return salesReports.reduce(
      (acc, report) => {
        acc.totalSales += report.total_sales
        acc.totalProfit += report.total_profit
        acc.totalProjects += report.total_projects
        acc.approvedQuotes += report.approved_quotes
        return acc
      },
      { totalSales: 0, totalProfit: 0, totalProjects: 0, approvedQuotes: 0 }
    )
  }

  const totalStats = getTotalStats()
  const overallProfitRate = totalStats.totalSales > 0 
    ? (totalStats.totalProfit / totalStats.totalSales) * 100 
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>読込中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">レポート・業績分析</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">営業実績と粗利分析</p>
        </div>

        <Button onClick={exportToCSV} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          CSVエクスポート
        </Button>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            期間・フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 期間タイプ */}
            <div className="space-y-2">
              <label className="text-sm font-medium">期間タイプ</label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">月次</SelectItem>
                  <SelectItem value="quarter">四半期</SelectItem>
                  <SelectItem value="year">年次</SelectItem>
                  <SelectItem value="custom">カスタム</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 開始日 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">開始日</label>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder="開始日を選択"
              />
            </div>

            {/* 終了日 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">終了日</label>
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                placeholder="終了日を選択"
              />
            </div>

            {/* 営業担当フィルター */}
            {(currentUser?.role === '営業事務' || currentUser?.role === '管理者') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">営業担当</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="営業担当を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全営業担当</SelectItem>
                    {users
                      .filter((u) => u.role === '営業')
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 全体サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalStats.totalSales)}
            </div>
            <p className="text-xs text-gray-600 mt-1">承認済み見積合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総粗利</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalStats.totalProfit)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              粗利率: {formatPercentage(overallProfitRate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">案件数</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalProjects}件</div>
            <p className="text-xs text-gray-600 mt-1">
              承認済み: {totalStats.approvedQuotes}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均粗利率</CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatPercentage(overallProfitRate)}
            </div>
            <p className="text-xs text-gray-600 mt-1">全案件平均</p>
          </CardContent>
        </Card>
      </div>

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月次売上推移 */}
        <Card>
          <CardHeader>
            <CardTitle>月次売上・粗利推移</CardTitle>
            <CardDescription>選択期間の推移</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="売上" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="粗利" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 営業別売上ランキング */}
        <Card>
          <CardHeader>
            <CardTitle>営業別売上ランキング</CardTitle>
            <CardDescription>承認済み見積ベース（上位5名）</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesReports.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sales_rep_name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="total_sales" name="売上" fill="#22c55e" />
                <Bar dataKey="total_profit" name="粗利" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 顧客別売上ランキング */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>顧客別売上ランキング</CardTitle>
            </div>
            <CardDescription>上位10社</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerReports.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="customer_name" type="category" width={100} />
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="total_sales" name="売上" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別売上分析 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>カテゴリ別売上分析</CardTitle>
            </div>
            <CardDescription>案件カテゴリ別の売上構成</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryReports}
                  dataKey="total_sales"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.category} (${((entry.total_sales / totalStats.totalSales) * 100).toFixed(1)}%)`}
                >
                  {categoryReports.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 営業担当別実績 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>営業担当別実績</CardTitle>
          </div>
          <CardDescription>承認済み見積ベースの売上・粗利集計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>営業担当</TableHead>
                  <TableHead className="text-right">案件数</TableHead>
                  <TableHead className="text-right">承認済み</TableHead>
                  <TableHead className="text-right">売上金額</TableHead>
                  <TableHead className="text-right">粗利</TableHead>
                  <TableHead className="text-right">粗利率</TableHead>
                  <TableHead className="text-right">計上済み</TableHead>
                  <TableHead className="text-right">計上待ち</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  salesReports.map((report) => (
                    <TableRow key={report.sales_rep_id}>
                      <TableCell className="font-medium">{report.sales_rep_name}</TableCell>
                      <TableCell className="text-right">{report.total_projects}</TableCell>
                      <TableCell className="text-right">{report.approved_quotes}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.total_sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(report.total_profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            report.average_profit_rate >= 20
                              ? 'text-green-600 font-medium'
                              : report.average_profit_rate >= 10
                              ? 'text-blue-600'
                              : 'text-red-600'
                          }
                        >
                          {formatPercentage(report.average_profit_rate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{report.billed_count}</TableCell>
                      <TableCell className="text-right">
                        {report.pending_billing_count > 0 ? (
                          <Badge variant="secondary">{report.pending_billing_count}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 顧客別実績 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>顧客別実績</CardTitle>
          </div>
          <CardDescription>売上・粗利集計（上位20社）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>顧客名</TableHead>
                  <TableHead className="text-right">案件数</TableHead>
                  <TableHead className="text-right">売上金額</TableHead>
                  <TableHead className="text-right">粗利</TableHead>
                  <TableHead className="text-right">粗利率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  customerReports.slice(0, 20).map((report) => (
                    <TableRow key={report.customer_id}>
                      <TableCell className="font-medium">{report.customer_name}</TableCell>
                      <TableCell className="text-right">{report.total_projects}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.total_sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(report.total_profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            report.average_profit_rate >= 20
                              ? 'text-green-600 font-medium'
                              : report.average_profit_rate >= 10
                              ? 'text-blue-600'
                              : 'text-red-600'
                          }
                        >
                          {formatPercentage(report.average_profit_rate)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* カテゴリ別実績 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>カテゴリ別実績</CardTitle>
          </div>
          <CardDescription>案件カテゴリ別の売上・粗利集計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead className="text-right">案件数</TableHead>
                  <TableHead className="text-right">売上金額</TableHead>
                  <TableHead className="text-right">粗利</TableHead>
                  <TableHead className="text-right">粗利率</TableHead>
                  <TableHead className="text-right">構成比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  categoryReports.map((report) => (
                    <TableRow key={report.category}>
                      <TableCell className="font-medium">{report.category}</TableCell>
                      <TableCell className="text-right">{report.total_projects}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.total_sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(report.total_profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            report.average_profit_rate >= 20
                              ? 'text-green-600 font-medium'
                              : report.average_profit_rate >= 10
                              ? 'text-blue-600'
                              : 'text-red-600'
                          }
                        >
                          {formatPercentage(report.average_profit_rate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage((report.total_sales / totalStats.totalSales) * 100)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 案件別詳細 */}
      <Card>
        <CardHeader>
          <CardTitle>案件別詳細</CardTitle>
          <CardDescription>承認済み見積の粗利詳細</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>案件番号</TableHead>
                  <TableHead>案件名</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead className="text-right">売上金額</TableHead>
                  <TableHead className="text-right">仕入原価</TableHead>
                  <TableHead className="text-right">粗利</TableHead>
                  <TableHead className="text-right">粗利率</TableHead>
                  <TableHead>計上状況</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  projectSummaries.map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{summary.project_number}</TableCell>
                      <TableCell>{summary.project_name}</TableCell>
                      <TableCell>{summary.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{summary.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(summary.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(summary.total_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(summary.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            summary.profit_rate >= 20
                              ? 'text-green-600 font-medium'
                              : summary.profit_rate >= 10
                              ? 'text-blue-600'
                              : 'text-red-600'
                          }
                        >
                          {formatPercentage(summary.profit_rate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {summary.billing_status === '計上済み' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            計上済み
                          </Badge>
                        ) : summary.billing_status === '申請中' ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            申請中
                          </Badge>
                        ) : (
                          <Badge variant="outline">未計上</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
