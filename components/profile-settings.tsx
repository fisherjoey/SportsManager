"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Award, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/api"

export function ProfileSettings() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const api = useApi()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    maxDistance: 25,
    isAvailable: true,
    postalCode: "",
  })

  useEffect(() => {
    if (user) {
      const referee = user.referee || {}
      setFormData({
        name: referee.name || "",
        email: user.email || "",
        phone: referee.phone || "",
        location: referee.location || "",
        maxDistance: referee.max_distance || 25,
        isAvailable: referee.is_available !== false,
        postalCode: referee.postal_code || "",
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Only send fields that have values
      const updateData: any = {}
      if (formData.name) updateData.name = formData.name
      if (formData.email) updateData.email = formData.email
      if (formData.phone) updateData.phone = formData.phone
      if (formData.location) updateData.location = formData.location
      if (formData.postalCode) updateData.postal_code = formData.postalCode
      updateData.is_available = formData.isAvailable
      updateData.max_distance = formData.maxDistance
      
      await api.updateReferee(user.referee?.id || user.id, updateData)
      
      setIsEditing(false)
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          variant={isEditing ? "default" : "outline"}
          disabled={loading}
        >
          <Settings className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
            <CardDescription>Your basic profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Downtown, Westside"
              />
            </div>
          </CardContent>
        </Card>

        {user?.role === "referee" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Referee Information
              </CardTitle>
              <CardDescription>Your referee qualifications and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.referee?.wage_per_game !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="wage">Base Wage per Game</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-medium">${user.referee.wage_per_game}</span>
                    <Badge variant="outline">Admin-only</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    * Final game wage may vary based on game multipliers (e.g., playoffs, holidays)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  disabled={!isEditing}
                  placeholder="M5V 3A8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDistance">Max Travel Distance (km)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  min="1"
                  max="200"
                  value={formData.maxDistance}
                  onChange={(e) => setFormData({ ...formData, maxDistance: parseInt(e.target.value) || 25 })}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: !!checked })}
                  disabled={!isEditing}
                />
                <Label htmlFor="isAvailable">Currently available for assignments</Label>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {user?.role === "referee" && (
        <Card>
          <CardHeader>
            <CardTitle>Availability Settings</CardTitle>
            <CardDescription>Set your general availability preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Weekly Availability</h4>
                <div className="grid grid-cols-7 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="text-center">
                      <Label className="text-xs">{day}</Label>
                      <div className="mt-1">
                        <Checkbox disabled={!isEditing} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Preferred Time Slots</h4>
                <div className="space-y-2">
                  {["Morning (8AM - 12PM)", "Afternoon (12PM - 6PM)", "Evening (6PM - 10PM)"].map((slot) => (
                    <div key={slot} className="flex items-center space-x-2">
                      <Checkbox disabled={!isEditing} />
                      <Label className="text-sm">{slot}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      )}
    </div>
  )
}
