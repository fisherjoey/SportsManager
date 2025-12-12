'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  Download, 
  User, 
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  AlertTriangle,
  Clock,
  MessageSquare,
  UserCheck,
  Eye
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

import { ApprovalHistory } from './approval-history'

interface ExpenseApprovalDetailsProps {
  expense: {
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
  onApproved: () => void
  onRejected: () => void
}

export function ExpenseApprovalDetails({ expense, onApproved, onRejected }: ExpenseApprovalDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [delegateToUser, setDelegateToUser] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [expenseDetails, setExpenseDetails] = useState<any>(null)
  const [receiptData, setReceiptData] = useState<any>(null)

  useEffect(() => {
    loadExpenseDetails()
    loadAvailableApprovers()
  }, [expense.id])

  const loadExpenseDetails = async () => {
    try {
      const response = await apiClient.request(`/expenses/${expense.id}`)
      setExpenseDetails(response)
      
      if (expense.receipt_filename) {
        const receiptResponse = await apiClient.request(`/expenses/receipts/${expense.id}`)
        setReceiptData(receiptResponse.receipt)
      }
    } catch (error) {
      console.error('Error loading expense details:', error)
    }
  }

  const loadAvailableApprovers = async () => {
    try {
      const response = await apiClient.request('/users?role=manager,admin&active=true')
      setAvailableUsers(response.users || [])
    } catch (error) {
      console.error('Error loading available approvers:', error)
    }
  }

  const handleApprove = async () => {
    try {
      setLoading(true)
      await apiClient.request(`/expenses/${expense.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'approved',
          notes: approvalNotes || 'Approved',
          approved_amount: expense.amount
        })
      })

      toast({
        title: 'Success',
        description: 'Expense approved successfully'
      })
      
      onApproved()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve expense',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)
      await apiClient.request(`/expenses/${expense.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'rejected',
          reason: rejectionReason,
          allow_resubmission: true
        })
      })

      toast({
        title: 'Success',
        description: 'Expense rejected successfully'
      })
      
      onRejected()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject expense',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelegate = async () => {
    if (!delegateToUser) {
      toast({
        title: 'Error',
        description: 'Please select a user to delegate to',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)
      await apiClient.request(`/expenses/${expense.id}/delegate`, {
        method: 'POST',
        body: JSON.stringify({
          delegate_to_user_id: delegateToUser,
          delegation_notes: approvalNotes || 'Delegated for approval'
        })
      })

      toast({
        title: 'Success',
        description: 'Expense delegated successfully'
      })
      
      onApproved()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delegate expense',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadReceipt = async () => {
    try {
      const response = await fetch(`/api/expenses/receipts/${expense.id}/download`, {
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to download receipt')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = expense.receipt_filename || 'receipt.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download receipt',
        variant: 'destructive'
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
    case 'person_reimbursement': return UserCheck
    case 'purchase_order': return FileText
    case 'credit_card': return CreditCard
    default: return DollarSign
    }
  }

  const PaymentMethodIcon = getPaymentMethodIcon(expense.payment_method_type)

  return (
    <div className="space-y-6">
      {/* Expense Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{expense.description}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <PaymentMethodIcon className="h-4 w-4" />
                {expense.payment_method_name}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(expense.amount)}</div>
              <Badge variant={expense.is_overdue ? 'destructive' : expense.urgency_level === 'high' ? 'default' : 'secondary'}>
                {expense.is_overdue ? 'Overdue' : expense.urgency_level}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Submitted by:</span>
                <span>{expense.submitted_by_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{new Date(expense.submitted_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Category:</span>
                <Badge variant="outline" style={{ backgroundColor: expense.category_color + '20', color: expense.category_color }}>
                  {expense.category_name}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Vendor:</span>
                <span>{expense.vendor_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Expense #:</span>
                <span>{expense.expense_number}</span>
              </div>
              {expense.approval_deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Deadline:</span>
                  <span>{new Date(expense.approval_deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {expense.business_purpose && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="font-medium mb-2">Business Purpose</h4>
                <p className="text-sm text-muted-foreground">{expense.business_purpose}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Receipt Section */}
      {expense.receipt_filename && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">File:</span>
                <span className="text-sm font-medium">{expense.receipt_filename}</span>
              </div>
              <Button variant="outline" size="sm" onClick={downloadReceipt}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            {receiptData && receiptData.ocrText && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Extracted Text</h4>
                <div className="bg-muted p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                  {receiptData.ocrText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {expense.approval_history && expense.approval_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Approval History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalHistory history={expense.approval_history} />
          </CardContent>
        </Card>
      )}

      {/* Approval Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Decision</CardTitle>
          <CardDescription>
            Review the expense details and make your decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Approval Notes (Optional)</label>
            <Textarea
              placeholder="Add any comments or notes about this approval..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Rejection Reason (Required for rejection)</label>
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select rejection reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insufficient_documentation">Insufficient Documentation</SelectItem>
                <SelectItem value="exceeds_policy">Exceeds Company Policy</SelectItem>
                <SelectItem value="duplicate_expense">Duplicate Expense</SelectItem>
                <SelectItem value="incorrect_category">Incorrect Category</SelectItem>
                <SelectItem value="requires_additional_approval">Requires Additional Approval</SelectItem>
                <SelectItem value="business_purpose_unclear">Business Purpose Unclear</SelectItem>
                <SelectItem value="other">Other (specify in notes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Delegate To (Optional)</label>
            <Select value={delegateToUser} onValueChange={setDelegateToUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user to delegate to..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className=""
            >
              {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
            
            <Button
              onClick={handleReject}
              disabled={loading || !rejectionReason}
              variant="destructive"
            >
              {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            
            {delegateToUser && (
              <Button
                onClick={handleDelegate}
                disabled={loading}
                variant="outline"
              >
                {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                Delegate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}