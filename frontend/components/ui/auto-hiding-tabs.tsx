'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

interface AutoHidingTabsContextType {
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
  autoHide: boolean
  hideDelay: number
}

const AutoHidingTabsContext = React.createContext<AutoHidingTabsContextType | null>(null)

interface AutoHidingTabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  autoHide?: boolean
  hideDelay?: number
  orientation?: 'horizontal' | 'vertical'
}

const AutoHidingTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  AutoHidingTabsProps
>(({ className, autoHide = false, hideDelay = 3000, orientation = 'horizontal', ...props }, ref) => {
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  React.useEffect(() => {
    if (autoHide && !isHovered) {
      timeoutRef.current = setTimeout(() => {
        setIsMinimized(true)
      }, hideDelay)
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [autoHide, hideDelay, isHovered])

  const handleMouseEnter = () => {
    setIsHovered(true)
    setIsMinimized(false)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <AutoHidingTabsContext.Provider value={{ isMinimized, setIsMinimized, autoHide, hideDelay }}>
      <TabsPrimitive.Root
        ref={ref}
        className={cn(className)}
        orientation={orientation}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      />
    </AutoHidingTabsContext.Provider>
  )
})
AutoHidingTabs.displayName = 'AutoHidingTabs'

interface AutoHidingTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: 'default' | 'underline' | 'pills'
}

const AutoHidingTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  AutoHidingTabsListProps
>(({ className, variant = 'default', ...props }, ref) => {
  const context = React.useContext(AutoHidingTabsContext)

  if (!context) {
    throw new Error('AutoHidingTabsList must be used within AutoHidingTabs')
  }

  const { isMinimized, setIsMinimized } = context

  return (
    <div className="relative">
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-300',
          variant === 'default' && 'h-10 rounded-md bg-muted p-1 text-muted-foreground',
          variant === 'underline' && 'h-10 gap-6 border-b border-border',
          variant === 'pills' && 'gap-2 flex-wrap',
          isMinimized && 'transform -translate-x-full opacity-50 hover:translate-x-0 hover:opacity-100',
          className
        )}
        {...props}
      />
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-muted rounded-r-md p-2 hover:bg-muted/80 transition-colors"
          aria-label="Show tabs"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {!isMinimized && (
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 hover:opacity-100 transition-opacity"
          aria-label="Hide tabs"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})
AutoHidingTabsList.displayName = 'AutoHidingTabsList'

interface AutoHidingTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: 'default' | 'underline' | 'pills'
}

const AutoHidingTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  AutoHidingTabsTriggerProps
>(({ className, children, variant = 'default', ...props }, ref) => {
  const context = React.useContext(AutoHidingTabsContext)

  if (!context) {
    throw new Error('AutoHidingTabsTrigger must be used within AutoHidingTabs')
  }

  const { isMinimized } = context

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        variant === 'underline' && 'relative px-3 py-2 text-muted-foreground data-[state=active]:text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform after:duration-200 data-[state=active]:after:scale-x-100',
        variant === 'pills' && 'rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
        isMinimized && 'opacity-0 w-0 px-0 overflow-hidden',
        className
      )}
      {...props}
    >
      {!isMinimized && children}
    </TabsPrimitive.Trigger>
  )
})
AutoHidingTabsTrigger.displayName = 'AutoHidingTabsTrigger'

const AutoHidingTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
))
AutoHidingTabsContent.displayName = 'AutoHidingTabsContent'

export { 
  AutoHidingTabs, 
  AutoHidingTabsList, 
  AutoHidingTabsTrigger, 
  AutoHidingTabsContent 
}