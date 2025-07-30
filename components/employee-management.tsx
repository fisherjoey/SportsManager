"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table/DataTable'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/components/ui/use-toast'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position: {
    id: string
    title: string
    department: string
  }
  department: {
    id: string
    name: string
    code: string
  }
  status: 'active' | 'inactive' | 'terminated' | 'on_leave'
  hireDate: string
  salary?: number
  manager?: {
    id: string
    name: string
  }
  location: {
    id: string
    name: string
    address: string
  }
  profilePicture?: string
  skills: string[]
  certifications: Array<{
    id: string
    name: string
    issuer: string
    issuedDate: string
    expiryDate?: string
    status: 'valid' | 'expired' | 'expiring_soon'
  }>
  performance: {
    rating: number
    lastReviewDate: string
    nextReviewDate: string
  }
  trainingCompleted: number
  trainingRequired: number
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
}

interface EmployeeFilters {
  search: string
  department: string
  position: string
  status: string
  location: string
  manager: string
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    department: '',
    position: '',
    status: '',
    location: '',
    manager: ''
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [employees, filters])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to load employees')
      
      const data = await response.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error loading employees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = employees

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(employee => 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower) ||
        employee.email.toLowerCase().includes(searchLower) ||
        employee.position.title.toLowerCase().includes(searchLower)
      )
    }

    if (filters.department) {
      filtered = filtered.filter(employee => employee.department.id === filters.department)
    }

    if (filters.position) {
      filtered = filtered.filter(employee => employee.position.id === filters.position)
    }

    if (filters.status) {
      filtered = filtered.filter(employee => employee.status === filters.status)
    }

    if (filters.location) {
      filtered = filtered.filter(employee => employee.location.id === filters.location)
    }

    if (filters.manager) {
      filtered = filtered.filter(employee => employee.manager?.id === filters.manager)
    }

    setFilteredEmployees(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default', text: 'Active', color: 'bg-green-100 text-green-800' },
      inactive: { variant: 'secondary', text: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      terminated: { variant: 'destructive', text: 'Terminated', color: 'bg-red-100 text-red-800' },
      on_leave: { variant: 'secondary', text: 'On Leave', color: 'bg-yellow-100 text-yellow-800' }
    }

    const config = variants[status as keyof typeof variants] || variants.active
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {config.text}
      </Badge>
    )
  }

  const getCertificationStatusBadge = (status: string) => {
    const variants = {
      valid: { variant: 'default', icon: CheckCircle, text: 'Valid', color: 'text-green-600' },
      expired: { variant: 'destructive', icon: AlertTriangle, text: 'Expired', color: 'text-red-600' },
      expiring_soon: { variant: 'secondary', icon: Clock, text: 'Expiring Soon', color: 'text-yellow-600' }
    }

    const config = variants[status as keyof typeof variants] || variants.valid
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const formatSalary = (salary?: number) => {
    if (!salary) return 'Not disclosed'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary)
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
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
              <AvatarImage src={employee.profilePicture} />
              <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{employee.firstName} {employee.lastName}</p>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'position.title',
      header: 'Position',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <div>
            <p className="font-medium">{employee.position.title}</p>
            <p className="text-sm text-muted-foreground">{employee.department.name}</p>
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return getStatusBadge(employee.status)
      }
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{employee.location.name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'hireDate',
      header: 'Hire Date',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return new Date(employee.hireDate).toLocaleDateString()
      }
    },
    {
      accessorKey: 'performance.rating',
      header: 'Performance',
      cell: ({ row }: any) => {
        const employee: Employee = row.original
        return (
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Award 
                  key={star} 
                  className={`h-4 w-4 ${
                    star <= employee.performance.rating 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            <span className="text-sm">{employee.performance.rating}/5</span>
          </div>
        )
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
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  <SelectItem value="hq">Headquarters</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="branch1">Branch Office 1</SelectItem>
                  <SelectItem value="branch2">Branch Office 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredEmployees}
            columns={columns}
          />
        </CardContent>
      </Card>

      {/* Employee Profile Dialog */}
      {selectedEmployee && (
        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedEmployee.profilePicture} />
                  <AvatarFallback>
                    {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xl font-bold">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEmployee.position.title} • {selectedEmployee.department.name}
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
                        <span>{selectedEmployee.email}</span>
                      </div>
                      {selectedEmployee.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedEmployee.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p>{selectedEmployee.location.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedEmployee.location.address}
                          </p>
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
                        <p className="text-sm text-muted-foreground">Status</p>
                        {getStatusBadge(selectedEmployee.status)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hire Date</p>
                        <p>{new Date(selectedEmployee.hireDate).toLocaleDateString()}</p>
                      </div>
                      {selectedEmployee.manager && (
                        <div>
                          <p className="text-sm text-muted-foreground">Reports To</p>
                          <p>{selectedEmployee.manager.name}</p>
                        </div>
                      )}
                      {selectedEmployee.salary && (
                        <div>
                          <p className="text-sm text-muted-foreground">Salary</p>
                          <p className="font-semibold">{formatSalary(selectedEmployee.salary)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedEmployee.skills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2">
                          {selectedEmployee.performance.rating}/5
                        </div>
                        <p className="text-sm text-muted-foreground">Current Rating</p>
                        <div className="flex justify-center mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Award 
                              key={star} 
                              className={`h-5 w-5 ${
                                star <= selectedEmployee.performance.rating 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-2">
                          {new Date(selectedEmployee.performance.lastReviewDate).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Last Review</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-2">
                          {new Date(selectedEmployee.performance.nextReviewDate).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Next Review</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Certifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEmployee.certifications.length > 0 ? (
                      <div className="space-y-4">
                        {selectedEmployee.certifications.map((cert, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{cert.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Issued by {cert.issuer}
                                </p>
                              </div>
                              {getCertificationStatusBadge(cert.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Issued</p>
                                <p>{new Date(cert.issuedDate).toLocaleDateString()}</p>
                              </div>
                              {cert.expiryDate && (
                                <div>
                                  <p className="text-muted-foreground">Expires</p>
                                  <p>{new Date(cert.expiryDate).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No certifications recorded</p>
                    )}
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
                          <div className="text-3xl font-bold text-green-600">
                            {selectedEmployee.trainingCompleted}
                          </div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                      </div>
                      <div>
                        <div className="text-center mb-4">
                          <div className="text-3xl font-bold text-orange-600">
                            {selectedEmployee.trainingRequired}
                          </div>
                          <p className="text-sm text-muted-foreground">Required</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Training Completion</span>
                        <span>
                          {Math.round((selectedEmployee.trainingCompleted / (selectedEmployee.trainingCompleted + selectedEmployee.trainingRequired)) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(selectedEmployee.trainingCompleted / (selectedEmployee.trainingCompleted + selectedEmployee.trainingRequired)) * 100} 
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
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john.doe@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Software Developer</SelectItem>
                  <SelectItem value="designer">UI/UX Designer</SelectItem>
                  <SelectItem value="manager">Project Manager</SelectItem>
                  <SelectItem value="analyst">Business Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}