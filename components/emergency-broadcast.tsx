'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  Send, 
  Users, 
  Zap,
  Megaphone,
  Clock,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

interface EmergencyBroadcastProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

interface BroadcastTarget {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

const BROADCAST_TARGETS: BroadcastTarget[] = [
  {
    id: 'all_referees',
    label: 'All Referees',
    description: 'Send to all active referees in the system',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'scheduled_referees',
    label: 'Scheduled Referees',
    description: 'Send only to referees with upcoming assignments',
    icon: <Clock className="h-4 w-4" />
  },
  {
    id: 'all_users',
    label: 'All Users',
    description: 'Send to all users (referees, admins, assignors)',
    icon: <Megaphone className="h-4 w-4" />
  }
]

export function EmergencyBroadcast({ trigger, onSuccess }: EmergencyBroadcastProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targets: ['all_referees'] as string[],
    requiresAcknowledgment: true
  })

  const handleTargetChange = (targetId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        targets: [...prev.targets, targetId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        targets: prev.targets.filter(id => id !== targetId)
      }))
    }
  }

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in both title and message')
      return
    }

    if (formData.targets.length === 0) {
      toast.error('Please select at least one target audience')
      return
    }

    try {
      setSending(true)

      // Create the emergency communication
      const communicationData = {
        title: `🚨 EMERGENCY: ${formData.title}`,
        content: formData.message,
        type: 'emergency',
        priority: 'urgent',
        target_audience: {
          broadcast_targets: formData.targets,
          all_users: formData.targets.includes('all_users')
        },
        requires_acknowledgment: formData.requiresAcknowledgment
      }

      const response = await apiClient.createCommunication(communicationData)
      
      if (response.success) {
        // Immediately publish the emergency communication
        await apiClient.publishCommunication(response.data.id)
        
        toast.success('Emergency broadcast sent successfully!')
        
        // Reset form
        setFormData({
          title: '',
          message: '',
          targets: ['all_referees'],
          requiresAcknowledgment: true
        })
        
        setIsOpen(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error sending emergency broadcast:', error)
      toast.error('Failed to send emergency broadcast')
    } finally {
      setSending(false)
    }
  }

  const getTargetCount = () => {
    // This would normally come from an API call to get actual counts
    const mockCounts = {
      'all_referees': 45,
      'scheduled_referees': 12,
      'all_users': 67
    }
    
    return formData.targets.reduce((total, targetId) => {
      return total + (mockCounts[targetId as keyof typeof mockCounts] || 0)
    }, 0)
  }

  // Only show for admins
  if (user?.role !== 'admin') {
    return null
  }

  const DefaultTrigger = (
    <Button variant="destructive" className="gap-2">
      <AlertTriangle className="h-4 w-4" />
      Emergency Broadcast
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || DefaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Broadcast
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            This will send an urgent notification to all selected recipients immediately. 
            Use only for genuine emergencies that require immediate attention.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="emergency-title">Emergency Title *</Label>
            <Input
              id="emergency-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Game Cancellation, Weather Alert, Field Closure"
              className="mt-1"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="emergency-message">Emergency Message *</Label>
            <Textarea
              id="emergency-message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Provide clear, specific details about the emergency and any required actions..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Target Audience */}
          <div>
            <Label className="text-base font-medium">Target Audience</Label>
            <div className="mt-3 space-y-3">
              {BROADCAST_TARGETS.map((target) => (
                <div key={target.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={target.id}
                    checked={formData.targets.includes(target.id)}
                    onCheckedChange={(checked) => handleTargetChange(target.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={target.id} className="flex items-center gap-2 cursor-pointer">
                      {target.icon}
                      {target.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {target.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {formData.targets.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Users className="h-4 w-4" />
                  Approximately {getTargetCount()} recipients will be notified
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires-acknowledgment"
              checked={formData.requiresAcknowledgment}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                requiresAcknowledgment: checked as boolean 
              }))}
            />
            <Label htmlFor="requires-acknowledgment" className="text-sm cursor-pointer">
              Require acknowledgment from recipients
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || !formData.title.trim() || !formData.message.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {sending ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Emergency Broadcast
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Quick emergency broadcast button for dashboard or toolbar
export function QuickEmergencyBroadcast() {
  return (
    <EmergencyBroadcast 
      trigger={
        <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          Emergency
        </Button>
      }
    />
  )
}