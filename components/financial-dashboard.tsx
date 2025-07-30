"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  Receipt, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  CreditCard,
  FileText,
  Calendar,
  Filter
} from 'lucide-react'
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
import { ReceiptUpload } from './receipt-upload'
import { ExpenseList } from './expense-list'
import { BudgetTracker } from './budget-tracker'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface FinancialMetrics {
  totalExpenses: number
  totalBudget: number
  pendingApprovals: number
  monthlySpend: number
  budgetUtilization: number
  expensesByCategory: { category: string; amount: number; color: string }[]
  monthlyTrends: { month: string; expenses: number; budget: number }[]
  topExpenses: { id: string; description: string; amount: number; category: string; date: string }[]
  recentReceipts: { id: string; filename: string; status: string; amount: number; processedAt: string }[]
}

interface FinancialDashboardProps {
  className?: string
}

export function FinancialDashboard({ className }: FinancialDashboardProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('current-month')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFinancialMetrics()
  }, [dateRange])

  const loadFinancialMetrics = async () => {
    try {
      setLoading(true)
      
      // Use the API client to get financial reports
      const response = await apiClient.getFinancialReports({ period: dateRange })
      
      // Transform the response to match the expected FinancialMetrics interface
      const data: FinancialMetrics = {
        totalExpenses: response.totalExpenses || 0,
        totalBudget: response.totalBudget || 0,
        pendingApprovals: response.pendingApprovals || 0,
        monthlySpend: response.monthlySpend || 0,
        budgetUtilization: response.budgetUtilization || 0,
        expensesByCategory: response.expensesByCategory || [],
        monthlyTrends: response.monthlyTrends || [],
        topExpenses: response.topExpenses || [],
        recentReceipts: response.recentReceipts || []
      }
      
      setMetrics(data)
      setError(null)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load financial data'
      setError(errorMessage)
      console.error('Error loading financial metrics:', err)
      
      // Handle authentication errors
      if (err?.message?.includes('401') || err?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getBudgetStatus = (utilization: number) => {
    if (utilization >= 90) return { color: 'destructive', icon: AlertTriangle, text: 'Over Budget' }
    if (utilization >= 75) return { color: 'warning', icon: Clock, text: 'Near Limit' }
    return { color: 'success', icon: CheckCircle, text: 'On Track' }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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

  if (!metrics) return null

  const budgetStatus = getBudgetStatus(metrics.budgetUtilization)
  const StatusIcon = budgetStatus.icon

  return (
    <div className={className}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Management</h1>
          <p className="text-muted-foreground">
            Track expenses, manage budgets, and analyze financial performance
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="current-month">Current Month</option>
            <option value="last-month">Last Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button onClick={loadFinancialMetrics} variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              vs {formatCurrency(metrics.totalBudget)} budgeted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <StatusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.budgetUtilization.toFixed(1)}%</div>
            <Progress value={metrics.budgetUtilization} className="mt-2" />
            <Badge variant={budgetStatus.color as any} className="mt-2 text-xs">
              {budgetStatus.text}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlySpend)}</div>
            <p className="text-xs text-muted-foreground">
              Current month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Categories Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={metrics.expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {metrics.expensesByCategory.map((entry, index) => (
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
                  Monthly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis formatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Actual Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Budget"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Top Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.topExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category} • {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Recent Receipts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.recentReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{receipt.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(receipt.processedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        receipt.status === 'completed' ? 'default' : 
                        receipt.status === 'processing' ? 'secondary' : 'destructive'
                      }>
                        {receipt.status}
                      </Badge>
                      {receipt.amount > 0 && (
                        <span className="font-semibold">{formatCurrency(receipt.amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseList />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetTracker />
        </TabsContent>

        <TabsContent value="receipts">
          <ReceiptUpload />
        </TabsContent>
      </Tabs>
    </div>
  )
}