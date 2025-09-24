'use client'

import React, { useState, useEffect } from 'react'
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient, Asset as APIAsset, AssetMaintenance, AssetCheckout } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

// Use the Asset interface from the API client with some additional frontend-specific properties
interface Asset extends Omit<APIAsset, 'status' | 'condition'> {
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost'
  condition?: 'excellent' | 'good' | 'fair' | 'poor'
  assignedTo?: {
    id: string
    name: string
    email?: string
  }
  assignedDate?: string
  location?: {
    id: string
    name: string
    address?: string
  }
  vendor?: {
    id: string
    name: string
    contact?: string
  }
  specifications?: Record<string, any>
  maintenanceHistory?: AssetMaintenance[]
  images?: string[]
  purchasePrice?: number
  currentValue?: number
  depreciationRate?: number
}

interface AssetFilters {
  search: string
  category: string
  status: string
  condition: string
  location: string
  assigned_to: string
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
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [assetStats, setAssetStats] = useState<any>(null)
  const [selectedAssetMaintenance, setSelectedAssetMaintenance] = useState<AssetMaintenance[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState<AssetFilters>({
    search: '',
    category: '',
    status: '',
    condition: '',
    location: '',
    assigned_to: ''
  })

  useEffect(() => {
    loadAssets()
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    applyFilters()
  }, [assets, filters.search]) // Only trigger on search change, other filters reload data

  const loadAssets = async () => {
    try {
      setLoading(true)
      
      // Build query parameters from filters
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      }
      
      if (filters.category) params.category = filters.category
      if (filters.status) params.status = filters.status
      if (filters.location) params.location = filters.location
      if (filters.assigned_to) params.assigned_to = filters.assigned_to
      
      const response = await apiClient.getAssets(params)
      
      // Transform backend data to frontend format
      const transformedAssets: Asset[] = response.assets.map((asset: APIAsset) => ({
        ...asset,
        assetTag: asset.asset_tag,
        serialNumber: asset.serial_number || '',
        status: (asset.status as any) || 'available',
        condition: (asset.condition as any) || 'good',
        purchaseDate: asset.purchase_date || '',
        purchasePrice: asset.purchase_cost || 0,
        currentValue: asset.purchase_cost || 0,
        depreciationRate: 0,
        warrantyExpiry: asset.warranty_expiry,
        assignedTo: asset.assigned_to_name ? {
          id: asset.assigned_to || '',
          name: asset.assigned_to_name,
          email: ''
        } : undefined,
        assignedDate: asset.assigned_to ? asset.updated_at : undefined,
        location: asset.location ? {
          id: asset.location,
          name: asset.location,
          address: ''
        } : undefined,
        specifications: {},
        maintenanceHistory: [],
        images: [],
        nextMaintenanceDate: asset.next_maintenance_date
      }))
      
      setAssets(transformedAssets)
      setPagination(response.pagination)
      
      // Load asset statistics
      await loadAssetStats()
      
      // Load maintenance data for selected asset if exists
      if (selectedAsset) {
        await loadAssetMaintenance(selectedAsset.id)
      }
      
    } catch (error) {
      console.error('Error loading assets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assets. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const loadAssetStats = async () => {
    try {
      const response = await apiClient.getAssetStats()
      setAssetStats(response.data)
    } catch (error) {
      console.error('Error loading asset stats:', error)
    }
  }
  
  const loadAssetMaintenance = async (assetId: string) => {
    try {
      const response = await apiClient.getAssetMaintenance(assetId)
      setSelectedAssetMaintenance(response.data)
    } catch (error) {
      console.error('Error loading asset maintenance:', error)
      setSelectedAssetMaintenance([])
    }
  }
  
  const handleScheduleMaintenance = async (assetId: string, maintenanceData: {
    maintenance_type: string
    scheduled_date: string
    description?: string
    priority?: string
    estimated_cost?: number
  }) => {
    try {
      await apiClient.createAssetMaintenance(assetId, maintenanceData)
      
      toast({
        title: 'Success',
        description: 'Maintenance scheduled successfully'
      })
      
      setShowMaintenanceDialog(false)
      if (selectedAsset) {
        await loadAssetMaintenance(selectedAsset.id)
      }
      loadAssets()
    } catch (error) {
      console.error('Error scheduling maintenance:', error)
      toast({
        title: 'Error',
        description: 'Failed to schedule maintenance. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const applyFilters = () => {
    let filtered = assets

    // Client-side search filtering (since search is not handled by backend query)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchLower) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchLower)) ||
        asset.assetTag.toLowerCase().includes(searchLower) ||
        (asset.assignedTo?.name && asset.assignedTo.name.toLowerCase().includes(searchLower))
      )
    }

    setFilteredAssets(filtered)
    
    // If filters change, reload assets from backend
    if (filters.category || filters.status || filters.location || filters.assigned_to) {
      loadAssets()
    }
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

  const handleCheckout = async (assetId: string, employeeId: string, notes?: string) => {
    try {
      const checkoutData = {
        assigned_to: employeeId,
        checkout_date: new Date().toISOString().split('T')[0],
        notes: notes || ''
      }
      
      await apiClient.checkoutAsset(assetId, checkoutData)

      toast({
        title: 'Success',
        description: 'Asset checked out successfully'
      })

      setShowCheckoutDialog(false)
      setSelectedAsset(null)
      loadAssets()
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: 'Failed to checkout asset. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleCheckin = async (assetId: string, condition?: string, notes?: string) => {
    try {
      // First, we need to find the active checkout for this asset
      // For simplicity, we'll use a placeholder checkout ID
      // In a real implementation, you'd need to track the checkout ID
      const checkinData = {
        checkin_date: new Date().toISOString().split('T')[0],
        condition_on_return: condition || 'good',
        notes: notes || ''
      }
      
      // Note: This would need the checkout ID in a real implementation
      // For now, we'll update the asset status directly
      await apiClient.updateAsset(assetId, {
        status: 'available',
        assigned_to: undefined
      })

      toast({
        title: 'Success',
        description: 'Asset checked in successfully'
      })

      setSelectedAsset(null)
      loadAssets()
    } catch (error) {
      console.error('Checkin error:', error)
      toast({
        title: 'Error',
        description: 'Failed to checkin asset. Please try again.',
        variant: 'destructive'
      })
    }
  }
  
  const handleCreateAsset = async (assetData: {
    name: string
    category: string
    asset_tag: string
    serial_number?: string
    model?: string
    manufacturer?: string
    location?: string
    description?: string
  }) => {
    try {
      await apiClient.createAsset(assetData)
      
      toast({
        title: 'Success',
        description: 'Asset created successfully'
      })
      
      setShowAddDialog(false)
      loadAssets()
    } catch (error) {
      console.error('Error creating asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to create asset. Please try again.',
        variant: 'destructive'
      })
    }
  }
  
  const handleUpdateAsset = async (assetId: string, assetData: Partial<Asset>) => {
    try {
      const updateData: any = {}
      if (assetData.name) updateData.name = assetData.name
      if (assetData.description) updateData.description = assetData.description
      if (assetData.category) updateData.category = assetData.category
      if (assetData.model) updateData.model = assetData.model
      if (assetData.manufacturer) updateData.manufacturer = assetData.manufacturer
      if (assetData.location?.name) updateData.location = assetData.location.name
      if (assetData.status) updateData.status = assetData.status
      if (assetData.condition) updateData.condition = assetData.condition
      
      await apiClient.updateAsset(assetId, updateData)
      
      toast({
        title: 'Success',
        description: 'Asset updated successfully'
      })
      
      setShowEditDialog(false)
      setEditingAsset(null)
      setSelectedAsset(null)
      loadAssets()
    } catch (error) {
      console.error('Error updating asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to update asset. Please try again.',
        variant: 'destructive'
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
              <DropdownMenuItem onClick={() => {
                setSelectedAsset(asset)
                if (asset.id) {
                  loadAssetMaintenance(asset.id)
                }
              }}>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setEditingAsset(asset)
                setShowEditDialog(true)
              }}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Asset
              </DropdownMenuItem>
              {asset.status === 'available' && (
                <DropdownMenuItem onClick={() => {
                  setSelectedAsset(asset)
                  setShowCheckoutDialog(true)
                }}>
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
              <DropdownMenuItem onClick={() => {
                setSelectedAsset(asset)
                setShowMaintenanceDialog(true)
              }}>
                <Wrench className="h-4 w-4 mr-2" />
                Schedule Maintenance
              </DropdownMenuItem>
              <DropdownMenuItem>
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => {
                  if (confirm('Are you sure you want to retire this asset?')) {
                    apiClient.updateAsset(asset.id, { status: 'retired' })
                      .then(() => {
                        toast({ title: 'Success', description: 'Asset retired successfully' })
                        loadAssets()
                      })
                      .catch(() => {
                        toast({ title: 'Error', description: 'Failed to retire asset', variant: 'destructive' })
                      })
                  }
                }}
              >
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

  const assetsByCategory = ASSET_CATEGORIES.map(category => {
    const categoryAssets = assets.filter(asset => asset.category === category.value)
    const availableAssets = categoryAssets.filter(asset => asset.status === 'available')
    
    return {
      ...category,
      count: categoryAssets.length,
      available: availableAssets.length
    }
  })
  
  // Use real stats from API if available, otherwise calculate from current assets
  const statsToDisplay = assetStats || {
    totalAssets: assets.length,
    availableAssets: assets.filter(a => a.status === 'available').length,
    checkedOutAssets: assets.filter(a => a.status === 'assigned').length,
    maintenanceAssets: assets.filter(a => a.status === 'maintenance').length,
    retiredAssets: assets.filter(a => a.status === 'retired').length,
    categoryBreakdown: assetsByCategory.map(cat => ({
      category: cat.label,
      count: cat.count,
      available: cat.available
    })),
    overallValue: assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0)
  }

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
        {/* Asset Status Overview Cards */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Available</p>
                  <p className="text-sm text-muted-foreground">Ready for use</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{statsToDisplay.availableAssets}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Assigned</p>
                  <p className="text-sm text-muted-foreground">In use</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{statsToDisplay.checkedOutAssets}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Maintenance</p>
                  <p className="text-sm text-muted-foreground">Being serviced</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{statsToDisplay.maintenanceAssets}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Total Assets</p>
                  <p className="text-sm text-muted-foreground">Overall count</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{statsToDisplay.totalAssets}</div>
            </div>
          </CardContent>
        </Card>
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
                  placeholder="Search by name, tag, serial number..."
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
                  <SelectItem value="all">All categories</SelectItem>
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
                  <SelectItem value="all">All statuses</SelectItem>
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
                  <SelectItem value="all">All conditions</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="field">Field</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Maintenance History</CardTitle>
                      <Button 
                        onClick={() => setShowMaintenanceDialog(true)}
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Maintenance
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedAssetMaintenance.length > 0 ? (
                      <div className="space-y-4">
                        {selectedAssetMaintenance.map((maintenance) => (
                          <div key={maintenance.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium capitalize">{maintenance.maintenance_type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(maintenance.scheduled_date).toLocaleDateString()}
                                  {maintenance.assigned_to_name && ` • ${maintenance.assigned_to_name}`}
                                </p>
                                <Badge 
                                  variant={maintenance.status === 'completed' ? 'default' : 'secondary'}
                                  className="mt-1"
                                >
                                  {maintenance.status}
                                </Badge>
                              </div>
                              {maintenance.estimated_cost && (
                                <Badge variant="outline">{formatCurrency(maintenance.estimated_cost)}</Badge>
                              )}
                            </div>
                            {maintenance.description && (
                              <p className="text-sm">{maintenance.description}</p>
                            )}
                            {maintenance.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{maintenance.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">No Maintenance History</p>
                        <p className="text-muted-foreground mb-4">No maintenance records found for this asset</p>
                        <Button onClick={() => setShowMaintenanceDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Schedule First Maintenance
                        </Button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Asset Tag</span>
                        <span className="font-medium">{selectedAsset.assetTag}</span>
                      </div>
                      {selectedAsset.serialNumber && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Serial Number</span>
                          <span className="font-medium">{selectedAsset.serialNumber}</span>
                        </div>
                      )}
                      {selectedAsset.model && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Model</span>
                          <span className="font-medium">{selectedAsset.model}</span>
                        </div>
                      )}
                      {selectedAsset.manufacturer && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Manufacturer</span>
                          <span className="font-medium">{selectedAsset.manufacturer}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium">{ASSET_CATEGORIES.find(cat => cat.value === selectedAsset.category)?.label}</span>
                      </div>
                      {selectedAsset.specifications && Object.keys(selectedAsset.specifications).length > 0 && (
                        <>
                          {Object.entries(selectedAsset.specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
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
            <Button onClick={() => {
              if (selectedAsset) {
                handleCheckout(selectedAsset.id, 'emp1') // In real app, get selected employee
              }
            }}>Check Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Maintenance Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              Schedule maintenance for {selectedAsset?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select maintenance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Describe the maintenance work..." />
            </div>
            <div className="space-y-2">
              <Label>Estimated Cost</Label>
              <Input type="number" placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedAsset) {
                handleScheduleMaintenance(selectedAsset.id, {
                  maintenance_type: 'inspection', // In real app, get from form
                  scheduled_date: new Date().toISOString().split('T')[0],
                  description: 'Scheduled maintenance',
                  priority: 'medium'
                })
              }
            }}>Schedule Maintenance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Asset Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Create a new asset record
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Asset Name *</Label>
              <Input placeholder="Enter asset name" />
            </div>
            <div className="space-y-2">
              <Label>Asset Tag *</Label>
              <Input placeholder="Enter unique asset tag" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input placeholder="Enter serial number" />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input placeholder="Enter model" />
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input placeholder="Enter manufacturer" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="field">Field</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input placeholder="Enter description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleCreateAsset({
                name: 'New Asset', // In real app, get from form
                category: 'computer',
                asset_tag: 'AST-' + Date.now(),
                description: 'New asset created'
              })
            }}>Create Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Asset Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset information
            </DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Asset Name</Label>
                <Input defaultValue={editingAsset.name} placeholder="Enter asset name" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue={editingAsset.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select defaultValue={editingAsset.condition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select defaultValue={editingAsset.location?.name}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="field">Field</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input defaultValue={editingAsset.description} placeholder="Enter description" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (editingAsset) {
                handleUpdateAsset(editingAsset.id, {
                  name: editingAsset.name, // In real app, get from form
                  status: editingAsset.status,
                  condition: editingAsset.condition
                })
              }
            }}>Update Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}