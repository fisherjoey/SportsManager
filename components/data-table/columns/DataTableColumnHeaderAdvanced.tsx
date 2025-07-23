"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  EyeNoneIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons"
import { Column } from "@tanstack/react-table"
import { Check, ChevronDown, X, Filter } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRangeFilter } from "@/components/data-table/DateRangeFilter"

interface DataTableColumnHeaderAdvancedProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  searchable?: boolean
  filterable?: boolean
  filterOptions?: { label: string; value: string; id?: string }[]
  filterSections?: { title: string; options: { label: string; value: string; id?: string }[] }[]
  dateRangeFilter?: boolean // New prop for date range filtering
}

export function DataTableColumnHeaderAdvanced<TData, TValue>({
  column,
  title,
  className,
  searchable = true,
  filterable = true,
  filterOptions = [],
  filterSections = [],
  dateRangeFilter = false,
}: DataTableColumnHeaderAdvancedProps<TData, TValue>) {
  const [searchValue, setSearchValue] = React.useState(
    (column.getFilterValue() as string) || ""
  )
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  
  // Date range filter state
  const [startDate, setStartDate] = React.useState<Date | undefined>()
  const [endDate, setEndDate] = React.useState<Date | undefined>()

  // Generate filter options from column data if not provided
  const facets = column.getFacetedUniqueValues()
  const autoFilterOptions = React.useMemo(() => {
    if (filterOptions.length > 0) return filterOptions
    if (filterSections.length > 0) return [] // Don't auto-generate when sections are provided
    
    return Array.from(facets?.entries() || [])
      .filter(([value]) => value != null && value !== undefined)
      .filter(([value]) => {
        // Skip objects that would become [object Object]
        const stringValue = String(value)
        return stringValue !== '[object Object]' && stringValue !== 'undefined' && stringValue !== 'null'
      })
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([value, count], index) => ({
        label: `${value} (${count})`,
        value: String(value),
        id: `${String(value)}-${index}` // Add unique id for key prop
      }))
  }, [facets, filterOptions, filterSections])

  const selectedValues = new Set(
    Array.isArray(column.getFilterValue()) 
      ? column.getFilterValue() as string[]
      : column.getFilterValue() 
        ? [column.getFilterValue() as string]
        : []
  )

  const handleSearch = (value: string) => {
    setSearchValue(value)
    column.setFilterValue(value || undefined)
  }

  const handleFilterToggle = (value: string) => {
    const newSelectedValues = new Set(selectedValues)
    if (newSelectedValues.has(value)) {
      newSelectedValues.delete(value)
    } else {
      newSelectedValues.add(value)
    }
    
    const filterArray = Array.from(newSelectedValues)
    column.setFilterValue(filterArray.length ? filterArray : undefined)
  }

  // Date range filter handlers
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    updateDateRangeFilter(date, endDate)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    updateDateRangeFilter(startDate, date)
  }

  const updateDateRangeFilter = (start: Date | undefined, end: Date | undefined) => {
    if (start || end) {
      column.setFilterValue({ startDate: start, endDate: end })
    } else {
      column.setFilterValue(undefined)
    }
  }

  const clearDateRangeFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    updateDateRangeFilter(undefined, undefined)
  }

  const clearAllFilters = () => {
    setSearchValue("")
    setStartDate(undefined)
    setEndDate(undefined)
    column.setFilterValue(undefined)
    setIsSearchOpen(false)
    setIsFilterOpen(false)
  }

  const hasActiveFilters = searchValue || selectedValues.size > 0 || startDate || endDate
  const sortDirection = column.getIsSorted()

  const [isColumnMenuOpen, setIsColumnMenuOpen] = React.useState(false)

  return (
    <div className={cn("flex items-center justify-between h-10", className)}>
      <div className="flex items-center space-x-2">
        <Popover open={isColumnMenuOpen} onOpenChange={setIsColumnMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="justify-start p-0 h-auto font-medium text-xs hover:underline"
            >
              {title}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <div className="p-3 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsColumnMenuOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Search Section */}
              {searchable && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Search</label>
                  <div className="relative">
                    <Input
                      placeholder={`Search ${title.toLowerCase()}...`}
                      value={searchValue}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="h-8 text-xs pr-8"
                    />
                    {searchValue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-0 h-8 w-6 p-0"
                        onClick={() => handleSearch("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Sort Section */}
              {column.getCanSort() && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Sort</label>
                  <div className="flex gap-2">
                    <Button
                      variant={sortDirection === "asc" ? "default" : "outline"}
                      size="sm"
                      onClick={() => column.toggleSorting(false)}
                      className="text-xs"
                    >
                      <ArrowUpIcon className="mr-1 h-3 w-3" />
                      Ascending
                    </Button>
                    <Button
                      variant={sortDirection === "desc" ? "default" : "outline"}
                      size="sm"
                      onClick={() => column.toggleSorting(true)}
                      className="text-xs"
                    >
                      <ArrowDownIcon className="mr-1 h-3 w-3" />
                      Descending
                    </Button>
                  </div>
                  {sortDirection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => column.clearSorting()}
                      className="text-xs w-full"
                    >
                      Clear Sort
                    </Button>
                  )}
                </div>
              )}

              {/* Filter Section */}
              {filterable && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Filter</label>
                    {selectedValues.size > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-xs">
                        {selectedValues.size}
                      </Badge>
                    )}
                  </div>
                  
                  {dateRangeFilter ? (
                    <DateRangeFilter
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={handleStartDateChange}
                      onEndDateChange={handleEndDateChange}
                      onClear={clearDateRangeFilter}
                    />
                  ) : filterSections.length > 0 ? (
                    <div className="space-y-3 max-h-[200px] overflow-auto">
                      {filterSections.map((section, sectionIndex) => (
                        <div key={`section-${sectionIndex}`} className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted/50 rounded">
                            {section.title}
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {section.options.map((option) => {
                              const isSelected = selectedValues.has(option.value)
                              return (
                                <div
                                  key={option.id || option.value}
                                  className={cn(
                                    "flex items-center space-x-2 px-2 py-1 rounded cursor-pointer hover:bg-accent",
                                    isSelected && "bg-accent"
                                  )}
                                  onClick={() => handleFilterToggle(option.value)}
                                >
                                  <div className={cn(
                                    "h-4 w-4 rounded border",
                                    isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                                  )}>
                                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                  <span className="text-sm">{option.label}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                      
                      {/* Active Filters Display for Sections */}
                      {selectedValues.size > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <label className="text-xs font-medium text-muted-foreground">Active Filters</label>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(selectedValues).map((value) => (
                              <Badge
                                key={value}
                                variant="secondary"
                                className="text-xs px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFilterToggle(value)
                                }}
                              >
                                {value}
                                <X className="h-2 w-2" />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[150px] overflow-auto">
                      {autoFilterOptions.length > 0 ? autoFilterOptions.map((option) => {
                        const isSelected = selectedValues.has(option.value)
                        return (
                          <div
                            key={option.id || option.value}
                            className={cn(
                              "flex items-center space-x-2 px-2 py-1 rounded cursor-pointer hover:bg-accent",
                              isSelected && "bg-accent"
                            )}
                            onClick={() => handleFilterToggle(option.value)}
                          >
                            <div className={cn(
                              "h-4 w-4 rounded border",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                            )}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm">{option.label}</span>
                          </div>
                        )
                      }) : (
                        <div className="text-sm text-muted-foreground p-2">
                          No filter options available
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Filters Display */}
                  {selectedValues.size > 0 && (
                    <div className="space-y-2 pt-3 mt-2 border-t bg-blue-50 rounded p-2">
                      <label className="text-xs font-medium text-blue-700">Active Filters ({selectedValues.size})</label>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(selectedValues).map((value) => (
                          <Badge
                            key={value}
                            variant="secondary"
                            className="text-xs px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-red-500 hover:text-white bg-blue-100 text-blue-800 border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFilterToggle(value)
                            }}
                            title={`Click to remove filter: ${value}`}
                          >
                            {value}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Column Actions */}
              <div className="pt-2 border-t space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => column.toggleVisibility(false)}
                  className="text-xs w-full justify-start"
                >
                  <EyeNoneIcon className="mr-2 h-3 w-3" />
                  Hide Column
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs w-full justify-start text-destructive hover:text-destructive"
                  >
                    <X className="mr-2 h-3 w-3" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Active filter indicator */}
        {hasActiveFilters && (
          <div 
            className="flex items-center gap-1 cursor-pointer hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation()
              setIsColumnMenuOpen(true)
            }}
            title="Click to manage filters"
          >
            <Filter className="h-3 w-3 text-blue-600" />
            <Badge variant="secondary" className="h-4 px-1 text-xs bg-blue-100 text-blue-800 border-blue-200">
              {selectedValues.size > 0 ? selectedValues.size : "1"}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}