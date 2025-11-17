"use client"

import { useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Percent, ShieldCheck } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  fetchSystemUsageAnalytics,
  simulateVendorConsolidation,
  type SystemUsageAnalytics,
  type VendorConsolidationScenario,
} from '@/app/(dashboard)/dashboard/settings/group-companies/actions'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

const formatCurrency = (value: number) => `¥${value.toLocaleString('ja-JP')}`
const formatPercent = (value: number) => `${Math.round(value * 100)}%`

export function VendorConsolidationSimulator() {
  const [analytics, setAnalytics] = useState<SystemUsageAnalytics | null>(null)
  const [vendorInput, setVendorInput] = useState('')
  const [discountRate, setDiscountRate] = useState(0.15)
  const [includeUnassigned, setIncludeUnassigned] = useState(true)
  const [scenario, setScenario] = useState<VendorConsolidationScenario | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const loadAnalytics = async () => {
    setLoadingAnalytics(true)
    const result = await fetchSystemUsageAnalytics()
    if (!result.success) {
      toast.error(result.message)
    } else {
      setAnalytics(result.data)
    }
    setLoadingAnalytics(false)
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const vendorOptions = useMemo(() => {
    if (!analytics) return []
    return analytics.vendor_adoption.map((vendor) => vendor.vendor)
  }, [analytics])

  const handleSimulate = () => {
    if (!vendorInput.trim()) {
      toast.error('ベンダー名を入力してください')
      return
    }
    startTransition(async () => {
      const result = await simulateVendorConsolidation({
        vendor: vendorInput.trim(),
        discount_rate: discountRate,
        include_unassigned: includeUnassigned,
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setScenario(result.data)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>ベンダー統一コスト試算</CardTitle>
            <CardDescription>
              統一したいベンダーと想定ディスカウント率を入力すると、年間コスト差分を試算します。
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={loadingAnalytics}>
            {loadingAnalytics ? '更新中...' : '最新データ取得'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>統一対象ベンダー *</Label>
            <Input
              list="vendor-options"
              placeholder="例: Microsoft"
              value={vendorInput}
              onChange={(event) => setVendorInput(event.target.value)}
            />
            <datalist id="vendor-options">
              {vendorOptions.map((vendor) => (
                <option key={vendor} value={vendor} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              想定ディスカウント率
              <span className="text-xs text-muted-foreground">({formatPercent(discountRate)})</span>
            </Label>
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0"
                max="0.9"
                value={discountRate}
                onChange={(event) => {
                  const numericValue = Number(event.target.value)
                  if (Number.isNaN(numericValue)) {
                    setDiscountRate(0)
                    return
                  }
                  const clamped = Math.max(0, Math.min(0.9, numericValue))
                  setDiscountRate(clamped)
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              ベンダー未入力の案件も含める
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </Label>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox
                id="include-unassigned"
                checked={includeUnassigned}
                onCheckedChange={(checked) => setIncludeUnassigned(Boolean(checked))}
              />
              <Label htmlFor="include-unassigned" className="text-sm text-muted-foreground">
                未登録のシステムを統一対象に含める
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSimulate} disabled={isPending}>
            {isPending ? '試算中...' : '試算を実行'}
          </Button>
        </div>

        {scenario ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="統一対象ベンダー"
                value={scenario.target_vendor}
                description={`${scenario.company_count}社 / ${scenario.system_count}件`}
              />
              <MetricCard
                label="現状年間コスト"
                value={formatCurrency(scenario.current_cost)}
                description="統一対象の合計"
              />
              <MetricCard
                label="交渉後見込み"
                value={formatCurrency(scenario.negotiated_cost)}
                description={`試算: ${formatPercent(discountRate)}`}
                highlight
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">削減インサイト</CardTitle>
                <CardDescription>
                  ベンダー統一によって年間 {formatCurrency(scenario.estimated_savings)} の削減が見込めます。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>グループ会社</TableHead>
                        <TableHead>システム名</TableHead>
                        <TableHead>年間コスト</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenario.eligible_records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <p className="font-medium">{record.group_company_name}</p>
                            {record.group_company_id && (
                              <p className="font-mono text-[11px] text-muted-foreground">{record.group_company_id}</p>
                            )}
                          </TableCell>
                          <TableCell>{record.system_name}</TableCell>
                          <TableCell>{formatCurrency(record.annual_cost ?? 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">試算結果がここに表示されます。</p>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({
  label,
  value,
  description,
  highlight,
}: {
  label: string
  value: string
  description: string
  highlight?: boolean
}) {
  return (
    <div className={cn('rounded-md border p-4', highlight && 'border-primary bg-primary/5')}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
