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

// Map semantic colors to theme classes and backgrounds
const colorMap = {
  primary: { text: 'text-primary', bg: 'bg-primary/10' },
  success: { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  warning: { text: 'text-amber-500', bg: 'bg-amber-500/10' },
  destructive: { text: 'text-red-500', bg: 'bg-red-500/10' },
  info: { text: 'text-info', bg: 'bg-info/10' }
}

function getTrendIcon(trend: 'positive' | 'negative' | 'neutral') {
  switch (trend) {
  case 'positive':
    return <TrendingUp className="h-4 w-4 text-emerald-500" />
  case 'negative':
    return <TrendingDown className="h-4 w-4 text-red-500" />
  default:
    return <Minus className="h-4 w-4 text-muted-foreground" />
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
        const colorConfig = stat.color
          ? (colorMap[stat.color as keyof typeof colorMap] || { text: stat.color, bg: 'bg-muted/50' })
          : { text: 'text-muted-foreground', bg: 'bg-muted/50' }

        return (
          <Card key={index} variant="interactive" className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={cn('rounded-lg p-2.5', colorConfig.bg)}>
                <stat.icon className={cn('h-5 w-5', colorConfig.text)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              )}
              {stat.change && (
                <div className="flex items-center gap-1.5 mt-3">
                  {getTrendIcon(stat.change.trend)}
                  <span className={cn(
                    'text-sm font-semibold',
                    stat.change.trend === 'positive' ? 'text-emerald-500' :
                      stat.change.trend === 'negative' ? 'text-red-500' :
                        'text-muted-foreground'
                  )}>
                    {stat.change.value > 0 && '+'}{stat.change.value}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              )}
              {stat.description && (
                <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
              )}
              {/* Decorative gradient bar at bottom */}
              <div className={cn(
                'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r',
                stat.color === 'primary' && 'from-primary/50 to-primary',
                stat.color === 'success' && 'from-emerald-500/50 to-emerald-500',
                stat.color === 'warning' && 'from-amber-500/50 to-amber-500',
                stat.color === 'destructive' && 'from-red-500/50 to-red-500',
                !stat.color && 'from-muted to-muted-foreground/20'
              )} />
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