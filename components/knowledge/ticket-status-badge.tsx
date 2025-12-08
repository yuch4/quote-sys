'use client'

import {
  type TicketStatus,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
} from '@/types/knowledge'
import { cn } from '@/lib/utils'

interface TicketStatusBadgeProps {
  status: TicketStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function TicketStatusBadge({
  status,
  size = 'md',
  showIcon = false,
}: TicketStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  const icons: Record<TicketStatus, string> = {
    open: '○',
    in_progress: '◐',
    pending: '◷',
    resolved: '✓',
    closed: '●',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md border',
        sizeClasses[size],
        TICKET_STATUS_COLORS[status]
      )}
    >
      {showIcon && <span className="text-[0.7em]">{icons[status]}</span>}
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}
