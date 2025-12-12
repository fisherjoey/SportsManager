'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Brain,
  Target,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { chartColorArray } from '@/lib/theme-colors'

interface AnalyticsMetrics {
  organizationalHealth: {
    score: number
    trend: 'up' | 'down' | 'stable'
    factors: Array<{
      name: string
      score: number
      weight: number
      trend: 'up' | 'down' | 'stable'
    }>
  }
  financialInsights: {
    totalRevenue: number
    totalExpenses: number
    profitMargin: number
    burnRate: number
    forecastAccuracy: number
    trends: Array<{
      month: string
      revenue: number
      expenses: number
      profit: number
      forecast: number
    }>
  }
  employeeAnalytics: {
    productivity: number
    satisfaction: number
    retention: number
    performanceDistribution: Array<{
      rating: string
      count: number
      percentage: number
    }>
    departmentMetrics: Array<{
      department: string
      productivity: number
      satisfaction: number
      headcount: number
    }>
  }
  operationalMetrics: {
    efficiency: number
    qualityScore: number
    complianceScore: number
    assetUtilization: number
    processMetrics: Array<{
      process: string
      efficiency: number
      volume: number
      errors: number
    }>
  }
  aiInsights: Array<{
    id: string
    type: 'opportunity' | 'risk' | 'recommendation' | 'alert'
    title: string
    description: string
    confidence: number
    impact: 'high' | 'medium' | 'low'
    category: string
    actionable: boolean
    generatedAt: string
  }>
  predictiveAnalytics: {
    employeeTurnover: Array<{
      month: string
      predicted: number
      actual?: number
      confidence: number
    }>
    budgetForecasting: Array<{
      category: string
      currentSpend: number
      predictedSpend: number
      variance: number
    }>
    riskAssessment: Array<{
      area: string
      riskLevel: number
      probability: number
      impact: number
    }>
  }
}

interface AnalyticsDashboardProps {
  className?: string
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('6months')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Use the API client to get organizational analytics
      const response = await apiClient.getOrganizationalAnalytics({ timeRange })
      
      // The response should already match the AnalyticsMetrics interface
      setMetrics(response)
      setError(null)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load analytics data'
      setError(errorMessage)
      console.error('Error loading analytics data:', err)
      
      // Handle authentication errors
      if (err?.message?.includes('401') || err?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshAnalytics = async () => {
    try {
      setRefreshing(true)
      await loadAnalyticsData()
      toast({
        title: 'Analytics Refreshed',
        description: 'Latest data has been loaded successfully'
      })
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh analytics data',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
    case 'up': return <TrendingUp className="h-4 w-4 text-success" />
    case 'down': return <TrendingDown className="h-4 w-4 text-destructive" />
    default: return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getInsightBadge = (type: string) => {
    const variants = {
      opportunity: { variant: 'default', icon: Target, text: 'Opportunity', color: 'bg-success/10 text-success dark:bg-success/20' },
      risk: { variant: 'destructive', icon: AlertTriangle, text: 'Risk', color: 'bg-destructive/10 text-destructive dark:bg-destructive/20' },
      recommendation: { variant: 'secondary', icon: Brain, text: 'Recommendation', color: 'bg-info/10 text-info dark:bg-info/20' },
      alert: { variant: 'secondary', icon: Zap, text: 'Alert', color: 'bg-warning/10 text-warning dark:bg-warning/20' }
    }

    const config = variants[type as keyof typeof variants] || variants.recommendation
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getImpactBadge = (impact: string) => {
    const variants = {
      high: { variant: 'destructive', text: 'High Impact' },
      medium: { variant: 'secondary', text: 'Medium Impact' },
      low: { variant: 'outline', text: 'Low Impact' }
    }

    const config = variants[impact as keyof typeof variants] || variants.medium
    return (
      <Badge variant={config.variant as any}>
        {config.text}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const COLORS = chartColorArray

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) return null

  return (
    <div className={className}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights, forecasting, and organizational health metrics
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="2years">Last 2 Years</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshAnalytics} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizational Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics.organizationalHealth.score}%</div>
              {getTrendIcon(metrics.organizationalHealth.trend)}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall organizational performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.financialInsights.profitMargin}%</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.financialInsights.totalRevenue - metrics.financialInsights.totalExpenses)} profit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employee Satisfaction</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.employeeAnalytics.satisfaction}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.employeeAnalytics.retention}% retention rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational Efficiency</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.operationalMetrics.efficiency}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.operationalMetrics.assetUtilization}% asset utilization
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="workforce">Workforce</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Organizational Health Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Organizational Health Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={metrics.organizationalHealth.factors}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Financial Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.financialInsights.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis formatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1"
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      name="Revenue"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stackId="2"
                      stroke="#ff7c7c" 
                      fill="#ff7c7c"
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      name="Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Department Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.employeeAnalytics.departmentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="productivity" fill="#8884d8" name="Productivity %" />
                  <Bar dataKey="satisfaction" fill="#82ca9d" name="Satisfaction %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Latest AI Insights
              </CardTitle>
              <CardDescription>
                AI-generated recommendations and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.aiInsights.slice(0, 5).map((insight) => (
                  <div key={insight.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getInsightBadge(insight.type)}
                        {getImpactBadge(insight.impact)}
                        <Badge variant="outline">{Math.round(insight.confidence * 100)}% confidence</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(insight.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-semibold mb-2">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {insight.category}
                      </Badge>
                      {insight.actionable && (
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.financialInsights.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis formatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ff7c7c" 
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forecast" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Budget Forecasting */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Forecasting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.predictiveAnalytics.budgetForecasting.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-sm text-muted-foreground">
                          Current: {formatCurrency(item.currentSpend)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.predictedSpend)}</p>
                        <p className={`text-sm ${item.variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workforce" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={metrics.employeeAnalytics.performanceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ rating, percentage }) => `${rating}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.employeeAnalytics.performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Turnover Prediction */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Turnover Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.predictiveAnalytics.employeeTurnover}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#ff7c7c" 
                      fill="#ff7c7c"
                      fillOpacity={0.6}
                      name="Predicted Turnover"
                    />
                    {metrics.predictiveAnalytics.employeeTurnover.some(d => d.actual !== undefined) && (
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Actual Turnover"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Process Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle>Process Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.operationalMetrics.processMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="process" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="efficiency" 
                      fill="#8884d8" 
                      name="Efficiency %"
                    />
                    <Bar 
                      dataKey="errors" 
                      fill="#ff7c7c" 
                      name="Error Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={metrics.predictiveAnalytics.riskAssessment}>
                    <CartesianGrid />
                    <XAxis 
                      type="number" 
                      dataKey="probability" 
                      name="Probability"
                      domain={[0, 100]}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="impact" 
                      name="Impact"
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-3 border rounded shadow">
                              <p className="font-semibold">{data.area}</p>
                              <p>Probability: {data.probability}%</p>
                              <p>Impact: {data.impact}%</p>
                              <p>Risk Level: {data.riskLevel}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter 
                      name="Risk Areas" 
                      dataKey="riskLevel" 
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-4">
            {metrics.aiInsights.map((insight) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getInsightBadge(insight.type)}
                      {getImpactBadge(insight.impact)}
                      <Badge variant="outline">{Math.round(insight.confidence * 100)}% confidence</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(insight.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                  <p className="text-muted-foreground mb-4">{insight.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {insight.category}
                      </Badge>
                    </div>
                    
                    {insight.actionable && (
                      <Button variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Take Action
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}