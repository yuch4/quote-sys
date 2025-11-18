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
          <p className="text-sm text-muted-foreground">同一カテゴリでバラバラに使われているシステムを洗い出し、統一によるコスト削減インパクトを把握します。</p>
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
                  <CardTitle>統一化優先カテゴリ</CardTitle>
                  <CardDescription>同一カテゴリで異なるシステムが並行稼働している領域を抽出しました。</CardDescription>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  コスト統一余地
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(analytics?.standardization_candidates?.length ?? 0) > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>カテゴリ</TableHead>
                        <TableHead>現状</TableHead>
                        <TableHead>推奨統一候補</TableHead>
                        <TableHead>その他の採用システム</TableHead>
                        <TableHead>年間コスト</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics?.standardization_candidates ?? []).map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="font-medium">
                            <div>{translateCategory(row.category)}</div>
                            <FragmentationBadge value={row.fragmentation_index} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{row.company_count}社 / {row.distinct_system_count}システム</div>
                            <p className="text-xs text-muted-foreground">
                              統一で最大 {formatPercent(row.fragmentation_index)} の重複解消余地
                            </p>
                          </TableCell>
                          <TableCell>
                            {row.leading_system ? (
                              <div>
                                <div className="font-medium">{row.leading_system.system_name}</div>
                                <p className="text-xs text-muted-foreground">
                                  {row.leading_system.vendor ?? 'ベンダー未登録'} ・ {formatPercent(row.leading_system.company_count / row.company_count)} 採用
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">未計測</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {row.alternate_systems.length === 0 ? (
                                <span className="text-xs text-muted-foreground">代替システム情報なし</span>
                              ) : (
                                <>
                                  {row.alternate_systems.slice(0, 3).map((system) => (
                                    <Badge key={`${row.category}-${system.system_name}-${system.vendor ?? 'unknown'}`} variant="outline">
                                      {system.system_name} ({system.company_count}社)
                                    </Badge>
                                  ))}
                                  {row.alternate_systems.length > 3 && (
                                    <Badge variant="secondary">+{row.alternate_systems.length - 3}</Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(row.estimated_annual_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState message="統一化対象となるカテゴリはまだありません" />
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

function FragmentationBadge({ value }: { value: number }) {
  let variant: 'secondary' | 'default' | 'destructive' = 'secondary'
  let label = '低'
  if (value >= 0.6) {
    variant = 'destructive'
    label = '高'
  } else if (value >= 0.3) {
    variant = 'default'
    label = '中'
  }

  return (
    <Badge variant={variant} className="mt-1 text-xs">
      ばらつき {label} ({formatPercent(value)})
    </Badge>
  )
}
