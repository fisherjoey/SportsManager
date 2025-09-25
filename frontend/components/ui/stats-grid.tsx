'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatItem {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | string
  description?: string
  subtitle?: string
  change?: {
    value: number
    trend: 'positive' | 'negative' | 'neutral'
  }
}

interface StatsGridProps {
  items: StatItem[]
  columns?: 2 | 3 | 4
  className?: string
}

// Map semantic colors to theme classes
const colorMap = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
}

function getTrendIcon(trend: 'positive' | 'negative' | 'neutral') {
  switch (trend) {
    case 'positive':
      return <TrendingUp className="h-3 w-3 text-success" />
    case 'negative':
      return <TrendingDown className="h-3 w-3 text-destructive" />
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />
  }
}

export function StatsGrid({ 
  items = [], 
  columns = 4, 
  className 
}: StatsGridProps) {
  const gridClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3', 
    4: 'md:grid-cols-2 lg:grid-cols-4'
  }[columns]

  // Handle undefined or null items
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className={cn(`grid gap-4 ${gridClass}`, className)}>
      {items.map((stat, index) => {
        const iconColor = stat.color 
          ? (colorMap[stat.color as keyof typeof colorMap] || stat.color)
          : 'text-muted-foreground'
          
        return (
          <Card key={index} className="transition-colors hover:bg-muted/50 dark:hover:bg-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={cn('h-4 w-4', iconColor)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              )}
              {stat.change && (
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(stat.change.trend)}
                  <span className={cn(
                    "text-xs font-medium",
                    stat.change.trend === 'positive' ? 'text-success' :
                    stat.change.trend === 'negative' ? 'text-destructive' :
                    'text-muted-foreground'
                  )}>
                    {stat.change.value > 0 && '+'}{stat.change.value}%
                  </span>
                </div>
              )}
              {stat.description && (
                <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Legacy support for old prop name
interface LegacyStatsGridProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
  className?: string
}

export function LegacyStatsGrid({ stats, ...props }: LegacyStatsGridProps) {
  return <StatsGrid items={stats} {...props} />
}