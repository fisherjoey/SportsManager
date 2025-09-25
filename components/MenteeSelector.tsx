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
  const { toast } = useToast()

  useEffect(() => {
    const fetchMentees = async () => {
      try {
        setLoading(true)
        apiClient.initializeToken()
        const response = await apiClient.getMenteesByMentor(undefined, {
          status: 'active',
          includeDetails: true
        })
        
        if (response.data) {
          setMentees(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch mentees:', error)
        toast({
          title: 'Error',
          description: 'Failed to load mentees. Please try again.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMentees()
  }, [toast])

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onMenteeChange(null)
    } else {
      onMenteeChange(value)
    }
  }

  const selectedMentee = mentees.find(m => m.id === selectedMenteeId)

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
          <SelectItem value="all">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>All Mentees</span>
              {mentees.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {mentees.length}
                </Badge>
              )}
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
          {mentees.length === 0 && !loading && (
            <SelectItem value="none" disabled>
              <span className="text-muted-foreground">No mentees found</span>
            </SelectItem>
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