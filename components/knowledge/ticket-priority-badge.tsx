'use client'

import {
  type TicketPriority,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
} from '@/types/knowledge'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowDown, ArrowUp, Flame } from 'lucide-react'

interface TicketPriorityBadgeProps {
  priority: TicketPriority
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function TicketPriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
}: TicketPriorityBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  const icons: Record<TicketPriority, React.ReactNode> = {
    low: <ArrowDown className={iconSizes[size]} />,
    normal: null,
    high: <ArrowUp className={iconSizes[size]} />,
    urgent: <Flame className={cn(iconSizes[size], 'animate-pulse')} />,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md border',
        sizeClasses[size],
        TICKET_PRIORITY_COLORS[priority]
      )}
    >
      {showIcon && icons[priority]}
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  )
}
