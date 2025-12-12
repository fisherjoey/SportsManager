'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  UserPlus, 
  Download, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'
import { apiClient, Employee, Department, JobPosition } from '@/lib/api'

// Employee interface now imported from api.ts - using backend schema

interface EmployeeFilters {
  search: string
  department_id: string
  position_id: string
  employment_status: string
  manager_id: string
}

interface EmployeeStats {
  totalEmployees: number
  activeEmployees: number
  departmentBreakdown: any[]
  positionBreakdown: any[]
  newHiresThisMonth: number
  upcomingEvaluations: number
  activeTrainingPrograms: number
  averageTenure: number
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<JobPosition[]>([])
  const [stats, setStats] = useState<EmployeeStats | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    department_id: '',
    position_id: '',
    employment_status: '',
    manager_id: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [filters, pagination.page, pagination.limit])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadEmployees(),
        loadDepartments(),
        loadPositions(),
        loadStats()
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load initial data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadEmployees = async (retryCount = 0) => {
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      }
      
      if (filters.search) params.search = filters.search
      if (filters.department_id) params.department_id = filters.department_id
      if (filters.position_id) params.position_id = filters.position_id
      if (filters.employment_status) params.employment_status = filters.employment_status
      if (filters.manager_id) params.manager_id = filters.manager_id
      
      const response = await apiClient.getEmployees(params)
      setEmployees(response.employees)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }))
    } catch (error: any) {
      console.error('Error loading employees:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
      
      // Retry logic for temporary failures
      if (retryCount < 2 && (error?.message?.includes('network') || error?.message?.includes('timeout'))) {
        setTimeout(() => loadEmployees(retryCount + 1), 1000 * (retryCount + 1))
        return
      }
      
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load employees. Please try again.',
        variant: 'destructive',
        action: {
          label: 'Retry',
          onClick: () => loadEmployees()
        }
      })
    }
  }

  const loadDepartments = async () => {
    try {
      const response = await apiClient.getEmployeeDepartments()
      setDepartments(response)
    } catch (error: any) {
      console.error('Error loading departments:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
    }
  }

  const loadPositions = async () => {
    try {
      const response = await apiClient.getEmployeePositions()
      setPositions(response)
    } catch (error: any) {
      console.error('Error loading positions:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
    }
  }

  const loadStats = async () => {
    try {
      const response = await apiClient.getEmployeeStats()
      setStats(response.data)
    } catch (error: any) {
      console.error('Error loading stats:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
    }
  }

  const handleFilterChange = (key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filtering
  }

  const handleCreateEmployee = async (employeeData: any) => {
    try {
      await apiClient.createEmployee(employeeData)
      toast({
        title: 'Success',
        description: 'Employee created successfully'
      })
      setShowAddDialog(false)
      await loadEmployees() // Refresh data
      await loadStats() // Refresh stats
    } catch (error: any) {
      console.error('Error creating employee:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
      
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create employee. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateEmployee = async (id: string, employeeData: any) => {
    try {
      await apiClient.updateEmployee(id, employeeData)
      toast({
        title: 'Success',
        description: 'Employee updated successfully'
      })
      await loadEmployees() // Refresh data
      await loadStats() // Refresh stats
    } catch (error: any) {
      console.error('Error updating employee:', error)
      
      // Handle authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        apiClient.removeToken()
        window.location.href = '/login'
        return
      }
      
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update employee. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default', text: 'Active', color: 'bg-emerald-100 text-emerald-800' },
      inactive: { variant: 'secondary', text: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      terminated: { variant: 'destructive', text: 'Terminated', color: 'bg-red-100 text-red-800' },
      on_leave: { variant: 'secondary', text: 'On Leave', color: 'bg-yellow-100 text-yellow-800' },
      probation: { variant: 'secondary', text: 'Probation', color: 'bg-orange-100 text-orange-800' },
      suspended: { variant: 'destructive', text: 'Suspended', color: 'bg-red-100 text-red-800' }
    }

    const config = variants[status as keyof typeof variants] || variants.active
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {config.text}
      </Badge>
    )
  }

  const getTrainingProgressBadge = (completed: number, total: number) => {
    if (total === 0) {
      return (
        <Badge variant="secondary">
          No Training Required
        </Badge>
      )
    }
    
    const percentage = (completed / total) * 100
    let variant: 'default' | 'secondary' | 'destructive' = 'default'
    let color = 'bg-emerald-100 text-emerald-800'
    
    if (percentage < 50) {
      variant = 'destructive'
      color = 'bg-red-100 text-red-800'
    } else if (percentage < 80) {
      variant = 'secondary'
      color = 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <Badge variant={variant} className={color}>
        {completed}/{total} ({Math.round(percentage)}%)
      </Badge>
    )
  }

  const formatSalary = (salary?: number) => {
    if (!salary) return 'Not disclosed'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(salary)
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.length >= 2 
      ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }


  const columns = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(employee.employee_name || 'Unknown')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{employee.employee_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{employee.employee_email}</p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'position_title',
      header: 'Position',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <div>
            <p className="font-medium">{employee.position_title || 'Not assigned'}</p>
            <p className="text-sm text-muted-foreground">{employee.department_name || 'No department'}</p>
          </div>
        )
      }
    },
    {
      accessorKey: 'employment_status',
      header: 'Status',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return getStatusBadge(employee.employment_status)
      }
    },
    {
      accessorKey: 'work_location',
      header: 'Location',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{employee.work_location || 'Not specified'}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'hire_date',
      header: 'Hire Date',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return new Date(employee.hire_date).toLocaleDateString()
      }
    },
    {
      id: 'performance',
      header: 'Performance',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        if (!employee.latest_overall_rating) {
          return <span className="text-sm text-muted-foreground">No rating</span>
        }
        return (
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Award 
                  key={star} 
                  className={`h-4 w-4 ${
                    star <= employee.latest_overall_rating! 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            <span className="text-sm">{employee.latest_overall_rating}/5</span>
          </div>
        )
      }
    },
    {
      id: 'training',
      header: 'Training',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        const completed = employee.completed_trainings || 0
        const active = employee.active_trainings || 0
        return getTrainingProgressBadge(completed, completed + active)
      }
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedEmployee(employee)}>
                <Users className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Employee
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Employee Management</h2>
            <p className="text-muted-foreground">
              Loading employee data...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats Overview */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Employee Management</h2>
            <p className="text-muted-foreground">
              Manage employee information, performance, and organizational structure
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                    <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">New Hires This Month</p>
                    <p className="text-2xl font-bold">{stats.newHiresThisMonth}</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming Evaluations</p>
                    <p className="text-2xl font-bold">{stats.upcomingEvaluations}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={filters.department_id} onValueChange={(value) => handleFilterChange('department_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select value={filters.employment_status} onValueChange={(value) => handleFilterChange('employment_status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={filters.position_id} onValueChange={(value) => handleFilterChange('position_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Employees ({pagination.total})</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={employees}
            columns={columns}
          />
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Profile Dialog */}
      {selectedEmployee && (
        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {getInitials(selectedEmployee.employee_name || 'Unknown')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xl font-bold">
                    {selectedEmployee.employee_name || 'Unknown Employee'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEmployee.position_title || 'No position'} • {selectedEmployee.department_name || 'No department'}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="certifications">Certifications</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.employee_email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p>{selectedEmployee.work_location || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Employment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Employment Status</p>
                        {getStatusBadge(selectedEmployee.employment_status)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hire Date</p>
                        <p>{new Date(selectedEmployee.hire_date).toLocaleDateString()}</p>
                      </div>
                      {selectedEmployee.manager_name && (
                        <div>
                          <p className="text-sm text-muted-foreground">Reports To</p>
                          <p>{selectedEmployee.manager_name}</p>
                        </div>
                      )}
                      {selectedEmployee.base_salary && (
                        <div>
                          <p className="text-sm text-muted-foreground">Base Salary</p>
                          <p className="font-semibold">{formatSalary(selectedEmployee.base_salary)}</p>
                        </div>
                      )}
                      {selectedEmployee.employment_type && (
                        <div>
                          <p className="text-sm text-muted-foreground">Employment Type</p>
                          <p>{selectedEmployee.employment_type}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Employee ID</p>
                      <p>{selectedEmployee.employee_id || 'Not assigned'}</p>
                    </div>
                    {selectedEmployee.position_level && (
                      <div>
                        <p className="text-sm text-muted-foreground">Position Level</p>
                        <p>{selectedEmployee.position_level}</p>
                      </div>
                    )}
                    {selectedEmployee.hourly_rate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Hourly Rate</p>
                        <p>{formatSalary(selectedEmployee.hourly_rate)}/hour</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2">
                          {selectedEmployee.latest_overall_rating || 0}/5
                        </div>
                        <p className="text-sm text-muted-foreground">Latest Rating</p>
                        <div className="flex justify-center mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Award 
                              key={star} 
                              className={`h-5 w-5 ${
                                star <= (selectedEmployee.latest_overall_rating || 0) 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-2">
                          {selectedEmployee.latest_evaluation_date 
                            ? new Date(selectedEmployee.latest_evaluation_date).toLocaleDateString()
                            : 'No evaluation'}
                        </div>
                        <p className="text-sm text-muted-foreground">Last Evaluation</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Certifications & Training Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Training and certification records will be loaded from the training module.
                      </p>
                      <Button variant="outline" className="mt-4" disabled>
                        View Training Records
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="training" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Training Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-center mb-4">
                          <div className="text-3xl font-bold text-emerald-600">
                            {selectedEmployee.completed_trainings || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">Completed Trainings</p>
                        </div>
                      </div>
                      <div>
                        <div className="text-center mb-4">
                          <div className="text-3xl font-bold text-blue-600">
                            {selectedEmployee.active_trainings || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">Active Trainings</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Training Progress</span>
                        <span>
                          {(selectedEmployee.completed_trainings || 0) + (selectedEmployee.active_trainings || 0) > 0
                            ? Math.round(((selectedEmployee.completed_trainings || 0) / ((selectedEmployee.completed_trainings || 0) + (selectedEmployee.active_trainings || 0))) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={(selectedEmployee.completed_trainings || 0) + (selectedEmployee.active_trainings || 0) > 0
                          ? ((selectedEmployee.completed_trainings || 0) / ((selectedEmployee.completed_trainings || 0) + (selectedEmployee.active_trainings || 0))) * 100
                          : 0} 
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee record in the system
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Add New Employee</h3>
            <p className="text-muted-foreground mb-4">
              This feature requires integration with user management.<br />
              Employees must first be created as users, then assigned employee records.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Steps to add an employee:</p>
              <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                <li>Create user account via User Management</li>
                <li>Assign department and position</li>
                <li>Set employment details</li>
                <li>Configure salary and benefits</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Close
            </Button>
            <Button disabled>
              Feature Coming Soon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}