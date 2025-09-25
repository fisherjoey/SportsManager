'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Filter, 
  X, 
  Calendar,
  User,
  Tag,
  Search,
  MapPin,
  Bookmark,
  RefreshCw,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AuditLogFilters as Filters, 
  AuditAction, 
  AuditLogPreset, 
  AUDIT_LOG_PRESETS, 
  ACTION_CONFIG 
} from '@/lib/types/audit'

interface AuditLogFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  availableUsers?: Array<{ id: string; name: string; email: string }>
  availableResourceTypes?: string[]
  availableCategories?: string[]
  isLoading?: boolean
  onSavePreset?: (preset: Omit<AuditLogPreset, 'id'>) => void
  savedPresets?: AuditLogPreset[]
  className?: string
}

export function AuditLogFilters({
  filters,
  onFiltersChange,
  availableUsers = [],
  availableResourceTypes = [],
  availableCategories = [],
  isLoading = false,
  onSavePreset,
  savedPresets = [],
  className = ''
}: AuditLogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')

  // Active filter count
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.dateRange) count++
    if (filters.users && filters.users.length > 0) count++
    if (filters.actions && filters.actions.length > 0) count++
    if (filters.resourceTypes && filters.resourceTypes.length > 0) count++
    if (filters.categories && filters.categories.length > 0) count++
    if (filters.success !== undefined) count++
    if (filters.ipAddress) count++
    return count
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const applyPreset = (preset: AuditLogPreset) => {
    onFiltersChange(preset.filters)
  }

  const saveCurrentAsPreset = () => {
    if (onSavePreset && presetName.trim()) {
      onSavePreset({
        name: presetName.trim(),
        description: presetDescription.trim() || `Custom filter preset`,
        filters: filters
      })
      setPresetName('')
      setPresetDescription('')
      setShowPresetDialog(false)
    }
  }

  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    const currentRange = filters.dateRange || { from: new Date(), to: new Date() }
    onFiltersChange({
      ...filters,
      dateRange: {
        ...currentRange,
        [field]: date || (field === 'from' ? new Date() : new Date())
      }
    })
  }

  const handleArrayFilterChange = (
    filterKey: keyof Filters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = (filters[filterKey] as string[]) || []
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value)
    
    onFiltersChange({
      ...filters,
      [filterKey]: newValues.length > 0 ? newValues : undefined
    })
  }

  const renderDateRangeFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Date Range</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left font-normal"
                disabled={isLoading}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {filters.dateRange?.from ? format(filters.dateRange.from, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateRange?.from}
                onSelect={(date) => handleDateRangeChange('from', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left font-normal"
                disabled={isLoading}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {filters.dateRange?.to ? format(filters.dateRange.to, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateRange?.to}
                onSelect={(date) => handleDateRangeChange('to', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {filters.dateRange && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
          className="text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Clear date range
        </Button>
      )}
    </div>
  )

  const renderUserFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Users</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            className="w-full justify-between"
            disabled={isLoading}
          >
            <User className="w-4 h-4 mr-2" />
            {filters.users && filters.users.length > 0 
              ? `${filters.users.length} selected`
              : 'Select users'
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {availableUsers.map((user) => (
                <CommandItem key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.users?.includes(user.id) || false}
                    onCheckedChange={(checked) => 
                      handleArrayFilterChange('users', user.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {filters.users && filters.users.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filters.users.map(userId => {
            const user = availableUsers.find(u => u.id === userId)
            return (
              <Badge key={userId} variant="secondary" className="text-xs">
                {user?.name || userId}
                <button
                  onClick={() => handleArrayFilterChange('users', userId, false)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderActionFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Actions</Label>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
        {Object.entries(ACTION_CONFIG).map(([action, config]) => {
          const ActionIcon = require('lucide-react')[config.icon] || Tag
          return (
            <div key={action} className="flex items-center space-x-2">
              <Checkbox
                id={action}
                checked={filters.actions?.includes(action as AuditAction) || false}
                onCheckedChange={(checked) => 
                  handleArrayFilterChange('actions', action, checked as boolean)
                }
                disabled={isLoading}
              />
              <Label 
                htmlFor={action} 
                className="text-xs font-normal cursor-pointer flex items-center gap-1"
              >
                <ActionIcon className="w-3 h-3" />
                {config.label}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderResourceTypeFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Resource Types</Label>
      <div className="space-y-2 max-h-32 overflow-auto">
        {availableResourceTypes.map((type) => (
          <div key={type} className="flex items-center space-x-2">
            <Checkbox
              id={type}
              checked={filters.resourceTypes?.includes(type) || false}
              onCheckedChange={(checked) => 
                handleArrayFilterChange('resourceTypes', type, checked as boolean)
              }
              disabled={isLoading}
            />
            <Label htmlFor={type} className="text-xs font-normal cursor-pointer capitalize">
              {type.replace(/[_-]/g, ' ')}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )

  const renderCategoryFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Categories</Label>
      <div className="space-y-2 max-h-32 overflow-auto">
        {availableCategories.map((category) => (
          <div key={category} className="flex items-center space-x-2">
            <Checkbox
              id={category}
              checked={filters.categories?.includes(category) || false}
              onCheckedChange={(checked) => 
                handleArrayFilterChange('categories', category, checked as boolean)
              }
              disabled={isLoading}
            />
            <Label htmlFor={category} className="text-xs font-normal cursor-pointer">
              {category}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPresets = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Quick Filters</Label>
        {onSavePreset && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPresetDialog(true)}
            className="text-xs"
          >
            <Bookmark className="w-3 h-3 mr-1" />
            Save Current
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {AUDIT_LOG_PRESETS.map((preset) => {
          const PresetIcon = (() => {
            try {
              return require('lucide-react')[preset.icon || 'Filter'] || Filter
            } catch {
              return Filter
            }
          })()
          return (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="justify-start text-left h-auto p-3"
              disabled={isLoading}
            >
              <PresetIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs">{preset.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {preset.description}
                </div>
              </div>
            </Button>
          )
        })}
        
        {savedPresets.map((preset) => {
          const PresetIcon = require('lucide-react')[preset.icon || 'Bookmark']
          return (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="justify-start text-left h-auto p-3"
              disabled={isLoading}
            >
              <PresetIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs">{preset.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {preset.description}
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )

  const activeFilterCount = getActiveFilterCount()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Basic Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search audit logs..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="pl-9"
            disabled={isLoading}
          />
        </div>

        {/* Quick Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="success-only"
              checked={filters.success === true}
              onCheckedChange={(checked) => 
                onFiltersChange({ 
                  ...filters, 
                  success: checked ? true : undefined 
                })
              }
              disabled={isLoading}
            />
            <Label htmlFor="success-only" className="text-xs">Success only</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="failed-only"
              checked={filters.success === false}
              onCheckedChange={(checked) => 
                onFiltersChange({ 
                  ...filters, 
                  success: checked ? false : undefined 
                })
              }
              disabled={isLoading}
            />
            <Label htmlFor="failed-only" className="text-xs">Failed only</Label>
          </div>

          <Separator orientation="vertical" className="h-4" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
            disabled={isLoading}
          >
            <Filter className="w-3 h-3 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
              disabled={isLoading}
            >
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="presets" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
                  <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
                  <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="presets" className="mt-4">
                  {renderPresets()}
                </TabsContent>
                
                <TabsContent value="time" className="mt-4">
                  {renderDateRangeFilter()}
                </TabsContent>
                
                <TabsContent value="users" className="mt-4">
                  <div className="space-y-4">
                    {renderUserFilter()}
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">IP Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Filter by IP address..."
                          value={filters.ipAddress || ''}
                          onChange={(e) => 
                            onFiltersChange({ 
                              ...filters, 
                              ipAddress: e.target.value || undefined 
                            })
                          }
                          className="pl-9"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="mt-4">
                  <div className="space-y-4">
                    {renderActionFilter()}
                    
                    {availableResourceTypes.length > 0 && (
                      <>
                        <Separator />
                        {renderResourceTypeFilter()}
                      </>
                    )}
                    
                    {availableCategories.length > 0 && (
                      <>
                        <Separator />
                        {renderCategoryFilter()}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <Sheet open={showPresetDialog} onOpenChange={setShowPresetDialog}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Save Filter Preset</SheetTitle>
              <SheetDescription>
                Save your current filters as a reusable preset.
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="preset-name">Name</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                />
              </div>
              
              <div>
                <Label htmlFor="preset-description">Description</Label>
                <Input
                  id="preset-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Enter description (optional)..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={saveCurrentAsPreset}
                  disabled={!presetName.trim()}
                  className="flex-1"
                >
                  Save Preset
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPresetDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}