'use client'

import * as React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Search, RefreshCw, Calendar, X } from 'lucide-react'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

import { DataTableViewOptions } from './DataTableViewOptions'
import { DateRangeFilter } from './DateRangeFilter'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  globalFilter: string
  setGlobalFilter: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter
}: DataTableToolbarProps<TData>) {
  const [startDate, setStartDate] = React.useState<Date | undefined>()
  const [endDate, setEndDate] = React.useState<Date | undefined>()
  const [isDateFilterOpen, setIsDateFilterOpen] = React.useState(false)

  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter || startDate || endDate

  // Apply date filter to table
  React.useEffect(() => {
    // Check if date column exists before trying to access it
    const columns = table.getAllColumns()
    const hasDateColumn = columns.some(col => col.id === 'date')
    if (!hasDateColumn) return
    
    const dateColumn = table.getColumn('date')
    if (!dateColumn) return

    if (!startDate && !endDate) {
      dateColumn.setFilterValue(undefined)
      return
    }

    dateColumn.setFilterValue({ startDate, endDate })
  }, [startDate, endDate, table])

  const clearAllFilters = () => {
    table.resetColumnFilters()
    setGlobalFilter('')
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const clearDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-3">
          {/* Global Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all columns..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-8"
            />
          </div>

          {/* Date Range Filter */}
          <Popover open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-8 px-3 ${(startDate || endDate) ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <Calendar className="mr-2 h-3 w-3" />
                Date Filter
                {(startDate || endDate) && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs">
                    Active
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClear={clearDateFilter}
              />
            </PopoverContent>
          </Popover>

          {/* Clear all filters */}
          {isFiltered && (
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="h-8 px-3"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Clear All Filters
            </Button>
          )}
        </div>

        {/* View options */}
        <DataTableViewOptions table={table} />
      </div>

      {/* Active filters summary */}
      {(globalFilter || table.getState().columnFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          
          {globalFilter && (
            <Badge variant="secondary" className="rounded-sm px-2 font-normal flex items-center gap-1">
              Global: "{globalFilter}"
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-red-500 hover:text-white rounded-full ml-1"
                onClick={() => setGlobalFilter('')}
                title="Clear global search"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          {(startDate || endDate) && (
            <Badge variant="secondary" className="rounded-sm px-2 font-normal flex items-center gap-1">
              Date: {startDate && endDate
                ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                : startDate
                  ? `From ${startDate.toLocaleDateString()}`
                  : `Until ${endDate?.toLocaleDateString()}`}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-red-500 hover:text-white rounded-full ml-1"
                onClick={clearDateFilter}
                title="Clear date filter"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          {table.getState().columnFilters.map((filter) => {
            const column = table.getColumn(filter.id)
            if (!column) return null

            const filterValue = Array.isArray(filter.value) 
              ? `${filter.value.length} selected`
              : `"${filter.value}"`

            return (
              <Badge key={filter.id} variant="secondary" className="rounded-sm px-2 font-normal flex items-center gap-1">
                {filter.id}: {filterValue}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 hover:bg-red-500 hover:text-white rounded-full ml-1"
                  onClick={() => column.setFilterValue(undefined)}
                  title={`Clear ${filter.id} filter`}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )
          })}
          
          <span className="text-xs">
            ({table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} rows)
          </span>
        </div>
      )}
    </div>
  )
}