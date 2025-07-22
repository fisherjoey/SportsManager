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

import { DataTablePagination } from "./DataTablePagination"
import { DataTableToolbar } from "./DataTableToolbar"
import { MobileFilterSheet } from "./MobileFilterSheet"
import { GameMobileCard } from "./GameMobileCard"
import { RefereeMobileCard } from "./RefereeMobileCard"
import { Game, Team, Referee } from "./types"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  loading?: boolean
  onAssignReferee?: (game: Game) => void
  onEditReferee?: (referee: Referee) => void
  onViewProfile?: (referee: Referee) => void
  mobileCardType?: "game" | "referee"
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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [startDate, setStartDate] = React.useState<Date | undefined>()
  const [endDate, setEndDate] = React.useState<Date | undefined>()

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
        const homeTeamName = `${homeTeam?.organization} ${homeTeam?.ageGroup} ${homeTeam?.gender} ${homeTeam?.rank}`
        const awayTeamName = `${awayTeam?.organization} ${awayTeam?.ageGroup} ${awayTeam?.gender} ${awayTeam?.rank}`
        
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

  const clearDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  return (
    <div className="space-y-4">
      {/* Desktop Toolbar */}
      <div className="hidden lg:block">
        <DataTableToolbar 
          table={table} 
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
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
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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