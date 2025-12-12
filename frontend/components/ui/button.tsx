import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md active:bg-primary/95',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/90',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/85',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/90',
        link: 'text-primary underline-offset-4 hover:underline active:text-primary/90',
        gradient: 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-md hover:from-primary/90 hover:to-primary/70',
        success: 'bg-success text-success-foreground hover:bg-success/90 active:bg-success/95'
      },
      size: {
        xs: 'h-7 rounded-md px-2 text-xs [&_svg]:size-3',
        sm: 'h-9 rounded-md px-3 md:h-9 md:px-3 [&_svg]:size-4',
        default: 'h-10 px-4 py-2 md:h-10 md:px-4 md:py-2 [&_svg]:size-4',
        lg: 'h-11 rounded-md px-8 md:h-11 md:px-8 [&_svg]:size-5',
        xl: 'h-12 rounded-md px-10 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 md:h-10 md:w-10 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-4',
        'icon-lg': 'size-12 [&_svg]:size-5',
        mobile: 'h-12 px-6 py-3 text-base md:h-10 md:px-4 md:py-2 md:text-sm [&_svg]:size-5 md:[&_svg]:size-4',
        mobileSm: 'h-11 px-4 py-2 md:h-9 md:px-3 [&_svg]:size-4',
        mobileLg: 'h-13 px-8 py-4 text-lg md:h-11 md:px-8 md:text-base [&_svg]:size-6 md:[&_svg]:size-5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
