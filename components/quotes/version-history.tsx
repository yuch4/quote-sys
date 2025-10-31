'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Quote {
  id: string
  quote_number: string
  version: number
  issue_date: string
  total_amount: string
  approval_status: string
  created_by_user?: {
    display_name: string
  }
}

interface VersionHistoryProps {
  currentQuoteId: string
  versions: Quote[]
}

export function VersionHistory({ currentQuoteId, versions }: VersionHistoryProps) {
  const getApprovalStatusBadgeVariant = (status: string) => {
    switch (status) {
      case '下書き': return 'outline'
      case '承認待ち': return 'secondary'
      case '承認済み': return 'default'
      case '却下': return 'destructive'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Number(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  if (versions.length <= 1) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>改訂履歴</CardTitle>
        <CardDescription>この見積の全バージョン履歴</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {versions
            .sort((a, b) => b.version - a.version)
            .map((version) => (
              <div
                key={version.id}
                className={`p-4 border rounded-lg ${
                  version.id === currentQuoteId ? 'bg-blue-50 border-blue-300' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-lg">{version.quote_number}</span>
                      {version.id === currentQuoteId && (
                        <Badge variant="secondary">現在のバージョン</Badge>
                      )}
                      <Badge variant={getApprovalStatusBadgeVariant(version.approval_status)}>
                        {version.approval_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>発行日: {formatDate(version.issue_date)}</p>
                      <p>金額: {formatCurrency(version.total_amount)}</p>
                      {version.created_by_user && (
                        <p>作成者: {version.created_by_user.display_name}</p>
                      )}
                    </div>
                  </div>
                  {version.id !== currentQuoteId && (
                    <Link href={`/dashboard/quotes/${version.id}`}>
                      <Button variant="outline" size="sm">
                        表示
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
