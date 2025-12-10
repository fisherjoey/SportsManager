'use client'

import React, { useState, useEffect } from 'react'
import { 
  DollarSign,
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react'
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge' 
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface BudgetData {
  budgets: Array<{
    id: number
    category: string
    allocated: number
    spent: number
    percentage: number
    color: string
  }>
  summary: {
    totalAllocated: number
    totalSpent: number
    overallUtilization: number
    remainingBudget: number
    categoriesOverBudget: number
    categoriesNearLimit: number
  }
  period: {
    month: number
    year: number
    monthName: string
  }
}

export function BudgetTracker() {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBudgetData()
  }, [])

  const loadBudgetData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/budget-tracker/utilization`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load budget data: ${response.statusText}`)
      }
      
      const data = await response.json()
      setBudgetData(data)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load budget data'
      setError(errorMessage)
      console.error('Error loading budget data:', err)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
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

  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 100) return { color: 'destructive', icon: AlertTriangle, text: 'Over Budget' }
    if (percentage >= 75) return { color: 'warning', icon: AlertTriangle, text: 'Near Limit' }
    return { color: 'default', icon: CheckCircle, text: 'On Track' }
  }

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

  if (!budgetData) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Budget Tracker</h2>
        <p className="text-muted-foreground">
          Track budget utilization for {budgetData.period.monthName} {budgetData.period.year}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetData.summary.totalAllocated)}</div>
            <p className="text-xs text-muted-foreground">Allocated this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetData.summary.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {budgetData.summary.overallUtilization.toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetData.summary.remainingBudget)}</div>
            <p className="text-xs text-muted-foreground">Available to spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetData.summary.categoriesOverBudget}</div>
            <p className="text-xs text-muted-foreground">
              Over budget ({budgetData.summary.categoriesNearLimit} near limit)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetData.budgets.map((budget) => {
              const status = getBudgetStatus(budget.percentage)
              const StatusIcon = status.icon
              
              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: budget.color }}
                      />
                      <span className="font-medium">{budget.category}</span>
                    </div>
                    <Badge variant={status.color as any} className="text-xs">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {budget.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Spent: {formatCurrency(budget.spent)}</span>
                      <span>Budget: {formatCurrency(budget.allocated)}</span>
                    </div>
                    <Progress value={budget.percentage} className="h-2" />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Budget Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={budgetData.budgets}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="allocated"
                >
                  {budgetData.budgets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Spending vs Budget Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spending vs Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetData.budgets} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis formatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="allocated" fill="#8884d8" name="Allocated" />
              <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}