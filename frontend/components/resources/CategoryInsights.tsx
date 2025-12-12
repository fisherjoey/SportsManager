'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Eye, 
  Users, 
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Clock,
  Target,
  Zap
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

interface CategoryInsightsProps {
  categoryId: string
  categoryName: string
  className?: string
}

interface InsightData {
  downloads: Array<{ name: string; value: number; change: number }>
  views: Array<{ name: string; value: number; change: number }>
  usage: Array<{ date: string; downloads: number; views: number; uploads: number }>
  resourceTypes: Array<{ type: string; count: number; percentage: number }>
  topResources: Array<{ 
    id: string
    name: string
    downloads: number
    views: number
    uploadedAt: string
    type: string
  }>
  userActivity: Array<{
    date: string
    activeUsers: number
    newUsers: number
    returningUsers: number
  }>
  permissions: Array<{ permission: string; users: number; percentage: number }>
  timeDistribution: Array<{ hour: number; activity: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

const chartConfig = {
  downloads: {
    label: 'Downloads',
    color: '#2563eb'
  },
  views: {
    label: 'Views', 
    color: '#60a5fa'
  },
  uploads: {
    label: 'Uploads',
    color: '#34d399'
  },
  activeUsers: {
    label: 'Active Users',
    color: '#f59e0b'
  },
  newUsers: {
    label: 'New Users',
    color: '#10b981'
  },
  returningUsers: {
    label: 'Returning Users',
    color: '#8b5cf6'
  }
}

export function CategoryInsights({ categoryId, categoryName, className }: CategoryInsightsProps) {
  const [data, setData] = useState<InsightData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true)
      // Simulate API call
      setTimeout(() => {
        setData({
          downloads: [
            { name: 'This Week', value: 147, change: 12 },
            { name: 'Last Week', value: 131, change: -5 },
            { name: 'This Month', value: 592, change: 18 },
            { name: 'Last Month', value: 501, change: 25 }
          ],
          views: [
            { name: 'This Week', value: 1248, change: 8 },
            { name: 'Last Week', value: 1156, change: 15 },
            { name: 'This Month', value: 4821, change: 22 },
            { name: 'Last Month', value: 3952, change: 12 }
          ],
          usage: Array.from({ length: 30 }, (_, i) => ({
            date: `Day ${i + 1}`,
            downloads: Math.floor(Math.random() * 50) + 20,
            views: Math.floor(Math.random() * 150) + 50,
            uploads: Math.floor(Math.random() * 10) + 2
          })),
          resourceTypes: [
            { type: 'Documents', count: 28, percentage: 59.6 },
            { type: 'Videos', count: 12, percentage: 25.5 },
            { type: 'Images', count: 5, percentage: 10.6 },
            { type: 'Links', count: 2, percentage: 4.3 }
          ],
          topResources: [
            {
              id: '1',
              name: 'Training Manual 2024.pdf',
              downloads: 145,
              views: 320,
              uploadedAt: '2024-08-20',
              type: 'document'
            },
            {
              id: '2',
              name: 'Equipment Checklist',
              downloads: 203,
              views: 412,
              uploadedAt: '2024-08-15',
              type: 'document'
            },
            {
              id: '3',
              name: 'Safety Guidelines Video',
              downloads: 89,
              views: 256,
              uploadedAt: '2024-08-18',
              type: 'video'
            },
            {
              id: '4',
              name: 'Quick Reference Guide',
              downloads: 178,
              views: 298,
              uploadedAt: '2024-08-12',
              type: 'document'
            },
            {
              id: '5',
              name: 'Team Photos 2024',
              downloads: 67,
              views: 189,
              uploadedAt: '2024-08-10',
              type: 'image'
            }
          ],
          userActivity: Array.from({ length: 30 }, (_, i) => ({
            date: `Day ${i + 1}`,
            activeUsers: Math.floor(Math.random() * 25) + 10,
            newUsers: Math.floor(Math.random() * 5) + 1,
            returningUsers: Math.floor(Math.random() * 20) + 8
          })),
          permissions: [
            { permission: 'Read', users: 156, percentage: 100 },
            { permission: 'Download', users: 134, percentage: 85.9 },
            { permission: 'Upload', users: 23, percentage: 14.7 },
            { permission: 'Manage', users: 8, percentage: 5.1 }
          ],
          timeDistribution: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            activity: Math.floor(Math.random() * 100) + (i >= 8 && i <= 17 ? 50 : 10)
          }))
        })
        setIsLoading(false)
      }, 1000)
    }

    loadInsights()
  }, [categoryId, timeRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false)
    }, 2000)
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-emerald-600" />
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-emerald-600'
    if (change < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 mt-6">
            <div className="h-80 bg-muted rounded-lg"></div>
            <div className="h-80 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Category Insights</h2>
          <p className="text-muted-foreground">
            Analytics and usage patterns for {categoryName}
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={refreshing}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads This Month</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.downloads[2]?.value.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {getTrendIcon(data.downloads[2]?.change)}
              <span className={cn('ml-1', getTrendColor(data.downloads[2]?.change))}>
                {Math.abs(data.downloads[2]?.change)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views This Month</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.views[2]?.value.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {getTrendIcon(data.views[2]?.change)}
              <span className={cn('ml-1', getTrendColor(data.views[2]?.change))}>
                {Math.abs(data.views[2]?.change)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.resourceTypes.reduce((sum, type) => sum + type.count, 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="mr-1 h-3 w-3" />
              Across {data.resourceTypes.length} types
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.permissions.find(p => p.permission === 'Read')?.users || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Activity className="mr-1 h-3 w-3" />
              With access permissions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4">
          <TabsTrigger value="usage" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Usage Trends
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Resource Analytics
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            User Behavior
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Time Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage Over Time</CardTitle>
                <CardDescription>Downloads, views, and uploads trend</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <AreaChart data={data.usage.slice(-15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stackId="1" 
                      stroke={chartConfig.views.color}
                      fill={chartConfig.views.color}
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="downloads" 
                      stackId="1" 
                      stroke={chartConfig.downloads.color}
                      fill={chartConfig.downloads.color}
                      fillOpacity={0.8}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="uploads" 
                      stackId="1" 
                      stroke={chartConfig.uploads.color}
                      fill={chartConfig.uploads.color}
                      fillOpacity={0.9}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Distribution</CardTitle>
                <CardDescription>Types of resources in the category</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <PieChart>
                    <Pie
                      data={data.resourceTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {data.resourceTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between space-x-8">
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="h-2.5 w-2.5 rounded-full" 
                                      style={{ backgroundColor: payload[0].color }}
                                    />
                                    <span className="text-sm font-medium">{data.type}</span>
                                  </div>
                                </div>
                                <div className="grid gap-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span>Count:</span>
                                    <span className="font-mono">{data.count}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Percentage:</span>
                                    <span className="font-mono">{data.percentage}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performing Resources</CardTitle>
                <CardDescription>Most downloaded and viewed resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.topResources.map((resource, index) => (
                    <div key={resource.id} className="flex items-center space-x-4 rounded-lg border p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">{resource.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Download className="mr-1 h-3 w-3" />
                            {resource.downloads} downloads
                          </span>
                          <span className="flex items-center">
                            <Eye className="mr-1 h-3 w-3" />
                            {resource.views} views
                          </span>
                          <span>Uploaded {resource.uploadedAt}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(resource.downloads / resource.views * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          conversion rate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Trend</CardTitle>
                <CardDescription>Active, new, and returning users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <LineChart data={data.userActivity.slice(-15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke={chartConfig.activeUsers.color}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="newUsers" 
                      stroke={chartConfig.newUsers.color}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="returningUsers" 
                      stroke={chartConfig.returningUsers.color}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permission Distribution</CardTitle>
                <CardDescription>Users by permission level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.permissions.map((permission) => (
                    <div key={permission.permission} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{permission.permission}</span>
                        <span className="text-muted-foreground">
                          {permission.users} users ({permission.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div 
                          className="h-2 rounded-full bg-primary" 
                          style={{ width: `${permission.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity by Time of Day</CardTitle>
              <CardDescription>When users are most active in accessing resources</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80">
                <BarChart data={data.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="font-medium">
                                {data.hour}:00 - {data.hour + 1}:00
                              </div>
                              <div className="text-sm">
                                Activity: {data.activity}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="activity" 
                    fill={chartConfig.activeUsers.color}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CategoryInsights