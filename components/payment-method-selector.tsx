"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { 
  CreditCard,
  User,
  FileText,
  Building,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Search,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface PaymentMethod {
  id: string
  name: string
  type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'
  description: string
  requiresApproval: boolean
  spendingLimit?: number
  monthlySpent?: number
  remainingBudget?: number
  restrictions?: string[]
  approvalWorkflow?: {
    stages: number
    estimatedDays: number
  }
  isActive: boolean
  confidence?: number
  reason?: string
}

interface PaymentMethodSelectorProps {
  value?: string
  onSelect: (paymentMethod: PaymentMethod) => void
  suggestions?: PaymentMethod[]
  receiptData?: {
    vendor?: string
    amount?: number
    category?: string
    extractedData?: any
  }
  expectedAmount?: number
  className?: string
}

export function PaymentMethodSelector({ 
  value, 
  onSelect, 
  suggestions = [],
  receiptData,
  expectedAmount = 0,
  className 
}: PaymentMethodSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [showAllMethods, setShowAllMethods] = useState(false)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  useEffect(() => {
    filterPaymentMethods()
  }, [paymentMethods, searchQuery, suggestions])

  useEffect(() => {
    if (value) {
      const method = paymentMethods.find(m => m.id === value)
      setSelectedMethod(method || null)
    }
  }, [value, paymentMethods])

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getPaymentMethods()
      setPaymentMethods(response.paymentMethods || [])
    } catch (error) {
      console.error('Error loading payment methods:', error)
      toast({
        title: 'Error loading payment methods',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterPaymentMethods = () => {
    let filtered = paymentMethods.filter(method => method.isActive)

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(method =>
        method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        method.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        method.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort by suggestions first, then by spending limits and usage
    filtered.sort((a, b) => {
      // Prioritize suggestions
      const aSuggested = suggestions.some(s => s.id === a.id)
      const bSuggested = suggestions.some(s => s.id === b.id)
      
      if (aSuggested && !bSuggested) return -1
      if (!aSuggested && bSuggested) return 1
      
      // Then sort by confidence if both are suggestions
      if (aSuggested && bSuggested) {
        const aConf = suggestions.find(s => s.id === a.id)?.confidence || 0
        const bConf = suggestions.find(s => s.id === b.id)?.confidence || 0
        return bConf - aConf
      }
      
      // Sort by remaining budget for non-suggestions
      const aRemaining = a.remainingBudget || Infinity
      const bRemaining = b.remainingBudget || Infinity
      return bRemaining - aRemaining
    })

    setFilteredMethods(filtered)
  }

  const handleMethodSelect = (method: PaymentMethod) => {
    // Validate spending limits
    if (method.spendingLimit && expectedAmount > method.spendingLimit) {
      toast({
        title: 'Amount exceeds spending limit',
        description: `This payment method has a limit of $${method.spendingLimit.toFixed(2)}`,
        variant: 'destructive',
      })
      return
    }

    // Check remaining budget
    if (method.remainingBudget && expectedAmount > method.remainingBudget) {
      toast({
        title: 'Insufficient budget remaining',
        description: `Only $${method.remainingBudget.toFixed(2)} remaining in budget`,
        variant: 'destructive',
      })
      return
    }

    setSelectedMethod(method)
    onSelect(method)
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'person_reimbursement':
        return <User className="h-5 w-5" />
      case 'purchase_order':
        return <FileText className="h-5 w-5" />
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />
      case 'direct_vendor':
        return <Building className="h-5 w-5" />
      default:
        return <DollarSign className="h-5 w-5" />
    }
  }

  const getMethodTypeLabel = (type: string) => {
    switch (type) {
      case 'person_reimbursement':
        return 'Personal Reimbursement'
      case 'purchase_order':
        return 'Purchase Order'
      case 'credit_card':
        return 'Company Credit Card'
      case 'direct_vendor':
        return 'Direct Vendor Payment'
      default:
        return 'Payment Method'
    }
  }

  const getBudgetUtilization = (method: PaymentMethod) => {
    if (!method.spendingLimit || !method.monthlySpent) return 0
    return (method.monthlySpent / method.spendingLimit) * 100
  }

  const getBudgetColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500'
    if (utilization >= 75) return 'bg-orange-500'
    if (utilization >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getSuggestionMethod = (methodId: string) => {
    return suggestions.find(s => s.id === methodId)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner className="h-6 w-6 mr-2" />
          <span>Loading payment methods...</span>
        </CardContent>
      </Card>
    )
  }

  // Group methods for better organization
  const suggestedMethods = filteredMethods.filter(method => 
    suggestions.some(s => s.id === method.id)
  )
  const otherMethods = filteredMethods.filter(method => 
    !suggestions.some(s => s.id === method.id)
  )

  const displayMethods = showAllMethods ? otherMethods : otherMethods.slice(0, 4)

  return (
    <div className={className}>
      {/* Search and Filter */}
      <div className="mb-6">
        <Label htmlFor="payment-search">Search Payment Methods</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="payment-search"
            placeholder="Search by name, type, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestedMethods.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">AI Suggestions</h3>
            <Badge variant="secondary">Based on receipt data</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {suggestedMethods.map((method) => {
              const suggestion = getSuggestionMethod(method.id)
              const utilization = getBudgetUtilization(method)
              
              return (
                <Card 
                  key={method.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                    selectedMethod?.id === method.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleMethodSelect(method)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                          {getMethodIcon(method.type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{method.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {getMethodTypeLabel(method.type)}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        {suggestion && (
                          <Badge variant="default" className="bg-blue-500">
                            {Math.round(suggestion.confidence * 100)}% match
                          </Badge>
                        )}
                        {selectedMethod?.id === method.id && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {method.description}
                    </p>
                    
                    {suggestion?.reason && (
                      <Alert className="mb-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>Why suggested:</strong> {suggestion.reason}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Budget Information */}
                    {method.spendingLimit && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Usage</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getBudgetColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>${method.monthlySpent?.toFixed(2) || '0.00'} spent</span>
                          <span>${method.spendingLimit.toFixed(2)} limit</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Approval Information */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {method.requiresApproval ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {method.approvalWorkflow?.estimatedDays || 2}-day approval
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Auto-approved
                        </div>
                      )}
                      
                      {method.restrictions && method.restrictions.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Has restrictions
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Other Payment Methods */}
      {otherMethods.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Other Payment Methods</h3>
            {otherMethods.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllMethods(!showAllMethods)}
              >
                {showAllMethods ? 'Show Less' : `Show All (${otherMethods.length})`}
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayMethods.map((method) => {
              const utilization = getBudgetUtilization(method)
              
              return (
                <Card 
                  key={method.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                    selectedMethod?.id === method.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleMethodSelect(method)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                          {getMethodIcon(method.type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{method.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {getMethodTypeLabel(method.type)}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {selectedMethod?.id === method.id && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {method.description}
                    </p>
                    
                    {/* Budget Information */}
                    {method.spendingLimit && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Usage</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getBudgetColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>${method.monthlySpent?.toFixed(2) || '0.00'} spent</span>
                          <span>${method.spendingLimit.toFixed(2)} limit</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Approval Information */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {method.requiresApproval ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {method.approvalWorkflow?.estimatedDays || 2}-day approval
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Auto-approved
                        </div>
                      )}
                      
                      {method.restrictions && method.restrictions.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Has restrictions
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* No Methods Found */}
      {filteredMethods.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No payment methods found</p>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'No payment methods are currently available'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Method Details */}
      {selectedMethod && (
        <Alert className="mt-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Selected:</strong> {selectedMethod.name} - {getMethodTypeLabel(selectedMethod.type)}
            {selectedMethod.requiresApproval && (
              <span className="ml-2 text-muted-foreground">
                (Requires approval - estimated {selectedMethod.approvalWorkflow?.estimatedDays || 2} days)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}