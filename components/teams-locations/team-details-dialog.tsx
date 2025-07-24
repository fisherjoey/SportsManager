"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MapPin, Phone, Mail, Globe, Users, Edit } from "lucide-react"
import type { Team } from "@/lib/mock-data"

interface TeamDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team
}

export function TeamDetailsDialog({ open, onOpenChange, team }: TeamDetailsDialogProps) {
  if (!team) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: team.colors?.primary || "#gray" }} />
            <div>
              <DialogTitle className="text-xl">{team.name}</DialogTitle>
              <DialogDescription>
                {team.division} Division{team.foundedYear ? ` • Est. ${team.foundedYear}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="flex items-center justify-between">
            <Badge variant={team.isActive ? "default" : "secondary"} className="text-sm">
              {team.isActive ? "Active Team" : "Inactive Team"}
            </Badge>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Team
            </Button>
          </div>

          {/* Team Colors */}
          {team.colors && (
            <div>
              <h4 className="text-sm font-medium mb-2">Team Colors</h4>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded border" style={{ backgroundColor: team.colors.primary }} />
                  <span className="text-sm">Primary: {team.colors.primary}</span>
                </div>
                {team.colors.secondary && (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: team.colors.secondary }} />
                    <span className="text-sm">Secondary: {team.colors.secondary}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-medium mb-3">Contact Information</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{team.contactName}</p>
                  <p className="text-xs text-muted-foreground">Team Contact</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{team.contactPhone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{team.contactEmail}</span>
              </div>
              {team.website && (
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={team.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {team.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location Information */}
          <div>
            <h4 className="text-sm font-medium mb-3">Location & Venue</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{team.location}</p>
                  <p className="text-xs text-muted-foreground">Team Location</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{team.homeVenue}</p>
                  <p className="text-xs text-muted-foreground">Home Venue</p>
                </div>
              </div>
            </div>
          </div>

          {team.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{team.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span> {new Date(team.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {new Date(team.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
