'use client'

import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  User,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsGrid } from '@/components/ui/stats-grid'
import { AuditLogStats, ACTION_CONFIG } from '@/lib/types/audit'

interface AuditLogStatsProps {
  stats: AuditLogStats
  isLoading?: boolean
  className?: string
  showDetailed?: boolean
}

export function AuditLogStatsComponent({
  stats,
  isLoading = false,
  className = '',
  showDetailed = true
}: AuditLogStatsProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const successRate = Math.round(stats.success_rate * 100)
  const errorRate = Math.round(stats.error_rate * 100)

  const getTopActions = () => {
    return Object.entries(stats.actions_by_type)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({
        action,
        count,
        config: ACTION_CONFIG[action as keyof typeof ACTION_CONFIG]
      }))
  }

  const getTopResourceTypes = () => {
    return Object.entries(stats.resource_types)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))
  }

  const getActivityTrend = () => {
    if (!stats.recent_activity || stats.recent_activity.length === 0) return null
    
    const latest = stats.recent_activity[stats.recent_activity.length - 1]?.count || 0
    const previous = stats.recent_activity[stats.recent_activity.length - 2]?.count || 0
    const change = latest - previous
    const percentChange = previous > 0 ? Math.round((change / previous) * 100) : 0
    
    return {
      change,
      percentChange,
      isIncreasing: change > 0
    }
  }

  const renderOverviewStats = () => {
    const trend = getActivityTrend()
    
    const overviewStats = [
      {
        title: 'Total Entries',
        value: stats.total_entries.toLocaleString(),
        description: 'All audit log entries',
        icon: Activity,
        color: 'text-blue-600'
      },
      {
        title: 'Success Rate',
        value: `${successRate}%`,
        description: `${stats.total_entries - Math.round(stats.total_entries * stats.error_rate)} successful actions`,
        icon: CheckCircle,
        color: successRate > 90 ? 'text-green-600' : successRate > 70 ? 'text-yellow-600' : 'text-red-600',
        badge: successRate > 95 ? 'Excellent' : successRate > 85 ? 'Good' : successRate > 70 ? 'Fair' : 'Poor'
      },
      {
        title: 'Error Rate',
        value: `${errorRate}%`,
        description: `${Math.round(stats.total_entries * stats.error_rate)} failed actions`,
        icon: AlertTriangle,
        color: errorRate < 5 ? 'text-green-600' : errorRate < 15 ? 'text-yellow-600' : 'text-red-600',
        badge: errorRate < 2 ? 'Low' : errorRate < 10 ? 'Medium' : 'High'
      },
      {
        title: 'Recent Activity',
        value: trend ? `${trend.change > 0 ? '+' : ''}${trend.change}` : 'N/A',
        description: trend ? `${trend.percentChange}% vs previous hour` : 'No trend data',
        icon: trend?.isIncreasing ? TrendingUp : TrendingDown,
        color: trend?.isIncreasing ? 'text-green-600' : 'text-red-600'
      }
    ]

    return <StatsGrid items={overviewStats} />
  }

  const renderActionStats = () => {
    const topActions = getTopActions()
    const totalActions = Object.values(stats.actions_by_type).reduce((sum, count) => sum + count, 0)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Action Breakdown</h3>
          <Badge variant="secondary">{totalActions} total actions</Badge>
        </div>
        
        <div className="space-y-3">
          {topActions.map(({ action, count, config }) => {
            const percentage = totalActions > 0 ? (count / totalActions) * 100 : 0
            const ActionIcon = (() => {
              try {
                return require('lucide-react')[config?.icon] || Activity
              } catch {
                return Activity
              }
            })()
            
            return (
              <div key={action} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-md ${config?.color || 'text-gray-600 bg-gray-50'}`}>
                    <ActionIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {config?.label || action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5 mt-1" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderUserStats = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Most Active Users</h3>
        <Badge variant="secondary">{stats.top_users.length} users shown</Badge>
      </div>
      
      <div className="space-y-3">
        {stats.top_users.slice(0, 5).map((user, index) => (
          <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">
                  #{index + 1}
                </span>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {user.user_name ? user.user_name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.user_name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.user_email}</div>
              </div>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {user.count} actions
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )

  const renderResourceStats = () => {
    const topTypes = getTopResourceTypes()
    const totalResources = Object.values(stats.resource_types).reduce((sum, count) => sum + count, 0)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Resource Types</h3>
          <Badge variant="secondary">{totalResources} total resources</Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topTypes.map(({ type, count }) => {
            const percentage = totalResources > 0 ? (count / totalResources) * 100 : 0
            
            return (
              <Card key={type} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">
                    {type.replace(/[_-]/g, ' ')}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
                <Progress value={percentage} className="h-1.5" />
                <div className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% of all resources
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const renderActivityChart = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <Badge variant="secondary">Last 24 hours</Badge>
      </div>
      
      <div className="space-y-2">
        {stats.recent_activity.slice(-12).map((activity, index) => {
          const maxCount = Math.max(...stats.recent_activity.map(a => a.count))
          const percentage = maxCount > 0 ? (activity.count / maxCount) * 100 : 0
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground w-16 flex-shrink-0">
                {activity.hour}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{activity.count} actions</span>
                  <span className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (!showDetailed) {
    return (
      <div className={className}>
        {renderOverviewStats()}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {renderOverviewStats()}
      
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="resources" className="text-xs">Resources</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="actions" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {renderActionStats()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {renderUserStats()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {renderResourceStats()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {renderActivityChart()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Compact version for dashboards
export function AuditLogStatsCompact({
  stats,
  isLoading = false,
  className = ''
}: Pick<AuditLogStatsProps, 'stats' | 'isLoading' | 'className'>) {
  return (
    <AuditLogStatsComponent
      stats={stats}
      isLoading={isLoading}
      className={className}
      showDetailed={false}
    />
  )
}

// Default export for easier importing
export default AuditLogStatsComponent