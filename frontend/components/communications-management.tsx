'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Send,
  Calendar,
  User,
  Eye,
  Loader2,
  AlertCircle,
  Megaphone,
  Bell,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  Zap,
  Archive,
  MessageSquare,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient, Communication } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

interface CommunicationFormData {
  title: string
  content: string
  type: string
  priority: string
  target_audience: {
    role?: string[]
    specific_users?: string[]
    all_users?: boolean
  }
  requires_acknowledgment: boolean
  scheduled_send_date?: string
}

const COMMUNICATION_TYPES = [
  { value: 'announcement', label: 'Announcement', icon: Megaphone, description: 'General announcements' },
  { value: 'memo', label: 'Memo', icon: MessageCircle, description: 'Internal memos and notes' },
  { value: 'policy_update', label: 'Policy Update', icon: FileText, description: 'Policy changes and updates' },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, description: 'Urgent communications' },
  { value: 'newsletter', label: 'Newsletter', icon: Bell, description: 'Regular newsletters and updates' }
]

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800', icon: MessageSquare },
  { value: 'normal', label: 'Normal', color: 'bg-yellow-100 text-yellow-800', icon: Bell },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
]

export function CommunicationsManagement() {
  const { user } = useAuth()
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  // Form state
  const [formData, setFormData] = useState<CommunicationFormData>({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'medium',
    target_audience: { all_users: true },
    requires_acknowledgment: false,
    scheduled_send_date: undefined
  })

  useEffect(() => {
    fetchCommunications()
  }, [statusFilter, typeFilter, priorityFilter, activeTab])

  const fetchCommunications = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters: Record<string, string> = {}
      if (statusFilter !== 'all') filters.status = statusFilter
      if (typeFilter !== 'all') filters.type = typeFilter
      if (priorityFilter !== 'all') filters.priority = priorityFilter

      const response = await apiClient.getCommunications(filters)

      // Handle different response formats
      if (response.communications) {
        setCommunications(response.communications)
      } else if (Array.isArray(response)) {
        setCommunications(response as Communication[])
      } else if ((response as any).items) {
        setCommunications((response as any).items)
      } else {
        setCommunications([])
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
      setError('Failed to load communications')
      toast.error('Failed to load communications')
      setCommunications([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCommunication = async () => {
    try {
      const response = await apiClient.createCommunication({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        target_audience: formData.target_audience,
        requires_acknowledgment: formData.requires_acknowledgment,
        scheduled_send_date: formData.scheduled_send_date
      })

      if (response.success && response.data) {
        setCommunications(prev => [response.data, ...prev])
        setIsCreateDialogOpen(false)
        resetForm()
        toast.success('Communication created successfully')
      }
    } catch (error) {
      console.error('Error creating communication:', error)
      toast.error('Failed to create communication')
    }
  }

  const handleUpdateCommunication = async () => {
    if (!editingCommunication) return

    try {
      const response = await apiClient.updateCommunication(editingCommunication.id, formData)
      if (response.success) {
        setCommunications(communications.map(comm => 
          comm.id === editingCommunication.id ? response.data : comm
        ))
        setIsEditDialogOpen(false)
        setEditingCommunication(null)
        resetForm()
        toast.success('Communication updated successfully')
      }
    } catch (error) {
      console.error('Error updating communication:', error)
      toast.error('Failed to update communication')
    }
  }

  const handlePublishCommunication = async (id: string) => {
    try {
      const response = await apiClient.publishCommunication(id)
      if (response.success) {
        setCommunications(communications.map(comm =>
          comm.id === id ? { ...comm, status: 'published', sent_at: new Date().toISOString() } : comm
        ))
        toast.success('Communication published successfully')
      }
    } catch (error) {
      console.error('Error publishing communication:', error)
      toast.error('Failed to publish communication')
    }
  }

  const handleArchiveCommunication = async (id: string) => {
    try {
      const response = await apiClient.archiveCommunication(id)
      if (response.success) {
        setCommunications(communications.map(comm =>
          comm.id === id ? { ...comm, status: 'archived' } : comm
        ))
        toast.success('Communication archived')
      }
    } catch (error) {
      console.error('Error archiving communication:', error)
      toast.error('Failed to archive communication')
    }
  }

  const openEditDialog = (communication: Communication) => {
    setEditingCommunication(communication)
    setFormData({
      title: communication.title,
      content: communication.content,
      type: communication.type,
      priority: communication.priority,
      target_audience: communication.target_audience || { all_users: true },
      requires_acknowledgment: communication.requires_acknowledgment,
      scheduled_send_date: communication.scheduled_send_date
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'announcement',
      priority: 'medium',
      target_audience: { all_users: true },
      requires_acknowledgment: false,
      scheduled_send_date: undefined
    })
  }

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         comm.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || comm.status === statusFilter
    const matchesType = typeFilter === 'all' || comm.type === typeFilter
    const matchesPriority = priorityFilter === 'all' || comm.priority === priorityFilter
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'published' && comm.status === 'published') ||
                      (activeTab === 'draft' && comm.status === 'draft') ||
                      (activeTab === 'scheduled' && comm.scheduled_send_date && !comm.sent_at)
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesTab
  })

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'published': return 'bg-green-100 text-green-800'
    case 'draft': return 'bg-yellow-100 text-yellow-800'
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    case 'archived': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = PRIORITY_LEVELS.find(p => p.value === priority)
    return priorityConfig?.color || 'bg-gray-100 text-gray-800'
  }

  const getTypeIcon = (type: string) => {
    const typeConfig = COMMUNICATION_TYPES.find(t => t.value === type)
    const IconComponent = typeConfig?.icon || MessageSquare
    return <IconComponent className="w-4 h-4" />
  }

  const stats = [
    {
      title: 'Total Communications',
      value: communications.length,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      title: 'Published',
      value: communications.filter(c => c.status === 'published').length,
      icon: Send,
      color: 'text-green-600'
    },
    {
      title: 'Drafts',
      value: communications.filter(c => c.status === 'draft').length,
      icon: Edit,
      color: 'text-orange-600'
    },
    {
      title: 'Urgent',
      value: communications.filter(c => c.priority === 'urgent').length,
      icon: AlertTriangle,
      color: 'text-red-600'
    }
  ]

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          icon={MessageSquare}
          title="Communications"
          description="Manage announcements, notifications, and team communications"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading communications...</span>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <PageHeader
          icon={MessageSquare}
          title="Communications"
          description="Manage announcements, notifications, and team communications"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchCommunications} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        icon={MessageSquare}
        title="Communications"
        description="Manage announcements, notifications, and team communications"
      >
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
          <Plus className="h-5 w-5 mr-2" />
          New Communication
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search communications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="min-w-[150px]">
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {COMMUNICATION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="min-w-[150px]">
                  <Label>Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {PRIORITY_LEVELS.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communications List */}
          <div className="grid gap-4">
            {filteredCommunications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No communications found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || typeFilter !== 'all' || priorityFilter !== 'all' 
                      ? 'No communications match your current filters.'
                      : 'Get started by creating your first communication.'
                    }
                  </p>
                  {!searchQuery && typeFilter === 'all' && priorityFilter === 'all' && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Communication
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredCommunications.map(communication => (
                <Card key={communication.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{communication.title}</CardTitle>
                          <Badge className={getStatusColor(communication.status)}>
                            {communication.status}
                          </Badge>
                          <Badge className={getPriorityColor(communication.priority)}>
                            {communication.priority}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeIcon(communication.type)}
                            <span className="ml-1">{communication.type}</span>
                          </Badge>
                        </div>
                        
                        <CardDescription className="text-base mb-2">
                          {communication.content.replace(/<[^>]*>/g, '').substring(0, 200)}
                          {communication.content.length > 200 && '...'}
                        </CardDescription>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {communication.created_by_name || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {communication.sent_at 
                              ? format(new Date(communication.sent_at), 'MMM d, yyyy h:mm a')
                              : format(new Date(communication.created_at || ''), 'MMM d, yyyy h:mm a')
                            }
                          </div>
                          {communication.acknowledgment_count !== undefined && communication.total_recipients && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              {communication.acknowledgment_count}/{communication.total_recipients} acknowledged
                            </div>
                          )}
                          {communication.requires_acknowledgment && (
                            <Badge variant="secondary" className="text-xs">
                              Requires Acknowledgment
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {communication.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublishCommunication(communication.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Publish communication"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {communication.status === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleArchiveCommunication(communication.id)}
                            className="text-gray-600 hover:text-gray-700"
                            title="Archive communication"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                        {communication.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(communication)}
                            title="Edit communication"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Communication</DialogTitle>
          </DialogHeader>
          <CommunicationForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleCreateCommunication}
            onCancel={() => setIsCreateDialogOpen(false)}
            isEdit={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Communication</DialogTitle>
          </DialogHeader>
          <CommunicationForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateCommunication}
            onCancel={() => {
              setIsEditDialogOpen(false)
              setEditingCommunication(null)
              resetForm()
            }}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

// Communication Form Component
interface CommunicationFormProps {
  formData: CommunicationFormData
  setFormData: (data: CommunicationFormData) => void
  onSubmit: () => void
  onCancel: () => void
  isEdit: boolean
}

function CommunicationForm({ formData, setFormData, onSubmit, onCancel, isEdit }: CommunicationFormProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter communication title..."
        />
      </div>

      {/* Type and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMUNICATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4" />
                    <div>
                      <div>{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_LEVELS.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>
                  <div className="flex items-center gap-2">
                    <priority.icon className="w-4 h-4" />
                    {priority.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div>
        <Label>Content *</Label>
        <RichTextEditor
          content={formData.content}
          onChange={(content) => setFormData({ ...formData, content })}
          placeholder="Write your communication content..."
          className="mt-2"
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-4">
        <Label>Target Audience</Label>
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.target_audience.all_users || false}
            onCheckedChange={(checked) => setFormData({
              ...formData,
              target_audience: { all_users: checked }
            })}
          />
          <Label className="text-sm">All Users</Label>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.requires_acknowledgment}
            onCheckedChange={(checked) => setFormData({
              ...formData,
              requires_acknowledgment: checked
            })}
          />
          <Label className="text-sm">Requires Acknowledgment</Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Update Communication' : 'Create Communication'}
        </Button>
      </div>
    </div>
  )
}