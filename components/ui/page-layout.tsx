'use client'

import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
  /**
   * Container type for the layout
   * - 'default': Standard spacing with full width
   * - 'contained': Max-width container with padding
   * - 'fluid': Full width with minimal padding
   */
  variant?: 'default' | 'contained' | 'fluid'
  /**
   * Padding size
   * - 'none': No padding
   * - 'small': Small padding (p-2 sm:p-3 lg:p-4)
   * - 'medium': Medium padding (p-4 sm:p-6 lg:p-8)
   * - 'large': Large padding (p-6 sm:p-8 lg:p-10)
   */
  padding?: 'none' | 'small' | 'medium' | 'large'
}

const paddingClasses = {
  none: '',
  small: 'p-2 sm:p-3 lg:p-4',
  medium: 'p-4 sm:p-6 lg:p-8',
  large: 'p-6 sm:p-8 lg:p-10'
}

const variantClasses = {
  default: 'w-full min-w-0 space-y-6',
  contained: 'w-full max-w-7xl mx-auto space-y-6',
  fluid: 'w-full min-w-0 space-y-4'
}

export function PageLayout({
  children,
  className,
  fullWidth = true,
  variant = 'default',
  padding = 'none'
}: PageLayoutProps) {
  return (
    <div className={cn(
      variantClasses[variant],
      paddingClasses[padding],
      fullWidth ? 'w-full' : '',
      className
    )}>
      {children}
    </div>
  )
}

// Helper component for responsive grid layouts within pages
interface PageGridProps {
  children: React.ReactNode
  className?: string
  /**
   * Number of columns at different breakpoints
   * Uses responsive grid system
   */
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
    '3xl'?: number
  }
  gap?: 'small' | 'medium' | 'large'
}

// Grid column mappings - must be explicit for Tailwind to include them
const gridColsMap: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-2',
  '3': 'grid-cols-3',
  '4': 'grid-cols-4',
  '5': 'grid-cols-5',
  '6': 'grid-cols-6',
  '7': 'grid-cols-7',
  '8': 'grid-cols-8',
  '9': 'grid-cols-9',
  '10': 'grid-cols-10',
  '11': 'grid-cols-11',
  '12': 'grid-cols-12',
}

const smColsMap: Record<string, string> = {
  '1': 'sm:grid-cols-1',
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-3',
  '4': 'sm:grid-cols-4',
  '5': 'sm:grid-cols-5',
  '6': 'sm:grid-cols-6',
}

const mdColsMap: Record<string, string> = {
  '1': 'md:grid-cols-1',
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-3',
  '4': 'md:grid-cols-4',
  '5': 'md:grid-cols-5',
  '6': 'md:grid-cols-6',
}

const lgColsMap: Record<string, string> = {
  '1': 'lg:grid-cols-1',
  '2': 'lg:grid-cols-2',
  '3': 'lg:grid-cols-3',
  '4': 'lg:grid-cols-4',
  '5': 'lg:grid-cols-5',
  '6': 'lg:grid-cols-6',
  '7': 'lg:grid-cols-7',
  '8': 'lg:grid-cols-8',
}

const xlColsMap: Record<string, string> = {
  '1': 'xl:grid-cols-1',
  '2': 'xl:grid-cols-2',
  '3': 'xl:grid-cols-3',
  '4': 'xl:grid-cols-4',
  '5': 'xl:grid-cols-5',
  '6': 'xl:grid-cols-6',
  '7': 'xl:grid-cols-7',
  '8': 'xl:grid-cols-8',
}

const xl2ColsMap: Record<string, string> = {
  '1': '2xl:grid-cols-1',
  '2': '2xl:grid-cols-2',
  '3': '2xl:grid-cols-3',
  '4': '2xl:grid-cols-4',
  '5': '2xl:grid-cols-5',
  '6': '2xl:grid-cols-6',
  '7': '2xl:grid-cols-7',
  '8': '2xl:grid-cols-8',
  '9': '2xl:grid-cols-9',
  '10': '2xl:grid-cols-10',
}

const xl3ColsMap: Record<string, string> = {
  '1': '3xl:grid-cols-1',
  '2': '3xl:grid-cols-2',
  '3': '3xl:grid-cols-3',
  '4': '3xl:grid-cols-4',
  '5': '3xl:grid-cols-5',
  '6': '3xl:grid-cols-6',
  '7': '3xl:grid-cols-7',
  '8': '3xl:grid-cols-8',
  '9': '3xl:grid-cols-9',
  '10': '3xl:grid-cols-10',
  '11': '3xl:grid-cols-11',
  '12': '3xl:grid-cols-12',
}

export function PageGrid({
  children,
  className,
  cols = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 'medium'
}: PageGridProps) {
  const gapClasses = {
    small: 'gap-2 sm:gap-3 lg:gap-4',
    medium: 'gap-4 sm:gap-5 lg:gap-6',
    large: 'gap-6 sm:gap-8 lg:gap-10'
  }

  // Build responsive grid classes using explicit mappings
  const gridClasses = []
  if (cols.default) gridClasses.push(gridColsMap[String(cols.default)] || 'grid-cols-1')
  if (cols.sm) gridClasses.push(smColsMap[String(cols.sm)] || '')
  if (cols.md) gridClasses.push(mdColsMap[String(cols.md)] || '')
  if (cols.lg) gridClasses.push(lgColsMap[String(cols.lg)] || '')
  if (cols.xl) gridClasses.push(xlColsMap[String(cols.xl)] || '')
  if (cols['2xl']) gridClasses.push(xl2ColsMap[String(cols['2xl'])] || '')
  if (cols['3xl']) gridClasses.push(xl3ColsMap[String(cols['3xl'])] || '')

  return (
    <div className={cn(
      'grid',
      gridClasses.filter(Boolean).join(' '),
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}