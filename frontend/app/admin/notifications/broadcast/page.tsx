'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { notificationsApi, BroadcastNotificationData } from '@/lib/notifications-api'
import {
  Bell,
  Send,
  AlertCircle,
  CheckCircle2,
  Users,
  Info,
  RefreshCw,
  Eye
} from 'lucide-react'

interface Role {
  name: string;
  description: string;
}

interface FormData {
  title: string;
  message: string;
  type: 'assignment' | 'status_change' | 'reminder' | 'system';
  link: string;
  sendToAll: boolean;
  selectedRoles: string[];
}

interface FormErrors {
  title?: string;
  message?: string;
  targetAudience?: string;
}

export default function BroadcastNotificationPage() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    message: '',
    type: 'system',
    link: '',
    sendToAll: false,
    selectedRoles: [],
  })

  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null)
  const [lastSentResult, setLastSentResult] = useState<{
    recipientCount: number;
    createdCount: number;
  } | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    loadAvailableRoles()
  }, [])

  const loadAvailableRoles = async () => {
    setIsLoadingRoles(true)
    try {
      const response = await fetch('/api/roles/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableRoles(data.data?.roles || [])
      } else {
        // Fallback to default roles
        setAvailableRoles([
          { name: 'admin', description: 'Full system access' },
          { name: 'referee', description: 'Basic referee access' },
          { name: 'referee_coach', description: 'Referee coach access' },
          { name: 'evaluator', description: 'Evaluator access' },
        ])
      }
    } catch (error) {
      console.error('Failed to load roles:', error)
      // Use fallback roles
      setAvailableRoles([
        { name: 'admin', description: 'Full system access' },
        { name: 'referee', description: 'Basic referee access' },
        { name: 'referee_coach', description: 'Referee coach access' },
        { name: 'evaluator', description: 'Evaluator access' },
      ])
    } finally {
      setIsLoadingRoles(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.title.trim()) {
      errors.title = 'Title is required'
    } else if (formData.title.length > 255) {
      errors.title = 'Title must be 255 characters or less'
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required'
    }

    if (!formData.sendToAll && formData.selectedRoles.length === 0) {
      errors.targetAudience = 'Please select at least one role or choose "Send to all users"'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRoleToggle = (roleName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(roleName)
        ? prev.selectedRoles.filter(r => r !== roleName)
        : [...prev.selectedRoles, roleName]
    }))
    // Clear target audience error when user makes selection
    if (formErrors.targetAudience) {
      setFormErrors(prev => ({ ...prev, targetAudience: undefined }))
    }
  }

  const handleSendToAllChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sendToAll: checked,
      selectedRoles: checked ? [] : prev.selectedRoles
    }))
    // Clear target audience error when user makes selection
    if (formErrors.targetAudience) {
      setFormErrors(prev => ({ ...prev, targetAudience: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmAndSend = async () => {
    setShowConfirmDialog(false)
    setIsSending(true)

    try {
      const broadcastData: BroadcastNotificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        link: formData.link.trim() || undefined,
        target_audience: {
          all_users: formData.sendToAll,
          roles: formData.sendToAll ? undefined : formData.selectedRoles,
        }
      }

      const result = await notificationsApi.broadcastNotification(broadcastData)

      setLastSentResult({
        recipientCount: result.recipientCount,
        createdCount: result.createdCount
      })

      toast({
        title: 'Notification Sent Successfully',
        description: `Broadcast sent to ${result.createdCount} of ${result.recipientCount} users`,
      })

      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'system',
        link: '',
        sendToAll: false,
        selectedRoles: [],
      })
      setFormErrors({})
      setShowPreview(false)

    } catch (error) {
      console.error('Failed to broadcast notification:', error)
      toast({
        title: 'Broadcast Failed',
        description: error instanceof Error ? error.message : 'Failed to send notification. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  const getNotificationIcon = () => {
    switch (formData.type) {
      case 'assignment':
        return '📋'
      case 'status_change':
        return '🔄'
      case 'reminder':
        return '⏰'
      case 'system':
      default:
        return '📢'
    }
  }

  const getRemainingChars = () => {
    return 255 - formData.title.length
  }

  const getTargetDescription = () => {
    if (formData.sendToAll) {
      return 'All users in the system'
    }
    if (formData.selectedRoles.length === 0) {
      return 'No target selected'
    }
    return formData.selectedRoles.map(role =>
      availableRoles.find(r => r.name === role)?.name || role
    ).join(', ')
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broadcast Notifications</h1>
          <p className="text-muted-foreground">
            Send notifications to multiple users at once
          </p>
        </div>
      </div>

      {/* Success Message */}
      {lastSentResult && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Last broadcast successfully sent to {lastSentResult.createdCount} of {lastSentResult.recipientCount} users
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Notification Details</CardTitle>
                <CardDescription>
                  Enter the notification content and configure delivery options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, title: e.target.value }))
                      if (formErrors.title) {
                        setFormErrors(prev => ({ ...prev, title: undefined }))
                      }
                    }}
                    placeholder="Enter notification title"
                    maxLength={255}
                    className={formErrors.title ? 'border-destructive' : ''}
                    aria-invalid={!!formErrors.title}
                    aria-describedby={formErrors.title ? 'title-error' : undefined}
                  />
                  <div className="flex justify-between items-center">
                    {formErrors.title && (
                      <p id="title-error" className="text-sm text-destructive">
                        {formErrors.title}
                      </p>
                    )}
                    <p className={`text-xs ${getRemainingChars() < 20 ? 'text-amber-600 font-medium' : 'text-muted-foreground'} ml-auto`}>
                      {getRemainingChars()} characters remaining
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, message: e.target.value }))
                      if (formErrors.message) {
                        setFormErrors(prev => ({ ...prev, message: undefined }))
                      }
                    }}
                    placeholder="Enter the notification message"
                    rows={5}
                    className={formErrors.message ? 'border-destructive' : ''}
                    aria-invalid={!!formErrors.message}
                    aria-describedby={formErrors.message ? 'message-error' : undefined}
                  />
                  {formErrors.message && (
                    <p id="message-error" className="text-sm text-destructive">
                      {formErrors.message}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="status_change">Status Change</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Link */}
                <div className="space-y-2">
                  <Label htmlFor="link">Link (Optional)</Label>
                  <Input
                    id="link"
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="/path/to/page or https://example.com"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a link users can click to get more information
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Target Audience */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>
                  Select who should receive this notification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Send to All */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendToAll"
                    checked={formData.sendToAll}
                    onCheckedChange={handleSendToAllChange}
                  />
                  <Label
                    htmlFor="sendToAll"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Send to all users
                  </Label>
                </div>

                {/* Role Selection */}
                {!formData.sendToAll && (
                  <div className="space-y-3">
                    <Label>Select Roles</Label>
                    {isLoadingRoles ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableRoles.map((role) => (
                          <div
                            key={role.name}
                            className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <Checkbox
                              id={`role-${role.name}`}
                              checked={formData.selectedRoles.includes(role.name)}
                              onCheckedChange={() => handleRoleToggle(role.name)}
                            />
                            <Label
                              htmlFor={`role-${role.name}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium capitalize">{role.name.replace('_', ' ')}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {formErrors.targetAudience && (
                      <p className="text-sm text-destructive">
                        {formErrors.targetAudience}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                type="submit"
                disabled={isSending}
                className="flex-1"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </form>
        </div>

        {/* Preview/Info Section */}
        <div className="space-y-6">
          {/* Preview Card */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-accent/50 p-4 rounded-lg border space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon()}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm break-words">
                        {formData.title || 'Notification Title'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                        {formData.message || 'Notification message will appear here...'}
                      </p>
                      {formData.link && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            Link: {formData.link}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Recipients:</p>
                <p className="text-sm text-muted-foreground">
                  {getTargetDescription()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Notification Type:</p>
                <Badge variant="secondary" className="mt-1">
                  {formData.type}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Keep titles clear and concise (max 255 characters)</p>
              <p>Use the preview to check how your notification will look</p>
              <p>System notifications are for general announcements</p>
              <p>Add a link to provide additional context or actions</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this notification?
              <div className="mt-4 p-3 bg-accent rounded-md space-y-2">
                <p className="font-medium text-foreground">
                  Title: {formData.title}
                </p>
                <p className="text-sm">
                  Target: {getTargetDescription()}
                </p>
              </div>
              <p className="mt-3 text-sm">
                This action cannot be undone. The notification will be sent immediately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndSend}>
              Send Notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
