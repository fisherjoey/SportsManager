'use client'

import { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  icon: Icon, 
  title, 
  description, 
  children, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-6 w-6 text-muted-foreground" />}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-2">
          {children}
        </div>
      )}
    </div>
  )
}