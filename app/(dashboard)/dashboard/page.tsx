import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

type ProjectRelation =
  | {
      project_name: string | null
      customers?: {
        customer_name: string | null
      } | null
    }
  | null

type PendingApprovalQuote = {
  id: string
  quote_number: string
  created_at: string
  projects?: ProjectRelation
}

type LongDelayItem = {
  id: string
  product_name: string
  ordered_at: string | null
  quotes?: {
    projects?: ProjectRelation
  } | null
  suppliers?: {
    supplier_name: string | null
  } | null
}

type RecentQuoteActivity = {
  id: string
  quote_number: string
  approval_status: string
  updated_at: string
  projects?: ProjectRelation
}

const normalizeProjectRelation = (relation: ProjectRelation | ProjectRelation[] | null | undefined) => {
  const project = Array.isArray(relation) ? relation[0] : relation
  const customers = project?.customers
  const customer = Array.isArray(customers) ? customers[0] : customers
  return {
    projectName: project?.project_name ?? null,
    customerName: customer?.customer_name ?? null,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>ログインしてください</div>
  }

  // ユーザー情報取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError) {
    console.error('ユーザー情報取得エラー:', userError)
    return (
      <Card>
        <CardHeader>
          <CardTitle>エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">ユーザー情報の取得に失敗しました</p>
        </CardContent>
      </Card>
    )
  }

  const isAdmin = userData?.role === '管理者' || userData?.role === '営業事務'

  // KPI取得
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  // 案件数（自分または全体）
  let projectQuery = supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .in('status', ['見積中', '受注'])

  if (!isAdmin) {
    projectQuery = projectQuery.eq('sales_rep_id', user.id)
  }

  const { count: projectCount, error: projectError } = await projectQuery

  if (projectError) {
    console.error('案件数取得エラー:', projectError)
  }

  // 承認済み見積数（今月）
  const quoteQuery = supabase
    .from('quotes')
    .select('id, project_id', { count: 'exact', head: true })
    .eq('approval_status', '承認済み')
    .gte('created_at', thisMonth.toISOString())

  const { count: approvedQuoteCount, error: quoteCountError } = await quoteQuery

  if (quoteCountError) {
    console.error('見積数取得エラー:', quoteCountError)
  }

  // 今月の売上・粗利（承認済み見積）
  const salesQuery = supabase
    .from('quotes')
    .select('total_amount, gross_profit, project_id')
    .eq('approval_status', '承認済み')
    .gte('created_at', thisMonth.toISOString())

  const { data: salesData, error: salesError } = await salesQuery

  if (salesError) {
    console.error('売上データ取得エラー:', salesError)
  }

  const totalSales = salesData?.reduce((sum, q) => sum + Number(q.total_amount || 0), 0) || 0
  const totalProfit = salesData?.reduce((sum, q) => sum + Number(q.gross_profit || 0), 0) || 0

  // 承認待ち見積（アラート）
  const pendingApprovalQuery = supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      created_at,
      approval_status,
      project_id,
      projects!inner(
        project_name,
        customers(customer_name)
      )
    `)
    .eq('approval_status', '承認待ち')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: pendingApprovals, error: pendingError } = await pendingApprovalQuery.returns<PendingApprovalQuote[]>()

  if (pendingError) {
    console.error('承認待ち見積取得エラー:', pendingError)
  }

  const safePendingApprovals = (pendingApprovals || []).map((quote) => {
    const projectInfo = normalizeProjectRelation(quote.projects)
    return {
      ...quote,
      projectName: projectInfo.projectName,
      customerName: projectInfo.customerName,
    }
  })

  // 長期未入荷アラート（14日以上）
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: longDelayItems, error: delayError } = await supabase
    .from('quote_items')
    .select(`
      id,
      product_name,
      ordered_at,
      procurement_status,
      quote_id,
      supplier_id,
      quotes!inner(
        quote_number,
        projects!inner(
          project_name,
          customers(customer_name)
        )
      ),
      suppliers(supplier_name)
    `)
    .eq('procurement_status', '発注済')
    .lte('ordered_at', fourteenDaysAgo.toISOString())
    .limit(5)
    .returns<LongDelayItem[]>()

  if (delayError) {
    console.error('長期未入荷データ取得エラー:', delayError)
  }

  // 最近の案件・見積
  const recentActivityQuery = supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      updated_at,
      approval_status,
      project_id,
      projects!inner(
        project_name,
        customers(customer_name)
      )
    `)
    .order('updated_at', { ascending: false })
    .limit(5)

  const { data: recentActivity, error: recentError } = await recentActivityQuery.returns<RecentQuoteActivity[]>()

  if (recentError) {
    console.error('最近の活動取得エラー:', recentError)
  }

  const safeLongDelayItems = (longDelayItems || []).map((item) => {
    const projectInfo = normalizeProjectRelation(item.quotes?.projects)
    const supplierRecord = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers
    return {
      ...item,
      projectName: projectInfo.projectName,
      customerName: projectInfo.customerName,
      supplierName: supplierRecord?.supplier_name ?? null,
    }
  })

  const safeRecentActivity = (recentActivity || []).map((quote) => {
    const projectInfo = normalizeProjectRelation(quote.projects)
    return {
      ...quote,
      projectName: projectInfo.projectName,
      customerName: projectInfo.customerName,
    }
  })

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(0.22_0.04_250)] via-[oklch(0.26_0.05_248)] to-[oklch(0.20_0.06_255)] p-8 text-white shadow-2xl shadow-black/10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[oklch(0.65_0.12_195_/_0.4)] to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[oklch(0.75_0.12_85_/_0.3)] to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            おはようございます、{userData?.display_name}さん
          </h1>
          <p className="text-white/70 text-lg">
            本日も素晴らしい一日になりますように
            {!isAdmin && <span className="ml-2 text-sm opacity-70">（あなたの担当案件を表示）</span>}
          </p>
        </div>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.12_195_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">進行中案件</CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.65_0.12_195_/_0.1)]">
              <TrendingUp className="h-5 w-5 text-[oklch(0.55_0.18_195)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{projectCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">見積中・受注案件</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.18_145_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">承認済み見積</CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.65_0.18_145_/_0.1)]">
              <CheckCircle className="h-5 w-5 text-[oklch(0.55_0.18_145)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{approvedQuoteCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">今月作成</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.75_0.12_85_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今月売上</CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.75_0.12_85_/_0.1)]">
              <TrendingUp className="h-5 w-5 text-[oklch(0.65_0.15_85)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              ¥{totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">承認済み見積合計</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.55_0.18_195_/_0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今月粗利</CardTitle>
            <div className="p-2 rounded-xl bg-[oklch(0.55_0.18_195_/_0.1)]">
              <TrendingUp className="h-5 w-5 text-[oklch(0.55_0.18_195)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              ¥{totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              粗利率 <span className="font-semibold text-[oklch(0.55_0.18_195)]">{totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* アラート */}
      {(safePendingApprovals && safePendingApprovals.length > 0) || (safeLongDelayItems && safeLongDelayItems.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* 承認待ち */}
          {safePendingApprovals.length > 0 && (
            <Card className="border-0 shadow-lg shadow-black/5 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-[oklch(0.80_0.15_85_/_0.1)] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[oklch(0.80_0.15_85_/_0.2)]">
                    <Clock className="h-5 w-5 text-[oklch(0.65_0.15_85)]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">承認待ち見積</CardTitle>
                    <CardDescription>{safePendingApprovals.length}件の見積が承認待ちです</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {safePendingApprovals.map((quote, index) => (
                    <Link
                      key={quote.id}
                      href={`/dashboard/quotes/${quote.id}`}
                      className="block p-4 rounded-xl border border-border/50 hover:border-[oklch(0.65_0.12_195_/_0.5)] hover:bg-muted/50 transition-all duration-200 group"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-[oklch(0.55_0.18_195)] transition-colors">{quote.quote_number}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {quote.projectName ?? '-'} • {quote.customerName ?? '-'}
                          </p>
                        </div>
                        <Badge className="bg-[oklch(0.80_0.15_85_/_0.15)] text-[oklch(0.55_0.15_85)] border-[oklch(0.80_0.15_85_/_0.3)] hover:bg-[oklch(0.80_0.15_85_/_0.2)]">
                          承認待ち
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 長期未入荷 */}
          {safeLongDelayItems.length > 0 && (
            <Card className="border-0 shadow-lg shadow-black/5 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-[oklch(0.55_0.22_25_/_0.1)] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[oklch(0.55_0.22_25_/_0.2)]">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">長期未入荷アラート</CardTitle>
                    <CardDescription>14日以上入荷待ちの明細があります</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {safeLongDelayItems.slice(0, 3).map((item, index) => (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-xl border border-destructive/20 bg-destructive/5"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <p className="font-semibold text-foreground">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.projectName ?? '-'} • {item.supplierName ?? '-'}
                      </p>
                      <p className="text-xs text-destructive mt-2 font-medium">
                        発注日: {item.ordered_at ? new Date(item.ordered_at).toLocaleDateString('ja-JP') : '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* 最近の活動 */}
      <Card className="border-0 shadow-lg shadow-black/5 bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl">最近の見積</CardTitle>
          <CardDescription>直近の見積更新</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {safeRecentActivity.length > 0 ? (
            <div className="space-y-3">
              {safeRecentActivity.map((quote, index) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/quotes/${quote.id}`}
                  className="block p-4 rounded-xl border border-border/50 hover:border-[oklch(0.65_0.12_195_/_0.5)] hover:bg-muted/50 transition-all duration-200 group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-[oklch(0.55_0.18_195)] transition-colors">{quote.quote_number}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {quote.projectName ?? '-'} • {quote.customerName ?? '-'}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        更新: {new Date(quote.updated_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <Badge
                      className={
                        quote.approval_status === '承認済み'
                          ? 'bg-[oklch(0.65_0.18_145_/_0.15)] text-[oklch(0.45_0.18_145)] border-[oklch(0.65_0.18_145_/_0.3)]'
                          : quote.approval_status === '承認待ち'
                          ? 'bg-[oklch(0.80_0.15_85_/_0.15)] text-[oklch(0.55_0.15_85)] border-[oklch(0.80_0.15_85_/_0.3)]'
                          : 'bg-muted text-muted-foreground border-border'
                      }
                    >
                      {quote.approval_status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">データがありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
