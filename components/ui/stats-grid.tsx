'use client'

import { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatItem {
  title: string
  value: string | number
  icon: LucideIcon
  color?: string
  description?: string
}

interface StatsGridProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
  className?: string
}

export function StatsGrid({ 
  stats, 
  columns = 4, 
  className 
}: StatsGridProps) {
  const gridClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3', 
    4: 'md:grid-cols-2 lg:grid-cols-4'
  }[columns]

  return (
    <div className={cn(`grid gap-4 ${gridClass}`, className)}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={cn('h-4 w-4', stat.color || 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}