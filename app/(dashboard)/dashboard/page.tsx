import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

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
  let quoteQuery = supabase
    .from('quotes')
    .select('id, project_id', { count: 'exact', head: true })
    .eq('approval_status', '承認済み')
    .gte('created_at', thisMonth.toISOString())

  const { count: approvedQuoteCount, error: quoteCountError } = await quoteQuery

  if (quoteCountError) {
    console.error('見積数取得エラー:', quoteCountError)
  }

  // 今月の売上・粗利（承認済み見積）
  let salesQuery = supabase
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
  let pendingApprovalQuery = supabase
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

  const { data: pendingApprovals, error: pendingError } = await pendingApprovalQuery

  if (pendingError) {
    console.error('承認待ち見積取得エラー:', pendingError)
  }

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

  if (delayError) {
    console.error('長期未入荷データ取得エラー:', delayError)
  }

  // 最近の案件・見積
  let recentActivityQuery = supabase
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

  const { data: recentActivity, error: recentError } = await recentActivityQuery

  if (recentError) {
    console.error('最近の活動取得エラー:', recentError)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
          {userData?.display_name}さん、ようこそ
          {!isAdmin && ' （あなたの案件のみ表示）'}
        </p>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中案件</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">見積中・受注案件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認済み見積</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedQuoteCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">今月作成</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月売上</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">承認済み見積合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月粗利</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              粗利率 {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* アラート */}
      {(pendingApprovals && pendingApprovals.length > 0) || (longDelayItems && longDelayItems.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* 承認待ち */}
          {pendingApprovals && pendingApprovals.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <CardTitle>承認待ち見積</CardTitle>
                </div>
                <CardDescription>{pendingApprovals.length}件の見積が承認待ちです</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingApprovals.map((quote: any) => (
                    <Link
                      key={quote.id}
                      href={`/dashboard/quotes/${quote.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{quote.quote_number}</p>
                          <p className="text-xs text-gray-600">
                            {quote.projects?.project_name} - {quote.projects?.customers?.customer_name}
                          </p>
                        </div>
                        <Badge variant="secondary">承認待ち</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 長期未入荷 */}
          {longDelayItems && longDelayItems.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <CardTitle>長期未入荷アラート</CardTitle>
                </div>
                <CardDescription>14日以上入荷待ちの明細があります</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {longDelayItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-600">
                        {item.quotes?.projects?.project_name} - {item.suppliers?.supplier_name}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
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
      <Card>
        <CardHeader>
          <CardTitle>最近の見積</CardTitle>
          <CardDescription>直近の見積更新</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((quote: any) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/quotes/${quote.id}`}
                  className="block p-3 rounded-lg border hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{quote.quote_number}</p>
                      <p className="text-xs text-gray-600">
                        {quote.projects?.project_name} - {quote.projects?.customers?.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        更新: {new Date(quote.updated_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        quote.approval_status === '承認済み'
                          ? 'default'
                          : quote.approval_status === '承認待ち'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {quote.approval_status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">データがありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
