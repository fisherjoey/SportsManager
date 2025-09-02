'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Users, UserCheck, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mentee, getMenteeProgress, getMenteeStatusColor } from '@/types/mentorship'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface MenteeeSelectorProps {
  mentorId: string
  selectedMenteeId?: string | null
  onMenteeSelect: (mentee: Mentee | null) => void
  className?: string
  showAllOption?: boolean
  placeholder?: string
  variant?: 'default' | 'outline' | 'ghost'
}

export function MenteeSelector({ 
  mentorId, 
  selectedMenteeId, 
  onMenteeSelect, 
  className = '',
  showAllOption = true,
  placeholder = 'Select mentee...',
  variant = 'outline'
}: MenteeeSelectorProps) {
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchMentees()
  }, [mentorId])

  const fetchMentees = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/mentors/${mentorId}/mentees`)
      
      if (response.data) {
        setMentees(response.data)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load mentees'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedMentee = selectedMenteeId 
    ? mentees.find(m => m.id === selectedMenteeId)
    : null

  const handleMenteeSelect = (mentee: Mentee | null) => {
    onMenteeSelect(mentee)
    setOpen(false)
  }

  const activeMentees = mentees.filter(m => 
    m.mentorship_assignments.some(a => a.status === 'active')
  )
  const inactiveMentees = mentees.filter(m => 
    !m.mentorship_assignments.some(a => a.status === 'active')
  )

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            role="combobox"
            aria-expanded={open}
            className="justify-between min-w-[200px]"
          >
            {selectedMentee ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedMentee.profile_photo_url} />
                  <AvatarFallback className="text-xs">
                    {selectedMentee.first_name?.[0]}{selectedMentee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {selectedMentee.first_name} {selectedMentee.last_name}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ml-auto ${getMenteeStatusColor(
                    selectedMentee.mentorship_assignments[0]?.status || 'active'
                  )}`}
                >
                  {selectedMentee.mentorship_assignments[0]?.status || 'active'}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start">
          <Command>
            <CommandInput placeholder="Search mentees..." className="h-9" />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Loading mentees...' : 'No mentees found.'}
              </CommandEmpty>
              
              {showAllOption && (
                <CommandGroup>
                  <CommandItem
                    value="all-mentees"
                    onSelect={() => handleMenteeSelect(null)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedMenteeId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Users className="mr-2 h-4 w-4" />
                    All Mentees
                  </CommandItem>
                </CommandGroup>
              )}
              
              {activeMentees.length > 0 && (
                <>
                  {showAllOption && <CommandSeparator />}
                  <CommandGroup heading="Active Mentees">
                    {activeMentees.map((mentee) => {
                      const progress = getMenteeProgress(mentee)
                      const assignment = mentee.mentorship_assignments[0]
                      
                      return (
                        <CommandItem
                          key={mentee.id}
                          value={`${mentee.first_name} ${mentee.last_name} ${mentee.email}`}
                          onSelect={() => handleMenteeSelect(mentee)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedMenteeId === mentee.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={mentee.profile_photo_url} />
                              <AvatarFallback className="text-xs">
                                {mentee.first_name?.[0]}{mentee.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate">
                                  {mentee.first_name} {mentee.last_name}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getMenteeStatusColor(assignment.status)}`}
                                >
                                  {assignment.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {progress.level}
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${progress.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {progress.progress}%
                                </span>
                              </div>
                              {mentee.stats?.next_session_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Next session: {new Date(mentee.stats.next_session_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </>
              )}

              {inactiveMentees.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Inactive Mentees">
                    {inactiveMentees.map((mentee) => {
                      const progress = getMenteeProgress(mentee)
                      const assignment = mentee.mentorship_assignments[0]
                      
                      return (
                        <CommandItem
                          key={mentee.id}
                          value={`${mentee.first_name} ${mentee.last_name} ${mentee.email}`}
                          onSelect={() => handleMenteeSelect(mentee)}
                          className="cursor-pointer opacity-75"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedMenteeId === mentee.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={mentee.profile_photo_url} />
                              <AvatarFallback className="text-xs">
                                {mentee.first_name?.[0]}{mentee.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate">
                                  {mentee.first_name} {mentee.last_name}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getMenteeStatusColor(assignment.status)}`}
                                >
                                  {assignment.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {progress.level}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {progress.progress}% complete
                                </span>
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Quick stats indicator */}
      {mentees.length > 0 && (
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            <span>{activeMentees.length} active</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{mentees.length} total</span>
          </div>
          {selectedMentee && selectedMentee.stats?.next_session_date && (
            <div className="flex items-center gap-1">
              <span>Next session: {new Date(selectedMentee.stats.next_session_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Alternative simple dropdown version for compact spaces
interface SimpleMenteeSelectorProps {
  mentorId: string
  selectedMenteeId?: string | null
  onMenteeSelect: (mentee: Mentee | null) => void
  className?: string
}

export function SimpleMenteeSelector({ 
  mentorId, 
  selectedMenteeId, 
  onMenteeSelect, 
  className = ''
}: SimpleMenteeSelectorProps) {
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchMentees()
  }, [mentorId])

  const fetchMentees = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/mentors/${mentorId}/mentees`)
      
      if (response.data) {
        setMentees(response.data)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load mentees'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedMentee = selectedMenteeId 
    ? mentees.find(m => m.id === selectedMenteeId)
    : null

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {selectedMentee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedMentee.profile_photo_url} />
                  <AvatarFallback className="text-xs">
                    {selectedMentee.first_name?.[0]}{selectedMentee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate">
                  {selectedMentee.first_name} {selectedMentee.last_name}
                </span>
              </div>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                All Mentees
              </>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          <DropdownMenuLabel>Select Mentee</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onMenteeSelect(null)}>
            <Users className="mr-2 h-4 w-4" />
            <span>All Mentees</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {loading ? (
            <DropdownMenuItem disabled>
              Loading mentees...
            </DropdownMenuItem>
          ) : mentees.length === 0 ? (
            <DropdownMenuItem disabled>
              No mentees assigned
            </DropdownMenuItem>
          ) : (
            mentees.map((mentee) => {
              const assignment = mentee.mentorship_assignments[0]
              
              return (
                <DropdownMenuItem 
                  key={mentee.id} 
                  onClick={() => onMenteeSelect(mentee)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={mentee.profile_photo_url} />
                    <AvatarFallback className="text-xs">
                      {mentee.first_name?.[0]}{mentee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {mentee.first_name} {mentee.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {assignment?.status || 'active'}
                    </div>
                  </div>
                  {selectedMenteeId === mentee.id && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              )
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}