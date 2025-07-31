"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Pie,
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
import { apiClient, Budget, BudgetPeriod, BudgetCategory, BudgetAllocation } from '@/lib/api'

// Enhanced Budget interface with additional display data
interface BudgetWithDetails extends Budget {
  category?: {
    id: string
    name: string
    code: string
    color: string
  }
  period?: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  owner?: {
    id: string
    name: string
  }
  monthlyAllocations?: Array<{
    month: string
    allocated: number
    spent: number
    remaining: number
  }>
  topExpenses?: Array<{
    id: string
    description: string
    amount: number
    date: string
  }>
  forecastData?: Array<{
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
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([])
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    period_id: '',
    category_id: '',
    allocated_amount: '',
    responsible_person: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      loadBudgetData()
    }
  }, [selectedPeriod])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      console.log('BudgetTracker: Starting to load initial data...')
      
      const [periodsResponse, categoriesResponse] = await Promise.all([
        apiClient.getBudgetPeriods(),
        apiClient.getBudgetCategories()
      ])

      console.log('BudgetTracker: API responses received:', { periodsResponse, categoriesResponse })

      if (periodsResponse.success && periodsResponse.data.length > 0) {
        setBudgetPeriods(periodsResponse.data)
        // Set the first active period as default
        const activePeriod = periodsResponse.data.find(p => p.status === 'active') || periodsResponse.data[0]
        setSelectedPeriod(activePeriod.id)
        console.log('BudgetTracker: Set selected period:', activePeriod.id)
      } else {
        console.warn('BudgetTracker: No budget periods found or API call failed:', periodsResponse)
        setError('No budget periods found. Please create budget periods first.')
      }

      if (categoriesResponse.success) {
        setBudgetCategories(categoriesResponse.data)
        console.log('BudgetTracker: Set budget categories:', categoriesResponse.data)
      } else {
        console.warn('BudgetTracker: No budget categories found or API call failed:', categoriesResponse)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data')
      console.error('BudgetTracker: Error loading initial data:', err)
      toast({
        title: "Error",
        description: "Failed to load budget periods and categories",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBudgetData = async () => {
    try {
      setLoading(true)
      console.log('BudgetTracker: Loading budget data for period:', selectedPeriod)
      
      const budgetsResponse = await apiClient.getBudgets({
        period_id: selectedPeriod,
        page: 1,
        limit: 100
      })

      console.log('BudgetTracker: Budget data response:', budgetsResponse)

      if (budgetsResponse && budgetsResponse.budgets) {
        // Transform budget data to include additional fields for the UI
        const transformedBudgets: BudgetWithDetails[] = budgetsResponse.budgets.map(budget => {
          const utilizationRate = budget.utilization_rate || 0
          const spentAmount = budget.spent_amount || 0
          const remainingAmount = budget.remaining_amount || (budget.allocated_amount - spentAmount)
          
          return {
            ...budget,
            category: {
              id: budget.category_id || '',
              name: budget.category_name || 'Unknown',
              code: budget.category_name || 'UNK',
              color: getCategoryColor(budget.category_id, budget.category_name || '')
            },
            period: {
              id: budget.period_id,
              name: budget.period_name || 'Unknown Period',
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString()
            },
            owner: {
              id: budget.responsible_person || '',
              name: budget.responsible_person_name || 'Unassigned'
            },
            // Add empty arrays for additional fields - will be populated on demand
            monthlyAllocations: [],
            topExpenses: [],
            forecastData: []
          }
        })

        console.log('BudgetTracker: Transformed budgets:', transformedBudgets)
        setBudgets(transformedBudgets)
        
        // Generate summary data from budgets
        const summaryData = generateBudgetSummary(transformedBudgets)
        setSummary(summaryData)
        console.log('BudgetTracker: Generated summary:', summaryData)
      } else {
        console.warn('BudgetTracker: No budgets found in response:', budgetsResponse)
        setBudgets([])
        // Create an empty summary for when there are no budgets
        setSummary({
          totalBudget: 0,
          totalSpent: 0,
          totalRemaining: 0,
          averageUtilization: 0,
          budgetsOverLimit: 0,
          budgetsNearLimit: 0,
          monthlyTrends: [],
          categoryBreakdown: []
        })
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data')
      console.error('BudgetTracker: Error loading budget data:', err)
      toast({
        title: "Error",
        description: "Failed to load budget data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getCategoryColor = (categoryId: string, categoryName: string) => {
    // Use consistent colors based on category ID or name
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    const hash = (categoryId || categoryName || '').split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  // Helper function to fetch additional budget details when needed
  const loadBudgetDetails = async (budgetId: string) => {
    try {
      // When detailed budget API endpoints are available, use them here
      // For now, return empty arrays as placeholders
      return {
        monthlyAllocations: [],
        topExpenses: [],
        forecastData: []
      }
    } catch (error) {
      console.error('Error loading budget details:', error)
      return {
        monthlyAllocations: [],
        topExpenses: [],
        forecastData: []
      }
    }
  }

  const generateBudgetSummary = (budgets: BudgetWithDetails[]): BudgetSummary => {
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocated_amount, 0)
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
    const totalRemaining = totalBudget - totalSpent
    const averageUtilization = budgets.length > 0 
      ? budgets.reduce((sum, b) => sum + (b.utilization_rate || 0), 0) / budgets.length
      : 0
    const budgetsOverLimit = budgets.filter(b => (b.utilization_rate || 0) >= 100).length
    const budgetsNearLimit = budgets.filter(b => (b.utilization_rate || 0) >= 90 && (b.utilization_rate || 0) < 100).length

    // Generate category breakdown
    const categoryMap = new Map<string, any>()
    budgets.forEach(budget => {
      const categoryName = budget.category?.name || 'Unknown'
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category: categoryName,
          allocated: 0,
          spent: 0,
          utilization: 0,
          color: budget.category?.color || getCategoryColor(budget.category_id, budget.category?.name || '')
        })
      }
      const category = categoryMap.get(categoryName)!
      category.allocated += budget.allocated_amount
      category.spent += budget.spent_amount || 0
    })

    const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      utilization: cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0
    }))

    // Generate monthly trends (mock data)
    const monthlyTrends = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(month => ({
      month,
      budgeted: totalBudget / 6,
      spent: (totalSpent / 6) + (Math.random() - 0.5) * (totalBudget / 12),
      variance: Math.random() * 2000 - 1000
    }))

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      averageUtilization,
      budgetsOverLimit,
      budgetsNearLimit,
      monthlyTrends,
      categoryBreakdown
    }
  }

  const getBudgetStatus = (utilization: number, status?: string) => {
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      period_id: selectedPeriod,
      category_id: '',
      allocated_amount: '',
      responsible_person: ''
    })
  }

  const populateEditForm = (budget: Budget) => {
    setFormData({
      name: budget.name,
      description: budget.description || '',
      period_id: budget.period_id,
      category_id: budget.category_id,
      allocated_amount: budget.allocated_amount.toString(),
      responsible_person: budget.responsible_person || ''
    })
  }

  const handleCreateBudget = async () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleSaveNewBudget = async () => {
    if (!formData.name || !formData.period_id || !formData.category_id || !formData.allocated_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setFormLoading(true)
      const budgetData = {
        name: formData.name,
        description: formData.description,
        period_id: formData.period_id,
        category_id: formData.category_id,
        allocated_amount: parseFloat(formData.allocated_amount),
        responsible_person: formData.responsible_person
      }

      const response = await apiClient.createBudget(budgetData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Budget created successfully"
        })
        setShowCreateModal(false)
        resetForm()
        // Reload budget data
        await loadBudgetData()
      } else {
        throw new Error('Failed to create budget')
      }
    } catch (error) {
      console.error('Error creating budget:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create budget",
        variant: "destructive"
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditBudget = async (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId)
    if (!budget) {
      toast({
        title: "Error",
        description: "Budget not found",
        variant: "destructive"
      })
      return
    }
    
    setEditingBudget(budget)
    populateEditForm(budget)
    setShowEditModal(true)
  }

  const handleSaveEditBudget = async () => {
    if (!editingBudget || !formData.name || !formData.period_id || !formData.category_id || !formData.allocated_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setFormLoading(true)
      const budgetData = {
        name: formData.name,
        description: formData.description,
        period_id: formData.period_id,
        category_id: formData.category_id,
        allocated_amount: parseFloat(formData.allocated_amount),
        responsible_person: formData.responsible_person
      }

      const response = await apiClient.updateBudget(editingBudget.id, budgetData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Budget updated successfully"
        })
        setShowEditModal(false)
        setEditingBudget(null)
        resetForm()
        // Reload budget data
        await loadBudgetData()
      } else {
        throw new Error('Failed to update budget')
      }
    } catch (error) {
      console.error('Error updating budget:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update budget",
        variant: "destructive"
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId)
    if (!budget) {
      toast({
        title: "Error",
        description: "Budget not found",
        variant: "destructive"
      })
      return
    }

    // Show custom confirmation dialog instead of browser confirm
    const confirmed = window.confirm(
      `Are you sure you want to delete the budget "${budget.name}"?\n\nThis action cannot be undone.`
    )
    
    if (!confirmed) return
    
    try {
      setLoading(true)
      
      // Since there's no delete endpoint in the API client yet, 
      // we'll show an informative message about the limitation
      toast({
        title: "Feature Not Available",
        description: "Budget deletion is not yet supported by the backend API. Please contact your administrator to remove this budget.",
        variant: "destructive"
      })
      
      // TODO: Uncomment when delete API is available
      // const response = await apiClient.deleteBudget(budgetId)
      // if (response.success) {
      //   toast({
      //     title: "Success",
      //     description: "Budget deleted successfully"
      //   })
      //   await loadBudgetData()
      // } else {
      //   throw new Error('Failed to delete budget')
      // }
      
    } catch (err) {
      console.error('Error deleting budget:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete budget",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {budgetPeriods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.name} ({period.fiscal_year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreateBudget}>
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
              const utilizationPercent = budget.utilization_rate || 0
              const status = getBudgetStatus(utilizationPercent, budget.status)
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
                          <p>Period: {budget.period?.name || budget.period_name || 'Unknown'}</p>
                          <p>Category: {budget.category?.name || budget.category_name || 'Unknown'}</p>
                          <p>Owner: {budget.owner?.name || budget.responsible_person_name || 'Unassigned'}</p>
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
                          <DropdownMenuItem onClick={() => handleEditBudget(budget.id)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Budget
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast({ title: "Analytics", description: "Analytics view coming soon" })}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => handleDeleteBudget(budget.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Allocated</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.allocated_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spent</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.spent_amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(budget.remaining_amount || (budget.allocated_amount - (budget.spent_amount || 0)))}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Budget Utilization</span>
                        <span>{utilizationPercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={utilizationPercent} />
                    </div>

                    {/* Monthly breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <div>
                        <h4 className="font-medium mb-3">Monthly Allocations</h4>
                        <div className="space-y-2">
                          {budget.monthlyAllocations && budget.monthlyAllocations.length > 0 ? (
                            budget.monthlyAllocations.slice(0, 3).map((month, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{month.month}</span>
                                <div className="text-right">
                                  <div>{formatCurrency(month.spent)} / {formatCurrency(month.allocated)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCurrency(month.remaining)} remaining
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No monthly allocation data available
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Top Expenses</h4>
                        <div className="space-y-2">
                          {budget.topExpenses && budget.topExpenses.length > 0 ? (
                            budget.topExpenses.slice(0, 3).map((expense, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <div>
                                  <div className="font-medium">{expense.description}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(expense.date).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No expense data available
                            </div>
                          )}
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
                  <LineChart data={budgets[0]?.forecastData?.length > 0 ? budgets[0].forecastData : []}>
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
                {(!budgets[0]?.forecastData || budgets[0].forecastData.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    No forecast data available
                  </div>
                )}
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
                    {budgets.filter(b => (b.utilization_rate || 0) < 75).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Budgets Under 75%</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {budgets.filter(b => (b.utilization_rate || 0) >= 75 && (b.utilization_rate || 0) < 90).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Budgets 75-90%</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {budgets.filter(b => (b.utilization_rate || 0) >= 90).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Budgets Over 90%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Budget Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>
              Create a new budget allocation for a specific period and category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Budget Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter budget name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter budget description (optional)"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-period">Budget Period *</Label>
                <Select
                  value={formData.period_id}
                  onValueChange={(value) => setFormData({ ...formData, period_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} ({period.fiscal_year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="create-category">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="create-amount">Allocated Amount *</Label>
              <Input
                id="create-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.allocated_amount}
                onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="create-responsible">Responsible Person</Label>
              <Input
                id="create-responsible"
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                placeholder="Enter responsible person (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNewBudget} disabled={formLoading}>
              {formLoading ? 'Creating...' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update the budget information and allocation amount.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Budget Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter budget name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter budget description (optional)"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-period">Budget Period *</Label>
                <Select
                  value={formData.period_id}
                  onValueChange={(value) => setFormData({ ...formData, period_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} ({period.fiscal_year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Allocated Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.allocated_amount}
                onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-responsible">Responsible Person</Label>
              <Input
                id="edit-responsible"
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                placeholder="Enter responsible person (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditModal(false)
                setEditingBudget(null)
                resetForm()
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditBudget} disabled={formLoading}>
              {formLoading ? 'Updating...' : 'Update Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}