'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, ChevronDown } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface Mentee {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'completed';
  level?: string;
  experience_years?: number;
  mentorship_assignments?: Array<{
    id: string;
    status: string;
    game_id?: string;
  }>;
}

interface MenteeSelectorProps {
  selectedMenteeId?: string;
  onMenteeChange: (menteeId: string | null) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function MenteeSelector({
  selectedMenteeId,
  onMenteeChange,
  className = '',
  disabled = false,
  placeholder = 'Select mentee...'
}: MenteeSelectorProps) {
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchMentees = async () => {
    try {
      setLoading(true)
      setError(null)
      apiClient.initializeToken()

      // Get current user as mentor, then fetch mentees
      const userResponse = await apiClient.get('/auth/me')
      const mentorId = userResponse.data?.user?.id

      if (!mentorId) {
        // This is not an error - user might have permissions but no mentees
        console.log('User context not available for mentee selection')
        setMentees([])
        setError(null) // Don't show error, just show empty state
        return
      }

      const response = await apiClient.get(`/mentors/${mentorId}/mentees`, {
        params: {
          status: 'active',
          includeDetails: true
        }
      })

      if (response.data) {
        // Ensure response is always an array
        setMentees(Array.isArray(response.data) ? response.data : [])
      } else {
        setMentees([])
      }
    } catch (error) {
      console.error('Failed to fetch mentees:', error)
      // Set empty array to prevent crashes
      setMentees([])

      // Set error state for retry functionality
      const errorMessage = 'Unable to load mentees'
      setError(errorMessage)

      // Only show toast for non-404 errors
      if (error instanceof Error && !error.message.includes('404')) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMentees()
  }, [toast])

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onMenteeChange(null)
    } else {
      onMenteeChange(value)
    }
  }

  // Safe access to selected mentee
  const selectedMentee = selectedMenteeId ? mentees.find(m => m.id === selectedMenteeId) : null

  // Show error state if there's an error
  if (error && !loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <Users className="h-4 w-4" />
          <span className="text-sm">{error}</span>
          <button
            onClick={fetchMentees}
            className="text-xs underline hover:no-underline"
            disabled={loading}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedMenteeId || 'all'}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={loading ? 'Loading...' : placeholder}>
            {loading ? (
              <span className="text-muted-foreground">Loading mentees...</span>
            ) : selectedMenteeId && selectedMentee ? (
              <div className="flex items-center space-x-2">
                <span>{selectedMentee.name}</span>
                {selectedMentee.level && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedMentee.level}
                  </Badge>
                )}
              </div>
            ) : (
              <span>All Mentees</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {mentees.length === 0 ? (
            <div className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No mentees assigned</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have mentor permissions but no active mentees
              </p>
            </div>
          ) : (
            <>
              <SelectItem value="all">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>All Mentees</span>
                  <Badge variant="outline" className="ml-2">
                    {mentees.length}
                  </Badge>
                </div>
              </SelectItem>
              {mentees.map((mentee) => (
            <SelectItem key={mentee.id} value={mentee.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{mentee.name}</span>
                  <span className="text-xs text-muted-foreground">{mentee.email}</span>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  {mentee.level && (
                    <Badge variant="secondary" className="text-xs">
                      {mentee.level}
                    </Badge>
                  )}
                  <Badge 
                    variant={mentee.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {mentee.status}
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
            </>
          )}
        </SelectContent>
      </Select>
      
      {selectedMenteeId && selectedMentee && (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          Viewing: {selectedMentee.name}
        </Badge>
      )}
    </div>
  )
}