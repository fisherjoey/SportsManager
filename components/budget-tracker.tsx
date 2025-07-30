"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Plus,
  Edit3,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface Budget {
  id: string
  name: string
  description?: string
  category: {
    id: string
    name: string
    code: string
    color: string
  }
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  allocatedAmount: number
  spentAmount: number
  committedAmount: number
  remainingAmount: number
  utilizationPercent: number
  status: 'active' | 'exceeded' | 'completed' | 'draft'
  owner: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
  monthlyAllocations: Array<{
    month: string
    allocated: number
    spent: number
    remaining: number
  }>
  topExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
  }>
  forecastData: Array<{
    month: string
    projected: number
    trend: 'up' | 'down' | 'stable'
  }>
}

interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  averageUtilization: number
  budgetsOverLimit: number
  budgetsNearLimit: number
  monthlyTrends: Array<{
    month: string
    budgeted: number
    spent: number
    variance: number
  }>
  categoryBreakdown: Array<{
    category: string
    allocated: number
    spent: number
    utilization: number
    color: string
  }>
}

export function BudgetTracker() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBudgetData()
  }, [selectedPeriod])

  const loadBudgetData = async () => {
    try {
      setLoading(true)
      const [budgetsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/budgets?period=${selectedPeriod}`),
        fetch(`/api/budgets/summary?period=${selectedPeriod}`)
      ])

      if (!budgetsResponse.ok || !summaryResponse.ok) {
        throw new Error('Failed to load budget data')
      }

      const budgetsData = await budgetsResponse.json()
      const summaryData = await summaryResponse.json()

      setBudgets(budgetsData)
      setSummary(summaryData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data')
      console.error('Error loading budget data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getBudgetStatus = (utilization: number, status: string) => {
    if (status === 'exceeded' || utilization >= 100) {
      return { color: 'destructive', icon: AlertTriangle, text: 'Over Budget', bgColor: 'bg-red-50 border-red-200' }
    }
    if (utilization >= 90) {
      return { color: 'warning', icon: Clock, text: 'Near Limit', bgColor: 'bg-yellow-50 border-yellow-200' }
    }
    if (utilization >= 75) {
      return { color: 'secondary', icon: Clock, text: 'On Track', bgColor: 'bg-blue-50 border-blue-200' }
    }
    return { color: 'default', icon: CheckCircle, text: 'Under Budget', bgColor: 'bg-green-50 border-green-200' }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />
      default: return <div className="h-4 w-4" />
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

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

  if (!summary) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-muted-foreground">
            Track budget performance and spending across categories
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="last">Last Period</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.totalSpent)} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRemaining)}</div>
            <Progress value={(summary.totalSpent / summary.totalBudget) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.budgetsOverLimit}</div>
            <p className="text-xs text-muted-foreground">
              {summary.budgetsNearLimit} near limit
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Budget by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={summary.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, utilization }) => `${category} ${utilization.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="allocated"
                    >
                      {summary.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Budget vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis formatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                    <Bar dataKey="spent" fill="#82ca9d" name="Actual Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>
                Budget utilization across different expense categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.categoryBreakdown.map((category, index) => {
                  const utilization = (category.spent / category.allocated) * 100
                  const status = getBudgetStatus(utilization, utilization >= 100 ? 'exceeded' : 'active')
                  const StatusIcon = status.icon

                  return (
                    <div key={index} className={`p-4 rounded-lg border ${status.bgColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <h4 className="font-semibold">{category.category}</h4>
                          <Badge variant={status.color as any} className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(category.spent)}</p>
                          <p className="text-sm text-muted-foreground">
                            of {formatCurrency(category.allocated)}
                          </p>
                        </div>
                      </div>
                      <Progress value={utilization} className="mb-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{utilization.toFixed(1)}% utilized</span>
                        <span>{formatCurrency(category.allocated - category.spent)} remaining</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <div className="grid gap-6">
            {budgets.map((budget) => {
              const status = getBudgetStatus(budget.utilizationPercent, budget.status)
              const StatusIcon = status.icon

              return (
                <Card key={budget.id} className={status.bgColor}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{budget.name}</h3>
                          <Badge variant={status.color as any} className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{budget.description}</p>
                          <p>Period: {budget.period.name}</p>
                          <p>Owner: {budget.owner.name}</p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Budget
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Allocated</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.allocatedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spent</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.spentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Committed</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.committedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(budget.remainingAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Budget Utilization</span>
                        <span>{budget.utilizationPercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={budget.utilizationPercent} />
                    </div>

                    {/* Monthly breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <div>
                        <h4 className="font-medium mb-3">Monthly Allocations</h4>
                        <div className="space-y-2">
                          {budget.monthlyAllocations.slice(0, 3).map((month, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{month.month}</span>
                              <div className="text-right">
                                <div>{formatCurrency(month.spent)} / {formatCurrency(month.allocated)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(month.remaining)} remaining
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Top Expenses</h4>
                        <div className="space-y-2">
                          {budget.topExpenses.slice(0, 3).map((expense, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <div>
                                <div className="font-medium">{expense.description}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(expense.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Budget Forecast
                </CardTitle>
                <CardDescription>
                  Projected spending based on current trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={budgets[0]?.forecastData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis formatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Projected Spend"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Variance Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Variance Analysis</CardTitle>
                <CardDescription>
                  Budget vs actual spending variance by month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis formatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar 
                      dataKey="variance" 
                      fill="#FF8042" 
                      name="Variance"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Budget Health Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Health Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {budgets.filter(b => b.utilizationPercent < 75).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Budgets Under 75%</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {budgets.filter(b => b.utilizationPercent >= 75 && b.utilizationPercent < 90).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Budgets 75-90%</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {budgets.filter(b => b.utilizationPercent >= 90).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Budgets Over 90%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}