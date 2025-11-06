'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

interface AlertSummary {
  id: string
  productName: string
  supplierName: string | null
  daysElapsed: number
  purchaseOrderNumber?: string | null
}

interface ProcurementAlertReminderProps {
  alerts: AlertSummary[]
}

export function ProcurementAlertReminder({ alerts }: ProcurementAlertReminderProps) {
  useEffect(() => {
    if (!alerts || alerts.length === 0) return

    const top = alerts.slice(0, 3)
    const detail = top
      .map((alert) => `${alert.purchaseOrderNumber ?? 'PO-?'} / ${alert.productName} (${alert.daysElapsed}日経過)`) 
      .join('\n')

    toast.warning(`入荷が遅れている明細が ${alerts.length} 件あります`, {
      description: detail,
      duration: 8000,
    })
  }, [alerts])

  if (!alerts || alerts.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="space-y-2 text-sm text-amber-700">
          <p className="font-semibold">入荷遅延のリマインダー</p>
          <ul className="space-y-1 list-disc pl-5">
            {alerts.slice(0, 3).map((alert) => (
              <li key={alert.id}>
                {alert.purchaseOrderNumber ?? 'PO-?'} / {alert.productName}
                {' '}({alert.daysElapsed}日経過)
                {alert.supplierName ? ` - ${alert.supplierName}` : ''}
              </li>
            ))}
          </ul>
          {alerts.length > 3 ? (
            <p className="text-xs">他 {alerts.length - 3} 件の明細があります。詳細は入荷状況を確認してください。</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
