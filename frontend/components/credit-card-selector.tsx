'use client'

import React, { useState, useEffect } from 'react'
import { 
  CreditCard,
  Search,
  CheckCircle,
  AlertTriangle,
  Shield,
  Lock,
  DollarSign,
  Calendar,
  Building,
  Info,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react'

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
import { apiClient } from '@/lib/api'

interface CompanyCreditCard {
  id: string
  cardName: string
  cardType: 'visa' | 'mastercard' | 'amex' | 'discover'
  last4Digits: string
  cardholderName: string
  issuingBank: string
  monthlyLimit: number
  monthlySpent: number
  remainingLimit: number
  billingCycle: {
    startDate: string
    endDate: string
    dueDate: string
  }
  status: 'active' | 'suspended' | 'expired' | 'cancelled'
  expirationDate: string
  authorizedUsers: Array<{
    id: string
    name: string
    email: string
    spendingLimit?: number
  }>
  restrictions: {
    categories?: string[]
    vendors?: string[]
    maxTransactionAmount?: number
    requiresApproval?: boolean
    approvalThreshold?: number
  }
  recentTransactions?: Array<{
    id: string
    amount: number
    merchant: string
    date: string
    category: string
    status: 'posted' | 'pending'
  }>
  securityFeatures: {
    hasChipAndPin: boolean
    hasContactless: boolean
    hasVirtualCard: boolean
    fraudProtection: boolean
  }
  department?: string
  projectCode?: string
  createdAt: string
  updatedAt: string
}

interface CreditCardSelectorProps {
  value?: string
  onSelect: (creditCardId: string) => void
  expectedAmount?: number
  vendorName?: string
  category?: string
  className?: string
}

export function CreditCardSelector({ 
  value, 
  onSelect, 
  expectedAmount = 0,
  vendorName,
  category,
  className 
}: CreditCardSelectorProps) {
  const [creditCards, setCreditCards] = useState<CompanyCreditCard[]>([])
  const [filteredCards, setFilteredCards] = useState<CompanyCreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<CompanyCreditCard | null>(null)
  const [showAllCards, setShowAllCards] = useState(false)
  const [showCardNumbers, setShowCardNumbers] = useState(false)

  useEffect(() => {
    loadCreditCards()
  }, [])

  useEffect(() => {
    filterCreditCards()
  }, [creditCards, searchQuery, expectedAmount, vendorName, category])

  useEffect(() => {
    if (value) {
      const card = creditCards.find(cc => cc.id === value)
      setSelectedCard(card || null)
    }
  }, [value, creditCards])

  const loadCreditCards = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getCompanyCreditCards({
        status: 'active',
        minRemainingLimit: 0
      })
      setCreditCards(response.creditCards || [])
    } catch (error) {
      console.error('Error loading credit cards:', error)
      toast({
        title: 'Error loading credit cards',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      })
      
      // Fallback with mock data for development
      setCreditCards([
        {
          id: 'cc-1',
          cardName: 'Corporate Amex',
          cardType: 'amex',
          last4Digits: '1234',
          cardholderName: 'COMPANY OPERATIONS',
          issuingBank: 'American Express',
          monthlyLimit: 25000,
          monthlySpent: 12500,
          remainingLimit: 12500,
          billingCycle: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            dueDate: '2024-02-15'
          },
          status: 'active',
          expirationDate: '2027-12-31',
          authorizedUsers: [
            {
              id: 'user-1',
              name: 'John Admin',
              email: 'admin@example.com',
              spendingLimit: 5000
            }
          ],
          restrictions: {
            categories: ['travel', 'office_supplies', 'meals'],
            maxTransactionAmount: 5000,
            requiresApproval: false
          },
          securityFeatures: {
            hasChipAndPin: true,
            hasContactless: true,
            hasVirtualCard: true,
            fraudProtection: true
          },
          department: 'Operations',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z'
        },
        {
          id: 'cc-2',
          cardName: 'Travel Card - Visa',
          cardType: 'visa',
          last4Digits: '5678',
          cardholderName: 'COMPANY TRAVEL',
          issuingBank: 'Chase Bank',
          monthlyLimit: 15000,
          monthlySpent: 8200,
          remainingLimit: 6800,
          billingCycle: {
            startDate: '2024-01-15',
            endDate: '2024-02-14',
            dueDate: '2024-03-01'
          },
          status: 'active',
          expirationDate: '2026-08-31',
          authorizedUsers: [
            {
              id: 'user-2',
              name: 'Jane Manager',
              email: 'manager@example.com',
              spendingLimit: 3000
            }
          ],
          restrictions: {
            categories: ['travel', 'hotels', 'transportation'],
            maxTransactionAmount: 2500,
            requiresApproval: true,
            approvalThreshold: 1000
          },
          securityFeatures: {
            hasChipAndPin: true,
            hasContactless: true,
            hasVirtualCard: false,
            fraudProtection: true
          },
          department: 'Travel',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-20T09:30:00Z'
        },
        {
          id: 'cc-3',
          cardName: 'Marketing Mastercard',
          cardType: 'mastercard',
          last4Digits: '9012',
          cardholderName: 'COMPANY MARKETING',
          issuingBank: 'Bank of America',
          monthlyLimit: 10000,
          monthlySpent: 9500,
          remainingLimit: 500,
          billingCycle: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            dueDate: '2024-02-20'
          },
          status: 'active',
          expirationDate: '2025-11-30',
          authorizedUsers: [
            {
              id: 'user-3',
              name: 'Mike Marketing',
              email: 'marketing@example.com',
              spendingLimit: 2000
            }
          ],
          restrictions: {
            categories: ['marketing', 'advertising', 'office_supplies'],
            maxTransactionAmount: 1000,
            requiresApproval: false
          },
          securityFeatures: {
            hasChipAndPin: true,
            hasContactless: true,
            hasVirtualCard: false,
            fraudProtection: true
          },
          department: 'Marketing',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-25T16:45:00Z'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const filterCreditCards = () => {
    let filtered = creditCards.filter(card => 
      card.status === 'active' && 
      card.remainingLimit > 0 &&
      new Date(card.expirationDate) > new Date()
    )

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.cardholderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.issuingBank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.last4Digits.includes(searchQuery) ||
        card.department?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by sufficient remaining limit
    if (expectedAmount > 0) {
      filtered = filtered.filter(card => card.remainingLimit >= expectedAmount)
    }

    // Filter by category restrictions
    if (category && category.length > 0) {
      filtered = filtered.filter(card => 
        !card.restrictions.categories || 
        card.restrictions.categories.length === 0 ||
        card.restrictions.categories.includes(category.toLowerCase())
      )
    }

    // Filter by vendor restrictions
    if (vendorName && vendorName.length > 0) {
      filtered = filtered.filter(card => 
        !card.restrictions.vendors || 
        card.restrictions.vendors.length === 0 ||
        card.restrictions.vendors.some(vendor => 
          vendor.toLowerCase().includes(vendorName.toLowerCase())
        )
      )
    }

    // Filter by transaction amount limits
    if (expectedAmount > 0) {
      filtered = filtered.filter(card => 
        !card.restrictions.maxTransactionAmount || 
        card.restrictions.maxTransactionAmount >= expectedAmount
      )
    }

    // Sort by remaining limit (highest first) and usage
    filtered.sort((a, b) => {
      // Prioritize cards with sufficient remaining limit
      if (expectedAmount > 0) {
        const aHasSufficient = a.remainingLimit >= expectedAmount
        const bHasSufficient = b.remainingLimit >= expectedAmount
        if (aHasSufficient && !bHasSufficient) return -1
        if (!aHasSufficient && bHasSufficient) return 1
      }
      
      // Sort by remaining limit percentage (higher percentage = better)
      const aUtilization = (a.monthlySpent / a.monthlyLimit) * 100
      const bUtilization = (b.monthlySpent / b.monthlyLimit) * 100
      const utilizationDiff = aUtilization - bUtilization
      
      if (utilizationDiff !== 0) return utilizationDiff
      
      return b.remainingLimit - a.remainingLimit
    })

    setFilteredCards(filtered)
  }

  const handleCardSelect = (card: CompanyCreditCard) => {
    // Validate remaining limit
    if (expectedAmount > card.remainingLimit) {
      toast({
        title: 'Insufficient credit limit',
        description: `Only $${card.remainingLimit.toFixed(2)} remaining on this card`,
        variant: 'destructive'
      })
      return
    }

    // Check transaction amount limit
    if (card.restrictions.maxTransactionAmount && expectedAmount > card.restrictions.maxTransactionAmount) {
      toast({
        title: 'Transaction limit exceeded',
        description: `This card has a transaction limit of $${card.restrictions.maxTransactionAmount.toFixed(2)}`,
        variant: 'destructive'
      })
      return
    }

    // Check expiration
    if (new Date(card.expirationDate) <= new Date()) {
      toast({
        title: 'Card expired',
        description: 'This credit card has expired and cannot be used',
        variant: 'destructive'
      })
      return
    }

    // Check if approval is required
    if (card.restrictions.requiresApproval && 
        card.restrictions.approvalThreshold && 
        expectedAmount >= card.restrictions.approvalThreshold) {
      toast({
        title: 'Approval required',
        description: `This transaction requires approval for amounts over $${card.restrictions.approvalThreshold.toFixed(2)}`
      })
    }

    setSelectedCard(card)
    onSelect(card.id)
  }

  const getCardTypeIcon = (type: string) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳'
    }
    return icons[type as keyof typeof icons] || '💳'
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default', text: 'Active', icon: CheckCircle },
      suspended: { variant: 'secondary', text: 'Suspended', icon: AlertTriangle },
      expired: { variant: 'destructive', text: 'Expired', icon: AlertTriangle },
      cancelled: { variant: 'destructive', text: 'Cancelled', icon: AlertTriangle }
    }

    const config = variants[status as keyof typeof variants] || variants.active
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getUtilization = (card: CompanyCreditCard) => {
    return (card.monthlySpent / card.monthlyLimit) * 100
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500'
    if (utilization >= 75) return 'bg-orange-500'
    if (utilization >= 50) return 'bg-yellow-500'
    return 'bg-emerald-500'
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

  const maskCardNumber = (last4: string) => {
    return showCardNumbers ? `**** **** **** ${last4}` : `**** ${last4}`
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner className="h-6 w-6 mr-2" />
          <span>Loading credit cards...</span>
        </CardContent>
      </Card>
    )
  }

  const displayCards = showAllCards ? filteredCards : filteredCards.slice(0, 3)

  return (
    <div className={className}>
      {/* Search and Filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="card-search">Search Company Credit Cards</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCardNumbers(!showCardNumbers)}
            className="text-xs"
          >
            {showCardNumbers ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
            {showCardNumbers ? 'Hide' : 'Show'} Numbers
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="card-search"
            placeholder="Search by card name, bank, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {expectedAmount > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing cards with at least {formatCurrency(expectedAmount)} available credit
          </p>
        )}
      </div>

      {/* Credit Cards List */}
      {filteredCards.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredCards.length} credit card{filteredCards.length === 1 ? '' : 's'} available
            </p>
            {filteredCards.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCards(!showAllCards)}
              >
                {showAllCards ? 'Show Less' : `Show All (${filteredCards.length})`}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {displayCards.map((card) => {
              const utilization = getUtilization(card)
              const isSelected = selectedCard?.id === card.id
              const hasSufficientCredit = expectedAmount === 0 || card.remainingLimit >= expectedAmount
              const meetsTransactionLimit = !card.restrictions.maxTransactionAmount || 
                                          expectedAmount <= card.restrictions.maxTransactionAmount
              const isUsable = hasSufficientCredit && meetsTransactionLimit
              
              return (
                <Card 
                  key={card.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : isUsable
                        ? 'border-border hover:border-primary/50'
                        : 'border-red-200 bg-red-50/30'
                  }`}
                  onClick={() => handleCardSelect(card)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-primary via-primary to-[hsl(var(--primary-gradient-to))] text-white theme-transition">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {card.cardName}
                              <span className="text-lg">{getCardTypeIcon(card.cardType)}</span>
                            </CardTitle>
                            <CardDescription className="text-sm font-mono">
                              {maskCardNumber(card.last4Digits)}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {card.issuingBank}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {formatDate(card.expirationDate)}
                          </div>
                          {card.department && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {card.department}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(card.status)}
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Credit Limit Information */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monthly Limit</p>
                          <p className="font-semibold">{formatCurrency(card.monthlyLimit)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Used</p>
                          <p className="font-semibold text-orange-600">{formatCurrency(card.monthlySpent)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Available</p>
                          <p className={`font-semibold ${
                            expectedAmount > 0 && card.remainingLimit < expectedAmount 
                              ? 'text-red-600' 
                              : 'text-emerald-600'
                          }`}>
                            {formatCurrency(card.remainingLimit)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Credit Utilization</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getUtilizationColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Warnings and Restrictions */}
                      <div className="space-y-2">
                        {expectedAmount > 0 && card.remainingLimit < expectedAmount && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              Insufficient credit available. Need {formatCurrency(expectedAmount)} but only {formatCurrency(card.remainingLimit)} available.
                            </AlertDescription>
                          </Alert>
                        )}

                        {card.restrictions.maxTransactionAmount && expectedAmount > card.restrictions.maxTransactionAmount && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              Transaction limit exceeded. Maximum transaction: {formatCurrency(card.restrictions.maxTransactionAmount)}
                            </AlertDescription>
                          </Alert>
                        )}

                        {card.restrictions.requiresApproval && 
                         card.restrictions.approvalThreshold && 
                         expectedAmount >= card.restrictions.approvalThreshold && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              Approval required for transactions over {formatCurrency(card.restrictions.approvalThreshold)}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Restrictions Summary */}
                      {(card.restrictions.categories?.length || 
                        card.restrictions.vendors?.length || 
                        card.restrictions.maxTransactionAmount) && (
                        <div className="space-y-2">
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Restrictions
                            </p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {card.restrictions.categories && card.restrictions.categories.length > 0 && (
                                <p>Categories: {card.restrictions.categories.join(', ')}</p>
                              )}
                              {card.restrictions.maxTransactionAmount && (
                                <p>Max transaction: {formatCurrency(card.restrictions.maxTransactionAmount)}</p>
                              )}
                              {card.restrictions.requiresApproval && (
                                <p>Requires approval for large transactions</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Security Features */}
                      <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                        {card.securityFeatures.hasChipAndPin && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Chip & PIN
                          </div>
                        )}
                        {card.securityFeatures.hasContactless && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Contactless
                          </div>
                        )}
                        {card.securityFeatures.fraudProtection && (
                          <div className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Fraud Protection
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
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No credit cards available</p>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : expectedAmount > 0
                  ? `No credit cards have sufficient available credit (${formatCurrency(expectedAmount)} required)`
                  : 'No active credit cards with available credit'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Card Summary */}
      {selectedCard && (
        <Alert className="mt-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Selected:</strong> {selectedCard.cardName} (*{selectedCard.last4Digits})
            <br />
            <span className="text-muted-foreground">
              {formatCurrency(selectedCard.remainingLimit)} available of {formatCurrency(selectedCard.monthlyLimit)} monthly limit
              {selectedCard.restrictions.requiresApproval && 
               selectedCard.restrictions.approvalThreshold && 
               expectedAmount >= selectedCard.restrictions.approvalThreshold && 
               ' • Approval required'}
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}