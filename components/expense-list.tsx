'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Receipt,
  Calendar,
  DollarSign,
  Tag,
  Building,
  User,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface Expense {
  id: string
  receiptId?: string
  description: string
  amount: number
  category: string
  subcategory?: string
  merchant: string
  expenseDate: string
  submittedAt: string
  submittedBy: {
    id: string
    name: string
    email: string
  }
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
  approvedBy?: {
    id: string
    name: string
  }
  approvedAt?: string
  department?: string
  projectCode?: string
  businessPurpose?: string
  receiptUrl?: string
  tags: string[]
  isRecurring: boolean
  confidence?: number
  needsReview: boolean
}

interface ExpenseFilters {
  search: string
  category: string
  status: string
  department: string
  dateRange: string
  amountMin: string
  amountMax: string
  submittedBy: string
}

export function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: '',
    status: '',
    department: '',
    dateRange: '',
    amountMin: '',
    amountMax: '',
    submittedBy: ''
  })

  // Load expenses
  useEffect(() => {
    loadExpenses()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [expenses, filters])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/expenses')
      if (!response.ok) throw new Error('Failed to load expenses')
      
      const data = await response.json()
      setExpenses(data)
    } catch (error) {
      console.error('Error loading expenses:', error)
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = expenses

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchLower) ||
        expense.merchant.toLowerCase().includes(searchLower) ||
        expense.submittedBy.name.toLowerCase().includes(searchLower)
      )
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(expense => expense.category === filters.category)
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(expense => expense.status === filters.status)
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(expense => expense.department === filters.department)
    }

    // Amount range filters
    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin)
      filtered = filtered.filter(expense => expense.amount >= minAmount)
    }
    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax)
      filtered = filtered.filter(expense => expense.amount <= maxAmount)
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date()
      let startDate: Date

      switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      default:
        startDate = new Date(0)
      }

      filtered = filtered.filter(expense => 
        new Date(expense.expenseDate) >= startDate
      )
    }

    // Submitted by filter
    if (filters.submittedBy) {
      filtered = filtered.filter(expense => expense.submittedBy.id === filters.submittedBy)
    }

    setFilteredExpenses(filtered)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      department: '',
      dateRange: '',
      amountMin: '',
      amountMax: '',
      submittedBy: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'outline', icon: Edit3, text: 'Draft' },
      submitted: { variant: 'secondary', icon: Clock, text: 'Submitted' },
      approved: { variant: 'default', icon: CheckCircle, text: 'Approved' },
      rejected: { variant: 'destructive', icon: AlertTriangle, text: 'Rejected' },
      paid: { variant: 'default', icon: CheckCircle, text: 'Paid' }
    }

    const config = variants[status as keyof typeof variants] || variants.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const handleBulkAction = async (action: string) => {
    if (selectedExpenses.length === 0) {
      toast({
        title: 'No expenses selected',
        description: 'Please select expenses to perform bulk actions',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/expenses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          expenseIds: selectedExpenses
        })
      })

      if (!response.ok) throw new Error('Bulk action failed')

      toast({
        title: 'Success',
        description: `Bulk ${action} completed for ${selectedExpenses.length} expenses`
      })

      setSelectedExpenses([])
      loadExpenses()
    } catch (error) {
      console.error('Bulk action error:', error)
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive'
      })
    }
  }

  const exportExpenses = async () => {
    try {
      const response = await fetch('/api/expenses/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          selectedIds: selectedExpenses.length > 0 ? selectedExpenses : undefined
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export successful',
        description: 'Expenses exported to Excel file'
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export expenses',
        variant: 'destructive'
      })
    }
  }

  const columns = [
    {
      id: 'select',
      header: ({ table }: any) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return (
          <div className="space-y-1">
            <p className="font-medium">{expense.description}</p>
            <p className="text-sm text-muted-foreground">{expense.merchant}</p>
            {expense.needsReview && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Needs Review
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return (
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(expense.amount)}</p>
            {expense.confidence && (
              <p className="text-xs text-muted-foreground">
                {Math.round(expense.confidence * 100)}% confidence
              </p>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return (
          <div className="space-y-1">
            <Badge variant="outline">{expense.category}</Badge>
            {expense.subcategory && (
              <p className="text-xs text-muted-foreground">{expense.subcategory}</p>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return (
          <div className="text-sm">
            <p>{new Date(expense.expenseDate).toLocaleDateString()}</p>
            <p className="text-muted-foreground">
              Submitted {new Date(expense.submittedAt).toLocaleDateString()}
            </p>
          </div>
        )
      }
    },
    {
      accessorKey: 'submittedBy',
      header: 'Submitted By',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return (
          <div className="text-sm">
            <p className="font-medium">{expense.submittedBy.name}</p>
            {expense.department && (
              <p className="text-muted-foreground">{expense.department}</p>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return getStatusBadge(expense.status)
      }
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const expense: Expense = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(expense.id)}>
                Copy expense ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit expense
              </DropdownMenuItem>
              {expense.receiptUrl && (
                <DropdownMenuItem>
                  <Receipt className="h-4 w-4 mr-2" />
                  View receipt
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Expense Management</h2>
          <p className="text-muted-foreground">
            Manage and track all organizational expenses
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          <Button onClick={exportExpenses} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    <SelectItem value="meals">Meals & Entertainment</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="office">Office Supplies</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                    <SelectItem value="quarter">This quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.amountMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.amountMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </p>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedExpenses.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedExpenses.length} expense{selectedExpenses.length === 1 ? '' : 's'} selected
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('approve')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('reject')}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={exportExpenses}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredExpenses}
            columns={columns}
            onSelectionChange={setSelectedExpenses}
          />
        </CardContent>
      </Card>

      {filteredExpenses.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No expenses found</p>
            <p className="text-muted-foreground text-center">
              {expenses.length === 0 
                ? 'No expenses have been submitted yet' 
                : 'Try adjusting your filters to see more expenses'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}