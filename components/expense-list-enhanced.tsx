"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
  MoreHorizontal,
  CreditCard,
  FileText,
  Eye,
  ArrowUpDown,
  Settings,
  RefreshCw,
  Plus
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface ExpenseData {
  id: string
  receiptId?: string
  description: string
  amount: number
  category: {
    id: string
    name: string
    color_code: string
  }
  subcategory?: string
  merchant: string
  transactionDate: string
  submittedAt: string
  submittedBy: {
    id: string
    name: string
    email: string
  }
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'pending'
  paymentMethod: {
    id: string
    name: string
    type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'
  }
  purchaseOrder?: {
    id: string
    poNumber: string
    remainingAmount: number
  }
  creditCard?: {
    id: string
    cardName: string
    last4Digits: string
  }
  approvedBy?: {
    id: string
    name: string
  }
  approvedAt?: string
  approvedAmount?: number
  department?: string
  projectCode?: string
  businessPurpose?: string
  receiptUrl?: string
  tags: string[]
  isRecurring: boolean
  confidence?: number
  needsReview: boolean
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  approvalWorkflow?: {
    currentStage: number
    totalStages: number
    pendingWith: string[]
  }
}

interface ExpenseFilters {
  search: string
  category: string
  status: string
  paymentMethod: string
  department: string
  dateRange: string
  amountMin: string
  amountMax: string
  submittedBy: string
  urgency: string
  needsReview: boolean
}

interface ExpenseListEnhancedProps {
  onExpenseSelect?: (expense: ExpenseData) => void
  onCreateExpense?: () => void
  showActions?: boolean
  compactView?: boolean
  defaultFilters?: Partial<ExpenseFilters>
}

export function ExpenseListEnhanced({ 
  onExpenseSelect,
  onCreateExpense,
  showActions = true,
  compactView = false,
  defaultFilters = {}
}: ExpenseListEnhancedProps) {
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<string>('submittedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: '',
    status: '',
    paymentMethod: '',
    department: '',
    dateRange: '',
    amountMin: '',
    amountMax: '',
    submittedBy: '',
    urgency: '',
    needsReview: false,
    ...defaultFilters
  })

  // Load expenses
  useEffect(() => {
    loadExpenses()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    applyFiltersAndSort()
  }, [expenses, filters, sortField, sortDirection])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getExpenses()
      setExpenses(response.expenses || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive',
      })
      
      // Mock data for development
      setExpenses([
        {
          id: 'exp-1',
          receiptId: 'rec-1',
          description: 'Office supplies and equipment',
          amount: 245.67,
          category: {
            id: 'cat-1',
            name: 'Office Supplies',
            color_code: '#3B82F6'
          },
          merchant: 'Staples',
          transactionDate: '2024-01-15',
          submittedAt: '2024-01-16T10:30:00Z',
          submittedBy: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com'
          },
          status: 'approved',
          paymentMethod: {
            id: 'pm-1',
            name: 'Corporate Amex',
            type: 'credit_card'
          },
          creditCard: {
            id: 'cc-1',
            cardName: 'Corporate Amex',
            last4Digits: '1234'
          },
          approvedBy: {
            id: 'mgr-1',
            name: 'Jane Manager'
          },
          approvedAt: '2024-01-17T14:20:00Z',
          approvedAmount: 245.67,
          department: 'Operations',
          projectCode: 'OP-2024-Q1',
          businessPurpose: 'Office setup for new employees',
          receiptUrl: '/receipts/rec-1.pdf',
          tags: ['office', 'setup'],
          isRecurring: false,
          confidence: 0.95,
          needsReview: false,
          urgency: 'normal'
        },
        {
          id: 'exp-2',
          description: 'Team lunch meeting',
          amount: 87.32,
          category: {
            id: 'cat-2',
            name: 'Meals & Entertainment',
            color_code: '#10B981'
          },
          merchant: 'Local Restaurant',
          transactionDate: '2024-01-18',
          submittedAt: '2024-01-18T16:45:00Z',
          submittedBy: {
            id: 'user-2',
            name: 'Sarah Smith',
            email: 'sarah@example.com'
          },
          status: 'pending',
          paymentMethod: {
            id: 'pm-2',
            name: 'Personal Reimbursement',
            type: 'person_reimbursement'
          },
          department: 'Marketing',
          businessPurpose: 'Client meeting and project discussion',
          tags: ['meals', 'client'],
          isRecurring: false,
          needsReview: true,
          urgency: 'high',
          approvalWorkflow: {
            currentStage: 1,
            totalStages: 2,
            pendingWith: ['manager@example.com']
          }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = expenses

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchLower) ||
        expense.merchant.toLowerCase().includes(searchLower) ||
        expense.submittedBy.name.toLowerCase().includes(searchLower) ||
        expense.category.name.toLowerCase().includes(searchLower) ||
        expense.paymentMethod.name.toLowerCase().includes(searchLower)
      )
    }

    if (filters.category) {
      filtered = filtered.filter(expense => expense.category.id === filters.category)
    }

    if (filters.status) {
      filtered = filtered.filter(expense => expense.status === filters.status)
    }

    if (filters.paymentMethod) {
      filtered = filtered.filter(expense => expense.paymentMethod.type === filters.paymentMethod)
    }

    if (filters.department) {
      filtered = filtered.filter(expense => expense.department === filters.department)
    }

    if (filters.urgency) {
      filtered = filtered.filter(expense => expense.urgency === filters.urgency)
    }

    if (filters.needsReview) {
      filtered = filtered.filter(expense => expense.needsReview)
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
        new Date(expense.transactionDate) >= startDate
      )
    }

    if (filters.submittedBy) {
      filtered = filtered.filter(expense => expense.submittedBy.id === filters.submittedBy)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'transactionDate':
          aValue = new Date(a.transactionDate)
          bValue = new Date(b.transactionDate)
          break
        case 'submittedAt':
          aValue = new Date(a.submittedAt)
          bValue = new Date(b.submittedAt)
          break
        case 'merchant':
          aValue = a.merchant.toLowerCase()
          bValue = b.merchant.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          aValue = a.submittedAt
          bValue = b.submittedAt
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredExpenses(filtered)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      paymentMethod: '',
      department: '',
      dateRange: '',
      amountMin: '',
      amountMax: '',
      submittedBy: '',
      urgency: '',
      needsReview: false
    })
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (expense: ExpenseData) => {
    const variants = {
      draft: { variant: 'outline', icon: Edit3, text: 'Draft', color: 'text-gray-600' },
      submitted: { variant: 'secondary', icon: Clock, text: 'Submitted', color: 'text-blue-600' },
      pending: { variant: 'secondary', icon: Clock, text: 'Pending', color: 'text-orange-600' },
      approved: { variant: 'default', icon: CheckCircle, text: 'Approved', color: 'text-green-600' },
      rejected: { variant: 'destructive', icon: AlertTriangle, text: 'Rejected', color: 'text-red-600' },
      paid: { variant: 'default', icon: CheckCircle, text: 'Paid', color: 'text-green-600' }
    }

    const config = variants[expense.status as keyof typeof variants] || variants.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getPaymentMethodBadge = (paymentMethod: ExpenseData['paymentMethod']) => {
    const variants = {
      person_reimbursement: { icon: User, text: 'Reimbursement', color: 'bg-blue-100 text-blue-700' },
      purchase_order: { icon: FileText, text: 'Purchase Order', color: 'bg-purple-100 text-purple-700' },
      credit_card: { icon: CreditCard, text: 'Credit Card', color: 'bg-green-100 text-green-700' },
      direct_vendor: { icon: Building, text: 'Direct Vendor', color: 'bg-orange-100 text-orange-700' }
    }

    const config = variants[paymentMethod.type] || variants.person_reimbursement
    const Icon = config.icon

    return (
      <Badge variant="outline" className={`${config.color} border-current`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      low: { color: 'bg-gray-100 text-gray-700', text: 'Low' },
      normal: { color: 'bg-blue-100 text-blue-700', text: 'Normal' },
      high: { color: 'bg-orange-100 text-orange-700', text: 'High' },
      urgent: { color: 'bg-red-100 text-red-700', text: 'Urgent' }
    }

    const config = variants[urgency as keyof typeof variants] || variants.normal

    return (
      <Badge variant="outline" className={`${config.color} border-current text-xs`}>
        {config.text}
      </Badge>
    )
  }

  const handleBulkAction = async (action: string) => {
    if (selectedExpenses.length === 0) {
      toast({
        title: 'No expenses selected',
        description: 'Please select expenses to perform bulk actions',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/expenses/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action,
          expenseIds: selectedExpenses
        })
      })

      if (!response.ok) throw new Error('Bulk action failed')

      toast({
        title: 'Success',
        description: `Bulk ${action} completed for ${selectedExpenses.length} expenses`,
      })

      setSelectedExpenses([])
      loadExpenses()
    } catch (error) {
      console.error('Bulk action error:', error)
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive',
      })
    }
  }

  const exportExpenses = async () => {
    try {
      const response = await fetch('/api/expenses/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
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
        description: 'Expenses exported to Excel file',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export expenses',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!compactView && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Enhanced Expense Management</h2>
            <p className="text-muted-foreground">
              Manage expenses with payment method tracking and approval workflows
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {onCreateExpense && (
              <Button 
                onClick={onCreateExpense}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Expense
              </Button>
            )}
            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Button onClick={exportExpenses} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={loadExpenses} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
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
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={filters.paymentMethod} onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All methods</SelectItem>
                    <SelectItem value="person_reimbursement">Personal Reimbursement</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="purchase_order">Purchase Order</SelectItem>
                    <SelectItem value="direct_vendor">Direct Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={filters.urgency} onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All urgencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All urgencies</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsReview"
                    checked={filters.needsReview}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, needsReview: !!checked }))}
                  />
                  <Label htmlFor="needsReview" className="text-sm">Needs Review Only</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
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
      {selectedExpenses.length > 0 && showActions && (
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

      {/* Enhanced Expenses Table */}
      <Card>
        <CardContent className="p-0">
          {filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {showActions && (
                      <th className="p-4 text-left">
                        <Checkbox
                          checked={selectedExpenses.length === filteredExpenses.length}
                          onCheckedChange={(checked) => 
                            setSelectedExpenses(checked ? filteredExpenses.map(e => e.id) : [])
                          }
                        />
                      </th>
                    )}
                    <th className="p-4 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('description')}
                        className="h-auto p-0 font-semibold"
                      >
                        Description
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('amount')}
                        className="h-auto p-0 font-semibold"
                      >
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="p-4 text-left">Category</th>
                    <th className="p-4 text-left">Payment Method</th>
                    <th className="p-4 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('transactionDate')}
                        className="h-auto p-0 font-semibold"
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="p-4 text-left">Submitted By</th>
                    <th className="p-4 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('status')}
                        className="h-auto p-0 font-semibold"
                      >
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    {showActions && <th className="p-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr 
                      key={expense.id} 
                      className="border-b hover:bg-muted/25 cursor-pointer"
                      onClick={() => onExpenseSelect?.(expense)}
                    >
                      {showActions && (
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedExpenses.includes(expense.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedExpenses([...selectedExpenses, expense.id])
                              } else {
                                setSelectedExpenses(selectedExpenses.filter(id => id !== expense.id))
                              }
                            }}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">{expense.merchant}</p>
                          <div className="flex items-center gap-2">
                            {getUrgencyBadge(expense.urgency)}
                            {expense.needsReview && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Review
                              </Badge>
                            )}
                            {expense.confidence && expense.confidence < 0.8 && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(expense.confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div>
                          <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                          {expense.approvedAmount && expense.approvedAmount !== expense.amount && (
                            <p className="text-xs text-muted-foreground">
                              Approved: {formatCurrency(expense.approvedAmount)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant="outline" 
                          style={{ 
                            backgroundColor: `${expense.category.color_code}20`,
                            borderColor: expense.category.color_code,
                            color: expense.category.color_code
                          }}
                        >
                          {expense.category.name}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {getPaymentMethodBadge(expense.paymentMethod)}
                          {expense.creditCard && (
                            <p className="text-xs text-muted-foreground">
                              *{expense.creditCard.last4Digits}
                            </p>
                          )}
                          {expense.purchaseOrder && (
                            <p className="text-xs text-muted-foreground">
                              {expense.purchaseOrder.poNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p>{new Date(expense.transactionDate).toLocaleDateString()}</p>
                          <p className="text-muted-foreground">
                            Submitted {new Date(expense.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="font-medium">{expense.submittedBy.name}</p>
                          {expense.department && (
                            <p className="text-muted-foreground">{expense.department}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {getStatusBadge(expense)}
                          {expense.approvalWorkflow && (
                            <p className="text-xs text-muted-foreground">
                              Stage {expense.approvalWorkflow.currentStage}/{expense.approvalWorkflow.totalStages}
                            </p>
                          )}
                        </div>
                      </td>
                      {showActions && (
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
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
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Expense
                              </DropdownMenuItem>
                              {expense.receiptUrl && (
                                <DropdownMenuItem>
                                  <Receipt className="h-4 w-4 mr-2" />
                                  View Receipt
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
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No expenses found</p>
              <p className="text-muted-foreground text-center">
                {expenses.length === 0 
                  ? "No expenses have been submitted yet" 
                  : "Try adjusting your filters to see more expenses"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}