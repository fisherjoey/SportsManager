import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        warning:
          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        success:
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        info:
          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        outline: 'text-foreground'
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  dotColor?: 'success' | 'warning' | 'destructive' | 'default'
  pulse?: boolean
}

function Badge({ className, variant, size, dot, dotColor = 'default', pulse, ...props }: BadgeProps) {
  const dotColorClasses = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-destructive',
    default: 'bg-primary'
  }

  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="relative mr-1.5 flex h-2 w-2">
          {pulse && (
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              dotColorClasses[dotColor]
            )} />
          )}
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            dotColorClasses[dotColor]
          )} />
        </span>
      )}
      {props.children}
    </div>
  )
}

export { Badge, badgeVariants }
