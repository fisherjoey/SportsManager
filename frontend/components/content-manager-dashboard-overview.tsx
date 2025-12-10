'use client'

import { useState, useEffect } from 'react'
import { FileText, MessageSquare, Book, TrendingUp, Plus, Edit, Eye, Send, Archive } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner, CardLoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { useAuth } from '@/components/auth-provider'
import { Progress } from '@/components/ui/progress'

interface ContentStats {
  publishedResources: number
  draftResources: number
  totalViews: number
  recentUpdates: number
  communicationsSent: number
  pendingReviews: number
  documentCount: number
  engagementRate: number
}

interface RecentResource {
  id: string
  title: string
  category: string
  status: 'published' | 'draft' | 'review'
  views: number
  lastUpdated: string
  author: string
}

interface RecentCommunication {
  id: string
  subject: string
  recipientCount: number
  sentAt: string
  openRate: number
  status: 'sent' | 'scheduled' | 'draft'
}

export function ContentManagerDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [recentResources, setRecentResources] = useState<RecentResource[]>([])
  const [recentCommunications, setRecentCommunications] = useState<RecentCommunication[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Mock data for content manager dashboard
      const mockStats: ContentStats = {
        publishedResources: 42,
        draftResources: 8,
        totalViews: 3847,
        recentUpdates: 12,
        communicationsSent: 28,
        pendingReviews: 5,
        documentCount: 156,
        engagementRate: 72
      }
      
      const mockResources: RecentResource[] = [
        {
          id: '1',
          title: 'Referee Code of Conduct',
          category: 'Policies',
          status: 'published',
          views: 245,
          lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          author: user?.name || 'Content Manager'
        },
        {
          id: '2',
          title: 'Game Day Procedures',
          category: 'Training',
          status: 'published',
          views: 189,
          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          author: user?.name || 'Content Manager'
        },
        {
          id: '3',
          title: 'Safety Guidelines 2024',
          category: 'Safety',
          status: 'review',
          views: 0,
          lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          author: user?.name || 'Content Manager'
        },
        {
          id: '4',
          title: 'Tournament Rules Update',
          category: 'Rules',
          status: 'draft',
          views: 0,
          lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          author: user?.name || 'Content Manager'
        },
        {
          id: '5',
          title: 'Equipment Standards',
          category: 'Standards',
          status: 'published',
          views: 412,
          lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          author: user?.name || 'Content Manager'
        }
      ]
      
      const mockCommunications: RecentCommunication[] = [
        {
          id: '1',
          subject: 'Weekend Game Schedule Updates',
          recipientCount: 125,
          sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          openRate: 78,
          status: 'sent'
        },
        {
          id: '2',
          subject: 'New Training Resources Available',
          recipientCount: 89,
          sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          openRate: 65,
          status: 'sent'
        },
        {
          id: '3',
          subject: 'Monthly Newsletter - March 2024',
          recipientCount: 250,
          sentAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          openRate: 0,
          status: 'scheduled'
        },
        {
          id: '4',
          subject: 'Important Policy Changes',
          recipientCount: 0,
          sentAt: '',
          openRate: 0,
          status: 'draft'
        }
      ]
      
      setStats(mockStats)
      setRecentResources(mockResources)
      setRecentCommunications(mockCommunications)
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <CardLoadingSpinner count={4} />
      </div>
    )
  }

  const statsItems = [
    {
      title: 'Published Resources',
      value: stats?.publishedResources || 0,
      icon: FileText,
      change: { value: 5, trend: 'positive' as const },
      color: 'success' as const
    },
    {
      title: 'Total Views',
      value: stats?.totalViews || 0,
      icon: Eye,
      change: { value: 12, trend: 'positive' as const }
    },
    {
      title: 'Communications Sent',
      value: stats?.communicationsSent || 0,
      icon: MessageSquare,
      subtitle: 'This month'
    },
    {
      title: 'Pending Reviews',
      value: stats?.pendingReviews || 0,
      icon: Edit,
      color: 'warning' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'Content Manager'}!</h2>
        <p className="text-muted-foreground">
          You have {stats?.pendingReviews || 0} resources pending review and {stats?.draftResources || 0} drafts to complete.
        </p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.location.href = '/?view=resources'}>
            <Plus className="h-4 w-4 mr-2" />
            Create Resource
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/?view=communications'}>
            <Send className="h-4 w-4 mr-2" />
            Send Communication
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid items={statsItems} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Resources</CardTitle>
            <CardDescription>Latest content updates and publications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResources.length === 0 ? (
              <EmptyState
                title="No resources yet"
                description="Start creating content for your organization"
                icon={Book}
              />
            ) : (
              <div className="space-y-3">
                {recentResources.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{resource.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{resource.category}</Badge>
                        {resource.status === 'published' && (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>{resource.views} views</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          resource.status === 'published' ? 'success' :
                            resource.status === 'review' ? 'warning' :
                              'secondary'
                        }
                      >
                        {resource.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Communications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Communications</CardTitle>
            <CardDescription>Email campaigns and announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCommunications.length === 0 ? (
              <EmptyState
                title="No communications"
                description="Start sending updates to your community"
                icon={MessageSquare}
              />
            ) : (
              <div className="space-y-3">
                {recentCommunications.map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{comm.subject}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {comm.status === 'sent' && (
                          <>
                            <span>{comm.recipientCount} recipients</span>
                            <span>•</span>
                            <span>{comm.openRate}% opened</span>
                          </>
                        )}
                        {comm.status === 'scheduled' && (
                          <span>Scheduled for {new Date(comm.sentAt).toLocaleDateString()}</span>
                        )}
                        {comm.status === 'draft' && (
                          <span>Draft</span>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        comm.status === 'sent' ? 'success' :
                          comm.status === 'scheduled' ? 'default' :
                            'secondary'
                      }
                    >
                      {comm.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
          <CardDescription>Overview of your content management metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-success">{stats?.engagementRate || 0}%</div>
              <p className="text-sm text-muted-foreground mt-1">Engagement Rate</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.documentCount || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Documents</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-info">{stats?.recentUpdates || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Recent Updates</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.draftResources || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Drafts</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Content completion</span>
              <span className="font-medium">
                {stats?.publishedResources || 0} / {(stats?.publishedResources || 0) + (stats?.draftResources || 0)}
              </span>
            </div>
            <Progress 
              value={
                ((stats?.publishedResources || 0) / ((stats?.publishedResources || 0) + (stats?.draftResources || 0))) * 100
              } 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}