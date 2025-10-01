'use client'

import * as React from 'react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ColumnDef as TanstackColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable
} from '@tanstack/react-table'
import { Search, ChevronDown, Filter, X, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload } from 'lucide-react'
import Papa from 'papaparse'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar'
import { DataTableViewOptions } from '@/components/data-table/DataTableViewOptions'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { GameMobileCard } from '@/components/data-table/GameMobileCard'
import { RefereeMobileCard } from '@/components/data-table/RefereeMobileCard'
import { UserMobileCard } from '@/components/data-table/UserMobileCard'
import { getTeamSearchTerms } from '@/lib/team-utils'

export interface ColumnDef<T> {
  id: string
  title: string
  accessor: keyof T | ((item: T) => React.ReactNode)
  filterType?: 'search' | 'select' | 'none'
  filterOptions?: { value: string; label: string }[]
  className?: string
}

interface FilterableTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  emptyMessage?: string
  className?: string
  searchKey?: string
  loading?: boolean
  onAssignReferee?: (game: any) => void
  onEditReferee?: (referee: any) => void
  onViewProfile?: (referee: any) => void
  mobileCardType?: 'game' | 'referee' | 'team' | 'location' | 'user'
  enableViewToggle?: boolean
  enableCSV?: boolean
  onDataImport?: (newData: T[]) => void
  csvFilename?: string
  initialColumnVisibility?: Record<string, boolean>
  maxVisibleColumns?: number | 'auto' // Max columns to show, or 'auto' to calculate based on screen width
  columnWidthEstimate?: number // Estimated average column width in pixels (default: 150)
}

export function FilterableTable<T extends Record<string, any>>({
  data,
  columns,
  emptyMessage = 'No data found',
  className = '',
  searchKey = 'name',
  loading = false,
  onAssignReferee,
  onEditReferee,
  onViewProfile,
  mobileCardType = 'game',
  enableViewToggle = true,
  enableCSV = false,
  onDataImport,
  csvFilename,
  initialColumnVisibility = {},
  maxVisibleColumns = 'auto',
  columnWidthEstimate = 150
}: FilterableTableProps<T>) {
  // Generate storage key based on table type
  const storageKey = `filterable-table-${mobileCardType}-state`

  // Load initial state from localStorage
  const loadStoredState = useCallback(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [storageKey])

  const storedState = loadStoredState()

  const [sorting, setSorting] = useState<SortingState>(storedState?.sorting || [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(storedState?.columnFilters || [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    // Don't use stored columnVisibility if we have responsive settings
    // This ensures responsive behavior takes priority
    if (Object.keys(initialColumnVisibility).length > 0) {
      return initialColumnVisibility
    }
    return storedState?.columnVisibility || {}
  })
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState(storedState?.globalFilter || '')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(storedState?.viewMode || 'table')

  // CSV functionality
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track whether visibility was changed by user or responsive system
  const userChangedVisibilityRef = useRef(false)

  // State to track available width (considering sidebar)
  const [availableWidth, setAvailableWidth] = useState(() => {
    if (typeof window === 'undefined') return 1920
    return window.innerWidth
  })

  // Calculate maximum visible columns based on available width
  const calculateMaxVisibleColumns = useCallback(() => {
    if (maxVisibleColumns === 'auto') {
      // Reserve space for padding, scrollbar, and margins (approximately 100px)
      const effectiveWidth = availableWidth - 100
      // Calculate how many columns can fit
      const calculatedMax = Math.floor(effectiveWidth / columnWidthEstimate)
      // Always show at least 3 columns, max 12 columns
      return Math.max(3, Math.min(12, calculatedMax))
    }
    return typeof maxVisibleColumns === 'number' ? maxVisibleColumns : columns.length
  }, [maxVisibleColumns, columnWidthEstimate, availableWidth, columns.length])

  // Listen for window resize and recalculate available width
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateAvailableWidth = () => {
      setAvailableWidth(window.innerWidth)
    }

    window.addEventListener('resize', updateAvailableWidth)
    return () => window.removeEventListener('resize', updateAvailableWidth)
  }, [])

  // Listen for sidebar state changes via custom event
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSidebarChange = () => {
      // Trigger a recalculation after sidebar animation completes
      setTimeout(() => {
        setAvailableWidth(window.innerWidth)
      }, 300) // Wait for sidebar transition
    }

    window.addEventListener('sidebar-state-changed', handleSidebarChange)
    return () => window.removeEventListener('sidebar-state-changed', handleSidebarChange)
  }, [])

  // Apply max column limit to visibility settings
  const applyMaxColumnLimit = useCallback((visibility: VisibilityState) => {
    const maxCols = calculateMaxVisibleColumns()

    // Count currently visible columns
    const visibleColumns = columns.filter(col => {
      // Check if column is set to visible (undefined means visible by default)
      return visibility[col.id] !== false
    })

    // If we're under the limit, return as-is
    if (visibleColumns.length <= maxCols) {
      return visibility
    }

    // Otherwise, hide columns that are not in initialColumnVisibility and not critical
    const result = { ...visibility }
    let visibleCount = visibleColumns.length

    // Priority order: columns explicitly set to visible, then others
    for (const col of columns) {
      if (visibleCount <= maxCols) break

      // Don't hide columns that are explicitly set to visible in initialColumnVisibility
      if (initialColumnVisibility[col.id] === true) continue

      // Don't hide the actions column or columns that can't be hidden
      if (col.id === 'actions' || col.filterType === 'none') continue

      // If this column is currently visible and not protected, hide it
      if (result[col.id] !== false) {
        result[col.id] = false
        visibleCount--
      }
    }

    return result
  }, [columns, calculateMaxVisibleColumns, initialColumnVisibility])

  // Update column visibility when initialColumnVisibility or availableWidth changes
  // This ensures responsive behavior overrides localStorage
  useEffect(() => {
    if (Object.keys(initialColumnVisibility).length > 0) {
      const limitedVisibility = applyMaxColumnLimit(initialColumnVisibility)
      setColumnVisibility(limitedVisibility)
      userChangedVisibilityRef.current = false
    }
  }, [JSON.stringify(initialColumnVisibility), applyMaxColumnLimit, availableWidth])

  // Also recalculate when maxVisibleColumns is 'auto' and available width changes
  useEffect(() => {
    if (maxVisibleColumns === 'auto' && columnVisibility) {
      const limitedVisibility = applyMaxColumnLimit(columnVisibility)
      // Only update if the visibility actually changed
      if (JSON.stringify(limitedVisibility) !== JSON.stringify(columnVisibility)) {
        setColumnVisibility(limitedVisibility)
      }
    }
  }, [availableWidth, maxVisibleColumns, applyMaxColumnLimit])

  // Save state to localStorage whenever it changes (except responsive-triggered changes)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Don't save columnVisibility if it was set by responsive system
    const stateToSave = {
      sorting,
      columnFilters,
      ...(userChangedVisibilityRef.current ? { columnVisibility } : {}),
      globalFilter,
      viewMode,
      timestamp: Date.now()
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Failed to save table state to localStorage:', error)
    }
  }, [storageKey, sorting, columnFilters, columnVisibility, globalFilter, viewMode])

  // Column-level filters state (for the dropdown popovers)
  const [columnLevelFilters, setColumnLevelFilters] = useState<Record<string, string | string[] | Date | undefined>>(() => {
    const initialFilters: Record<string, string | string[] | Date | undefined> = {}
    
    // Initialize from columnFilters state to maintain sync
    columnFilters.forEach(filter => {
      initialFilters[filter.id] = filter.value as string | string[] | Date | undefined
    })
    
    // Set defaults for columns that don't have filters yet
    columns.forEach(col => {
      if (!(col.id in initialFilters)) {
        if (col.filterType === 'search') {
          initialFilters[col.id] = ''
        } else if (col.filterType === 'select') {
          initialFilters[col.id] = []
        }
      }
    })
    
    return initialFilters
  })


  // CSV Export functionality
  const handleExportCSV = () => {
    try {
      // Get current filtered data
      const filteredData = table.getFilteredRowModel().rows.map(row => row.original)
      
      // Prepare data for export using column definitions
      const exportData = filteredData.map(item => {
        const exportRow: Record<string, any> = {}
        
        columns.forEach(col => {
          if (col.filterType !== 'none') {
            let value: any
            
            if (typeof col.accessor === 'function') {
              // For function accessors, try to get raw data from the item
              const rawValue = item[col.id] || item[col.title.toLowerCase()] || ''
              value = rawValue
            } else {
              // For string accessors, get the value directly
              value = item[col.accessor as keyof typeof item] || ''
            }
            
            // Handle dates
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0] // Format as YYYY-MM-DD
            } else if (typeof value === 'object' && value !== null) {
              // Handle complex objects by stringifying
              value = JSON.stringify(value)
            }
            
            exportRow[col.title] = value
          }
        })
        
        return exportRow
      })

      // Generate CSV using Papa Parse
      const csv = Papa.unparse(exportData)

      // Create download link (client-side only)
      if (typeof window !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob)
          link.setAttribute('href', url)
          const filename = csvFilename || `${mobileCardType}-export-${new Date().toISOString().split('T')[0]}.csv`
          link.setAttribute('download', filename)
          link.style.visibility = 'hidden'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // CSV Import functionality
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onDataImport) return

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const importedData: T[] = results.data.map((row: any, index: number) => {
            const newItem: any = {}
            
            // Map CSV columns back to data structure
            columns.forEach(col => {
              const csvValue = row[col.title]
              
              if (csvValue !== undefined && csvValue !== null && csvValue !== '') {
                if (typeof col.accessor === 'string') {
                  // Handle dates
                  newItem[col.accessor] = csvValue
                } else {
                  // For function accessors, use the column id
                  newItem[col.id] = csvValue
                }
              }
            })
            
            // Ensure each item has a unique ID
            if (!newItem.id) {
              newItem.id = `imported-${Date.now()}-${index}`
            }
            
            return newItem as T
          }).filter(item => Object.keys(item).length > 1) // Filter out empty rows

          // Call the import callback
          onDataImport(importedData)
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } catch (error) {
          console.error('Import error:', error)
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error)
      }
    })
  }

  // FilterableHeader component with dropdown
  const FilterableHeader: React.FC<{
    column: ColumnDef<T>
    tanstackColumn: any
  }> = ({ column, tanstackColumn }) => {
    // Initialize search input from the current filter value
    const currentFilterValue = tanstackColumn.getFilterValue()
    const [searchInput, setSearchInput] = useState(
      column.filterType === 'search' && typeof currentFilterValue === 'string' 
        ? currentFilterValue 
        : ''
    )
    
    if (column.filterType === 'none' || !column.filterType) {
      return (
        <Button
          variant="ghost"
          className="flex items-center justify-between w-full h-auto p-2 font-medium text-left hover:bg-muted text-muted-foreground"
          onClick={() => tanstackColumn.toggleSorting()}
        >
          <span>{column.title}</span>
          {tanstackColumn.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : tanstackColumn.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </Button>
      )
    }

    // Get the actual filter value from the column to determine if filter is active
    const actualFilterValue = tanstackColumn.getFilterValue()
    const hasActiveFilter = actualFilterValue !== undefined && actualFilterValue !== null && 
      (column.filterType === 'search' 
        ? actualFilterValue !== ''
        : Array.isArray(actualFilterValue) && actualFilterValue.length > 0)

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={`flex items-center justify-between w-full h-auto p-2 font-medium text-left hover:bg-muted ${
              hasActiveFilter ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              {column.title}
              {hasActiveFilter && <Filter className="h-3 w-3" />}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{column.title}</span>
              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Clear the filter completely
                    tanstackColumn.setFilterValue(undefined)
                    
                    // Update local state based on filter type
                    if (column.filterType === 'search') {
                      setSearchInput('')
                      setColumnLevelFilters(prev => ({
                        ...prev,
                        [column.id]: ''
                      }))
                    } else if (column.filterType === 'select') {
                      setColumnLevelFilters(prev => ({
                        ...prev,
                        [column.id]: []
                      }))
                    }
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">SORT</span>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => tanstackColumn.toggleSorting(false)}
                  className="justify-start h-8"
                >
                  <ArrowUp className="h-3 w-3 mr-2" />
                  Sort Ascending
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => tanstackColumn.toggleSorting(true)}
                  className="justify-start h-8"
                >
                  <ArrowDown className="h-3 w-3 mr-2" />
                  Sort Descending
                </Button>
              </div>
            </div>
            
            {/* Filter Options */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">FILTER</span>
              {column.filterType === 'search' ? (
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${column.title.toLowerCase()}...`}
                    value={searchInput || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setSearchInput(value)
                      setColumnLevelFilters(prev => ({
                        ...prev,
                        [column.id]: value
                      }))
                      tanstackColumn.setFilterValue(value === '' ? undefined : value)
                    }}
                    onKeyDown={(e) => {
                      // Stop propagation to prevent closing the popover on Enter
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                      }
                    }}
                    className="pl-7 h-8"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {column.filterOptions?.filter(option => option.value !== 'all').map((option) => {
                      // Get the filter value directly from the column to ensure state sync
                      const filterValue = tanstackColumn.getFilterValue()
                      const currentArray = Array.isArray(filterValue) ? filterValue : []
                      const isSelected = currentArray.includes(option.value)
                      
                      return (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${column.id}-${option.value}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              let newValue: string[]
                              if (checked) {
                                newValue = [...currentArray, option.value]
                              } else {
                                newValue = currentArray.filter(v => v !== option.value)
                              }
                              
                              setColumnLevelFilters(prev => ({
                                ...prev,
                                [column.id]: newValue
                              }))
                              tanstackColumn.setFilterValue(newValue.length === 0 ? undefined : newValue)
                            }}
                          />
                          <label
                            htmlFor={`${column.id}-${option.value}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  {column.filterOptions && column.filterOptions.length > 1 && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allValues = column.filterOptions?.filter(opt => opt.value !== 'all').map(opt => opt.value) || []
                          setColumnLevelFilters(prev => ({
                            ...prev,
                            [column.id]: allValues
                          }))
                          tanstackColumn.setFilterValue(allValues)
                        }}
                        className="h-7 text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setColumnLevelFilters(prev => ({
                            ...prev,
                            [column.id]: []
                          }))
                          tanstackColumn.setFilterValue(undefined)
                        }}
                        className="h-7 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Convert our ColumnDef to TanStack ColumnDef
  const tanstackColumns: TanstackColumnDef<T>[] = useMemo(() => {
    return columns.map((col) => ({
      id: col.id,
      accessorKey: typeof col.accessor === 'string' ? col.accessor : col.id,
      accessorFn: typeof col.accessor === 'function'
        ? (row: T) => row
        : typeof col.accessor === 'string'
        ? (row: T) => (row as any)[col.accessor as string]
        : (row: T) => (row as any)[col.id],
      header: ({ column: tanstackColumn }) => (
        <FilterableHeader column={col} tanstackColumn={tanstackColumn} />
      ),
      cell: ({ row }) => {
        if (typeof col.accessor === 'function') {
          return col.accessor(row.original)
        }
        return row.getValue(col.id)
      },
      enableSorting: true,
      enableHiding: col.id !== 'actions' && col.filterType !== 'none',
      filterFn: (row, columnId, filterValue) => {
        const colDef = columns.find(c => c.id === columnId)
        if (!colDef || !filterValue) return true

        const originalData = row.original as any
        
        // Handle different filter types
        if (colDef.filterType === 'select') {
          // For select filters, we need the raw value from the data
          // The columnId usually matches the data property name
          let rawValue: string = ''
          
          // Check if accessor is a string (direct property access)
          if (typeof colDef.accessor === 'string') {
            rawValue = String(originalData[colDef.accessor] || '')
          } else {
            // For function accessors, use the columnId to get the raw value
            // This assumes the columnId matches the property name in the data
            rawValue = String(originalData[columnId] || '')
          }
          
          // Handle array filter values (multiple selections)
          if (Array.isArray(filterValue)) {
            // If no filters selected, show all
            if (filterValue.length === 0) return true
            // Check if the raw value matches any of the selected filters
            return filterValue.includes(rawValue)
          }
          // Handle single filter value
          return rawValue === filterValue
        }
        
        if (colDef.filterType === 'search') {
          // For search filters, extract text from rendered elements
          let cellValue: string
          
          if (typeof colDef.accessor === 'function') {
            // Call the accessor function to get the rendered element
            const rendered = colDef.accessor(row.original)
            if (React.isValidElement(rendered)) {
              // Extract text from React elements
              cellValue = extractTextFromElement(rendered)
            } else {
              cellValue = String(rendered || '')
            }
          } else if (typeof colDef.accessor === 'string') {
            // Direct property access
            cellValue = String(originalData[colDef.accessor] || '')
          } else {
            // Fallback to columnId
            cellValue = String(originalData[columnId] || '')
          }
          
          return cellValue.toLowerCase().includes(String(filterValue).toLowerCase())
        } else if (colDef.filterType === 'date' && filterValue instanceof Date) {
          // Extract date from the cell value
          let rowDate: Date | null = null
          
          // If the accessor is a function, try to get the raw date value from the row
          if (typeof colDef.accessor === 'string') {
            const rawValue = row.getValue(columnId)
            if (rawValue instanceof Date) {
              rowDate = rawValue
            } else if (typeof rawValue === 'string') {
              rowDate = parseISO(rawValue)
            }
          } else {
            // Try to parse date from the original data
            const originalData = row.original as any
            const dateField = originalData[columnId] || originalData.date
            if (dateField instanceof Date) {
              rowDate = dateField
            } else if (typeof dateField === 'string') {
              rowDate = parseISO(dateField)
            }
          }
          
          if (!rowDate || !isValid(rowDate)) return false
          
          // Compare dates (same day)
          return rowDate.toDateString() === filterValue.toDateString()
        }
        
        return true
      }
    }))
  }, [columns])

  // Helper function to extract text from React elements
  const extractTextFromElement = (element: React.ReactNode): string => {
    if (typeof element === 'string') return element
    if (typeof element === 'number') return String(element)
    if (!element) return ''
    
    if (React.isValidElement(element)) {
      // Special handling for Badge components - extract the text content
      if (element.type && typeof element.type === 'function' && element.type.name === 'Badge') {
        return extractTextFromElement(element.props.children)
      }
      
      if (element.props.children) {
        if (Array.isArray(element.props.children)) {
          return element.props.children.map(extractTextFromElement).join(' ')
        }
        return extractTextFromElement(element.props.children)
      }
    }
    
    return String(element)
  }

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) => {
      // Intercept column visibility changes to apply max column limit
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
      const limitedVisibility = applyMaxColumnLimit(newVisibility)

      // Check if we hit the limit
      const maxCols = calculateMaxVisibleColumns()
      const visibleCount = Object.keys(limitedVisibility).filter(key => limitedVisibility[key] !== false).length

      // Mark as user-changed only if not hitting the limit
      userChangedVisibilityRef.current = true

      setColumnVisibility(limitedVisibility)
    },
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, columnId, filterValue) => {
      const item = row.original as any
      const searchTerms: string[] = []
      
      // Add all primitive values
      Object.values(item).forEach(value => {
        if (typeof value === 'string' || typeof value === 'number') {
          searchTerms.push(String(value))
        }
      })
      
      // Special handling for team names (organization + age_group + gender)
      if (item.organization && item.age_group && item.gender) {
        searchTerms.push(`${item.organization} ${item.age_group} ${item.gender}`)
      }
      
      // Special handling for team names in name field
      if (item.name) {
        searchTerms.push(item.name)
      }
      
      // Handle homeTeam and awayTeam objects
      if (item.homeTeam) {
        searchTerms.push(...getTeamSearchTerms(item.homeTeam))
      }
      
      if (item.awayTeam) {
        searchTerms.push(...getTeamSearchTerms(item.awayTeam))
      }
      
      // Handle arrays (like assignedReferees)
      if (item.assignedReferees && Array.isArray(item.assignedReferees)) {
        searchTerms.push(...item.assignedReferees)
      }
      
      const searchableText = searchTerms
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        
      return searchableText.includes(filterValue.toLowerCase())
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Mobile card rendering
  const renderMobileCards = () => {
    const filteredData = table.getFilteredRowModel().rows
    
    if (filteredData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {filteredData.map((row) => {
          const item = row.original
          if (mobileCardType === 'game') {
            return (
              <GameMobileCard
                key={row.id}
                game={item as any}
                onAssign={onAssignReferee}
              />
            )
          } else if (mobileCardType === 'referee') {
            return (
              <RefereeMobileCard
                key={row.id}
                referee={item as any}
                onEditReferee={onEditReferee}
                onViewProfile={onViewProfile}
              />
            )
          } else if (mobileCardType === 'user') {
            return (
              <UserMobileCard
                key={row.id}
                user={item as any}
                isSelected={false}
                onSelect={() => {}}
                onEditUser={onEditReferee}
                onViewProfile={onViewProfile}
              />
            )
          } else {
            // Custom card for teams/locations
            return (
              <div key={row.id} className="p-4 border rounded-lg bg-card">
                <div className="space-y-2">
                  {columns.slice(0, 3).map((col) => {
                    const value = typeof col.accessor === 'function' 
                      ? col.accessor(item) 
                      : item[col.accessor as keyof T]
                    return (
                      <div key={col.id}>
                        <span className="font-medium text-sm">{col.title}: </span>
                        <span className="text-sm">{React.isValidElement(value) ? value : String(value || '')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
        })}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar with search, filters, and view toggle */}
      <div className="flex items-center justify-between">
        <DataTableToolbar table={table} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
        
        <div className="flex items-center space-x-2">
          {/* CSV Export/Import buttons */}
          {enableCSV && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8"
              >
                <Download className="h-3 w-3 mr-2" />
                Export CSV
              </Button>
              
              {onDataImport && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8"
                  >
                    <Upload className="h-3 w-3 mr-2" />
                    Import CSV
                  </Button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </>
              )}
            </>
          )}
          
          {enableViewToggle && (
            <>
              <DataTableViewOptions table={table} />
              <div className="flex items-center rounded-md border">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        renderMobileCards()
      ) : (
        <div className="rounded-md border">
          <Table className="data-table">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="p-0">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  )
}