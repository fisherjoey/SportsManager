'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

import { PageAccessGuard } from '@/components/page-access-guard'
import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'


interface DashboardData {
  summary: {
    totalRevenue: number
    totalWages: number
    totalExpenses: number
    netIncome: number
    gameCount: number
  }
  refereeWages: {
    topReferees: Array<{
      id: string
      name: string
      email: string
      games_count: number
      total_wages: number
      avg_wage: number
    }>
    totalPaid: number
    totalPending: number
  }
  expenseCategories: Array<{
    id: string | null
    name: string
    description: string
    transaction_count: number
    total_amount: number
    avg_amount: number
  }>
  recentTransactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    status: string
    category: string
    submitted_by: string
    type: string
  }>
  revenueTrends: Array<{
    date: string
    revenue: number
    expenses: number
    wages: number
    netIncome: number
    gameCount: number
  }>
  budgetUtilization: {
    budgets: Array<{
      category: string
      allocated: number
      spent: number
      percentage: number
    }>
    totalAllocated: number
    totalSpent: number
    overallUtilization: number
  }
  pendingApprovals: {
    expenses: number
    assignments: number
    total: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

function FinancialDashboardPageContent() {
  const { isAuthenticated, token } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchDashboardData()
    }
  }, [isAuthenticated, token, period])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/financial-dashboard?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading financial data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Error Loading Dashboard</CardTitle>
            <CardDescription className="text-red-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Track revenue, expenses, and financial health</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {dashboardData.pendingApprovals.total > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
              <Badge variant="outline" className="bg-yellow-100">
                {dashboardData.pendingApprovals.total} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <span className="text-sm">
                <strong>{dashboardData.pendingApprovals.expenses}</strong> expense approvals
              </span>
              <span className="text-sm">
                <strong>{dashboardData.pendingApprovals.assignments}</strong> assignment approvals
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.summary.totalRevenue)}</div>
            <p className="text-xs text-gray-600 mt-1">{dashboardData.summary.gameCount} games</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Referee Wages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.summary.totalWages)}</div>
            <p className="text-xs text-gray-600 mt-1">
              {formatCurrency(dashboardData.refereeWages.totalPending)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.summary.totalExpenses)}</div>
            <p className="text-xs text-gray-600 mt-1">
              {dashboardData.expenseCategories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardData.summary.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(dashboardData.summary.netIncome)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {dashboardData.summary.netIncome >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.budgetUtilization.overallUtilization.toFixed(1)}%
            </div>
            <Progress 
              value={dashboardData.budgetUtilization.overallUtilization} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referees">Referee Payments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Expense Trends</CardTitle>
              <CardDescription>Daily financial performance over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dashboardData.revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(date) => formatDate(date as string)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="wages" stroke="#F59E0B" name="Wages" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" name="Expenses" strokeWidth={2} />
                  <Line type="monotone" dataKey="netIncome" stroke="#6366F1" name="Net Income" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_amount"
                    >
                      {dashboardData.expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Referees by Earnings</CardTitle>
                <CardDescription>Highest paid referees this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.refereeWages.topReferees.slice(0, 5).map((referee) => (
                    <div key={referee.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{referee.name}</p>
                        <p className="text-xs text-gray-500">{referee.games_count} games</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(referee.total_wages)}</p>
                        <p className="text-xs text-gray-500">
                          Avg: {formatCurrency(referee.avg_wage)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Referee Payments Tab */}
        <TabsContent value="referees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referee Payment Summary</CardTitle>
              <CardDescription>
                Total Paid: {formatCurrency(dashboardData.refereeWages.totalPaid)} | 
                Pending: {formatCurrency(dashboardData.refereeWages.totalPending)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Games</TableHead>
                    <TableHead className="text-right">Total Wages</TableHead>
                    <TableHead className="text-right">Average/Game</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.refereeWages.topReferees.map((referee) => (
                    <TableRow key={referee.id}>
                      <TableCell className="font-medium">{referee.name}</TableCell>
                      <TableCell>{referee.email}</TableCell>
                      <TableCell className="text-center">{referee.games_count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(referee.total_wages)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(referee.avg_wage)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Detailed view of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.expenseCategories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total_amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Transactions</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.expenseCategories.map((category) => (
                      <TableRow key={category.id || 'uncategorized'}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell className="text-center">{category.transaction_count}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(category.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(category.avg_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization</CardTitle>
              <CardDescription>
                Overall utilization: {dashboardData.budgetUtilization.overallUtilization.toFixed(1)}% 
                ({formatCurrency(dashboardData.budgetUtilization.totalSpent)} of {formatCurrency(dashboardData.budgetUtilization.totalAllocated)})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.budgetUtilization.budgets.map((budget) => (
                  <div key={budget.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{budget.category}</span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                      </span>
                    </div>
                    <Progress 
                      value={budget.percentage} 
                      className={budget.percentage > 100 ? 'bg-red-100' : ''}
                    />
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{budget.percentage.toFixed(1)}% utilized</span>
                      {budget.percentage > 100 && (
                        <Badge variant="destructive" className="text-xs">Over budget</Badge>
                      )}
                      {budget.percentage > 80 && budget.percentage <= 100 && (
                        <Badge variant="outline" className="text-xs bg-yellow-50">Warning</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest financial activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.status === 'completed' ? 'success' :
                              transaction.status === 'pending' ? 'outline' :
                                transaction.status === 'approved' ? 'default' :
                                  'secondary'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={transaction.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}>
                          {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function FinancialDashboardPage() {
  return (
    <PageAccessGuard pageId="financial_dashboard">
      <FinancialDashboardPageContent />
    </PageAccessGuard>
  )
}