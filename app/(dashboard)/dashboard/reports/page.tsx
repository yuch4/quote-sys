'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, DollarSign, Target, Award } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
}

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [salesReports, setSalesReports] = useState<SalesReport[]>([])
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [users, setUsers] = useState<User[]>([])
  const [monthlySalesData, setMonthlySalesData] = useState<any[]>([])

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadReportData()
    }
  }, [currentUser, selectedUserId])

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
          .order('display_name')
        if (allUsers) setUsers(allUsers)
      }
    }
  }

  const loadReportData = async () => {
    try {
      // 案件データ取得
      let query = supabase
        .from('projects')
        .select(`
          id,
          project_number,
          project_name,
          customer:customers(customer_name),
          sales_rep:users!projects_sales_rep_id_fkey(id, display_name),
          quotes(
            id,
            quote_number,
            approval_status,
            total_amount,
            total_cost,
            quote_items(
              requires_procurement,
              procurement_status
            ),
            billing_requests(
              status
            )
          )
        `)
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

      projects?.forEach((project: any) => {
        const salesRepId = project.sales_rep.id
        const salesRepName = project.sales_rep.display_name

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

        const report = salesMap.get(salesRepId)!
        report.total_projects++

        // 承認済み見積がある案件のみカウント
        const approvedQuote = project.quotes.find((q: any) => q.approval_status === '承認済み')
        if (approvedQuote) {
          report.approved_quotes++
          report.total_sales += Number(approvedQuote.total_amount)
          report.total_cost += Number(approvedQuote.total_cost)
          report.total_profit += Number(approvedQuote.total_amount) - Number(approvedQuote.total_cost)

          // 計上状況チェック
          const billingRequest = approvedQuote.billing_requests[0]
          if (billingRequest?.status === '承認済み') {
            report.billed_count++
          } else {
            // 全明細入荷済みかチェック
            const procurementItems = approvedQuote.quote_items.filter((item: any) => item.requires_procurement)
            const allReceived = procurementItems.length === 0 || 
              procurementItems.every((item: any) => item.procurement_status === '入荷済み')
            if (allReceived) {
              report.pending_billing_count++
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

      const reports = Array.from(salesMap.values()).sort((a, b) => b.total_sales - a.total_sales)
      setSalesReports(reports)

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
          })
        }
      })

      setProjectSummaries(summaries)

      // 月次売上推移データ作成（過去6ヶ月）
      await loadMonthlySalesData()

      setLoading(false)
    } catch (error) {
      console.error('レポートデータ読込エラー:', error)
      alert('データの読込に失敗しました')
      setLoading(false)
    }
  }

  const loadMonthlySalesData = async () => {
    try {
      // 過去6ヶ月のデータを取得
      const monthlyData = []
      const now = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59)

        let query = supabase
          .from('quotes')
          .select('total_amount, total_cost, project:projects!inner(sales_rep_id)')
          .eq('approval_status', '承認済み')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())

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
          month: `${targetDate.getFullYear()}/${targetDate.getMonth() + 1}`,
          売上: Math.round(totalSales),
          粗利: Math.round(profit),
        })
      }

      setMonthlySalesData(monthlyData)
    } catch (error) {
      console.error('月次データ読込エラー:', error)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">レポート・業績分析</h1>
          <p className="text-gray-600 mt-2">営業実績と粗利分析</p>
        </div>

        {(currentUser?.role === '営業事務' || currentUser?.role === '管理者') && (
          <div className="w-64">
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

      {/* 全体サマリー */}
      <div className="grid grid-cols-4 gap-6">
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
            <CardDescription>過去6ヶ月の推移</CardDescription>
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
        </CardContent>
      </Card>

      {/* 案件別詳細 */}
      <Card>
        <CardHeader>
          <CardTitle>案件別詳細</CardTitle>
          <CardDescription>承認済み見積の粗利詳細</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件番号</TableHead>
                <TableHead>案件名</TableHead>
                <TableHead>顧客名</TableHead>
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
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                projectSummaries.map((summary, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{summary.project_number}</TableCell>
                    <TableCell>{summary.project_name}</TableCell>
                    <TableCell>{summary.customer_name}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
