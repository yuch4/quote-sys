import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, role, ...props }, ref) => {
    const isVertical = orientation === 'vertical'

    return (
      <div
        ref={ref}
        role={decorative ? 'presentation' : role || 'separator'}
        aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        className={cn(
          'bg-border',
          isVertical ? 'w-px h-full mx-2' : 'h-px w-full my-2',
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = 'Separator'

export { Separator }
