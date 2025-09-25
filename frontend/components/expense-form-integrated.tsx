'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  X,
  DollarSign,
  Calendar,
  Tag,
  Receipt,
  Sparkles,
  Save,
  Send,
  Brain
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface ExtractedData {
  merchant: string
  date: string
  amount: number
  category: string
  items: Array<{ description: string; amount: number }>
  confidence: number
}

interface ReceiptUploadData {
  id: string
  filename: string
  extractedData?: ExtractedData
  status: string
}

interface ExpenseCategory {
  id: string
  name: string
  code: string
  color_code: string
}

interface PaymentMethod {
  id: string
  name: string
  type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'
  requires_approval: boolean
  spending_limit?: number
}

interface ExpenseFormIntegratedProps {
  onExpenseCreated?: () => void
  className?: string
}

export function ExpenseFormIntegrated({ onExpenseCreated, className }: ExpenseFormIntegratedProps) {
  // Receipt upload state
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptUploadData | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  
  // Form data
  const [formData, setFormData] = useState({
    receiptId: '',
    amount: '',
    vendorName: '',
    transactionDate: '',
    categoryId: '',
    description: '',
    businessPurpose: '',
    paymentMethodId: '',
    expenseUrgency: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCategories()
    loadPaymentMethods()
  }, [])

  // Auto-fill form when receipt data is extracted
  useEffect(() => {
    if (receiptData?.extractedData) {
      const extracted = receiptData.extractedData
      setFormData(prev => ({
        ...prev,
        receiptId: receiptData.id,
        amount: extracted.amount?.toString() || prev.amount,
        vendorName: extracted.merchant || prev.vendorName,
        transactionDate: extracted.date || prev.transactionDate,
        description: extracted.items?.[0]?.description || `Purchase from ${extracted.merchant}` || prev.description
      }))
      
      // Auto-select category if we can match it
      if (extracted.category && categories.length > 0) {
        const matchedCategory = categories.find(cat => 
          cat.name.toLowerCase().includes(extracted.category.toLowerCase()) ||
          extracted.category.toLowerCase().includes(cat.name.toLowerCase())
        )
        if (matchedCategory) {
          setFormData(prev => ({ ...prev, categoryId: matchedCategory.id }))
        }
      }

      toast({
        title: 'Receipt Data Extracted',
        description: `Auto-filled form with data from ${extracted.merchant}. Please review and edit as needed.`
      })
    }
  }, [receiptData, categories])

  const loadCategories = async () => {
    try {
      const response = await apiClient.request('/expenses/categories')
      setCategories(response.categories || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadPaymentMethods = async () => {
    try {
      const response = await apiClient.request('/payment-methods')
      setPaymentMethods(response.paymentMethods || [])
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `${file.name} is not a supported file type`,
        variant: 'destructive'
      })
      return
    }
    
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `${file.name} is larger than 10MB`,
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('receipt', file)
      formData.append('businessPurpose', 'Business expense')
      formData.append('expenseUrgency', 'normal')

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await apiClient.uploadReceipt(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (response.receipt) {
        // Fetch the processed receipt data
        setTimeout(async () => {
          try {
            const receiptDetails = await apiClient.request(`/expenses/receipts/${response.receipt.id}`)
            setReceiptData({
              id: response.receipt.id,
              filename: response.receipt.filename,
              extractedData: receiptDetails.receipt?.extractedData,
              status: receiptDetails.receipt?.status || 'completed'
            })
            
            toast({
              title: 'Receipt Uploaded Successfully',
              description: 'Processing receipt data...'
            })
          } catch (error) {
            console.error('Error fetching receipt details:', error)
            setReceiptData({
              id: response.receipt.id,
              filename: response.receipt.filename,
              status: 'completed'
            })
          }
        }, 2000)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload receipt',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!receiptData?.id) {
      toast({
        title: 'Receipt Required',
        description: 'Please upload a receipt first',
        variant: 'destructive'
      })
      return
    }

    if (!formData.paymentMethodId) {
      toast({
        title: 'Payment Method Required',
        description: 'Please select a payment method',
        variant: 'destructive'
      })
      return
    }

    if (!formData.businessPurpose) {
      toast({
        title: 'Business Purpose Required',
        description: 'Please provide a business purpose for this expense',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const expenseData = {
        receiptId: receiptData.id,
        paymentMethodId: formData.paymentMethodId,
        amount: parseFloat(formData.amount),
        vendorName: formData.vendorName,
        transactionDate: formData.transactionDate,
        categoryId: formData.categoryId || undefined,
        description: formData.description,
        businessPurpose: formData.businessPurpose,
        expenseUrgency: formData.expenseUrgency
      }

      await apiClient.createExpense(expenseData)
      
      toast({
        title: 'Expense Created',
        description: 'Your expense has been submitted successfully'
      })

      // Reset form
      setFormData({
        receiptId: '',
        amount: '',
        vendorName: '',
        transactionDate: '',
        categoryId: '',
        description: '',
        businessPurpose: '',
        paymentMethodId: '',
        expenseUrgency: 'normal'
      })
      setReceiptData(null)
      setUploadProgress(0)

      onExpenseCreated?.()
    } catch (error: any) {
      console.error('Submit error:', error)
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to create expense',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Receipt Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receipt Upload
            </CardTitle>
            <CardDescription>
              Upload your receipt for automatic data extraction
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!receiptData ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {isUploading ? (
                  <div className="space-y-4">
                    <Brain className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-medium">Uploading and Processing...</p>
                      <Progress value={uploadProgress} className="mt-2" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Drop your receipt here, or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports PNG, JPG, WEBP, GIF, PDF (max 10MB)
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <FileText className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">{receiptData.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {receiptData.extractedData ? 
                      `Data extracted with ${Math.round((receiptData.extractedData.confidence || 0) * 100)}% confidence` :
                      'Receipt uploaded successfully'
                    }
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setReceiptData(null)
                    setFormData(prev => ({ ...prev, receiptId: '' }))
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {receiptData && (
          <>
            {/* Extracted Data Preview */}
            {receiptData.extractedData && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <strong>AI extracted:</strong> {receiptData.extractedData.merchant} • 
                  ${receiptData.extractedData.amount} • {receiptData.extractedData.date}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Review and edit the information below as needed
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Expense Details Form */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>
                  Review and complete the expense information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendorName">Vendor Name *</Label>
                    <Input
                      id="vendorName"
                      value={formData.vendorName}
                      onChange={(e) => updateFormData('vendorName', e.target.value)}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => updateFormData('amount', e.target.value)}
                        placeholder="0.00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="transactionDate">Transaction Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="transactionDate"
                        type="date"
                        value={formData.transactionDate}
                        onChange={(e) => updateFormData('transactionDate', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="categoryId">Category</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => updateFormData('categoryId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color_code }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Brief description of the expense"
                  />
                </div>

                <div>
                  <Label htmlFor="businessPurpose">Business Purpose *</Label>
                  <Textarea
                    id="businessPurpose"
                    value={formData.businessPurpose}
                    onChange={(e) => updateFormData('businessPurpose', e.target.value)}
                    placeholder="Explain the business purpose for this expense"
                    rows={3}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Select how this expense was paid
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethodId === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => updateFormData('paymentMethodId', method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{method.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {method.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.requires_approval && (
                            <Badge variant="outline">Requires Approval</Badge>
                          )}
                          {method.spending_limit && (
                            <Badge variant="secondary">
                              Limit: ${method.spending_limit.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Expense
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}