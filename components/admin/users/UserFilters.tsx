"use client"

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Filter, X, Download } from 'lucide-react'

interface UserFiltersProps {
  filters: {
    search: string
    role: string
    status: string
  }
  onFiltersChange: (filters: any) => void
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleRoleChange = (value: string) => {
    onFiltersChange({ ...filters, role: value })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      role: 'all',
      status: 'all'
    })
  }

  const hasActiveFilters = filters.search || filters.role !== 'all' || filters.status !== 'all'

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by name or email..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Select value={filters.role} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="admin">Administrators</SelectItem>
          <SelectItem value="assignor">Assignors</SelectItem>
          <SelectItem value="referee">All Referees</SelectItem>
          <SelectItem value="senior_referee">Senior Referees</SelectItem>
          <SelectItem value="junior_referee">Junior Referees</SelectItem>
          <SelectItem value="rookie_referee">Rookie Referees</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClearFilters}
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <Button variant="outline">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  )
}