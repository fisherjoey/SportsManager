'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft,
  Settings,
  Users,
  FileText,
  Activity,
  BarChart3,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Lock,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import our new components
import CategoryManagerDashboard from '@/components/resources/CategoryManagerDashboard'
import CategoryManagerList from '@/components/resources/CategoryManagerList'
import CategoryInsights from '@/components/resources/CategoryInsights'
import { PermissionMatrix } from '@/components/resources/PermissionMatrix'

interface CategoryData {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'archived'
  visibility: 'public' | 'restricted' | 'private'
  resourceCount: number
  managerCount: number
  createdAt: string
  lastUpdated: string
  permissions: {
    canManage: boolean
    canAddManagers: boolean
    canEditPermissions: boolean
    canViewInsights: boolean
  }
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
  status: 'active' | 'inactive'
}

interface ActivityItem {
  id: string
  type: 'upload' | 'download' | 'permission_change' | 'manager_added' | 'manager_removed'
  description: string
  timestamp: string
  user: string
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-96" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-80" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  )
}

function ResourceList({ categoryId }: { categoryId: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadResources = async () => {
      // Mock data - replace with actual API call
      setTimeout(() => {
        setResources([
          {
            id: '1',
            name: 'Training Manual 2024.pdf',
            type: 'document',
            size: '2.4 MB',
            downloadCount: 145,
            viewCount: 320,
            uploadedAt: '2024-08-20',
            uploadedBy: 'John Smith',
            status: 'active'
          },
          {
            id: '2',
            name: 'Safety Guidelines Video',
            type: 'video',
            size: '45.2 MB',
            downloadCount: 89,
            viewCount: 256,
            uploadedAt: '2024-08-18',
            uploadedBy: 'Sarah Johnson',
            status: 'active'
          },
          {
            id: '3',
            name: 'Equipment Checklist',
            type: 'document',
            size: '156 KB',
            downloadCount: 203,
            viewCount: 412,
            uploadedAt: '2024-08-15',
            uploadedBy: 'Mike Wilson',
            status: 'active'
          },
          {
            id: '4',
            name: 'Quick Reference Guide',
            type: 'document',
            size: '1.8 MB',
            downloadCount: 178,
            viewCount: 298,
            uploadedAt: '2024-08-12',
            uploadedBy: 'Lisa Davis',
            status: 'inactive'
          }
        ])
        setIsLoading(false)
      }, 1000)
    }

    loadResources()
  }, [categoryId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Resources ({resources.length})</h3>
        <Button>Add Resource</Button>
      </div>
      
      <div className="space-y-3">
        {resources.map((resource) => (
          <Card key={resource.id}>
            <CardContent className="flex items-center space-x-4 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{resource.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {resource.type}
                  </Badge>
                  <Badge 
                    variant={resource.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {resource.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{resource.size}</span>
                  <span className="flex items-center">
                    <Eye className="mr-1 h-3 w-3" />
                    {resource.downloadCount} downloads
                  </span>
                  <span className="flex items-center">
                    <Activity className="mr-1 h-3 w-3" />
                    {resource.viewCount} views
                  </span>
                  <span>by {resource.uploadedBy}</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ActivityFeed({ categoryId }: { categoryId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadActivities = async () => {
      // Mock data - replace with actual API call
      setTimeout(() => {
        setActivities([
          {
            id: '1',
            type: 'upload',
            description: 'Training Manual 2024.pdf was uploaded',
            timestamp: '2 hours ago',
            user: 'John Smith'
          },
          {
            id: '2',
            type: 'download',
            description: 'Safety Guidelines Video was downloaded 5 times',
            timestamp: '4 hours ago',
            user: 'Multiple users'
          },
          {
            id: '3',
            type: 'manager_added',
            description: 'Mike Wilson was added as a contributor',
            timestamp: '1 day ago',
            user: 'Sarah Johnson'
          },
          {
            id: '4',
            type: 'permission_change',
            description: 'Resource permissions updated for Equipment Checklist',
            timestamp: '2 days ago',
            user: 'John Smith'
          },
          {
            id: '5',
            type: 'manager_removed',
            description: 'Tom Brown\'s access was revoked',
            timestamp: '3 days ago',
            user: 'Sarah Johnson'
          }
        ])
        setIsLoading(false)
      }, 800)
    }

    loadActivities()
  }, [categoryId])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'download':
        return <Activity className="h-4 w-4 text-blue-600" />
      case 'permission_change':
        return <Shield className="h-4 w-4 text-orange-600" />
      case 'manager_added':
        return <Users className="h-4 w-4 text-purple-600" />
      case 'manager_removed':
        return <Users className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="h-4 w-4 rounded-full mt-1" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-80">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="mt-1">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{activity.description}</p>
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
  )
}

export default function CategoryManagePage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params?.id as string
  
  const [category, setCategory] = useState<CategoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCategory = async () => {
      if (!categoryId) {
        setError('Category ID is required')
        setIsLoading(false)
        return
      }

      try {
        // Mock data - replace with actual API call
        setTimeout(() => {
          setCategory({
            id: categoryId,
            name: 'Training & Development Resources',
            description: 'Resources for team training, development, and skill building activities.',
            status: 'active',
            visibility: 'restricted',
            resourceCount: 47,
            managerCount: 5,
            createdAt: '2024-01-15',
            lastUpdated: '2024-08-31',
            permissions: {
              canManage: true,
              canAddManagers: true,
              canEditPermissions: true,
              canViewInsights: true
            }
          })
          setIsLoading(false)
        }, 1000)
      } catch (err) {
        setError('Failed to load category data')
        setIsLoading(false)
      }
    }

    loadCategory()
  }, [categoryId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'archived':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4 text-blue-600" />
      case 'restricted':
        return <Shield className="h-4 w-4 text-orange-600" />
      case 'private':
        return <Lock className="h-4 w-4 text-red-600" />
      default:
        return <Globe className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Category not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/resources/categories">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Link>
            </Button>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {category.name}
              </h1>
              <Badge 
                variant={category.status === 'active' ? 'default' : 'secondary'}
                className="flex items-center space-x-1"
              >
                {getStatusIcon(category.status)}
                <span>{category.status}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                {getVisibilityIcon(category.visibility)}
                <span>{category.visibility}</span>
              </Badge>
            </div>
            
            {category.description && (
              <p className="text-muted-foreground max-w-2xl">
                {category.description}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{category.resourceCount} resources</span>
              <span>•</span>
              <span>{category.managerCount} managers</span>
              <span>•</span>
              <span>Created {category.createdAt}</span>
              <span>•</span>
              <span>Updated {category.lastUpdated}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Category Settings
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="border-b">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 sm:w-fit">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="managers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Managers</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <Suspense fallback={<LoadingSkeleton />}>
            <CategoryManagerDashboard 
              categoryId={categoryId}
              categoryName={category.name}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Category Resources</CardTitle>
              <CardDescription>
                Manage files, documents, and other resources in this category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingSkeleton />}>
                <ResourceList categoryId={categoryId} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="managers">
          <Suspense fallback={<LoadingSkeleton />}>
            <CategoryManagerList 
              categoryId={categoryId}
              categoryName={category.name}
              canManageManagers={category.permissions.canAddManagers}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permission Management</CardTitle>
              <CardDescription>
                Configure who can access and manage resources in this category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingSkeleton />}>
                <PermissionMatrix 
                  categoryId={categoryId}
                  canEdit={category.permissions.canEditPermissions}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                Recent changes and activities in this category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingSkeleton />}>
                <ActivityFeed categoryId={categoryId} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          {category.permissions.canViewInsights ? (
            <Suspense fallback={<LoadingSkeleton />}>
              <CategoryInsights 
                categoryId={categoryId}
                categoryName={category.name}
              />
            </Suspense>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to view insights for this category.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}