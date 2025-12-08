'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '@/types/knowledge'
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Ticket,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

interface TicketStats {
  total: number
  open: number
  in_progress: number
  pending: number
  resolved: number
  closed: number
  avgResolutionHours: number
}

interface CompanyStats {
  company_name: string
  company_id: string
  ticket_count: number
  [key: string]: string | number
}

interface CategoryStats {
  category: string
  count: number
  [key: string]: string | number
}

interface TrendData {
  date: string
  created: number
  resolved: number
}

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#6b7280']

export default function KnowledgeAnalyticsPage() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      const supabase = createClient()
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(period))

      // 基本統計
      const { data: tickets } = await supabase
        .from('knowledge_tickets')
        .select('id, status, created_at, resolved_at')
        .gte('created_at', daysAgo.toISOString())

      if (tickets) {
        const resolvedTickets = tickets.filter((t) => t.resolved_at)
        const avgResolution = resolvedTickets.length > 0
          ? resolvedTickets.reduce((acc, t) => {
              const created = new Date(t.created_at).getTime()
              const resolved = new Date(t.resolved_at).getTime()
              return acc + (resolved - created) / (1000 * 60 * 60)
            }, 0) / resolvedTickets.length
          : 0

        setStats({
          total: tickets.length,
          open: tickets.filter((t) => t.status === 'open').length,
          in_progress: tickets.filter((t) => t.status === 'in_progress').length,
          pending: tickets.filter((t) => t.status === 'pending').length,
          resolved: tickets.filter((t) => t.status === 'resolved').length,
          closed: tickets.filter((t) => t.status === 'closed').length,
          avgResolutionHours: Math.round(avgResolution * 10) / 10,
        })
      }

      // 顧客/会社別統計
      const { data: companyTickets } = await supabase
        .from('knowledge_tickets')
        .select(`
          id,
          group_company_id,
          group_companies(name)
        `)
        .gte('created_at', daysAgo.toISOString())
        .not('group_company_id', 'is', null)

      if (companyTickets) {
        const companyMap = new Map<string, { name: string; count: number }>()
        companyTickets.forEach((t) => {
          if (t.group_company_id) {
            const existing = companyMap.get(t.group_company_id)
            const groupCompany = t.group_companies as unknown as { name: string } | null
            const companyName = groupCompany?.name || '不明'
            if (existing) {
              existing.count++
            } else {
              companyMap.set(t.group_company_id, { name: companyName, count: 1 })
            }
          }
        })

        const sortedCompanies = Array.from(companyMap.entries())
          .map(([id, data]) => ({
            company_id: id,
            company_name: data.name,
            ticket_count: data.count,
          }))
          .sort((a, b) => b.ticket_count - a.ticket_count)
          .slice(0, 10)

        setCompanyStats(sortedCompanies)
      }

      // カテゴリ別統計
      const { data: categoryTickets } = await supabase
        .from('knowledge_tickets')
        .select('category')
        .gte('created_at', daysAgo.toISOString())

      if (categoryTickets) {
        const categoryMap = new Map<string, number>()
        categoryTickets.forEach((t) => {
          categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1)
        })

        setCategoryStats(
          Array.from(categoryMap.entries()).map(([category, count]) => ({
            category,
            count,
          }))
        )
      }

      // トレンドデータ
      const { data: trendTickets } = await supabase
        .from('knowledge_tickets')
        .select('created_at, resolved_at')
        .gte('created_at', daysAgo.toISOString())
        .order('created_at')

      if (trendTickets) {
        const trendMap = new Map<string, { created: number; resolved: number }>()
        
        trendTickets.forEach((t) => {
          const createdDate = new Date(t.created_at).toISOString().split('T')[0]
          const existing = trendMap.get(createdDate) || { created: 0, resolved: 0 }
          existing.created++
          trendMap.set(createdDate, existing)

          if (t.resolved_at) {
            const resolvedDate = new Date(t.resolved_at).toISOString().split('T')[0]
            const resolvedExisting = trendMap.get(resolvedDate) || { created: 0, resolved: 0 }
            resolvedExisting.resolved++
            trendMap.set(resolvedDate, resolvedExisting)
          }
        })

        setTrendData(
          Array.from(trendMap.entries())
            .map(([date, data]) => ({
              date: date.slice(5), // MM-DD
              created: data.created,
              resolved: data.resolved,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        )
      }

      setLoading(false)
    }

    fetchAnalytics()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分析ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            チケット対応状況と問い合わせ傾向を分析します
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">過去7日間</SelectItem>
            <SelectItem value="30">過去30日間</SelectItem>
            <SelectItem value="90">過去90日間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 概要統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">総チケット数</CardTitle>
            <Ticket className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.total || 0}</div>
            <p className="text-xs text-gray-500 mt-1">期間内の問い合わせ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">対応中</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {(stats?.open || 0) + (stats?.in_progress || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">新規 + 進行中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">解決済み</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats?.resolved || 0) + (stats?.closed || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">解決 + 完了</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">平均解決時間</CardTitle>
            <Clock className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {stats?.avgResolutionHours || 0}h
            </div>
            <p className="text-xs text-gray-500 mt-1">チケット解決まで</p>
          </CardContent>
        </Card>
      </div>

      {/* チャートセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* チケットトレンド */}
        <Card>
          <CardHeader>
            <CardTitle>チケット推移</CardTitle>
            <CardDescription>作成数と解決数の推移</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke="#8b5cf6"
                    name="作成"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#10b981"
                    name="解決"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* カテゴリ別分布 */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別分布</CardTitle>
            <CardDescription>問い合わせ種別の内訳</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryStats.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {categoryStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryStats.map((stat, index) => (
                    <div key={stat.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{TICKET_CATEGORY_LABELS[stat.category as TicketCategory] || stat.category}</span>
                      </div>
                      <Badge variant="secondary">{stat.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 顧客別統計 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            グループ会社別 問い合わせ数
          </CardTitle>
          <CardDescription>
            問い合わせが多い会社を把握し、サポート改善に活用します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="company_name"
                  fontSize={12}
                  width={150}
                />
                <Tooltip />
                <Bar dataKey="ticket_count" fill="#8b5cf6" name="チケット数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>グループ会社に紐づくチケットがありません</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ステータス別内訳 */}
      <Card>
        <CardHeader>
          <CardTitle>ステータス別内訳</CardTitle>
          <CardDescription>現在のチケット状態の分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(['open', 'in_progress', 'pending', 'resolved', 'closed'] as TicketStatus[]).map(
              (status) => (
                <div
                  key={status}
                  className="bg-gray-50 rounded-lg p-4 text-center"
                >
                  <div className="text-2xl font-bold mb-1" style={{ color: TICKET_STATUS_COLORS[status] }}>
                    {stats?.[status] || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    {TICKET_STATUS_LABELS[status]}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
