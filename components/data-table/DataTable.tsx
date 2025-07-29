"use client"

import * as React from "react"
import {
  ColumnDef,
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
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Table as TableIcon } from "lucide-react"

import { DataTablePagination } from "./DataTablePagination"
import { DataTableToolbar } from "./DataTableToolbar"
import { MobileFilterSheet } from "./MobileFilterSheet"
import { GameMobileCard } from "./GameMobileCard"
import { RefereeMobileCard } from "./RefereeMobileCard"
import { Game, Team, Referee } from "./types"
import { formatTeamName } from "@/lib/team-utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  loading?: boolean
  onAssignReferee?: (game: Game) => void
  onEditReferee?: (referee: Referee) => void
  onViewProfile?: (referee: Referee) => void
  mobileCardType?: "game" | "referee"
  enableViewToggle?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = "home_team_name",
  loading = false,
  onAssignReferee,
  onEditReferee,
  onViewProfile,
  mobileCardType = "game",
  enableViewToggle = false,
}: DataTableProps<TData, TValue>) {
  // Generate storage key based on table type
  const storageKey = `datatable-${mobileCardType}-state`
  
  // Load initial state from localStorage
  const loadStoredState = React.useCallback(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [storageKey])

  const storedState = loadStoredState()
  
  const [sorting, setSorting] = React.useState<SortingState>(storedState?.sorting || [])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(storedState?.columnFilters || [])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(storedState?.columnVisibility || {})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState(storedState?.globalFilter || "")
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    storedState?.startDate ? new Date(storedState.startDate) : undefined
  )
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    storedState?.endDate ? new Date(storedState.endDate) : undefined
  )
  const [viewMode, setViewMode] = React.useState<"table" | "cards">(storedState?.viewMode || "table")

  // Save state to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    const stateToSave = {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      viewMode,
      timestamp: Date.now()
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Failed to save table state to localStorage:', error)
    }
  }, [storageKey, sorting, columnFilters, columnVisibility, globalFilter, startDate, endDate, viewMode])

  // Debug: Log the first data item to see actual structure
  React.useEffect(() => {
    if (data.length > 0) {
      console.log('First data item keys:', Object.keys(data[0] as any))
      console.log('First data item:', data[0])
      console.log('Columns accessor keys:', columns.map(col => (col as any).accessorKey || (col as any).id))
    }
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, columnId, filterValue) => {
      if (mobileCardType === "referee") {
        // Referee search functionality
        const searchableText = [
          row.getValue("name"),
          row.getValue("email"),
          row.getValue("phone"),
          row.getValue("location"),
          row.getValue("level"),
          row.getValue("certificationLevel"),
          ...(row.getValue("certifications") as string[] || []),
          ...(row.getValue("preferredPositions") as string[] || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return searchableText.includes(filterValue.toLowerCase())
      } else {
        // Game search functionality
        const homeTeam = row.getValue("homeTeam") as Team
        const awayTeam = row.getValue("awayTeam") as Team
        const homeTeamName = formatTeamName(homeTeam)
        const awayTeamName = formatTeamName(awayTeam)
        
        const searchableText = [
          homeTeamName,
          awayTeamName,
          row.getValue("location"),
          row.getValue("level"),
          row.getValue("division"),
          row.getValue("season"),
          row.getValue("status"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return searchableText.includes(filterValue.toLowerCase())
      }
    },
  })

  // Apply date filter to table
  React.useEffect(() => {
    // Check if date column exists before trying to access it
    const columns = table?.getAllColumns()
    const hasDateColumn = columns?.some(col => col.id === "date")
    if (!hasDateColumn) return
    
    const dateColumn = table?.getColumn("date")
    if (!dateColumn) return

    if (!startDate && !endDate) {
      dateColumn.setFilterValue(undefined)
      return
    }

    dateColumn.setFilterValue({ startDate, endDate })
  }, [startDate, endDate, table])

  const clearAllFilters = () => {
    table.resetColumnFilters()
    setGlobalFilter("")
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const clearStoredState = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear stored table state:', error)
    }
  }

  const clearDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  return (
    <div className="space-y-4">
      {/* Desktop Toolbar */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          <DataTableToolbar 
            table={table} 
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
          {enableViewToggle && (
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Toolbar */}
      <div className="lg:hidden flex items-center justify-between gap-2">
        <div className="flex-1">
          <MobileFilterSheet
            table={table}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClearDateFilter={clearDateFilter}
            onClearAllFilters={clearAllFilters}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length}
        </div>
      </div>
      
      {/* Desktop Table View */}
      {viewMode === "table" && (
        <div className="hidden lg:block rounded-md border">
          <div className="max-h-[500px] overflow-auto">
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-[15] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => {
                      // Define optimized widths for each column based on content
                      const columnWidths = [
                        "w-10", // select checkbox - 40px
                        "w-36", // name - 144px (name + cert level)
                        "w-48", // contact - 192px (email + phone, longest content)
                        "w-20", // level - 80px (short badge)
                        "w-24", // location - 96px (location + radius)
                        "w-28", // certifications - 112px (cert badges)
                        "w-20", // status - 80px (available/unavailable)
                        "w-10", // actions - 40px (just menu button)
                      ];
                      
                      return (
                        <TableHead 
                          key={header.id} 
                          className={`text-xs font-medium h-10 px-1 ${columnWidths[index] || "w-32"}`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length} 
                      className="h-24 text-center"
                    >
                      <div className="flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="ml-2">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell, index) => {
                        // Use the same optimized widths for body cells
                        const columnWidths = [
                          "w-10", // select checkbox - 40px
                          "w-36", // name - 144px (name + cert level)
                          "w-48", // contact - 192px (email + phone, longest content)
                          "w-20", // level - 80px (short badge)
                          "w-24", // location - 96px (location + radius)
                          "w-28", // certifications - 112px (cert badges)
                          "w-20", // status - 80px (available/unavailable)
                          "w-10", // actions - 40px (just menu button)
                        ];
                        
                        return (
                          <TableCell 
                            key={cell.id} 
                            className={`p-1 text-xs align-top ${columnWidths[index] || "w-32"}`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Desktop Card View */}
      {viewMode === "cards" && (
        <div className="hidden lg:block space-y-4 max-h-[600px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              if (mobileCardType === "referee") {
                return (
                  <RefereeMobileCard
                    key={row.id}
                    referee={row.original as Referee}
                    isSelected={row.getIsSelected()}
                    onSelect={(selected) => row.toggleSelected(selected)}
                    onEditReferee={onEditReferee}
                    onViewProfile={onViewProfile}
                  />
                )
              } else {
                return (
                  <GameMobileCard
                    key={row.id}
                    game={row.original as Game}
                    isSelected={row.getIsSelected()}
                    onSelect={(selected) => row.toggleSelected(selected)}
                    onAssignReferee={onAssignReferee}
                  />
                )
              }
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found.</p>
            </div>
          )}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            if (mobileCardType === "referee") {
              return (
                <RefereeMobileCard
                  key={row.id}
                  referee={row.original as Referee}
                  isSelected={row.getIsSelected()}
                  onSelect={(selected) => row.toggleSelected(selected)}
                  onEditReferee={onEditReferee}
                  onViewProfile={onViewProfile}
                />
              )
            } else {
              return (
                <GameMobileCard
                  key={row.id}
                  game={row.original as Game}
                  isSelected={row.getIsSelected()}
                  onSelect={(selected) => row.toggleSelected(selected)}
                  onAssignReferee={onAssignReferee}
                />
              )
            }
          })
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found.</p>
          </div>
        )}
      </div>
      
      <DataTablePagination table={table} />
    </div>
  )
}