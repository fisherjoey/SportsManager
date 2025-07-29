"use client"

import type React from "react"

import { useState } from "react"
import { CustomFormDialog } from "@/components/ui/form-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ContactFieldGroup } from "@/components/ui/contact-field-group"
import { calgaryBasketballVenues } from "@/lib/mock-data"

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTeam: (teamData: any) => void
}

export function CreateTeamDialog({ open, onOpenChange, onCreateTeam }: CreateTeamDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    division: "",
    location: "",
    homeVenue: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    foundedYear: new Date().getFullYear(),
    website: "",
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    notes: "",
    isActive: true,
  })

  const handleSubmit = async (data: any) => {
    const teamData = {
      ...formData,
      ...data,
      colors: {
        primary: formData.primaryColor,
        secondary: formData.secondaryColor,
      },
    }
    await onCreateTeam(teamData)
    setFormData({
      name: "",
      division: "",
      location: "",
      homeVenue: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      foundedYear: new Date().getFullYear(),
      website: "",
      primaryColor: "#000000",
      secondaryColor: "#FFFFFF",
      notes: "",
      isActive: true,
    })
  }

  return (
    <CustomFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Team"
      description="Create a new team in the system"
      onSubmit={handleSubmit}
      submitText="Create Team"
      maxWidth="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
    >
      {({ loading, handleSubmit: submitForm }) => (
        <form id="dialog-form" onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const data = Object.fromEntries(formData.entries())
          submitForm(data)
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="division">Division</Label>
              <Select
                value={formData.division}
                onValueChange={(value) => setFormData({ ...formData, division: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="U10">U10</SelectItem>
                  <SelectItem value="U12">U12</SelectItem>
                  <SelectItem value="U14">U14</SelectItem>
                  <SelectItem value="U16">U16</SelectItem>
                  <SelectItem value="U18">U18</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Calgary NW"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeVenue">Home Venue</Label>
              <Select
                value={formData.homeVenue}
                onValueChange={(value) => setFormData({ ...formData, homeVenue: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select home venue" />
                </SelectTrigger>
                <SelectContent>
                  {calgaryBasketballVenues.map((venue) => (
                    <SelectItem key={venue} value={venue}>
                      {venue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ContactFieldGroup
            nameValue={formData.contactName}
            emailValue={formData.contactEmail}
            phoneValue={formData.contactPhone}
            onNameChange={(value) => setFormData({ ...formData, contactName: value })}
            onEmailChange={(value) => setFormData({ ...formData, contactEmail: value })}
            onPhoneChange={(value) => setFormData({ ...formData, contactPhone: value })}
            nameRequired
            emailRequired
            phoneRequired
            layout="grid"
            disabled={loading}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.foundedYear}
                onChange={(e) => setFormData({ ...formData, foundedYear: Number.parseInt(e.target.value) || new Date().getFullYear() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.teamwebsite.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about the team..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

        </form>
      )}
    </CustomFormDialog>
  )
}
