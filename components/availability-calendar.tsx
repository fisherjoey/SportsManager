"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/api"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns'

interface AvailabilityWindow {
  id: string
  referee_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  reason?: string
  created_at?: string
  updated_at?: string
}

interface AvailabilityCalendarProps {
  refereeId: string
  canEdit?: boolean
  viewMode?: 'week' | 'month'
  onWindowChange?: (windows: AvailabilityWindow[]) => void
}

export function AvailabilityCalendar({ 
  refereeId, 
  canEdit = false, 
  viewMode = 'week',
  onWindowChange 
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>([])
  const [selectedWindow, setSelectedWindow] = useState<AvailabilityWindow | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragStart, setDragStart] = useState<{date: string, time: string} | null>(null)
  const { toast } = useToast()
  const api = useApi()

  // Calculate week/month range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Time slots for the calendar view
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0')
    return `${hour}:00`
  })

  // Fetch availability windows
  const fetchAvailability = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd')
      const endDate = format(weekEnd, 'yyyy-MM-dd')
      
      const response = await api.getRefereeAvailabilityWindows(refereeId, {
        startDate,
        endDate
      })

      setAvailabilityWindows(response.data.availability)
      onWindowChange?.(response.data.availability)
    } catch (error) {
      console.error('Error fetching availability:', error)
      toast({
        title: "Error",
        description: "Failed to load availability data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [refereeId, weekStart, weekEnd, toast, onWindowChange, api])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // Get availability windows for a specific date and time
  const getWindowsForSlot = (date: string, time: string) => {
    return availabilityWindows.filter(window => {
      if (window.date !== date) return false
      return time >= window.start_time && time < window.end_time
    })
  }

  // Create new availability window
  const createWindow = async (windowData: Partial<AvailabilityWindow>) => {
    try {
      await api.createAvailabilityWindow(refereeId, windowData)
      
      toast({
        title: "Success",
        description: "Availability window created successfully.",
      })
      fetchAvailability()
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating window:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create availability window.",
        variant: "destructive",
      })
    }
  }

  // Update availability window
  const updateWindow = async (windowId: string, updates: Partial<AvailabilityWindow>) => {
    try {
      await api.updateAvailabilityWindow(windowId, updates)
      
      toast({
        title: "Success",
        description: "Availability window updated successfully.",
      })
      fetchAvailability()
      setIsEditDialogOpen(false)
      setSelectedWindow(null)
    } catch (error) {
      console.error('Error updating window:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update availability window.",
        variant: "destructive",
      })
    }
  }

  // Delete availability window
  const deleteWindow = async (windowId: string) => {
    try {
      await api.deleteAvailabilityWindow(windowId)
      
      toast({
        title: "Success",
        description: "Availability window deleted successfully.",
      })
      fetchAvailability()
      setSelectedWindow(null)
    } catch (error) {
      console.error('Error deleting window:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete availability window.",
        variant: "destructive",
      })
    }
  }

  // Handle time slot click for quick create
  const handleSlotClick = (date: string, time: string) => {
    if (!canEdit) return
    
    const existingWindows = getWindowsForSlot(date, time)
    if (existingWindows.length > 0) {
      setSelectedWindow(existingWindows[0])
      setIsEditDialogOpen(true)
    } else {
      // Quick create for 1-hour window
      const endTime = `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
      createWindow({
        date,
        start_time: time,
        end_time: endTime,
        is_available: true
      })
    }
  }

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Availability Calendar
              </CardTitle>
              <CardDescription>
                {viewMode === 'week' ? 'Weekly' : 'Monthly'} availability schedule
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Window
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <AvailabilityWindowForm
                      onSubmit={(data) => createWindow(data)}
                      onCancel={() => setIsCreateDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          {/* Week range display */}
          <div className="text-sm text-muted-foreground">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm text-muted-foreground">Loading availability...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Calendar Grid */}
              <div className="min-w-[800px]">
                {/* Day headers */}
                <div className="grid grid-cols-8 gap-px bg-muted/50 rounded-t-lg">
                  <div className="bg-background p-2 text-xs font-medium text-center">Time</div>
                  {weekDays.map(day => (
                    <div key={day.toISOString()} className="bg-background p-2 text-xs font-medium text-center">
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-lg font-semibold">{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>

                {/* Time slots */}
                <div className="bg-muted/50">
                  {timeSlots.map(time => (
                    <div key={time} className="grid grid-cols-8 gap-px">
                      {/* Time label */}
                      <div className="bg-background p-2 text-xs text-center text-muted-foreground border-r">
                        {time}
                      </div>
                      
                      {/* Day slots */}
                      {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const windows = getWindowsForSlot(dateStr, time)
                        const hasWindow = windows.length > 0
                        const isAvailable = windows.some(w => w.is_available)
                        const isUnavailable = windows.some(w => !w.is_available)
                        
                        return (
                          <div
                            key={`${dateStr}-${time}`}
                            className={`
                              bg-background p-1 min-h-[32px] border-b cursor-pointer transition-colors
                              ${canEdit ? 'hover:bg-muted/50' : ''}
                              ${hasWindow ? (
                                isAvailable ? 'bg-green-100 hover:bg-green-200' :
                                isUnavailable ? 'bg-red-100 hover:bg-red-200' :
                                'bg-yellow-100 hover:bg-yellow-200'
                              ) : 'hover:bg-blue-50'}
                            `}
                            onClick={() => handleSlotClick(dateStr, time)}
                            title={
                              hasWindow 
                                ? `${isAvailable ? 'Available' : 'Unavailable'}: ${time} - ${windows[0]?.end_time}`
                                : canEdit ? 'Click to add availability' : 'No availability set'
                            }
                          >
                            {hasWindow && (
                              <div className="flex items-center justify-center h-full">
                                {isAvailable ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <X className="h-3 w-3 text-red-600" />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border rounded"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border rounded"></div>
              <span>Not Set</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Window Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Availability Window</DialogTitle>
            <DialogDescription>
              Modify or delete this availability window.
            </DialogDescription>
          </DialogHeader>
          
          {selectedWindow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <div className="text-sm font-medium">{selectedWindow.date}</div>
                </div>
                <div>
                  <Label>Time</Label>
                  <div className="text-sm font-medium">
                    {selectedWindow.start_time} - {selectedWindow.end_time}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedWindow.is_available ? 'available' : 'unavailable'}
                  onValueChange={(value) => {
                    setSelectedWindow({
                      ...selectedWindow,
                      is_available: value === 'available'
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!selectedWindow.is_available && (
                <div>
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Input
                    id="reason"
                    value={selectedWindow.reason || ''}
                    onChange={(e) => setSelectedWindow({
                      ...selectedWindow,
                      reason: e.target.value
                    })}
                    placeholder="e.g., Personal appointment, Vacation"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedWindow && deleteWindow(selectedWindow.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedWindow) {
                  updateWindow(selectedWindow.id, {
                    is_available: selectedWindow.is_available,
                    reason: selectedWindow.reason
                  })
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Form component for creating availability windows
function AvailabilityWindowForm({ 
  onSubmit, 
  onCancel,
  initialData 
}: {
  onSubmit: (data: Partial<AvailabilityWindow>) => void
  onCancel: () => void
  initialData?: Partial<AvailabilityWindow>
}) {
  const [formData, setFormData] = useState({
    date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
    start_time: initialData?.start_time || '09:00',
    end_time: initialData?.end_time || '17:00',
    is_available: initialData?.is_available ?? true,
    reason: initialData?.reason || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Availability Window</DialogTitle>
        <DialogDescription>
          Create a new availability time window for scheduling.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="end_time">End Time</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label>Availability Status</Label>
          <Select
            value={formData.is_available ? 'available' : 'unavailable'}
            onValueChange={(value) => setFormData({
              ...formData,
              is_available: value === 'available'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!formData.is_available && (
          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Personal appointment, Vacation"
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Create Window
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}