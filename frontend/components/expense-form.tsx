'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload,
  Camera,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  DollarSign,
  Building,
  Calendar,
  Tag,
  CreditCard,
  Receipt,
  Sparkles,
  Eye,
  Save,
  Send,
  Brain
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { PaymentMethodSelector } from '@/components/payment-method-selector'
import { ReceiptUpload } from '@/components/receipt-upload'
import { PurchaseOrderSelector } from '@/components/purchase-order-selector'
import { CreditCardSelector } from '@/components/credit-card-selector'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

// Form validation schema
const expenseFormSchema = z.object({
  receiptId: z.string().uuid('Please upload a receipt first'),
  paymentMethodId: z.string().uuid('Please select a payment method'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  businessPurpose: z.string().min(1, 'Business purpose is required'),
  projectCode: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  creditCardId: z.string().optional(),
  expenseUrgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  urgencyJustification: z.string().optional()
})

type ExpenseFormData = z.infer<typeof expenseFormSchema>

interface ExpenseCategory {
  id: string
  name: string
  code: string
  color_code: string
  description: string
  keywords: string[]
}

interface PaymentMethod {
  id: string
  name: string
  type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'
  requiresApproval: boolean
  spendingLimit?: number
  description: string
}

interface ExpenseFormProps {
  onSubmit?: (data: ExpenseFormData) => Promise<void>
  onSaveDraft?: (data: Partial<ExpenseFormData>) => Promise<void>
  initialData?: Partial<ExpenseFormData>
  mode?: 'create' | 'edit'
  className?: string
}

export function ExpenseForm({ 
  onSubmit, 
  onSaveDraft, 
  initialData, 
  mode = 'create',
  className 
}: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [uploadedReceiptData, setUploadedReceiptData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [detectedPaymentMethods, setDetectedPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true)

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expenseUrgency: 'normal',
      amount: 0,
      vendorName: '',
      transactionDate: new Date().toISOString().split('T')[0],
      description: '',
      businessPurpose: '',
      projectCode: '',
      ...initialData
    },
    mode: 'onChange'
  })

  const { watch, setValue, trigger } = form

  // Watch for changes to auto-populate fields
  const receiptId = watch('receiptId')
  const paymentMethodId = watch('paymentMethodId')
  const vendorName = watch('vendorName')
  const amount = watch('amount')
  const expenseUrgency = watch('expenseUrgency')

  // Load expense categories
  useEffect(() => {
    loadCategories()
  }, [])

  // Auto-detect payment method when receipt data changes
  useEffect(() => {
    if (receiptId && vendorName && amount && autoDetectionEnabled) {
      detectPaymentMethod()
    }
  }, [receiptId, vendorName, amount, autoDetectionEnabled])

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await apiClient.getExpenseCategories()
      setCategories(response.categories || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast({
        title: 'Error loading categories',
        description: 'Using default categories. Please check your connection.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const detectPaymentMethod = async () => {
    try {
      const response = await apiClient.detectPaymentMethod({
        receiptId,
        vendorName,
        amount,
        urgency: expenseUrgency
      })
      
      setDetectedPaymentMethods(response.suggestions || [])
      
      // Auto-select the highest confidence suggestion
      if (response.suggestions && response.suggestions.length > 0) {
        const topSuggestion = response.suggestions[0]
        if (topSuggestion.confidence > 0.8) {
          setValue('paymentMethodId', topSuggestion.id)
          setSelectedPaymentMethod(topSuggestion)
          
          toast({
            title: 'Payment method detected',
            description: `Auto-selected ${topSuggestion.name} (${Math.round(topSuggestion.confidence * 100)}% confidence)`
          })
        }
      }
    } catch (error) {
      console.error('Payment method detection failed:', error)
      // Silently fail - this is an enhancement feature
    }
  }

  const handleReceiptUpload = useCallback((receiptData: any) => {
    setUploadedReceiptData(receiptData)
    setValue('receiptId', receiptData.id)
    
    // Auto-populate fields from extracted data
    if (receiptData.extractedData) {
      const extracted = receiptData.extractedData
      
      if (extracted.merchant) {
        setValue('vendorName', extracted.merchant)
      }
      
      if (extracted.amount) {
        setValue('amount', extracted.amount)
      }
      
      if (extracted.date) {
        setValue('transactionDate', extracted.date)
      }
      
      if (extracted.category) {
        const matchingCategory = categories.find(cat => 
          cat.name.toLowerCase() === extracted.category.toLowerCase()
        )
        if (matchingCategory) {
          setValue('categoryId', matchingCategory.id)
        }
      }
      
      // Auto-generate description from items if available
      if (extracted.items && extracted.items.length > 0) {
        const itemDescriptions = extracted.items
          .slice(0, 3)
          .map((item: any) => item.description)
          .join(', ')
        setValue('description', itemDescriptions)
      }
      
      toast({
        title: 'Receipt data extracted',
        description: `Auto-populated fields with ${Math.round(extracted.confidence * 100)}% confidence`
      })
    }
    
    trigger() // Validate form after auto-population
  }, [setValue, categories, trigger])

  const handlePaymentMethodSelect = useCallback((paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod)
    setValue('paymentMethodId', paymentMethod.id)
    
    // Clear dependent fields when payment method changes
    setValue('purchaseOrderId', undefined)
    setValue('creditCardId', undefined)
    
    trigger('paymentMethodId')
  }, [setValue, trigger])

  const handleFormSubmit = async (data: ExpenseFormData) => {
    try {
      setIsSubmitting(true)
      
      // Validate required dependencies
      if (selectedPaymentMethod?.type === 'purchase_order' && !data.purchaseOrderId) {
        toast({
          title: 'Purchase Order Required',
          description: 'Please select a purchase order for this payment method.',
          variant: 'destructive'
        })
        return
      }
      
      if (selectedPaymentMethod?.type === 'credit_card' && !data.creditCardId) {
        toast({
          title: 'Credit Card Required',
          description: 'Please select a credit card for this payment method.',
          variant: 'destructive'
        })
        return
      }
      
      // Use the enhanced expense creation API if no custom onSubmit handler is provided
      if (!onSubmit) {
        await apiClient.createExpense(data)
      } else {
        await onSubmit(data)
      }
      
      toast({
        title: 'Expense submitted successfully',
        description: 'Your expense has been submitted for processing.'
      })
      
      // Reset form after successful submission
      form.reset()
      setUploadedReceiptData(null)
      setSelectedPaymentMethod(null)
      setDetectedPaymentMethods([])
      
    } catch (error) {
      console.error('Form submission error:', error)
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true)
      const currentData = form.getValues()
      
      // Use the enhanced draft saving API if no custom onSaveDraft handler is provided
      if (!onSaveDraft) {
        await apiClient.saveDraftExpense(currentData)
      } else {
        await onSaveDraft(currentData)
      }
      
      toast({
        title: 'Draft saved',
        description: 'Your expense draft has been saved.'
      })
    } catch (error) {
      console.error('Save draft error:', error)
      toast({
        title: 'Save failed',
        description: 'Unable to save draft. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  const togglePreview = () => {
    setShowPreview(!showPreview)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
    case 'urgent': return cn(getStatusColorClass('error', 'text'), getStatusColorClass('error', 'bg'), getStatusColorClass('error', 'border'))
    case 'high': return cn(getStatusColorClass('warning', 'text'), getStatusColorClass('warning', 'bg'), getStatusColorClass('warning', 'border'))
    case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === 'edit' ? 'Edit Expense' : 'Create Expense'}
            </h2>
            <p className="text-muted-foreground">
              Upload receipts and manage expense submissions with AI-powered processing
            </p>
          </div>
          
          {detectedPaymentMethods.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Suggestions Available
            </Badge>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            {/* Receipt Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receipt Upload
                </CardTitle>
                <CardDescription>
                  Upload your receipt for AI-powered data extraction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReceiptUpload
                  onReceiptUpload={handleReceiptUpload}
                  maxFiles={1}
                  showPreview={true}
                  autoProcess={true}
                />
                
                <FormField
                  control={form.control}
                  name="receiptId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Choose how this expense should be paid
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="paymentMethodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PaymentMethodSelector
                          value={field.value}
                          onSelect={handlePaymentMethodSelect}
                          suggestions={detectedPaymentMethods}
                          receiptData={uploadedReceiptData}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Purchase Order Selection (conditional) */}
                {selectedPaymentMethod?.type === 'purchase_order' && (
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="purchaseOrderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Order</FormLabel>
                          <FormControl>
                            <PurchaseOrderSelector
                              value={field.value}
                              onSelect={(poId) => setValue('purchaseOrderId', poId)}
                              expectedAmount={amount}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Credit Card Selection (conditional) */}
                {selectedPaymentMethod?.type === 'credit_card' && (
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="creditCardId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Credit Card</FormLabel>
                          <FormControl>
                            <CreditCardSelector
                              value={field.value}
                              onSelect={(cardId) => setValue('creditCardId', cardId)}
                              expectedAmount={amount}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Expense Details
                </CardTitle>
                <CardDescription>
                  Complete the expense information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="vendorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Vendor Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter vendor name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Amount
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transactionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Transaction Date
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Category
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingCategories ? (
                              <div className="p-2 text-center">
                                <LoadingSpinner className="h-4 w-4 mx-auto" />
                              </div>
                            ) : (
                              categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: category.color_code }}
                                    />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Description and Business Purpose */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the expense"
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description of what was purchased
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Purpose</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Explain the business purpose of this expense"
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Required: Explain why this expense was necessary for business
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional project code" {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional project or cost center code
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Urgency Settings */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="expenseUrgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency Level</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                Low Priority
                              </div>
                            </SelectItem>
                            <SelectItem value="normal">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                Normal Priority
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                                High Priority
                              </div>
                            </SelectItem>
                            <SelectItem value="urgent">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                Urgent
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(expenseUrgency === 'high' || expenseUrgency === 'urgent') && (
                    <FormField
                      control={form.control}
                      name="urgencyJustification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgency Justification</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Explain why this expense is urgent"
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Required for high priority and urgent expenses
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview Section */}
            {showPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Expense Preview
                  </CardTitle>
                  <CardDescription>
                    Review your expense before submission
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Vendor</p>
                        <p className="font-medium">{vendorName || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium text-lg">
                          ${amount?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{selectedPaymentMethod?.name || 'Not selected'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Urgency</p>
                        <Badge className={getUrgencyColor(expenseUrgency)}>
                          {expenseUrgency}
                        </Badge>
                      </div>
                    </div>
                    
                    {form.watch('businessPurpose') && (
                      <div>
                        <p className="text-muted-foreground text-sm">Business Purpose</p>
                        <p className="text-sm mt-1">{form.watch('businessPurpose')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <div className="flex flex-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={togglePreview}
                  className="flex-1 sm:flex-none"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </Button>
                
                {onSaveDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="flex-1 sm:flex-none"
                  >
                    {isSavingDraft ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Draft
                  </Button>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="flex-1 sm:flex-none sm:min-w-[120px]"
                size="mobile"
              >
                {isSubmitting ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {mode === 'edit' ? 'Update Expense' : 'Submit Expense'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}