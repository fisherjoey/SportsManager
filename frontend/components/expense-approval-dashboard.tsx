'use client'

import React, { useState, useEffect } from 'react'
import {
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  Eye,
  UserCheck,
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

import { ExpenseApprovalDetails } from './expense-approval-details'

interface PendingExpense {
  id: string
  expense_number: string
  amount: number
  description: string
  vendor_name: string
  category_name: string
  category_color: string
  payment_method_type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'
  payment_method_name: string
  submitted_date: string
  submitted_by_name: string
  submitted_by_email: string
  urgency_level: 'low' | 'normal' | 'high' | 'urgent'
  current_approval_stage: string
  approval_deadline: string
  receipt_filename?: string
  business_purpose?: string
  is_overdue: boolean
  approval_history: any[]
}

interface ExpenseApprovalDashboardProps {
  className?: string
}

export function ExpenseApprovalDashboard({ className }: ExpenseApprovalDashboardProps) {
  const [expenses, setExpenses] = useState<PendingExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [filters, setFilters] = useState({
    payment_method: '',
    category: '',
    urgency: '',
    amount_min: '',
    amount_max: '',
    search: ''
  })
  const [selectedExpense, setSelectedExpense] = useState<PendingExpense | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadPendingExpenses()
  }, [filters])

  const loadPendingExpenses = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getPendingExpenses({
        payment_method: filters.payment_method,
        urgency: filters.urgency,
        amount_min: filters.amount_min,
        amount_max: filters.amount_max,
        search: filters.search
      })
      
      setExpenses(response.expenses || [])
    } catch (error: any) {
      console.error('Error loading pending expenses:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pending expenses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) return

    try {
      setLoading(true)
      await Promise.all(
        selectedExpenses.map(expenseId =>
          apiClient.approveExpense(expenseId, {
            decision: 'approved',
            notes: 'Bulk approval'
          })
        )
      )

      toast({
        title: 'Success',
        description: `${selectedExpenses.length} expenses approved successfully`
      })
      
      setSelectedExpenses([])
      loadPendingExpenses()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to approve expenses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedExpenses.length === 0) return

    try {
      setLoading(true)
      await Promise.all(
        selectedExpenses.map(expenseId =>
          apiClient.rejectExpense(expenseId, {
            decision: 'rejected',
            reason: 'Bulk rejection - requires more information',
            allow_resubmission: true
          })
        )
      )

      toast({
        title: 'Success',
        description: `${selectedExpenses.length} expenses rejected successfully`
      })
      
      setSelectedExpenses([])
      loadPendingExpenses()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to reject expenses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodBadge = (type: string, name: string) => {
    const variants = {
      person_reimbursement: { variant: 'secondary' as const, icon: UserCheck },
      purchase_order: { variant: 'outline' as const, icon: FileText },
      credit_card: { variant: 'default' as const, icon: CreditCard },
      direct_vendor: { variant: 'secondary' as const, icon: DollarSign }
    }
    
    const config = variants[type as keyof typeof variants] || variants.person_reimbursement
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {name}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string, isOverdue: boolean) => {
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </Badge>
    }

    const variants = {
      low: { variant: 'outline' as const, color: 'text-gray-500' },
      normal: { variant: 'secondary' as const, color: 'text-blue-500' },
      high: { variant: 'default' as const, color: 'text-orange-500' },
      urgent: { variant: 'destructive' as const, color: 'text-red-500' }
    }

    const config = variants[urgency as keyof typeof variants] || variants.normal

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Clock className="h-3 w-3" />
        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const filteredExpenses = expenses.filter(expense => {
    return (
      (!filters.payment_method || filters.payment_method === 'all' || expense.payment_method_type === filters.payment_method) &&
      (!filters.urgency || filters.urgency === 'all' || expense.urgency_level === filters.urgency) &&
      (!filters.amount_min || expense.amount >= parseFloat(filters.amount_min)) &&
      (!filters.amount_max || expense.amount <= parseFloat(filters.amount_max)) &&
      (!filters.search || 
        expense.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        expense.vendor_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        expense.submitted_by_name.toLowerCase().includes(filters.search.toLowerCase())
      )
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expense Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve pending expense submissions
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedExpenses.length > 0 && (
            <>
              <Button
                onClick={handleBulkApprove}
                className={cn(getStatusColorClass('success', 'bg'), getStatusColorClass('success', 'hover'))}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve {selectedExpenses.length}
              </Button>
              <Button
                onClick={handleBulkReject}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject {selectedExpenses.length}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.payment_method} onValueChange={(value) => setFilters(prev => ({ ...prev, payment_method: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="person_reimbursement">Person Reimbursement</SelectItem>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="direct_vendor">Direct Vendor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.urgency} onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                placeholder="Min Amount"
                type="number"
                value={filters.amount_min}
                onChange={(e) => setFilters(prev => ({ ...prev, amount_min: e.target.value }))}
              />
              <Input
                placeholder="Max Amount"
                type="number"
                value={filters.amount_max}
                onChange={(e) => setFilters(prev => ({ ...prev, amount_max: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
                <p className="text-muted-foreground">All expenses have been processed.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id} className={expense.is_overdue ? cn(getStatusColorClass('error', 'bg'), getStatusColorClass('error', 'border')) : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedExpenses.includes(expense.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExpenses(prev => [...prev, expense.id])
                        } else {
                          setSelectedExpenses(prev => prev.filter(id => id !== expense.id))
                        }
                      }}
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-lg">{expense.description}</h3>
                        {getUrgencyBadge(expense.urgency_level, expense.is_overdue)}
                        {getPaymentMethodBadge(expense.payment_method_type, expense.payment_method_name)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(expense.amount)}
                        </span>
                        <span>{expense.vendor_name}</span>
                        <span>{expense.submitted_by_name}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(expense.submitted_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {expense.business_purpose && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Purpose:</strong> {expense.business_purpose}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedExpense(expense)
                        setShowDetails(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>

                    <Button
                      size="sm"
                      className={cn(getStatusColorClass('success', 'bg'), getStatusColorClass('success', 'hover'))}
                      onClick={async () => {
                        try {
                          await apiClient.approveExpense(expense.id, {
                            decision: 'approved',
                            notes: 'Quick approval'
                          })
                          toast({
                            title: 'Success',
                            description: 'Expense approved successfully'
                          })
                          loadPendingExpenses()
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to approve expense',
                            variant: 'destructive'
                          })
                        }
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Expense Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Approval Details</DialogTitle>
            <DialogDescription>
              Review expense details and make your approval decision
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseApprovalDetails
              expense={selectedExpense}
              onApproved={() => {
                setShowDetails(false)
                loadPendingExpenses()
              }}
              onRejected={() => {
                setShowDetails(false)
                loadPendingExpenses()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}