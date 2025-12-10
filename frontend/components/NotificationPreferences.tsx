'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { notificationsApi, NotificationPreferences as NotificationPrefsType } from '@/lib/notifications-api'
import { useToast } from '@/components/ui/use-toast'

/**
 * NotificationPreferences Component
 *
 * Settings page for notification preferences.
 * Allows users to configure email, SMS, and in-app notification settings.
 */
export function NotificationPreferences() {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<NotificationPrefsType>({
    email_assignments: true,
    email_reminders: true,
    email_status_changes: true,
    sms_assignments: true,
    sms_reminders: true,
    in_app_enabled: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  /**
   * Fetch current preferences
   */
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true)
        const data = await notificationsApi.getPreferences()
        setPreferences(data)
      } catch (error) {
        console.error('Error fetching notification preferences:', error)
        toast({
          title: 'Error',
          description: 'Failed to load notification preferences.',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [toast])

  /**
   * Handle preference change
   */
  const handlePreferenceChange = (key: keyof NotificationPrefsType, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  /**
   * Save preferences
   */
  const handleSave = async () => {
    try {
      setIsSaving(true)
      const updated = await notificationsApi.updatePreferences(preferences)
      setPreferences(updated)
      setHasChanges(false)

      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully.'
      })
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage how you receive notifications about assignments, reminders, and updates.
        </p>
      </div>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>In-App Notifications</CardTitle>
          </div>
          <CardDescription>
            Control whether you receive notifications within the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in-app-enabled">Enable in-app notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the notification bell dropdown
              </p>
            </div>
            <Switch
              id="in-app-enabled"
              checked={preferences.in_app_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('in_app_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose which email notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-assignments">Game assignments</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails when you are assigned to a game
              </p>
            </div>
            <Switch
              id="email-assignments"
              checked={preferences.email_assignments}
              onCheckedChange={(checked) => handlePreferenceChange('email_assignments', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-reminders">Game reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminder emails before upcoming games
              </p>
            </div>
            <Switch
              id="email-reminders"
              checked={preferences.email_reminders}
              onCheckedChange={(checked) => handlePreferenceChange('email_reminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-status-changes">Assignment status changes</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails when game assignments are modified or cancelled
              </p>
            </div>
            <Switch
              id="email-status-changes"
              checked={preferences.email_status_changes}
              onCheckedChange={(checked) => handlePreferenceChange('email_status_changes', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>SMS Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose which SMS text messages you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-assignments">Game assignments</Label>
              <p className="text-sm text-muted-foreground">
                Receive SMS when you are assigned to a game
              </p>
            </div>
            <Switch
              id="sms-assignments"
              checked={preferences.sms_assignments}
              onCheckedChange={(checked) => handlePreferenceChange('sms_assignments', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-reminders">Game reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive SMS reminders before upcoming games
              </p>
            </div>
            <Switch
              id="sms-reminders"
              checked={preferences.sms_reminders}
              onCheckedChange={(checked) => handlePreferenceChange('sms_reminders', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4">
        {hasChanges && (
          <p className="text-sm text-muted-foreground">
            You have unsaved changes
          </p>
        )}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
