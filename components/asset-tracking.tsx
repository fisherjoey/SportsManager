"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  Package,
  Laptop,
  Smartphone,
  Monitor,
  Printer,
  Car,
  Building2,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  QrCode,
  FileText,
  Wrench
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface Asset {
  id: string
  name: string
  category: string
  type: string
  serialNumber: string
  assetTag: string
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost'
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  purchaseDate: string
  purchasePrice: number
  currentValue: number
  depreciationRate: number
  warrantyExpiry?: string
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  assignedDate?: string
  location: {
    id: string
    name: string
    address: string
  }
  vendor: {
    id: string
    name: string
    contact?: string
  }
  specifications: Record<string, any>
  maintenanceHistory: Array<{
    id: string
    date: string
    type: 'repair' | 'cleaning' | 'upgrade' | 'inspection'
    description: string
    cost?: number
    performedBy: string
  }>
  nextMaintenanceDate?: string
  notes?: string
  images: string[]
}

interface AssetFilters {
  search: string
  category: string
  status: string
  condition: string
  location: string
  assignedTo: string
}

const ASSET_CATEGORIES = [
  { value: 'computer', label: 'Computers', icon: Laptop },
  { value: 'mobile', label: 'Mobile Devices', icon: Smartphone },
  { value: 'monitor', label: 'Monitors', icon: Monitor },
  { value: 'printer', label: 'Printers', icon: Printer },
  { value: 'vehicle', label: 'Vehicles', icon: Car },
  { value: 'furniture', label: 'Furniture', icon: Building2 },
  { value: 'other', label: 'Other', icon: Package }
]

export function AssetTracking() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false)
  const [filters, setFilters] = useState<AssetFilters>({
    search: '',
    category: '',
    status: '',
    condition: '',
    location: '',
    assignedTo: ''
  })

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [assets, filters])

  const loadAssets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to load assets')
      
      const data = await response.json()
      setAssets(data)
    } catch (error) {
      console.error('Error loading assets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assets',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = assets

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchLower) ||
        asset.serialNumber.toLowerCase().includes(searchLower) ||
        asset.assetTag.toLowerCase().includes(searchLower) ||
        asset.assignedTo?.name.toLowerCase().includes(searchLower)
      )
    }

    if (filters.category) {
      filtered = filtered.filter(asset => asset.category === filters.category)
    }

    if (filters.status) {
      filtered = filtered.filter(asset => asset.status === filters.status)
    }

    if (filters.condition) {
      filtered = filtered.filter(asset => asset.condition === filters.condition)
    }

    if (filters.location) {
      filtered = filtered.filter(asset => asset.location.id === filters.location)
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(asset => asset.assignedTo?.id === filters.assignedTo)
    }

    setFilteredAssets(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { variant: 'default', icon: CheckCircle, text: 'Available', color: 'bg-green-100 text-green-800' },
      assigned: { variant: 'secondary', icon: User, text: 'Assigned', color: 'bg-blue-100 text-blue-800' },
      maintenance: { variant: 'secondary', icon: Wrench, text: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
      retired: { variant: 'outline', icon: Package, text: 'Retired', color: 'bg-gray-100 text-gray-800' },
      lost: { variant: 'destructive', icon: AlertTriangle, text: 'Lost', color: 'bg-red-100 text-red-800' }
    }

    const config = variants[status as keyof typeof variants] || variants.available
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getConditionBadge = (condition: string) => {
    const variants = {
      excellent: { variant: 'default', text: 'Excellent', color: 'bg-green-100 text-green-800' },
      good: { variant: 'secondary', text: 'Good', color: 'bg-blue-100 text-blue-800' },
      fair: { variant: 'secondary', text: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
      poor: { variant: 'destructive', text: 'Poor', color: 'bg-red-100 text-red-800' }
    }

    const config = variants[condition as keyof typeof variants] || variants.good
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {config.text}
      </Badge>
    )
  }

  const getCategoryIcon = (category: string) => {
    const categoryConfig = ASSET_CATEGORIES.find(cat => cat.value === category)
    const Icon = categoryConfig?.icon || Package
    return <Icon className="h-4 w-4" />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleCheckout = async (assetId: string, employeeId: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })

      if (!response.ok) throw new Error('Failed to checkout asset')

      toast({
        title: 'Success',
        description: 'Asset checked out successfully',
      })

      setShowCheckoutDialog(false)
      loadAssets()
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: 'Failed to checkout asset',
        variant: 'destructive',
      })
    }
  }

  const handleCheckin = async (assetId: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/checkin`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to checkin asset')

      toast({
        title: 'Success',
        description: 'Asset checked in successfully',
      })

      loadAssets()
    } catch (error) {
      console.error('Checkin error:', error)
      toast({
        title: 'Error',
        description: 'Failed to checkin asset',
        variant: 'destructive',
      })
    }
  }

  const columns = [
    {
      id: 'asset',
      header: 'Asset',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              {getCategoryIcon(asset.category)}
            </div>
            <div>
              <p className="font-medium">{asset.name}</p>
              <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        const categoryConfig = ASSET_CATEGORIES.find(cat => cat.value === asset.category)
        return categoryConfig?.label || asset.category
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return getStatusBadge(asset.status)
      }
    },
    {
      accessorKey: 'condition',
      header: 'Condition',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return getConditionBadge(asset.condition)
      }
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return asset.assignedTo ? (
          <div>
            <p className="font-medium">{asset.assignedTo.name}</p>
            <p className="text-sm text-muted-foreground">{asset.assignedTo.email}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )
      }
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return asset.location.name
      }
    },
    {
      accessorKey: 'currentValue',
      header: 'Value',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return formatCurrency(asset.currentValue)
      }
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const asset: Asset = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedAsset(asset)}>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Asset
              </DropdownMenuItem>
              {asset.status === 'available' && (
                <DropdownMenuItem onClick={() => setShowCheckoutDialog(true)}>
                  <User className="h-4 w-4 mr-2" />
                  Check Out
                </DropdownMenuItem>
              )}
              {asset.status === 'assigned' && (
                <DropdownMenuItem onClick={() => handleCheckin(asset.id)}>
                  <Package className="h-4 w-4 mr-2" />
                  Check In
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Retire Asset
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

  const assetsByCategory = ASSET_CATEGORIES.map(category => ({
    ...category,
    count: assets.filter(asset => asset.category === category.value).length,
    available: assets.filter(asset => asset.category === category.value && asset.status === 'available').length
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Asset Management</h2>
          <p className="text-muted-foreground">
            Track and manage organizational assets, assignments, and maintenance
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Asset Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {assetsByCategory.map((category) => {
          const Icon = category.icon
          return (
            <Card key={category.value} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{category.label}</p>
                      <p className="text-sm text-muted-foreground">{category.available} available</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{category.count}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
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
                  {ASSET_CATEGORIES.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={filters.condition} onValueChange={(value) => setFilters(prev => ({ ...prev, condition: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All conditions</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredAssets}
            columns={columns}
          />
        </CardContent>
      </Card>

      {/* Asset Details Dialog */}
      {selectedAsset && (
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getCategoryIcon(selectedAsset.category)}
                </div>
                <div>
                  <div className="text-xl font-bold">{selectedAsset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAsset.assetTag} • {selectedAsset.serialNumber}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="assignment">Assignment</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Asset Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(selectedAsset.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Condition</span>
                        {getConditionBadge(selectedAsset.condition)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category</span>
                        <span>{ASSET_CATEGORIES.find(cat => cat.value === selectedAsset.category)?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span>{selectedAsset.location.name}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Financial Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Purchase Date</span>
                        <span>{new Date(selectedAsset.purchaseDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Purchase Price</span>
                        <span className="font-semibold">{formatCurrency(selectedAsset.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Value</span>
                        <span className="font-semibold">{formatCurrency(selectedAsset.currentValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Depreciation Rate</span>
                        <span>{selectedAsset.depreciationRate}% per year</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedAsset.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedAsset.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="assignment" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedAsset.assignedTo ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold">{selectedAsset.assignedTo.name}</p>
                              <p className="text-sm text-muted-foreground">{selectedAsset.assignedTo.email}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCheckin(selectedAsset.id)}
                            >
                              Check In
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Assigned on {selectedAsset.assignedDate && new Date(selectedAsset.assignedDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">Asset Available</p>
                        <p className="text-muted-foreground mb-4">This asset is not currently assigned to anyone</p>
                        <Button onClick={() => setShowCheckoutDialog(true)}>
                          <User className="h-4 w-4 mr-2" />
                          Check Out Asset
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="maintenance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Maintenance History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedAsset.maintenanceHistory.length > 0 ? (
                      <div className="space-y-4">
                        {selectedAsset.maintenanceHistory.map((maintenance) => (
                          <div key={maintenance.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium capitalize">{maintenance.type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(maintenance.date).toLocaleDateString()} • {maintenance.performedBy}
                                </p>
                              </div>
                              {maintenance.cost && (
                                <Badge variant="outline">{formatCurrency(maintenance.cost)}</Badge>
                              )}
                            </div>
                            <p className="text-sm">{maintenance.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">No Maintenance History</p>
                        <p className="text-muted-foreground">No maintenance records found for this asset</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedAsset.nextMaintenanceDate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Upcoming Maintenance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Alert>
                        <Calendar className="h-4 w-4" />
                        <AlertDescription>
                          Next maintenance scheduled for {new Date(selectedAsset.nextMaintenanceDate).toLocaleDateString()}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="specifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Technical Specifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(selectedAsset.specifications).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedAsset.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No specifications recorded</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Asset</DialogTitle>
            <DialogDescription>
              Assign this asset to an employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emp1">John Doe - john.doe@company.com</SelectItem>
                  <SelectItem value="emp2">Jane Smith - jane.smith@company.com</SelectItem>
                  <SelectItem value="emp3">Mike Johnson - mike.johnson@company.com</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>
              Cancel
            </Button>
            <Button>Check Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}