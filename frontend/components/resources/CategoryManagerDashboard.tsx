'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users, 
  FileText, 
  Plus, 
  UserPlus, 
  Download, 
  Eye, 
  Calendar, 
  Activity,
  Shield,
  Settings,
  MoreVertical,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

interface CategoryManager {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'contributor'
  avatar?: string
  joinedAt: string
  lastActive: string
}

interface Resource {
  id: string
  name: string
  type: 'document' | 'video' | 'image' | 'link'
  size?: string
  downloadCount: number
  viewCount: number
  uploadedAt: string
  uploadedBy: string
}

interface ActivityItem {
  id: string
  type: 'upload' | 'download' | 'permission_change' | 'manager_added' | 'manager_removed'
  description: string
  timestamp: string
  user: string
}

interface CategoryStats {
  totalResources: number
  totalDownloads: number
  totalViews: number
  activeManagers: number
  publicAccess: number
  restrictedAccess: number
  recentActivity: number
}

interface CategoryManagerDashboardProps {
  categoryId: string
  categoryName: string
  className?: string
}

export function CategoryManagerDashboard({ categoryId, categoryName, className }: CategoryManagerDashboardProps) {
  const [stats, setStats] = useState<CategoryStats>({
    totalResources: 0,
    totalDownloads: 0,
    totalViews: 0,
    activeManagers: 0,
    publicAccess: 0,
    restrictedAccess: 0,
    recentActivity: 0
  })
  
  const [managers, setManagers] = useState<CategoryManager[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      // Simulate API call
      setTimeout(() => {
        setStats({
          totalResources: 47,
          totalDownloads: 1248,
          totalViews: 3842,
          activeManagers: 5,
          publicAccess: 28,
          restrictedAccess: 19,
          recentActivity: 12
        })

        setManagers([
          {
            id: '1',
            name: 'John Smith',
            email: 'john@example.com',
            role: 'owner',
            avatar: '/avatars/john.jpg',
            joinedAt: '2024-01-15',
            lastActive: '2 hours ago'
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            role: 'manager',
            avatar: '/avatars/sarah.jpg',
            joinedAt: '2024-02-20',
            lastActive: '1 day ago'
          },
          {
            id: '3',
            name: 'Mike Wilson',
            email: 'mike@example.com',
            role: 'contributor',
            joinedAt: '2024-03-10',
            lastActive: '3 days ago'
          }
        ])

        setResources([
          {
            id: '1',
            name: 'Training Manual 2024.pdf',
            type: 'document',
            size: '2.4 MB',
            downloadCount: 145,
            viewCount: 320,
            uploadedAt: '2024-08-20',
            uploadedBy: 'John Smith'
          },
          {
            id: '2',
            name: 'Safety Guidelines Video',
            type: 'video',
            size: '45.2 MB',
            downloadCount: 89,
            viewCount: 256,
            uploadedAt: '2024-08-18',
            uploadedBy: 'Sarah Johnson'
          },
          {
            id: '3',
            name: 'Equipment Checklist',
            type: 'document',
            size: '156 KB',
            downloadCount: 203,
            viewCount: 412,
            uploadedAt: '2024-08-15',
            uploadedBy: 'Mike Wilson'
          }
        ])

        setActivities([
          {
            id: '1',
            type: 'upload',
            description: 'Training Manual 2024.pdf uploaded',
            timestamp: '2 hours ago',
            user: 'John Smith'
          },
          {
            id: '2',
            type: 'download',
            description: 'Safety Guidelines Video downloaded 5 times',
            timestamp: '4 hours ago',
            user: 'Multiple users'
          },
          {
            id: '3',
            type: 'manager_added',
            description: 'Mike Wilson added as contributor',
            timestamp: '1 day ago',
            user: 'Sarah Johnson'
          }
        ])

        setIsLoading(false)
      }, 1000)
    }

    loadData()
  }, [categoryId])

  const getRoleColor = (role: string) => {
    switch (role) {
    case 'owner':
      return cn(getStatusColorClass('error', 'bg'), getStatusColorClass('error', 'text'))
    case 'manager':
      return cn(getStatusColorClass('info', 'bg'), getStatusColorClass('info', 'text'))
    case 'contributor':
      return cn(getStatusColorClass('success', 'bg'), getStatusColorClass('success', 'text'))
    default:
      return 'bg-muted text-muted-foreground'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
    case 'upload':
      return <FileText className={cn("h-4 w-4", getStatusColorClass('success', 'text'))} />
    case 'download':
      return <Download className={cn("h-4 w-4", getStatusColorClass('info', 'text'))} />
    case 'permission_change':
      return <Shield className={cn("h-4 w-4", getStatusColorClass('warning', 'text'))} />
    case 'manager_added':
      return <UserPlus className={cn("h-4 w-4", getStatusColorClass('info', 'text'))} />
    case 'manager_removed':
      return <Users className={cn("h-4 w-4", getStatusColorClass('error', 'text'))} />
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{categoryName}</h1>
          <p className="text-muted-foreground">Category Management Dashboard</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Button size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Manager
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResources}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className={cn("mr-1 h-3 w-3", getStatusColorClass('success', 'text'))} />
              +12% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className={cn("mr-1 h-3 w-3", getStatusColorClass('success', 'text'))} />
              +8% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className={cn("mr-1 h-3 w-3", getStatusColorClass('success', 'text'))} />
              +15% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeManagers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle className={cn("mr-1 h-3 w-3", getStatusColorClass('success', 'text'))} />
              All active
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Resources */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Resources</CardTitle>
                <CardDescription>Latest uploads and updates</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {resources.map((resource) => (
                    <div key={resource.id} className="flex items-center space-x-4 rounded-lg border p-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium leading-none">{resource.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{resource.size}</span>
                          <span className="flex items-center">
                            <Download className="mr-1 h-3 w-3" />
                            {resource.downloadCount}
                          </span>
                          <span className="flex items-center">
                            <Eye className="mr-1 h-3 w-3" />
                            {resource.viewCount}
                          </span>
                          <span>by {resource.uploadedBy}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Manage
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category Managers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Managers</CardTitle>
              <CardDescription>People who manage this category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={manager.avatar} />
                      <AvatarFallback>{manager.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium leading-none">{manager.name}</p>
                        <Badge variant="secondary" className={cn('text-xs', getRoleColor(manager.role))}>
                          {manager.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {manager.lastActive}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Manager
              </Button>
            </CardFooter>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="mt-1">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{activity.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{activity.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                View All Activity
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Access Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Public Access</span>
                <span className="text-sm font-medium">{stats.publicAccess}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Restricted Access</span>
                <span className="text-sm font-medium">{stats.restrictedAccess}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <span className="text-sm">Total Resources</span>
                <span className="text-sm">{stats.totalResources}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CategoryManagerDashboard