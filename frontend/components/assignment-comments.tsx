'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Send,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/components/auth-provider'


interface AssignmentComment {
  id: string
  assignment_id: string
  user_id: string
  user_name: string
  user_role: string
  content: string
  type: 'comment' | 'status_change' | 'system'
  status_change?: {
    from: string
    to: string
  }
  created_at: string
  updated_at?: string
}

interface AssignmentCommentsProps {
  assignmentId: string
  gameTitle?: string
  compact?: boolean
}

export function AssignmentComments({ assignmentId, gameTitle, compact = false }: AssignmentCommentsProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<AssignmentComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Mock data for development - replace with API calls
  const mockComments: AssignmentComment[] = [
    {
      id: '1',
      assignment_id: assignmentId,
      user_id: 'admin1',
      user_name: 'John Admin',
      user_role: 'admin',
      content: 'Please arrive 30 minutes early for this game. There may be some field preparation needed.',
      type: 'comment',
      created_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      assignment_id: assignmentId,
      user_id: 'ref1',
      user_name: 'Sarah Martinez',
      user_role: 'referee',
      content: 'Confirmed! I\'ll be there early. Any specific equipment requirements?',
      type: 'comment',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '3',
      assignment_id: assignmentId,
      user_id: 'system',
      user_name: 'System',
      user_role: 'system',
      content: 'Assignment status changed',
      type: 'status_change',
      status_change: {
        from: 'pending',
        to: 'confirmed'
      },
      created_at: '2024-01-15T10:31:00Z'
    }
  ]

  useEffect(() => {
    fetchComments()
  }, [assignmentId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const response = await apiClient.getAssignmentComments(assignmentId)
      // setComments(response.data || [])
      
      // Using mock data for now
      setComments(mockComments)
    } catch {
      // console.error('Error fetching assignment comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return

    const comment: AssignmentComment = {
      id: Date.now().toString(),
      assignment_id: assignmentId,
      user_id: user.id,
      user_name: user.name || user.email,
      user_role: user.role,
      content: newComment.trim(),
      type: 'comment',
      created_at: new Date().toISOString()
    }

    try {
      // TODO: Replace with actual API call
      // await apiClient.createAssignmentComment(assignmentId, {
      //   content: newComment.trim(),
      //   type: 'comment'
      // })

      setComments([...comments, comment])
      setNewComment('')
      toast.success('Comment added successfully')
    } catch {
      // console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const getStatusChangeDisplay = (statusChange: { from: string; to: string }) => {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
      case 'confirmed': return 'text-emerald-600'
      case 'pending': return 'text-yellow-600'
      case 'declined': return 'text-red-600'
      case 'cancelled': return 'text-gray-600'
      default: return 'text-gray-600'
      }
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={getStatusColor(statusChange.from)}>{statusChange.from}</span>
        <span>→</span>
        <span className={getStatusColor(statusChange.to)}>{statusChange.to}</span>
      </div>
    )
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const CommentsList = () => (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No comments yet</p>
        </div>
      ) : (
        <ScrollArea className={compact ? 'h-[200px]' : 'h-[300px]'}>
          <div className="space-y-4 pr-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={`text-xs ${
                    comment.user_role === 'admin' ? 'bg-blue-100 text-blue-600' :
                      comment.user_role === 'referee' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-gray-100 text-gray-600'
                  }`}>
                    {comment.user_role === 'system' ? 'SY' : getUserInitials(comment.user_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {comment.user_role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  
                  {comment.type === 'status_change' && comment.status_change ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Status changed: </span>
                      {getStatusChangeDisplay(comment.status_change)}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 break-words">{comment.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )

  const AddCommentForm = () => (
    <div className="space-y-3">
      <Textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Add a comment about this assignment..."
        rows={3}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || loading}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          Add Comment
        </Button>
      </div>
    </div>
  )

  if (compact) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments ({comments.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assignment Comments</DialogTitle>
            {gameTitle && (
              <DialogDescription>
                {gameTitle}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-6">
            <CommentsList />
            <Separator />
            <AddCommentForm />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Assignment Discussion</CardTitle>
            <CardDescription>
              Communicate about this assignment with referees and administrators
            </CardDescription>
          </div>
          <Badge variant="outline">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommentsList />
        <Separator />
        <AddCommentForm />
      </CardContent>
    </Card>
  )
}

// Quick comment component for inline use
export function QuickAssignmentComment({ assignmentId, gameTitle }: { assignmentId: string; gameTitle?: string }) {
  return (
    <AssignmentComments 
      assignmentId={assignmentId} 
      gameTitle={gameTitle}
      compact={true} 
    />
  )
}