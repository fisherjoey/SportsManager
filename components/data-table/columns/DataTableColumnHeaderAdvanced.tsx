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

interface DataTableColumnHeaderAdvancedProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  searchable?: boolean
  filterable?: boolean
  filterOptions?: { label: string; value: string }[]
}

export function DataTableColumnHeaderAdvanced<TData, TValue>({
  column,
  title,
  className,
  searchable = true,
  filterable = true,
  filterOptions = [],
}: DataTableColumnHeaderAdvancedProps<TData, TValue>) {
  const [searchValue, setSearchValue] = React.useState(
    (column.getFilterValue() as string) || ""
  )
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)

  // Generate filter options from column data if not provided
  const facets = column.getFacetedUniqueValues()
  const autoFilterOptions = React.useMemo(() => {
    if (filterOptions.length > 0) return filterOptions
    
    return Array.from(facets?.entries() || [])
      .filter(([value]) => value != null && value !== undefined)
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([value, count]) => ({
        label: `${value} (${count})`,
        value: String(value),
      }))
  }, [facets, filterOptions])

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

  const clearAllFilters = () => {
    setSearchValue("")
    column.setFilterValue(undefined)
    setIsSearchOpen(false)
    setIsFilterOpen(false)
  }

  const hasActiveFilters = searchValue || selectedValues.size > 0
  const sortDirection = column.getIsSorted()

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      {/* Main header row */}
      <div className="flex items-center justify-between min-h-[40px] px-2">
        <div className="flex items-center space-x-1 flex-1">
          <span className="font-medium text-sm">{title}</span>
          
          {/* Active filter indicator */}
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-4 px-1 text-xs">
              {selectedValues.size > 0 ? selectedValues.size : "1"}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* Search toggle */}
          {searchable && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0",
                (isSearchOpen || searchValue) && "bg-accent text-accent-foreground"
              )}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              title="Search in column"
            >
              <MagnifyingGlassIcon className="h-3 w-3" />
            </Button>
          )}

          {/* Filter dropdown */}
          {filterable && (
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0",
                    (selectedValues.size > 0) && "bg-accent text-accent-foreground"
                  )}
                  title="Filter column"
                >
                  <Filter className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Filter {title}</span>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-6 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-auto">
                    {autoFilterOptions.length > 0 ? autoFilterOptions.map((option) => {
                      const isSelected = selectedValues.has(option.value)
                      return (
                        <div
                          key={option.value}
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
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Column menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Column options"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {column.getCanSort() && (
                <>
                  <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                    <ArrowUpIcon className="mr-2 h-3.5 w-3.5" />
                    Sort Ascending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                    <ArrowDownIcon className="mr-2 h-3.5 w-3.5" />
                    Sort Descending
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeNoneIcon className="mr-2 h-3.5 w-3.5" />
                Hide Column
              </DropdownMenuItem>
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearAllFilters}>
                    <X className="mr-2 h-3.5 w-3.5" />
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search input row */}
      {isSearchOpen && searchable && (
        <div className="px-2 pb-1">
          <div className="relative">
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-7 text-xs pr-6"
              autoFocus
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-0 h-7 w-6 p-0"
                onClick={() => handleSearch("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}