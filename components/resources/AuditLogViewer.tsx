'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Download, 
  RefreshCw, 
  Search, 
  Eye, 
  MoreHorizontal,
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { AuditLogFilters } from './AuditLogFilters'
import { AuditLogEntry, AuditLogEntryCompact } from './AuditLogEntry'
import { AuditLogStatsComponent } from './AuditLogStats'
import {
  AuditLogEntry as AuditEntry,
  AuditLogFilters as Filters,
  AuditLogStats,
  AuditLogPreset,
  ExportOptions,
  ACTION_CONFIG
} from '@/lib/types/audit'

interface AuditLogViewerProps {
  // Data
  entries: AuditEntry[]
  stats?: AuditLogStats
  totalEntries: number
  
  // Pagination
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  
  // Filtering
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  availableUsers?: Array<{ id: string; name: string; email: string }>
  availableResourceTypes?: string[]
  availableCategories?: string[]
  
  // Actions
  onRefresh: () => void
  onExport: (options: ExportOptions) => Promise<void>
  onUserClick?: (userId: string) => void
  onResourceClick?: (resourceType: string, resourceId: string) => void
  onSavePreset?: (preset: Omit<AuditLogPreset, 'id'>) => void
  savedPresets?: AuditLogPreset[]
  
  // State
  isLoading?: boolean
  error?: string
  realTimeUpdates?: boolean
  
  // Display options
  defaultView?: 'list' | 'table' | 'cards'
  showStats?: boolean
  className?: string
}

type SortField = 'timestamp' | 'user' | 'action' | 'resource' | 'success'
type SortDirection = 'asc' | 'desc'

export function AuditLogViewer({
  entries,
  stats,
  totalEntries,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  filters,
  onFiltersChange,
  availableUsers = [],
  availableResourceTypes = [],
  availableCategories = [],
  onRefresh,
  onExport,
  onUserClick,
  onResourceClick,
  onSavePreset,
  savedPresets = [],
  isLoading = false,
  error,
  realTimeUpdates = false,
  defaultView = 'list',
  showStats = true,
  className = ''
}: AuditLogViewerProps) {
  const [currentView, setCurrentView] = useState(defaultView)
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (realTimeUpdates) {
      const interval = setInterval(onRefresh, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [realTimeUpdates, onRefresh])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime()
          bValue = new Date(b.timestamp).getTime()
          break
        case 'user':
          aValue = a.user?.name || 'Unknown'
          bValue = b.user?.name || 'Unknown'
          break
        case 'action':
          aValue = ACTION_CONFIG[a.action]?.label || a.action
          bValue = ACTION_CONFIG[b.action]?.label || b.action
          break
        case 'resource':
          aValue = a.resource_name || a.resource_type
          bValue = b.resource_name || b.resource_type
          break
        case 'success':
          aValue = a.success ? 1 : 0
          bValue = b.success ? 1 : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [entries, sortField, sortDirection])

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    setIsExporting(true)
    try {
      await onExport({
        format,
        filters,
        includeStats: true,
        dateRange: filters.dateRange
      })
      toast({
        title: 'Export started',
        description: `Your ${format.toUpperCase()} export is being prepared.`
      })
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Failed to export data',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => handleSort(field)}
      className="h-8 data-[state=open]:bg-accent"
    >
      {children}
      {sortField === field && (
        sortDirection === 'desc' ? 
        <SortDesc className="ml-2 h-4 w-4" /> : 
        <SortAsc className="ml-2 h-4 w-4" />
      )}
    </Button>
  )

  const renderTableView = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>
                  <SortButton field="timestamp">Time</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="user">User</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="action">Action</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="resource">Resource</SortButton>
                </TableHead>
                <TableHead className="w-12">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => (
                <TableRow 
                  key={entry.id}
                  className={`cursor-pointer hover:bg-muted/50 ${!entry.success ? 'bg-red-50/30' : ''}`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <TableCell>
                    <Badge 
                      variant={entry.success ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {entry.success ? "OK" : "ERR"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUserClick?.(entry.user_id)
                      }}
                      className="text-sm font-medium hover:underline text-blue-600"
                    >
                      {entry.user?.name || 'Unknown User'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${ACTION_CONFIG[entry.action]?.color} text-xs`}
                    >
                      {ACTION_CONFIG[entry.action]?.label || entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-48">
                    {entry.resource_name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onResourceClick?.(entry.resource_type, entry.resource_id)
                        }}
                        className="font-medium hover:underline text-blue-600 truncate"
                      >
                        {entry.resource_name}
                      </button>
                    )}
                    {!entry.resource_name && (
                      <span className="text-muted-foreground capitalize">
                        {entry.resource_type.replace(/[_-]/g, ' ')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {entries.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderListView = () => (
    <div className="space-y-3">
      {sortedEntries.map((entry) => (
        <AuditLogEntry
          key={entry.id}
          entry={entry}
          onUserClick={onUserClick}
          onResourceClick={onResourceClick}
        />
      ))}
      
      {entries.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderCompactView = () => (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-1">
            {sortedEntries.map((entry) => (
              <AuditLogEntryCompact
                key={entry.id}
                entry={entry}
                onUserClick={onUserClick}
                onResourceClick={onResourceClick}
              />
            ))}
          </div>
        </ScrollArea>
        
        {entries.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      {showStats && stats && (
        <AuditLogStatsComponent 
          stats={stats} 
          isLoading={isLoading}
          showDetailed={false}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <AuditLogFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableUsers={availableUsers}
        availableResourceTypes={availableResourceTypes}
        availableCategories={availableCategories}
        isLoading={isLoading}
        onSavePreset={onSavePreset}
        savedPresets={savedPresets}
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {totalEntries.toLocaleString()} total entries
          </Badge>
          
          {realTimeUpdates && (
            <Badge variant="outline" className="text-xs">
              Live updates
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <Tabs value={currentView} onValueChange={setCurrentView as any}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
              <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
              <TabsTrigger value="cards" className="text-xs">Compact</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                CSV File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                JSON File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Excel File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div>
        {currentView === 'table' && renderTableView()}
        {currentView === 'list' && renderListView()}
        {currentView === 'cards' && renderCompactView()}
      </div>

      {/* Pagination */}
      {totalEntries > pageSize && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries.toLocaleString()} entries
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                  className={currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, Math.ceil(totalEntries / pageSize)) }, (_, i) => {
                const totalPages = Math.ceil(totalEntries / pageSize)
                let pageNumber: number
                
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (currentPage <= 3) {
                  pageNumber = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i
                } else {
                  pageNumber = currentPage - 2 + i
                }
                
                if (pageNumber < 1 || pageNumber > totalPages) return null
                
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => onPageChange(pageNumber)}
                      isActive={currentPage === pageNumber}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              {Math.ceil(totalEntries / pageSize) > 5 && currentPage < Math.ceil(totalEntries / pageSize) - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => currentPage < Math.ceil(totalEntries / pageSize) && onPageChange(currentPage + 1)}
                  className={currentPage >= Math.ceil(totalEntries / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Entry Detail Modal */}
      <Dialog open={selectedEntry !== null} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed view of the audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <ScrollArea className="max-h-96">
              <AuditLogEntry
                entry={selectedEntry}
                showFullDetails
                onUserClick={onUserClick}
                onResourceClick={onResourceClick}
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}