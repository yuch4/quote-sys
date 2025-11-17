"use client"

import { useEffect, useState, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Layers, RefreshCw, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import type { SystemUsageAnalytics } from '@/app/(dashboard)/dashboard/settings/group-companies/actions'
import { fetchSystemUsageAnalytics } from '@/app/(dashboard)/dashboard/settings/group-companies/actions'
import { Button } from '@/components/ui/button'
import type { SystemAdoptionStatus } from '@/types/database'

const formatCurrency = (value: number) => `¥${value.toLocaleString('ja-JP')}`
const formatPercent = (value: number) => `${Math.round(value * 100)}%`

export function GroupSystemInsights() {
  const [analytics, setAnalytics] = useState<SystemUsageAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  const loadAnalytics = async () => {
    setLoading(true)
    const result = await fetchSystemUsageAnalytics()
    if (!result.success) {
      toast.error(result.message)
      setAnalytics(null)
    } else {
      setAnalytics(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const renderSummary = () => {
    if (!analytics) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard label="グループ会社" />
          <SkeletonCard label="棚卸システム" />
          <SkeletonCard label="平均システム数" />
          <SkeletonCard label="年間コスト" />
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="グループ会社"
          value={`${analytics.total_companies}社`}
          description="棚卸対象会社数"
        />
        <SummaryCard
          icon={<Layers className="h-4 w-4" />}
          label="棚卸システム"
          value={`${analytics.total_system_records}件`}
          description="登録済みシステム明細"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="平均システム数"
          value={analytics.avg_systems_per_company.toFixed(1)}
          description="1社あたりの導入件数"
        />
        <SummaryCard
          icon={<Wallet className="h-4 w-4" />}
          label="推定年間コスト"
          value={formatCurrency(analytics.estimated_annual_cost)}
          description="年額ベースの概算"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">共通化候補ダッシュボード</h3>
          <p className="text-sm text-muted-foreground">カテゴリ別の重複状況とベンダー採用率を把握して標準化を検討します。</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? '更新中...' : '再集計'}
        </Button>
      </div>

      {loading && !analytics ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            集計データを取得しています...
          </CardContent>
        </Card>
      ) : (
        <>
          {renderSummary()}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別採用状況</CardTitle>
                <CardDescription>導入件数が多いカテゴリから標準化候補を検討します。</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && analytics.adoption_by_category.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>カテゴリ</TableHead>
                          <TableHead>導入数</TableHead>
                          <TableHead>対象社数</TableHead>
                          <TableHead>稼働率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.adoption_by_category.map((row) => (
                          <TableRow key={row.category}>
                            <TableCell className="font-medium">{translateCategory(row.category)}</TableCell>
                            <TableCell>{row.system_count}</TableCell>
                            <TableCell>{row.company_count}</TableCell>
                            <TableCell>
                              <Badge variant={row.in_use_ratio >= 0.7 ? 'default' : 'secondary'}>
                                {formatPercent(row.in_use_ratio)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState message="カテゴリ別集計がまだありません" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ベンダー別採用状況</CardTitle>
                <CardDescription>複数社で採用されているベンダーを優先的に整理します。</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && analytics.vendor_adoption.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ベンダー</TableHead>
                          <TableHead>導入数</TableHead>
                          <TableHead>対象社数</TableHead>
                          <TableHead>概算コスト</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.vendor_adoption.map((row) => (
                          <TableRow key={row.vendor}>
                            <TableCell className="font-medium">{row.vendor}</TableCell>
                            <TableCell>{row.system_count}</TableCell>
                            <TableCell>{row.company_count}</TableCell>
                            <TableCell>{formatCurrency(row.estimated_annual_cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState message="ベンダー別集計がまだありません" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>共通化候補システム</CardTitle>
                  <CardDescription>複数社で採用されているシステムを抽出しました。</CardDescription>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  コスト集約対象
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics && analytics.consolidation_candidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>システム名</TableHead>
                        <TableHead>ベンダー</TableHead>
                        <TableHead>利用社数</TableHead>
                        <TableHead>概算コスト</TableHead>
                        <TableHead>採用ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.consolidation_candidates.map((row) => (
                        <TableRow key={`${row.system_name}-${row.vendor ?? 'unknown'}`}>
                          <TableCell className="font-medium">{row.system_name}</TableCell>
                          <TableCell>{row.vendor ?? '未登録'}</TableCell>
                          <TableCell>{row.company_count}</TableCell>
                          <TableCell>{formatCurrency(row.estimated_annual_cost)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {Object.entries(row.adoption_breakdown)
                                .filter(([, count]) => count > 0)
                                .map(([status, count]) => (
                                  <Badge key={status} variant="outline">
                                    {translateAdoptionStatus(status as keyof typeof row.adoption_breakdown)} {count}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState message="複数社で採用されているシステムはまだありません" />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function translateCategory(category: string) {
  const map: Record<string, string> = {
    sales_management: '販売管理',
    accounting: '会計・経理',
    human_resources: '人事・労務',
    endpoint_security: 'エンドポイントセキュリティ',
    collaboration: 'コラボレーション',
    infrastructure: 'インフラ',
    erp: 'ERP',
    other: 'その他',
  }
  return map[category] ?? category
}

function translateAdoptionStatus(status: SystemAdoptionStatus) {
  const map: Record<string, string> = {
    in_use: '稼働中',
    pilot: 'PoC',
    planned: '導入予定',
    decommissioned: '廃止済み',
    unknown: '不明',
  }
  return map[status] ?? status
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-8 animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode
  label: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
