"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Loader2, Settings } from 'lucide-react'
import { useApi, OrganizationSettings } from '@/lib/api'

export default function OrganizationSettings() {
  const api = useApi()
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    organization_name: '',
    payment_model: 'INDIVIDUAL' as 'INDIVIDUAL' | 'FLAT_RATE',
    default_game_rate: '',
    availability_strategy: 'BLACKLIST' as 'WHITELIST' | 'BLACKLIST'
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.getOrganizationSettings()
      
      if (response.success) {
        setSettings(response.data)
        setFormData({
          organization_name: response.data.organization_name,
          payment_model: response.data.payment_model,
          default_game_rate: response.data.default_game_rate?.toString() || '',
          availability_strategy: response.data.availability_strategy || 'BLACKLIST'
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load organization settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.organization_name.trim()) {
      toast.error('Organization name is required')
      return
    }

    if (formData.payment_model === 'FLAT_RATE' && (!formData.default_game_rate || parseFloat(formData.default_game_rate) <= 0)) {
      toast.error('Default game rate is required and must be positive for flat rate model')
      return
    }

    setSaving(true)

    try {
      const response = await api.updateOrganizationSettings({
        organization_name: formData.organization_name.trim(),
        payment_model: formData.payment_model,
        default_game_rate: formData.payment_model === 'FLAT_RATE' ? parseFloat(formData.default_game_rate) : undefined,
        availability_strategy: formData.availability_strategy
      })

      if (response.success) {
        setSettings(response.data)
        toast.success('Organization settings updated successfully')
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update organization settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure your organization's basic information and payment model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organization_name">Organization Name</Label>
            <Input
              id="organization_name"
              value={formData.organization_name}
              onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
              placeholder="Enter organization name"
            />
          </div>

          <div className="space-y-4">
            <Label>Payment Model</Label>
            <RadioGroup
              value={formData.payment_model}
              onValueChange={(value: 'INDIVIDUAL' | 'FLAT_RATE') => 
                setFormData({ ...formData, payment_model: value, default_game_rate: value === 'INDIVIDUAL' ? '' : formData.default_game_rate })
              }
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="INDIVIDUAL" id="individual" />
                <div className="space-y-1">
                  <Label htmlFor="individual" className="font-medium">
                    Pay by Individual Referee
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Each referee is paid based on their individual wage rate multiplied by the game's wage multiplier.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="FLAT_RATE" id="flat_rate" />
                <div className="space-y-1">
                  <Label htmlFor="flat_rate" className="font-medium">
                    Pay Flat Rate per Game
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Set a fixed amount per game that is divided equally among assigned referees.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {formData.payment_model === 'FLAT_RATE' && (
            <div className="space-y-2">
              <Label htmlFor="default_game_rate">Default Game Rate ($)</Label>
              <Input
                id="default_game_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.default_game_rate}
                onChange={(e) => setFormData({ ...formData, default_game_rate: e.target.value })}
                placeholder="150.00"
              />
              <p className="text-sm text-muted-foreground">
                This amount will be divided equally among all referees assigned to each game.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Label>Availability Strategy</Label>
            <RadioGroup
              value={formData.availability_strategy}
              onValueChange={(value: 'WHITELIST' | 'BLACKLIST') => 
                setFormData({ ...formData, availability_strategy: value })
              }
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="BLACKLIST" id="blacklist" />
                <div className="space-y-1">
                  <Label htmlFor="blacklist" className="font-medium">
                    Blacklist Mode (Assume Available)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Referees are available by default. They mark specific times as unavailable to block assignments.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="WHITELIST" id="whitelist" />
                <div className="space-y-1">
                  <Label htmlFor="whitelist" className="font-medium">
                    Whitelist Mode (Assume Unavailable)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Referees are unavailable by default. They must explicitly mark times as available for assignments.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Organization:</span>
                <p className="text-muted-foreground">{settings.organization_name}</p>
              </div>
              <div>
                <span className="font-medium">Payment Model:</span>
                <p className="text-muted-foreground">
                  {settings.payment_model === 'INDIVIDUAL' ? 'Individual Referee Rates' : 'Flat Rate per Game'}
                </p>
              </div>
              <div>
                <span className="font-medium">Availability Strategy:</span>
                <p className="text-muted-foreground">
                  {settings.availability_strategy === 'BLACKLIST' ? 'Blacklist Mode (Assume Available)' : 'Whitelist Mode (Assume Unavailable)'}
                </p>
              </div>
              {settings.payment_model === 'FLAT_RATE' && settings.default_game_rate && (
                <div>
                  <span className="font-medium">Default Game Rate:</span>
                  <p className="text-muted-foreground">${settings.default_game_rate}</p>
                </div>
              )}
              <div>
                <span className="font-medium">Last Updated:</span>
                <p className="text-muted-foreground">
                  {new Date(settings.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}