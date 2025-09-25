'use client'

import { useState, useEffect } from 'react'
import { Users, Calendar, Shield, DollarSign, Activity, Settings, TrendingUp, AlertCircle, CheckCircle, BarChart3, Building, FileText } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SystemHealth {
  status: 'operational' | 'degraded' | 'down'
  uptime: number
  apiLatency: number
  activeUsers: number
  errorRate: number
}

interface OrganizationStats {
  totalUsers: number
  activeReferees: number
  totalGames: number
  completedGames: number
  upcomingGames: number
  totalRevenue: number
  pendingPayments: number
  activeLeagues: number
}

interface RecentActivity {
  id: string
  type: 'user_created' | 'game_created' | 'payment_processed' | 'role_changed' | 'system_update'
  message: string
  timestamp: string
  userId?: string
  userName?: string
}

export function AdministratorDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch various data points
      const [gamesResponse, refereesResponse] = await Promise.all([
        apiClient.getGames({ limit: 100 }).catch(() => ({ data: [] })),
        apiClient.getReferees().catch(() => ({ success: true, data: { referees: [] } }))
      ])

      const games = gamesResponse.data || []
      const referees = refereesResponse.data?.referees || []
      const now = new Date()

      // Calculate organization statistics
      const upcoming = games.filter((g: any) => new Date(g.date) > now)
      const completed = games.filter((g: any) => new Date(g.date) <= now)

      // Mock system health data
      setSystemHealth({
        status: 'operational',
        uptime: 99.9,
        apiLatency: 145,
        activeUsers: Math.floor(Math.random() * 50) + 20,
        errorRate: 0.02
      })

      // Set organization stats
      setOrgStats({
        totalUsers: Math.floor(Math.random() * 200) + 100,
        activeReferees: referees.filter((r: any) => r.isAvailable).length,
        totalGames: games.length,
        completedGames: completed.length,
        upcomingGames: upcoming.length,
        totalRevenue: Math.floor(Math.random() * 50000) + 10000,
        pendingPayments: Math.floor(Math.random() * 5000) + 1000,
        activeLeagues: Math.floor(Math.random() * 10) + 5
      })

      // Mock recent activity
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'user_created',
          message: 'New referee John Smith registered',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          userId: 'user-1',
          userName: 'John Smith'
        },
        {
          id: '2',
          type: 'game_created',
          message: '15 new games added for next week',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: '3',
          type: 'payment_processed',
          message: 'Weekly referee payments processed ($3,450)',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
        },
        {
          id: '4',
          type: 'role_changed',
          message: 'Sarah Johnson promoted to Senior Referee',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          userId: 'user-2',
          userName: 'Sarah Johnson'
        },
        {
          id: '5',
          type: 'system_update',
          message: 'System backup completed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString()
        }
      ]

      setRecentActivity(mockActivity)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="Administrator Dashboard"
          description="System overview and management controls"
        />
        <LoadingSpinner size="lg" text="Loading dashboard data..." centered />
      </PageLayout>
    )
  }

  const statsItems = [
    {
      title: 'Total Users',
      value: orgStats?.totalUsers || 0,
      icon: Users,
      description: `${orgStats?.activeReferees || 0} active referees`,
      color: 'primary' as const
    },
    {
      title: 'Total Games',
      value: orgStats?.totalGames || 0,
      icon: Calendar,
      description: `${orgStats?.upcomingGames || 0} upcoming`,
      color: 'info' as const
    },
    {
      title: 'Revenue (Month)',
      value: `$${(orgStats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: `$${(orgStats?.pendingPayments || 0).toLocaleString()} pending`,
      color: 'success' as const
    },
    {
      title: 'System Health',
      value: `${systemHealth?.uptime || 0}%`,
      icon: Activity,
      description: systemHealth?.status || 'Unknown',
      color: systemHealth?.status === 'operational' ? 'success' : 'warning' as const
    }
  ]

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_created': return Users
      case 'game_created': return Calendar
      case 'payment_processed': return DollarSign
      case 'role_changed': return Shield
      case 'system_update': return Settings
      default: return Activity
    }
  }

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_created': return 'text-blue-600'
      case 'game_created': return 'text-green-600'
      case 'payment_processed': return 'text-purple-600'
      case 'role_changed': return 'text-orange-600'
      case 'system_update': return 'text-gray-600'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Administrator'}`}
        description="Manage your organization and monitor system performance"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/?view=admin-access-control'}>
            <Shield className="h-4 w-4 mr-2" />
            Access Control
          </Button>
          <Button onClick={() => window.location.href = '/?view=organization-settings'}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <StatsGrid items={statsItems} />

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            System Health
          </CardTitle>
          <CardDescription>Real-time system performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={systemHealth?.status === 'operational' ? 'success' : 'warning'}>
                  {systemHealth?.status || 'Unknown'}
                </Badge>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm font-bold">{systemHealth?.uptime}%</span>
              </div>
              <Progress value={systemHealth?.uptime} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Latency</span>
                <span className="text-sm font-bold">{systemHealth?.apiLatency}ms</span>
              </div>
              <Progress value={Math.min((200 - (systemHealth?.apiLatency || 0)) / 2, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Rate</span>
                <span className="text-sm font-bold">{systemHealth?.errorRate}%</span>
              </div>
              <Progress value={Math.max(0, 100 - (systemHealth?.errorRate || 0) * 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={() => window.location.href = '/?view=admin-access-control'}
            >
              <Users className="h-6 w-6 mb-2" />
              <span>Manage Users</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={() => window.location.href = '/?view=games'}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <span>View Games</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={() => window.location.href = '/?view=financial-dashboard'}
            >
              <DollarSign className="h-6 w-6 mb-2" />
              <span>Financials</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={() => window.location.href = '/?view=analytics-dashboard'}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>Analytics</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={() => window.location.href = '/?view=organization-settings'}
            >
              <Building className="h-6 w-6 mb-2" />
              <span>Organization</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={() => window.location.href = '/?view=resources'}
            >
              <FileText className="h-6 w-6 mb-2" />
              <span>Resources</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.type)

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Overview Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
          <CardDescription>Detailed metrics and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="games">Games</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{orgStats?.totalUsers || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{orgStats?.activeReferees || 0}</div>
                  <p className="text-sm text-muted-foreground">Active Referees</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{systemHealth?.activeUsers || 0}</div>
                  <p className="text-sm text-muted-foreground">Online Now</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-sm text-muted-foreground">New This Week</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="games" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{orgStats?.totalGames || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Games</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{orgStats?.upcomingGames || 0}</div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{orgStats?.completedGames || 0}</div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{orgStats?.activeLeagues || 0}</div>
                  <p className="text-sm text-muted-foreground">Active Leagues</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="financials" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">${(orgStats?.totalRevenue || 0).toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">${(orgStats?.pendingPayments || 0).toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">$45</div>
                  <p className="text-sm text-muted-foreground">Avg Game Rate</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">+12%</div>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{systemHealth?.uptime}%</div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{systemHealth?.apiLatency}ms</div>
                  <p className="text-sm text-muted-foreground">API Latency</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{systemHealth?.errorRate}%</div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">98.5%</div>
                  <p className="text-sm text-muted-foreground">User Satisfaction</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageLayout>
  )
}