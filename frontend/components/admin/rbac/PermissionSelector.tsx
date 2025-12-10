'use client'

import { useState, useEffect } from 'react'
import { Search, Shield, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/components/ui/use-toast'
import type { Permission, PermissionsByCategory, PermissionsResponse } from '@/lib/types'
import { apiClient } from '@/lib/api'

interface PermissionSelectorProps {
  selectedPermissions: Permission[]
  onSelectionChange: (permissions: Permission[]) => void
  disabled?: boolean
  maxHeight?: string
}

export function PermissionSelector({ 
  selectedPermissions, 
  onSelectionChange, 
  disabled = false,
  maxHeight = '400px'
}: PermissionSelectorProps) {
  const [permissions, setPermissions] = useState<PermissionsByCategory>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getPermissions()
      
      if (!data.success) throw new Error('Failed to fetch permissions')
      
      setPermissions(data.data.permissions)
      
      // Expand all categories by default
      setExpandedCategories(new Set(Object.keys(data.data.permissions)))
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load permissions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const selectedPermissionIds = new Set(selectedPermissions.map(p => p.id))

  const handlePermissionToggle = (permission: Permission, checked: boolean) => {
    if (disabled) return

    let newSelectedPermissions: Permission[]
    
    if (checked) {
      // Add permission
      newSelectedPermissions = [...selectedPermissions, permission]
    } else {
      // Remove permission
      newSelectedPermissions = selectedPermissions.filter(p => p.id !== permission.id)
    }
    
    onSelectionChange(newSelectedPermissions)
  }

  const handleCategoryToggle = (category: string, permissions: Permission[], selectAll: boolean) => {
    if (disabled) return

    let newSelectedPermissions = [...selectedPermissions]
    
    if (selectAll) {
      // Add all permissions from this category that aren't already selected
      const toAdd = permissions.filter(p => !selectedPermissionIds.has(p.id))
      newSelectedPermissions = [...newSelectedPermissions, ...toAdd]
    } else {
      // Remove all permissions from this category
      const categoryPermissionIds = new Set(permissions.map(p => p.id))
      newSelectedPermissions = newSelectedPermissions.filter(p => !categoryPermissionIds.has(p.id))
    }
    
    onSelectionChange(newSelectedPermissions)
  }

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const filteredPermissions = Object.entries(permissions).reduce((acc, [category, categoryPermissions]) => {
    const filtered = categoryPermissions.filter(permission =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    
    return acc
  }, {} as PermissionsByCategory)

  const getCategoryStats = (categoryPermissions: Permission[]) => {
    const selected = categoryPermissions.filter(p => selectedPermissionIds.has(p.id)).length
    const total = categoryPermissions.length
    const allSelected = selected === total && total > 0
    const someSelected = selected > 0 && selected < total
    
    return { selected, total, allSelected, someSelected }
  }

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'games': 'bg-blue-500',
      'assignments': 'bg-green-500',
      'referees': 'bg-purple-500',
      'financial': 'bg-yellow-500',
      'admin': 'bg-red-500',
      'reports': 'bg-orange-500',
      'system': 'bg-gray-500'
    }
    
    return colorMap[category.toLowerCase()] || 'bg-blue-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search permissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
          disabled={disabled}
        />
      </div>

      {/* Selection Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>
          {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
        </span>
        {selectedPermissions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
            disabled={disabled}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Permissions by Category */}
      <ScrollArea className="border rounded-md" style={{ height: maxHeight }}>
        <div className="p-4 space-y-4">
          {Object.entries(filteredPermissions).map(([category, categoryPermissions]) => {
            const { selected, total, allSelected, someSelected } = getCategoryStats(categoryPermissions)
            const isExpanded = expandedCategories.has(category)
            
            return (
              <Card key={category}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategoryExpansion(category)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                          <CardTitle className="text-base font-semibold capitalize">
                            {category.replace(/([A-Z])/g, ' $1').trim()}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {selected}/{total}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Category Select All Checkbox */}
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => 
                                handleCategoryToggle(category, categoryPermissions, checked === true)
                              }
                              disabled={disabled}
                              className={someSelected && !allSelected ? 'data-[state=checked]:bg-muted' : ''}
                            />
                            <span className="text-xs text-muted-foreground">
                              {allSelected ? 'Deselect all' : 'Select all'}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="space-y-3">
                        {categoryPermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className={`flex items-start gap-3 p-2 rounded-md border transition-colors ${
                              selectedPermissionIds.has(permission.id)
                                ? 'bg-accent border-accent-foreground/20'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={selectedPermissionIds.has(permission.id)}
                              onCheckedChange={(checked) => 
                                handlePermissionToggle(permission, checked === true)
                              }
                              disabled={disabled}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {permission.name}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {permission.code}
                                </Badge>
                                {permission.system_permission && (
                                  <Badge variant="outline" className="text-xs">
                                    System
                                  </Badge>
                                )}
                              </div>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {permission.description}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                Resource: {permission.resource} • Action: {permission.action}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      </ScrollArea>

      {/* Selected Permissions Summary */}
      {selectedPermissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {selectedPermissions.map((permission) => (
                <Badge
                  key={permission.id}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => !disabled && handlePermissionToggle(permission, false)}
                >
                  {permission.name}
                  {!disabled && <span className="ml-1">×</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}