'use client'

import * as React from 'react'
import { Table } from '@tanstack/react-table'
import { Filter, Search, X, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'

import { DateRangeFilter } from './DateRangeFilter'
import { DataTableFacetedFilter } from './DataTableFacetedFilter'

interface MobileFilterSheetProps<TData> {
  table: Table<TData>
  globalFilter: string
  setGlobalFilter: (value: string) => void
  startDate: Date | undefined
  endDate: Date | undefined
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  onClearDateFilter: () => void
  onClearAllFilters: () => void
}

export function MobileFilterSheet<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDateFilter,
  onClearAllFilters
}: MobileFilterSheetProps<TData>) {
  const [isOpen, setIsOpen] = React.useState(false)

  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter || startDate || endDate
  const activeFilterCount = table.getState().columnFilters.length + 
    (globalFilter ? 1 : 0) + 
    (startDate || endDate ? 1 : 0)

  // Level filter options
  const levelOptions = [
    { label: 'Recreational', value: 'Recreational', id: 'level-recreational' },
    { label: 'Competitive', value: 'Competitive', id: 'level-competitive' },
    { label: 'Elite', value: 'Elite', id: 'level-elite' }
  ]

  // Division filter sections  
  const divisionFilterSections = [
    {
      title: 'Age',
      options: [
        { label: 'U11', value: 'U11', id: 'age-u11' },
        { label: 'U13', value: 'U13', id: 'age-u13' },
        { label: 'U15', value: 'U15', id: 'age-u15' },
        { label: 'U18', value: 'U18', id: 'age-u18' }
      ]
    },
    {
      title: 'Division #',
      options: [
        { label: 'Division 1', value: 'Division 1', id: 'div-1' },
        { label: 'Division 2', value: 'Division 2', id: 'div-2' },
        { label: 'Division 3', value: 'Division 3', id: 'div-3' }
      ]
    },
    {
      title: 'Gender',
      options: [
        { label: 'Boys Teams', value: 'Boys', id: 'gender-boys' },
        { label: 'Girls Teams', value: 'Girls', id: 'gender-girls' }
      ]
    }
  ]

  // Status filter options (auto-generated from table data)
  // Try both "status" and "isAvailable" columns to support both games and referees
  // Check if columns exist by looking at all column IDs first
  const allColumnIds = table.getAllColumns().map(col => col.id)
  const hasIsAvailableColumn = allColumnIds.includes('isAvailable')
  const hasStatusColumn = allColumnIds.includes('status')
  
  const statusColumn = hasStatusColumn ? table.getColumn('status') : 
    hasIsAvailableColumn ? table.getColumn('isAvailable') : null
  const isRefereeTable = hasIsAvailableColumn
  const statusFacets = statusColumn?.getFacetedUniqueValues()
  const statusOptions = React.useMemo(() => {
    return Array.from(statusFacets?.entries() || [])
      .filter(([value]) => value != null && value !== undefined)
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([value, count], index) => ({
        label: `${value} (${count})`,
        value: String(value),
        id: `status-${String(value)}-${index}`
      }))
  }, [statusFacets])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[90vh] overflow-auto">
        <SheetHeader>
          <SheetTitle>
            {isRefereeTable ? 'Filter Referees' : 'Filter Games'}
          </SheetTitle>
          <SheetDescription>
            {isRefereeTable
              ? 'Choose your filters to find the referees you\'re looking for.'
              : 'Choose your filters to find the games you\'re looking for.'
            }
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={isRefereeTable
                  ? 'Search names, locations, certifications...' 
                  : 'Search teams, locations, divisions...'
                }
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8"
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={() => setGlobalFilter('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Date Range Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Date Range</Label>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearDateFilter}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={onStartDateChange}
              onEndDateChange={onEndDateChange}
              onClear={onClearDateFilter}
            />
          </div>

          <Separator />

          {/* Level Filter */}
          {table.getColumn('level') && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Level</Label>
                <DataTableFacetedFilter
                  column={table.getColumn('level')}
                  title="Level"
                  options={levelOptions}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Division Filter - Only show for games */}
          {table.getAllColumns().some(col => col.id === 'division') && table.getColumn('division') && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Division</Label>
                <div className="space-y-4">
                  {divisionFilterSections.map((section, index) => (
                    <div key={index} className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        {section.title}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {section.options.map((option) => {
                          const column = table.getColumn('division')
                          const selectedValues = new Set(
                            Array.isArray(column?.getFilterValue()) 
                              ? column?.getFilterValue() as string[]
                              : column?.getFilterValue() 
                                ? [column?.getFilterValue() as string]
                                : []
                          )
                          const isSelected = selectedValues.has(option.value)
                          
                          return (
                            <Button
                              key={option.id}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className="justify-start text-xs h-8"
                              onClick={() => {
                                const newSelectedValues = new Set(selectedValues)
                                if (newSelectedValues.has(option.value)) {
                                  newSelectedValues.delete(option.value)
                                } else {
                                  newSelectedValues.add(option.value)
                                }
                                const filterArray = Array.from(newSelectedValues)
                                column?.setFilterValue(filterArray.length ? filterArray : undefined)
                              }}
                            >
                              {option.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Location Filter - Show for referees */}
          {table.getColumn('location') && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Location</Label>
                <DataTableFacetedFilter
                  column={table.getColumn('location')}
                  title="Location"
                  options={[
                    { label: 'Downtown', value: 'Downtown' },
                    { label: 'Westside', value: 'Westside' },
                    { label: 'Northside', value: 'Northside' },
                    { label: 'Eastside', value: 'Eastside' }
                  ]}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Status Filter */}
          {statusColumn && statusOptions.length > 0 && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {statusColumn.id === 'isAvailable' ? 'Availability' : 'Assignment Status'}
                </Label>
                <DataTableFacetedFilter
                  column={statusColumn}
                  title={statusColumn.id === 'isAvailable' ? 'Availability' : 'Status'}
                  options={statusOptions}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Season Filter - Only show for games */}
          {table.getAllColumns().some(col => col.id === 'season') && table.getColumn('season') && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Season</Label>
                <DataTableFacetedFilter
                  column={table.getColumn('season')}
                  title="Season"
                  options={[]}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Active Filters Summary */}
          {isFiltered && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {globalFilter && (
                  <Badge variant="secondary" className="rounded-sm px-2 font-normal">
                    Search: "{globalFilter}"
                  </Badge>
                )}

                {(startDate || endDate) && (
                  <Badge variant="secondary" className="rounded-sm px-2 font-normal">
                    Date: {startDate && endDate
                      ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                      : startDate
                        ? `From ${startDate.toLocaleDateString()}`
                        : `Until ${endDate?.toLocaleDateString()}`}
                  </Badge>
                )}

                {table.getState().columnFilters.map((filter) => {
                  const column = table.getColumn(filter.id)
                  if (!column) return null

                  const filterValue = Array.isArray(filter.value) 
                    ? `${filter.value.length} selected`
                    : `"${filter.value}"`

                  return (
                    <Badge key={filter.id} variant="secondary" className="rounded-sm px-2 font-normal">
                      {filter.id}: {filterValue}
                    </Badge>
                  )
                })}
              </div>
              
              <div className="text-sm text-muted-foreground">
                Showing {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} {isRefereeTable ? 'referees' : 'games'}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-col sm:flex-col space-y-2">
          {isFiltered && (
            <Button
              variant="outline"
              onClick={() => {
                onClearAllFilters()
                setIsOpen(false)
              }}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          )}
          <Button onClick={() => setIsOpen(false)} className="w-full">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}