'use client'

import {
  type ContentVisibility,
  VISIBILITY_LABELS,
  VISIBILITY_COLORS,
} from '@/types/knowledge'
import { cn } from '@/lib/utils'
import { Lock, Users, Globe } from 'lucide-react'

interface VisibilityBadgeProps {
  visibility: ContentVisibility
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function VisibilityBadge({
  visibility,
  size = 'md',
  showIcon = true,
}: VisibilityBadgeProps) {
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

  const icons: Record<ContentVisibility, React.ReactNode> = {
    internal: <Lock className={iconSizes[size]} />,
    customer: <Users className={iconSizes[size]} />,
    public: <Globe className={iconSizes[size]} />,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md border',
        sizeClasses[size],
        VISIBILITY_COLORS[visibility]
      )}
    >
      {showIcon && icons[visibility]}
      {VISIBILITY_LABELS[visibility]}
    </span>
  )
}
