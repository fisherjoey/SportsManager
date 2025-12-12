import * as React from 'react'

import { cn } from '@/lib/utils'

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
