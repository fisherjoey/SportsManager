'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Target, 
  Trophy,
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Plus,
  Edit,
  Save,
  X,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  BookOpen,
  Users,
  Activity
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { apiClient } from '@/lib/api'
import { 
  Mentee, 
  MenteeNote, 
  MenteeDocument, 
  MentorshipGoal, 
  MentorshipSession,
  getMenteeProgress, 
  getMenteeStatusColor,
  formatSessionDuration,
  type NoteCategory,
  type GoalStatus,
  type GoalPriority,
  type SessionType
} from '@/types/mentorship'
import { RichTextEditor } from '@/components/rich-text-editor'

import { DocumentManager } from './DocumentManager'

interface MenteeDetailsViewProps {
  menteeId: string
  mentorId: string
  onClose?: () => void
  onMenteeUpdate?: (mentee: Mentee) => void
}

export function MenteeDetailsView({ 
  menteeId, 
  mentorId, 
  onClose, 
  onMenteeUpdate 
}: MenteeDetailsViewProps) {
  const [mentee, setMentee] = useState<Mentee | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [editingProfile, setEditingProfile] = useState(false)
  const { toast } = useToast()

  // State for different sections
  const [notes, setNotes] = useState<MenteeNote[]>([])
  const [documents, setDocuments] = useState<MenteeDocument[]>([])
  const [goals, setGoals] = useState<MentorshipGoal[]>([])
  const [sessions, setSessions] = useState<MentorshipSession[]>([])

  useEffect(() => {
    if (menteeId) {
      fetchMenteeDetails()
    }
  }, [menteeId])

  const fetchMenteeDetails = async () => {
    try {
      setLoading(true)
      
      const [
        menteeResponse,
        notesResponse,
        documentsResponse,
        goalsResponse,
        sessionsResponse
      ] = await Promise.all([
        apiClient.get(`/mentees/${menteeId}`),
        apiClient.get(`/mentees/${menteeId}/notes`),
        apiClient.get(`/mentees/${menteeId}/documents`),
        apiClient.get(`/mentees/${menteeId}/goals`),
        apiClient.get(`/mentees/${menteeId}/sessions`)
      ])
      
      if (menteeResponse.data) {
        setMentee(menteeResponse.data)
        if (onMenteeUpdate) {
          onMenteeUpdate(menteeResponse.data)
        }
      }
      
      setNotes(notesResponse.data || [])
      setDocuments(documentsResponse.data || [])
      setGoals(goalsResponse.data || [])
      setSessions(sessionsResponse.data || [])
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load mentee details'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!mentee) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Mentee not found</p>
      </div>
    )
  }

  const progress = getMenteeProgress(mentee)
  const assignment = mentee.mentorship_assignments[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={mentee.profile_photo_url} />
            <AvatarFallback className="text-xl">
              {mentee.first_name?.[0]}{mentee.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {mentee.first_name} {mentee.last_name}
            </h1>
            <p className="text-muted-foreground">{mentee.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={getMenteeStatusColor(assignment?.status || 'active')}
              >
                {assignment?.status || 'active'}
              </Badge>
              <Badge variant="secondary">
                {progress.level}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Session
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-2xl font-bold">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                Next milestone: {progress.nextMilestone}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">{sessions.length}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {goals.filter(g => g.status === 'completed').length}/{goals.length}
                </div>
                <div className="text-sm text-muted-foreground">Goals Completed</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-50">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {mentee.stats?.average_rating?.toFixed(1) || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ProfileTab 
            mentee={mentee} 
            editing={editingProfile}
            onEdit={() => setEditingProfile(true)}
            onSave={() => {
              setEditingProfile(false)
              fetchMenteeDetails()
            }}
            onCancel={() => setEditingProfile(false)}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <NotesTab 
            menteeId={menteeId}
            mentorId={mentorId}
            notes={notes}
            onNotesChange={setNotes}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsTab 
            menteeId={menteeId}
            mentorId={mentorId}
            documents={documents}
            onDocumentsChange={setDocuments}
          />
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <GoalsTab 
            menteeId={menteeId}
            mentorId={mentorId}
            goals={goals}
            onGoalsChange={setGoals}
          />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <SessionsTab 
            menteeId={menteeId}
            mentorId={mentorId}
            sessions={sessions}
            onSessionsChange={setSessions}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ mentee, editing, onEdit, onSave, onCancel }: {
  mentee: Mentee
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    first_name: mentee.first_name,
    last_name: mentee.last_name,
    email: mentee.email,
    phone: mentee.phone || '',
    emergency_contact_name: mentee.emergency_contact_name || '',
    emergency_contact_phone: mentee.emergency_contact_phone || '',
    street_address: mentee.street_address || '',
    city: mentee.city || '',
    province_state: mentee.province_state || '',
    postal_zip_code: mentee.postal_zip_code || ''
  })

  const handleSave = async () => {
    try {
      await apiClient.put(`/mentees/${mentee.id}`, formData)
      onSave()
    } catch (error) {
      console.error('Failed to update mentee:', error)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{mentee.email}</span>
              </div>
              {mentee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{mentee.phone}</span>
                </div>
              )}
              {mentee.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Born {new Date(mentee.date_of_birth).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {mentee.emergency_contact_name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{mentee.emergency_contact_name}</span>
                </div>
              )}
              {mentee.emergency_contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{mentee.emergency_contact_phone}</span>
                </div>
              )}
              {!mentee.emergency_contact_name && !mentee.emergency_contact_phone && (
                <p className="text-muted-foreground text-sm">No emergency contact information</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mentee Profile Information */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Development Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Current Level</h4>
              <Badge className="mb-4">
                {mentee.mentee_profile?.current_level || 'Rookie'}
              </Badge>
              
              {mentee.mentee_profile?.development_goals && (
                <>
                  <h4 className="font-medium mb-2">Development Goals</h4>
                  <ul className="space-y-1">
                    {mentee.mentee_profile.development_goals.map((goal, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <Target className="h-3 w-3" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            
            <div>
              {mentee.mentee_profile?.strengths && (
                <>
                  <h4 className="font-medium mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {mentee.mentee_profile.strengths.map((strength, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            
            <div>
              {mentee.mentee_profile?.areas_for_improvement && (
                <>
                  <h4 className="font-medium mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1">
                    {mentee.mentee_profile.areas_for_improvement.map((area, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Notes Tab Component (placeholder - would implement full notes functionality)
function NotesTab({ menteeId, mentorId, notes, onNotesChange }: {
  menteeId: string
  mentorId: string
  notes: MenteeNote[]
  onNotesChange: (notes: MenteeNote[]) => void
}) {
  const [showAddNote, setShowAddNote] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notes & Observations</CardTitle>
          <Button onClick={() => setShowAddNote(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>No notes yet</p>
            <p className="text-sm">Add your first observation or note about this mentee</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{note.title}</h4>
                  <Badge variant="outline">{note.category}</Badge>
                </div>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(note.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Documents Tab Component
function DocumentsTab({ 
  menteeId, 
  mentorId, 
  documents, 
  onDocumentsChange 
}: {
  menteeId: string
  mentorId: string
  documents: MenteeDocument[]
  onDocumentsChange: (documents: MenteeDocument[]) => void
}) {
  return (
    <DocumentManager
      menteeId={menteeId}
      mentorId={mentorId}
      documents={documents}
      onDocumentsChange={onDocumentsChange}
    />
  )
}

function GoalsTab({ menteeId, mentorId, goals, onGoalsChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Development Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Target className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>Goals management coming soon</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionsTab({ menteeId, mentorId, sessions, onSessionsChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentorship Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>Session management coming soon</p>
        </div>
      </CardContent>
    </Card>
  )
}