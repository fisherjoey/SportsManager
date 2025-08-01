"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { 
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  Calendar,
  Building,
  Info,
  TrendingUp,
  Package
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface PurchaseOrder {
  id: string
  poNumber: string
  description: string
  vendorName: string
  originalAmount: number
  remainingAmount: number
  spentAmount: number
  status: 'draft' | 'approved' | 'pending' | 'closed' | 'cancelled'
  approvedBy?: {
    id: string
    name: string
    email: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  department?: string
  projectCode?: string
  expirationDate?: string
  createdAt: string
  updatedAt: string
  lineItems?: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    remainingAmount: number
  }>
  restrictions?: string[]
  approvalNotes?: string
}

interface PurchaseOrderSelectorProps {
  value?: string
  onSelect: (purchaseOrderId: string) => void
  expectedAmount?: number
  vendorName?: string
  className?: string
}

export function PurchaseOrderSelector({ 
  value, 
  onSelect, 
  expectedAmount = 0,
  vendorName,
  className 
}: PurchaseOrderSelectorProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [showAllOrders, setShowAllOrders] = useState(false)

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  useEffect(() => {
    filterPurchaseOrders()
  }, [purchaseOrders, searchQuery, vendorName, expectedAmount])

  useEffect(() => {
    if (value) {
      const order = purchaseOrders.find(po => po.id === value)
      setSelectedOrder(order || null)
    }
  }, [value, purchaseOrders])

  const loadPurchaseOrders = async () => {
    try {
      setIsLoading(true)
      // Using a mock API call since we need to add this to the API client
      const response = await fetch('/api/purchase-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load purchase orders')
      }
      
      const data = await response.json()
      setPurchaseOrders(data.purchaseOrders || [])
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      toast({
        title: 'Error loading purchase orders',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      })
      
      // Fallback with mock data for development
      setPurchaseOrders([
        {
          id: 'po-1',
          poNumber: 'PO-2024-001',
          description: 'Office Supplies & Equipment',
          vendorName: 'Office Depot',
          originalAmount: 5000,
          remainingAmount: 3200,
          spentAmount: 1800,
          status: 'approved',
          createdBy: {
            id: 'user-1',
            name: 'John Admin',
            email: 'admin@example.com'
          },
          department: 'Operations',
          projectCode: 'OP-2024-Q1',
          expirationDate: '2024-12-31',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z',
          lineItems: [
            {
              id: 'li-1',
              description: 'Computer Equipment',
              quantity: 5,
              unitPrice: 800,
              totalPrice: 4000,
              remainingAmount: 2400
            },
            {
              id: 'li-2',
              description: 'Office Supplies',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
              remainingAmount: 800
            }
          ]
        },
        {
          id: 'po-2',
          poNumber: 'PO-2024-002',
          description: 'Marketing Materials',
          vendorName: 'PrintCorp',
          originalAmount: 2500,
          remainingAmount: 1200,
          spentAmount: 1300,
          status: 'approved',
          createdBy: {
            id: 'user-2',
            name: 'Jane Manager',
            email: 'manager@example.com'
          },
          department: 'Marketing',
          projectCode: 'MKT-2024-Q1',
          expirationDate: '2024-06-30',
          createdAt: '2024-02-01T09:00:00Z',
          updatedAt: '2024-02-05T11:15:00Z'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const filterPurchaseOrders = () => {
    let filtered = purchaseOrders.filter(po => 
      po.status === 'approved' && 
      po.remainingAmount > 0 &&
      (!po.expirationDate || new Date(po.expirationDate) > new Date())
    )

    // Filter by vendor name if provided
    if (vendorName) {
      filtered = filtered.filter(po => 
        po.vendorName.toLowerCase().includes(vendorName.toLowerCase())
      )
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(po =>
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.projectCode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by sufficient remaining amount
    if (expectedAmount > 0) {
      filtered = filtered.filter(po => po.remainingAmount >= expectedAmount)
    }

    // Sort by remaining amount (highest first) and creation date
    filtered.sort((a, b) => {
      // Prioritize orders with sufficient remaining budget
      if (expectedAmount > 0) {
        const aHasSufficient = a.remainingAmount >= expectedAmount
        const bHasSufficient = b.remainingAmount >= expectedAmount
        if (aHasSufficient && !bHasSufficient) return -1
        if (!aHasSufficient && bHasSufficient) return 1
      }
      
      // Sort by remaining amount, then by creation date
      const amountDiff = b.remainingAmount - a.remainingAmount
      if (amountDiff !== 0) return amountDiff
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    setFilteredOrders(filtered)
  }

  const handleOrderSelect = (order: PurchaseOrder) => {
    // Validate remaining amount
    if (expectedAmount > order.remainingAmount) {
      toast({
        title: 'Insufficient budget remaining',
        description: `Only $${order.remainingAmount.toFixed(2)} remaining in this PO`,
        variant: 'destructive',
      })
      return
    }

    // Check expiration
    if (order.expirationDate && new Date(order.expirationDate) <= new Date()) {
      toast({
        title: 'Purchase order expired',
        description: 'This purchase order has expired and cannot be used',
        variant: 'destructive',
      })
      return
    }

    setSelectedOrder(order)
    onSelect(order.id)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'outline', text: 'Draft', icon: Clock },
      pending: { variant: 'secondary', text: 'Pending', icon: Clock },
      approved: { variant: 'default', text: 'Approved', icon: CheckCircle },
      closed: { variant: 'secondary', text: 'Closed', icon: Package },
      cancelled: { variant: 'destructive', text: 'Cancelled', icon: AlertTriangle }
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

  const getBudgetUtilization = (order: PurchaseOrder) => {
    return (order.spentAmount / order.originalAmount) * 100
  }

  const getBudgetColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500'
    if (utilization >= 75) return 'bg-orange-500'
    if (utilization >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner className="h-6 w-6 mr-2" />
          <span>Loading purchase orders...</span>
        </CardContent>
      </Card>
    )
  }

  const displayOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, 4)

  return (
    <div className={className}>
      {/* Search and Filter */}
      <div className="mb-6">
        <Label htmlFor="po-search">Search Purchase Orders</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="po-search"
            placeholder="Search by PO number, description, vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {expectedAmount > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing purchase orders with at least {formatCurrency(expectedAmount)} remaining
          </p>
        )}
      </div>

      {/* Purchase Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} purchase order{filteredOrders.length === 1 ? '' : 's'} available
            </p>
            {filteredOrders.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllOrders(!showAllOrders)}
              >
                {showAllOrders ? 'Show Less' : `Show All (${filteredOrders.length})`}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {displayOrders.map((order) => {
              const utilization = getBudgetUtilization(order)
              const isSelected = selectedOrder?.id === order.id
              const hasSufficientBudget = expectedAmount === 0 || order.remainingAmount >= expectedAmount
              
              return (
                <Card 
                  key={order.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : hasSufficientBudget
                        ? 'border-border hover:border-primary/50'
                        : 'border-red-200 bg-red-50/30'
                  }`}
                  onClick={() => handleOrderSelect(order)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{order.poNumber}</CardTitle>
                            <CardDescription className="text-sm">
                              {order.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {order.vendorName}
                          </div>
                          {order.department && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {order.department}
                            </div>
                          )}
                          {order.expirationDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {formatDate(order.expirationDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(order.status)}
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Budget Information */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Original</p>
                          <p className="font-semibold">{formatCurrency(order.originalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Spent</p>
                          <p className="font-semibold text-orange-600">{formatCurrency(order.spentAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className={`font-semibold ${
                            expectedAmount > 0 && order.remainingAmount < expectedAmount 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {formatCurrency(order.remainingAmount)}
                          </p>
                        </div>
                      </div>

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
                      </div>

                      {/* Warning for insufficient budget */}
                      {expectedAmount > 0 && order.remainingAmount < expectedAmount && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Insufficient remaining budget. Need {formatCurrency(expectedAmount)} but only {formatCurrency(order.remainingAmount)} available.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Line Items Preview */}
                      {order.lineItems && order.lineItems.length > 0 && (
                        <div className="space-y-2">
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-2">Line Items</p>
                            <div className="space-y-1">
                              {order.lineItems.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{item.description}</span>
                                  <span>{formatCurrency(item.remainingAmount)} remaining</span>
                                </div>
                              ))}
                              {order.lineItems.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +{order.lineItems.length - 2} more line items
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Created by {order.createdBy.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(order.createdAt)}
                        </div>
                        {order.projectCode && (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {order.projectCode}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No purchase orders available</p>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : expectedAmount > 0
                  ? `No purchase orders have sufficient budget (${formatCurrency(expectedAmount)} required)`
                  : 'No approved purchase orders with remaining budget'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Order Summary */}
      {selectedOrder && (
        <Alert className="mt-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Selected:</strong> {selectedOrder.poNumber} - {selectedOrder.description}
            <br />
            <span className="text-muted-foreground">
              {formatCurrency(selectedOrder.remainingAmount)} remaining of {formatCurrency(selectedOrder.originalAmount)} original budget
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}