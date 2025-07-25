"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { AvailabilityWindow } from '@/lib/types'

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
  const [dragEnd, setDragEnd] = useState<{date: string, time: string} | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [dragHasHappened, setDragHasHappened] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const lastFetchTimeRef = useRef<number>(0)
  const { toast } = useToast()
  const api = useApi()

  // Calculate week/month range
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  // Time slots for the calendar view (30-minute increments from 8 AM to 10 PM)
  const timeSlots = Array.from({ length: 28 }, (_, i) => {
    const totalMinutes = (8 * 60) + (i * 30) // Start at 8:00 AM (480 minutes)
    const hour = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
    const minute = (totalMinutes % 60).toString().padStart(2, '0')
    return `${hour}:${minute}`
  })

  // Fetch availability windows
  const fetchAvailability = useCallback(async () => {
    if (!refereeId) {
      console.warn('No refereeId provided to fetchAvailability')
      return
    }
    
    console.log('Fetching availability for referee:', refereeId)
    
    // Prevent rapid successive API calls (rate limiting)
    const now = Date.now()
    if (now - lastFetchTimeRef.current < 1000) { // 1 second minimum between requests
      console.log('Skipping fetch - too soon after last request')
      return
    }
    lastFetchTimeRef.current = now
    
    setLoading(true)
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd')
      const endDate = format(weekEnd, 'yyyy-MM-dd')
      
      console.log('Making API call with params:', { refereeId, startDate, endDate })
      
      const response = await api.getRefereeAvailabilityWindows(refereeId, {
        startDate,
        endDate
      })

      console.log('API response received:', response)
      console.log('Response data:', response.data)
      console.log('Response data availability:', response.data?.availability)

      if (response.success && response.data && response.data.availability) {
        console.log('Setting availability windows:', response.data.availability)
        setAvailabilityWindows(response.data.availability)
        onWindowChange?.(response.data.availability)
      } else {
        console.error('Invalid API response structure:', response)
        console.error('Condition check failed - success:', response.success, 'data:', !!response.data, 'availability:', !!response.data?.availability)
        setAvailabilityWindows([])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      setAvailabilityWindows([])
      toast({
        title: "Error", 
        description: "Failed to load availability data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [refereeId, weekStart, weekEnd])

  useEffect(() => {
    fetchAvailability()
  }, [refereeId, weekStart, weekEnd])

  // Get availability windows for a specific date and time
  const getWindowsForSlot = (date: string, time: string) => {
    return availabilityWindows.filter(window => {
      // Normalize the window date to YYYY-MM-DD format for comparison
      const windowDate = window.date.includes('T') ? window.date.split('T')[0] : window.date
      if (windowDate !== date) return false
      
      // Normalize time formats (remove seconds if present)
      const normalizeTime = (timeStr: string) => timeStr.substring(0, 5) // "09:00:00" -> "09:00"
      const windowStart = normalizeTime(window.start_time)
      const windowEnd = normalizeTime(window.end_time)
      const slotTime = normalizeTime(time)
      
      return slotTime >= windowStart && slotTime < windowEnd
    })
  }

  // Create new availability window
  const createWindow = async (windowData: Partial<AvailabilityWindow>) => {
    if (!refereeId) {
      console.error('Cannot create availability window: No refereeId provided')
      toast({
        title: "Error",
        description: "Unable to create availability window. Referee ID is missing.",
        variant: "destructive",
      })
      return
    }
    
    // Create optimistic window for immediate UI update
    const optimisticWindow: AvailabilityWindow = {
      id: `temp-${Date.now()}`,
      referee_id: refereeId,
      date: windowData.date || '',
      start_time: windowData.start_time || '',
      end_time: windowData.end_time || '',
      is_available: windowData.is_available ?? true,
      reason: windowData.reason || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Update UI immediately
    setAvailabilityWindows(prev => [...prev, optimisticWindow])
    setIsCreateDialogOpen(false)
    
    try {
      const response = await api.createAvailabilityWindow(refereeId, windowData)
      
      // Replace optimistic window with actual server response
      if (response.success && response.data) {
        setAvailabilityWindows(prev => 
          prev.map(w => w.id === optimisticWindow.id ? response.data : w)
        )
      }
      
      toast({
        title: "Success",
        description: "Availability window created successfully.",
      })
    } catch (error) {
      console.error('Error creating window:', error)
      
      // Remove optimistic window on error
      setAvailabilityWindows(prev => 
        prev.filter(w => w.id !== optimisticWindow.id)
      )
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create availability window.",
        variant: "destructive",
      })
    }
  }

  // Update availability window
  const updateWindow = async (windowId: string, updates: Partial<AvailabilityWindow>) => {
    // Update UI immediately (optimistic update)
    const originalWindow = availabilityWindows.find(w => w.id === windowId)
    if (originalWindow) {
      setAvailabilityWindows(prev => 
        prev.map(w => w.id === windowId ? { ...w, ...updates } : w)
      )
    }
    
    setIsEditDialogOpen(false)
    setSelectedWindow(null)
    
    try {
      const response = await api.updateAvailabilityWindow(windowId, updates)
      
      // Replace with actual server response
      if (response.success && response.data) {
        setAvailabilityWindows(prev => 
          prev.map(w => w.id === windowId ? response.data : w)
        )
      }
      
      toast({
        title: "Success",
        description: "Availability window updated successfully.",
      })
    } catch (error) {
      console.error('Error updating window:', error)
      
      // Revert optimistic update on error
      if (originalWindow) {
        setAvailabilityWindows(prev => 
          prev.map(w => w.id === windowId ? originalWindow : w)
        )
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update availability window.",
        variant: "destructive",
      })
    }
  }

  // Delete availability window
  const deleteWindow = async (windowId: string) => {
    // Remove from UI immediately (optimistic update)
    const windowToDelete = availabilityWindows.find(w => w.id === windowId)
    setAvailabilityWindows(prev => prev.filter(w => w.id !== windowId))
    setSelectedWindow(null)
    
    try {
      await api.deleteAvailabilityWindow(windowId)
      
      toast({
        title: "Success",
        description: "Availability window deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting window:', error)
      
      // Restore window on error
      if (windowToDelete) {
        setAvailabilityWindows(prev => [...prev, windowToDelete])
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete availability window.",
        variant: "destructive",
      })
    }
  }

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedSlots(new Set()) // Clear selection when toggling mode
  }

  // Handle slot selection in selection mode
  const handleSlotSelect = (date: string, time: string) => {
    if (!isSelectionMode) return
    
    const slotKey = `${date}-${time}`
    const newSelectedSlots = new Set(selectedSlots)
    
    if (newSelectedSlots.has(slotKey)) {
      newSelectedSlots.delete(slotKey)
    } else {
      newSelectedSlots.add(slotKey)
    }
    
    setSelectedSlots(newSelectedSlots)
  }

  // Clear availability for selected slots (removes entries)
  const clearAvailabilityForSelected = async () => {
    if (selectedSlots.size === 0) return

    try {
      // Find existing windows that match selected slots
      const windowsToDelete = []
      
      for (const slot of selectedSlots) {
        const [date, time] = slot.split('-')
        const existingWindows = availabilityWindows.filter(window => {
          const windowDate = window.date.includes('T') ? window.date.split('T')[0] : window.date
          return windowDate === date && window.start_time === time
        })
        windowsToDelete.push(...existingWindows)
      }

      if (windowsToDelete.length === 0) {
        toast({
          title: "Nothing to clear",
          description: "No availability entries found for selected slots.",
        })
        setSelectedSlots(new Set())
        setIsSelectionMode(false)
        return
      }

      // Optimistically remove from UI
      setAvailabilityWindows(prev => 
        prev.filter(window => !windowsToDelete.some(w => w.id === window.id))
      )

      // Delete via API
      await Promise.all(windowsToDelete.map(window => api.deleteAvailabilityWindow(window.id)))

      // Clear selection and exit selection mode
      setSelectedSlots(new Set())
      setIsSelectionMode(false)
      
      toast({
        title: "Success",
        description: `Cleared availability for ${selectedSlots.size} time slot${selectedSlots.size > 1 ? 's' : ''}.`,
      })
    } catch (error) {
      console.error('Error clearing availability:', error)
      toast({
        title: "Error",
        description: "Failed to clear availability. Please try again.",
        variant: "destructive",
      })
      // Refresh data to restore correct state
      fetchAvailabilityWindows()
    }
  }

  // Apply availability to selected slots
  const applyAvailabilityToSelected = async (isAvailable: boolean | null) => {
    if (selectedSlots.size === 0) return

    try {
      const windows = Array.from(selectedSlots).map(slot => {
        const [date, time] = slot.split('-')
        const [hour, minute] = time.split(':').map(Number)
        const totalMinutes = hour * 60 + minute + 30 // 30-minute slots
        const endHour = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
        const endMinute = (totalMinutes % 60).toString().padStart(2, '0')
        const endTime = `${endHour}:${endMinute}`
        
        return {
          referee_id: refereeId,
          date,
          start_time: time,
          end_time: endTime,
          is_available: isAvailable,
          reason: '',
          max_games: null,
          preferred_partners: '',
          location_preference: '',
          notes: ''
        }
      })

      // Optimistically update UI
      const newWindows = windows.map(w => ({
        ...w,
        id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID for optimistic update
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      setAvailabilityWindows(prev => [...prev, ...newWindows])

      // Create windows via API
      await Promise.all(windows.map(window => api.createAvailabilityWindow(refereeId, window)))

      // Clear selection and exit selection mode
      setSelectedSlots(new Set())
      setIsSelectionMode(false)

      // Refresh data to get actual IDs
      fetchAvailabilityWindows()
      
      toast({
        title: "Success",
        description: `${selectedSlots.size} time slots marked as ${isAvailable ? 'available' : 'unavailable'}.`,
      })
    } catch (error) {
      console.error('Error applying availability:', error)
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      })
      // Refresh data to restore correct state
      fetchAvailabilityWindows()
    }
  }

  // Handle time slot click for quick create
  const handleSlotClick = (date: string, time: string) => {
    // In selection mode, handle slot selection
    if (isSelectionMode) {
      handleSlotSelect(date, time)
      return
    }

    if (!canEdit || !refereeId || isDragging || dragHasHappened) {
      if (dragHasHappened) {
        setDragHasHappened(false) // Reset for next interaction
      }
      return
    }
    
    const existingWindows = getWindowsForSlot(date, time)
    if (existingWindows.length > 0) {
      setSelectedWindow(existingWindows[0])
      setIsEditDialogOpen(true)
    } else {
      // Quick create for 30-minute window
      const [hour, minute] = time.split(':').map(Number)
      const totalMinutes = hour * 60 + minute + 30
      const endHour = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
      const endMinute = (totalMinutes % 60).toString().padStart(2, '0')
      const endTime = `${endHour}:${endMinute}`
      
      createWindow({
        date,
        start_time: time,
        end_time: endTime,
        is_available: true
      })
    }
  }

  // Handle drag selection (disabled in selection mode)
  const handleSlotMouseDown = (date: string, time: string, e: React.MouseEvent) => {
    if (!canEdit || !refereeId || isSelectionMode) return
    
    e.preventDefault()
    setIsDragging(true)
    setDragHasHappened(false)
    setDragStart({ date, time })
    setDragEnd({ date, time })
    setSelectedSlots(new Set([`${date}-${time}`]))
  }

  const handleSlotMouseEnter = (date: string, time: string) => {
    if (!isDragging || !dragStart || isSelectionMode) return
    
    setDragHasHappened(true) // Mark that dragging has occurred
    setDragEnd({ date, time })
    
    // Calculate all slots between dragStart and current position
    const startDateIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === dragStart.date)
    const endDateIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === date)
    const startTimeIndex = timeSlots.indexOf(dragStart.time)
    const endTimeIndex = timeSlots.indexOf(time)
    
    if (startDateIndex !== -1 && endDateIndex !== -1 && startTimeIndex !== -1 && endTimeIndex !== -1) {
      const newSelectedSlots = new Set<string>()
      
      const minDateIndex = Math.min(startDateIndex, endDateIndex)
      const maxDateIndex = Math.max(startDateIndex, endDateIndex)
      const minTimeIndex = Math.min(startTimeIndex, endTimeIndex)
      const maxTimeIndex = Math.max(startTimeIndex, endTimeIndex)
      
      for (let d = minDateIndex; d <= maxDateIndex; d++) {
        for (let t = minTimeIndex; t <= maxTimeIndex; t++) {
          const slotDate = format(weekDays[d], 'yyyy-MM-dd')
          const slotTime = timeSlots[t]
          newSelectedSlots.add(`${slotDate}-${slotTime}`)
        }
      }
      
      setSelectedSlots(newSelectedSlots)
    }
  }

  const handleSlotMouseUp = () => {
    if (!isDragging || selectedSlots.size === 0) {
      setIsDragging(false)
      setSelectedSlots(new Set())
      return
    }
    
    setIsDragging(false)
    
    // If multiple slots selected, open bulk create dialog
    if (selectedSlots.size > 1) {
      setIsCreateDialogOpen(true)
    }
  }

  // Global mouse up handler
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleSlotMouseUp()
      }
    }
    
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, selectedSlots])

  // Create bulk availability windows
  const createBulkWindows = async (windowData: Partial<AvailabilityWindow>) => {
    if (selectedSlots.size === 0) return
    
    const windows = Array.from(selectedSlots).map(slot => {
      const [date, time] = slot.split('-')
      const [hour, minute] = time.split(':').map(Number)
      const totalMinutes = hour * 60 + minute + 30
      const endHour = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
      const endMinute = (totalMinutes % 60).toString().padStart(2, '0')
      const endTime = `${endHour}:${endMinute}`
      
      return {
        date,
        start_time: time,
        end_time: endTime,
        is_available: windowData.is_available ?? true,
        reason: windowData.reason || ''
      }
    })
    
    // Create optimistic windows for immediate UI update
    const optimisticWindows: AvailabilityWindow[] = windows.map((window, index) => ({
      id: `temp-bulk-${Date.now()}-${index}`,
      referee_id: refereeId,
      date: window.date,
      start_time: window.start_time,
      end_time: window.end_time,
      is_available: window.is_available,
      reason: window.reason || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    // Update UI immediately
    setAvailabilityWindows(prev => [...prev, ...optimisticWindows])
    setIsCreateDialogOpen(false)
    setSelectedSlots(new Set())
    
    try {
      const response = await api.createBulkAvailabilityWindows(refereeId, windows)
      
      // Replace optimistic windows with actual server response
      if (response.success && response.data?.windows) {
        setAvailabilityWindows(prev => {
          const filteredPrev = prev.filter(w => !optimisticWindows.some(opt => opt.id === w.id))
          return [...filteredPrev, ...response.data.windows]
        })
      }
      
      toast({
        title: "Success",
        description: `Created ${windows.length} availability windows.`,
      })
    } catch (error) {
      console.error('Error creating bulk windows:', error)
      
      // Remove optimistic windows on error
      setAvailabilityWindows(prev => 
        prev.filter(w => !optimisticWindows.some(opt => opt.id === w.id))
      )
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create availability windows.",
        variant: "destructive",
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Availability Calendar
              </CardTitle>
              <CardDescription>
                {viewMode === 'week' ? 'Weekly' : 'Monthly'} availability schedule
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={isSelectionMode ? "default" : "outline"}
                    onClick={toggleSelectionMode}
                    className="w-full sm:w-auto"
                  >
                    {isSelectionMode ? (
                      <X className="h-4 w-4 mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">
                      {isSelectionMode ? 'Exit Select' : 'Select Mode'}
                    </span>
                    <span className="sm:hidden">
                      {isSelectionMode ? 'Exit' : 'Select'}
                    </span>
                  </Button>
                  
                  {!isSelectionMode && (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Add Window</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="mx-4 max-w-md">
                    <AvailabilityWindowForm
                      onSubmit={(data) => {
                        if (selectedSlots.size > 1) {
                          createBulkWindows(data)
                        } else {
                          createWindow(data)
                        }
                      }}
                      onCancel={() => {
                        setIsCreateDialogOpen(false)
                        setSelectedSlots(new Set())
                      }}
                      selectedSlotCount={selectedSlots.size}
                    />
                  </DialogContent>
                </Dialog>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Week range display */}
          <div className="text-sm text-muted-foreground mt-2">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm text-muted-foreground">Loading availability...</div>
            </div>
          ) : (
            <>
              {/* Desktop Calendar Grid */}
              <div className="hidden md:block overflow-x-auto">
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
                          const slotKey = `${dateStr}-${time}`
                          const isSelected = selectedSlots.has(slotKey)
                          
                          return (
                            <div
                              key={slotKey}
                              className={`
                                bg-background p-1 min-h-[32px] border-b cursor-pointer transition-colors select-none relative
                                ${canEdit ? 'hover:bg-muted/50' : ''}
                                ${isSelectionMode && isSelected ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-400 ring-opacity-50' : ''}
                                ${!isSelectionMode && isSelected ? 'bg-blue-200 hover:bg-blue-300' : ''}
                                ${!isSelected && hasWindow ? (
                                  isAvailable ? 'bg-green-100 hover:bg-green-200' :
                                  isUnavailable ? 'bg-red-100 hover:bg-red-200' :
                                  'bg-yellow-100 hover:bg-yellow-200'
                                ) : !isSelected ? 'hover:bg-blue-50' : ''}
                              `}
                              onClick={() => handleSlotClick(dateStr, time)}
                              onMouseDown={(e) => !isSelectionMode && handleSlotMouseDown(dateStr, time, e)}
                              onMouseEnter={() => !isSelectionMode && handleSlotMouseEnter(dateStr, time)}
                              title={
                                isSelected ? 'Selected for bulk creation' :
                                hasWindow 
                                  ? `${isAvailable ? 'Available' : 'Unavailable'}: ${time} - ${windows[0]?.end_time}`
                                  : canEdit ? 'Click to add availability or drag to select multiple' : 'No availability set'
                              }
                            >
                              {hasWindow && !isSelected && (
                                <div className="flex items-center justify-center h-full">
                                  {isAvailable ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <X className="h-3 w-3 text-red-600" />
                                  )}
                                </div>
                              )}
                              {isSelected && (
                                <div className="flex items-center justify-center h-full">
                                  {isSelectionMode ? (
                                    <div className="w-3 h-3 bg-blue-600 rounded border border-blue-700 flex items-center justify-center">
                                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
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

              {/* Mobile Calendar View */}
              <div className="md:hidden space-y-4">
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayWindows = availabilityWindows.filter(window => {
                    const windowDate = window.date.includes('T') ? window.date.split('T')[0] : window.date
                    return windowDate === dateStr
                  })
                  
                  return (
                    <Card key={dateStr} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {format(day, 'EEEE, MMM d')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-1">
                          {timeSlots.map(time => {
                            const windows = getWindowsForSlot(dateStr, time)
                            const hasWindow = windows.length > 0
                            const isAvailable = windows.some(w => w.is_available)
                            const isUnavailable = windows.some(w => !w.is_available)
                            const slotKey = `${dateStr}-${time}`
                            const isSelected = selectedSlots.has(slotKey)
                            
                            return (
                              <div
                                key={slotKey}
                                className={`
                                  p-3 border rounded-lg cursor-pointer transition-colors select-none text-center relative
                                  ${isSelectionMode && isSelected ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400 ring-opacity-50' : ''}
                                  ${!isSelectionMode && isSelected ? 'bg-blue-200 border-blue-400' : ''}
                                  ${!isSelected && hasWindow ? (
                                    isAvailable ? 'bg-green-100 border-green-300' :
                                    isUnavailable ? 'bg-red-100 border-red-300' :
                                    'bg-yellow-100 border-yellow-300'
                                  ) : !isSelected ? 'bg-background border-border hover:bg-muted/50' : ''}
                                `}
                                onClick={() => handleSlotClick(dateStr, time)}
                                onTouchStart={(e) => {
                                  if (!isSelectionMode) {
                                    e.preventDefault()
                                    handleSlotMouseDown(dateStr, time, e as any)
                                  }
                                }}
                                onTouchMove={(e) => {
                                  if (!isSelectionMode) {
                                    e.preventDefault()
                                    const touch = e.touches[0]
                                    const element = document.elementFromPoint(touch.clientX, touch.clientY)
                                    const slotElement = element?.closest('[data-slot]')
                                    if (slotElement) {
                                      const [touchDate, touchTime] = slotElement.getAttribute('data-slot')?.split('-') || []
                                      if (touchDate && touchTime) {
                                        handleSlotMouseEnter(touchDate, touchTime)
                                      }
                                    }
                                  }
                                }}
                                onTouchEnd={(e) => {
                                  if (!isSelectionMode) {
                                    e.preventDefault()
                                    handleSlotMouseUp()
                                  }
                                }}
                                data-slot={slotKey}
                              >
                                <div className="text-xs font-medium mb-1">{time}</div>
                                {hasWindow && !isSelected && (
                                  <div className="flex items-center justify-center">
                                    {isAvailable ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="flex items-center justify-center">
                                    {isSelectionMode ? (
                                      <div className="w-4 h-4 bg-blue-600 rounded border border-blue-700 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                      </div>
                                    ) : (
                                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                    )}
                                  </div>
                                )}
                                {!hasWindow && !isSelected && (
                                  <div className="h-4"></div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:flex md:items-center md:justify-center gap-4 md:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border rounded"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border rounded"></div>
              <span>Not Set</span>
            </div>
          </div>
          {canEdit && (
            <div className="text-center mt-2 text-xs text-muted-foreground">
              <span className="md:hidden">Tap to add • Touch and drag to select multiple</span>
              <span className="hidden md:inline">Click to add single window • Drag to select multiple slots</span>
            </div>
          )}
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

      {/* Floating Action Bar for Selection Mode */}
      {isSelectionMode && selectedSlots.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-background border border-border rounded-full shadow-lg px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedSlots.size} slot{selectedSlots.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => applyAvailabilityToSelected(true)}
              >
                <Check className="h-4 w-4 mr-1" />
                Available
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => applyAvailabilityToSelected(false)}
              >
                <X className="h-4 w-4 mr-1" />
                Unavailable
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-gray-600 hover:bg-gray-700 text-white"
                onClick={clearAvailabilityForSelected}
                title="Remove availability entries (reset to undefined)"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSlots(new Set())}
                title="Cancel selection"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Form component for creating availability windows
function AvailabilityWindowForm({ 
  onSubmit, 
  onCancel,
  initialData,
  selectedSlotCount = 0
}: {
  onSubmit: (data: Partial<AvailabilityWindow>) => void
  onCancel: () => void
  initialData?: Partial<AvailabilityWindow>
  selectedSlotCount?: number
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
        <DialogTitle>
          {selectedSlotCount > 1 ? `Add ${selectedSlotCount} Availability Windows` : 'Add Availability Window'}
        </DialogTitle>
        <DialogDescription>
          {selectedSlotCount > 1 
            ? `Create ${selectedSlotCount} new availability time windows for the selected slots.`
            : 'Create a new availability time window for scheduling.'
          }
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {selectedSlotCount <= 1 && (
          <>
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
          </>
        )}

        {selectedSlotCount > 1 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Each selected time slot will create a 30-minute availability window.
            </p>
          </div>
        )}

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
            {selectedSlotCount > 1 ? `Create ${selectedSlotCount} Windows` : 'Create Window'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}