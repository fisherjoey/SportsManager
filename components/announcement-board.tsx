"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient, Communication } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { EmergencyBroadcast, QuickEmergencyBroadcast } from "@/components/emergency-broadcast"
import { 
  Megaphone, 
  Bell, 
  AlertTriangle, 
  MessageCircle,
  Pin,
  Calendar,
  User,
  Eye,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface Post {
  id: string
  title: string
  content: string
  excerpt: string
  status: 'draft' | 'published' | 'archived'
  category: string
  category_name: string
  category_color: string
  category_icon: string
  author_name: string
  published_at: string | null
  created_at: string
  hasRead?: boolean
  readCount?: number
}

export function AnnouncementBoard() {
  const { user } = useAuth()
  const [communications, setCommunications] = useState<Communication[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      
      // Fetch communications
      const commResponse = await apiClient.getCommunications({
        status: 'published',
        limit: 10
      })
      setCommunications(commResponse.communications || [])

      // Fetch published posts
      const postsResponse = await apiClient.getPosts()
      const publishedPosts = (postsResponse.data?.posts || []).filter(
        (post: Post) => post.status === 'published'
      )
      setPosts(publishedPosts.slice(0, 10)) // Limit to 10 most recent

    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (communicationId: string) => {
    try {
      await apiClient.acknowledgeCommunication(communicationId, { acknowledged: true })
      setCommunications(prev => 
        prev.map(comm => comm.id === communicationId 
          ? { ...comm, acknowledgment_count: (comm.acknowledgment_count || 0) + 1 }
          : comm
        )
      )
      toast.success('Acknowledged successfully')
    } catch (error) {
      console.error('Error acknowledging communication:', error)
      toast.error('Failed to acknowledge')
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Bell className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-blue-500" />
      case 'assignment':
        return <Bell className="h-4 w-4 text-green-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getCategoryIcon = (iconName?: string) => {
    // Simple mapping - you could expand this
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className="w-4 h-4" />
      case 'Calendar':
        return <Calendar className="w-4 h-4" />
      default:
        return <MessageCircle className="w-4 h-4" />
    }
  }

  const urgentCommunications = communications.filter(c => c.priority === 'urgent')
  const regularCommunications = communications.filter(c => c.priority !== 'urgent')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground">
            Stay updated with the latest news and important communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchContent}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {user?.role === 'admin' && <QuickEmergencyBroadcast />}
        </div>
      </div>

      {/* Urgent Communications Banner */}
      {urgentCommunications.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Urgent Communications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentCommunications.map((comm) => (
                <div key={comm.id} className="flex items-start justify-between gap-4 p-3 bg-white rounded-md border border-red-200">
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">{comm.title}</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {comm.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                      {comm.content.length > 100 && '...'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(comm.sent_at || comm.created_at || ''), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  {comm.requires_acknowledgment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(comm.id)}
                      className="border-red-200 text-red-700 hover:bg-red-100"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Updates</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="posts">Posts & Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {/* Mix communications and posts by date */}
            {[...regularCommunications, ...posts]
              .sort((a, b) => {
                const dateA = new Date(a.sent_at || a.published_at || a.created_at || '')
                const dateB = new Date(b.sent_at || b.published_at || b.created_at || '')
                return dateB.getTime() - dateA.getTime()
              })
              .slice(0, 8)
              .map((item) => (
                <AnnouncementCard 
                  key={item.id} 
                  item={item} 
                  type={'type' in item ? 'communication' : 'post'}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <div className="grid gap-4">
            {regularCommunications.map((comm) => (
              <AnnouncementCard 
                key={comm.id} 
                item={comm} 
                type="communication"
                onAcknowledge={handleAcknowledge}
              />
            ))}
            {regularCommunications.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No communications</h3>
                  <p className="text-muted-foreground">
                    Check back later for new communications and updates.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4">
            {posts.map((post) => (
              <AnnouncementCard 
                key={post.id} 
                item={post} 
                type="post"
                onAcknowledge={handleAcknowledge}
              />
            ))}
            {posts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts</h3>
                  <p className="text-muted-foreground">
                    Check back later for new posts and articles.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Individual announcement card component
interface AnnouncementCardProps {
  item: Communication | Post
  type: 'communication' | 'post'
  onAcknowledge: (id: string) => void
}

function AnnouncementCard({ item, type, onAcknowledge }: AnnouncementCardProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Bell className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeIcon = (itemType: string) => {
    switch (itemType?.toLowerCase()) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-blue-500" />
      case 'assignment':
        return <Bell className="h-4 w-4 text-green-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className="w-4 h-4" />
      case 'Calendar':
        return <Calendar className="w-4 h-4" />
      default:
        return <MessageCircle className="w-4 h-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{item.title}</CardTitle>
              
              {type === 'communication' && 'priority' in item && (
                <Badge variant="outline" className="gap-1">
                  {getPriorityIcon(item.priority)}
                  {item.priority}
                </Badge>
              )}
              
              {type === 'communication' && 'type' in item && (
                <Badge variant="outline" className="gap-1">
                  {getTypeIcon(item.type)}
                  {item.type}
                </Badge>
              )}
              
              {type === 'post' && 'category_name' in item && item.category_name && (
                <Badge variant="outline" className="gap-1">
                  {getCategoryIcon(item.category_icon)}
                  {item.category_name}
                </Badge>
              )}
            </div>
            
            <CardDescription className="text-base">
              {item.content.replace(/<[^>]*>/g, '').substring(0, 200)}
              {item.content.length > 200 && '...'}
            </CardDescription>
            
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {type === 'communication' && 'created_by_name' in item 
                  ? item.created_by_name || 'System'
                  : 'author_name' in item ? item.author_name : 'Unknown'
                }
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(
                  type === 'communication' && 'sent_at' in item ? item.sent_at || item.created_at || '' :
                  'published_at' in item ? item.published_at || item.created_at || '' :
                  item.created_at || ''
                ), 'MMM d, yyyy h:mm a')}
              </div>
              
              {type === 'communication' && 'acknowledgment_count' in item && item.total_recipients && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {item.acknowledgment_count || 0}/{item.total_recipients} acknowledged
                </div>
              )}
            </div>
          </div>
          
          {type === 'communication' && 'requires_acknowledgment' in item && item.requires_acknowledgment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAcknowledge(item.id)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}