'use client'

import {
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Users,
  ParkingMeterIcon as Parking,
  Clock,
  Accessibility,
  Edit
} from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Location } from '@/lib/mock-data'

interface LocationDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location
}

export function LocationDetailsDialog({ open, onOpenChange, location }: LocationDetailsDialogProps) {
  if (!location) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{location.name}</DialogTitle>
              <DialogDescription>
                {location.address}, {location.city}, {location.province}
              </DialogDescription>
            </div>
            <Badge variant={location.isActive ? 'default' : 'secondary'}>
              {location.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-lg font-semibold">{location.capacity}</p>
              <p className="text-xs text-muted-foreground">Capacity</p>
            </div>
            {location.parkingSpaces && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Parking className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                <p className="text-lg font-semibold">{location.parkingSpaces}</p>
                <p className="text-xs text-muted-foreground">Parking</p>
              </div>
            )}
            {location.rentalRate && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <p className="text-lg font-semibold">${location.rentalRate}</p>
                <p className="text-xs text-muted-foreground">Per Hour</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Location
            </Button>
          </div>

          <Separator />

          {/* Address & Contact */}
          <div>
            <h4 className="text-sm font-medium mb-3">Address & Contact</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm">{location.address}</p>
                  <p className="text-sm">
                    {location.city}, {location.province} {location.postalCode}
                  </p>
                </div>
              </div>
              {location.contactName && (
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{location.contactName}</span>
                </div>
              )}
              {location.contactPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{location.contactPhone}</span>
                </div>
              )}
              {location.contactEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{location.contactEmail}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Facilities */}
          <div>
            <h4 className="text-sm font-medium mb-3">Facilities</h4>
            <div className="flex flex-wrap gap-2">
              {location.facilities.map((facility, idx) => (
                <Badge key={idx} variant="outline">
                  {facility}
                </Badge>
              ))}
            </div>
          </div>

          {/* Accessibility Features */}
          {location.accessibilityFeatures && location.accessibilityFeatures.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Accessibility className="h-4 w-4 mr-2" />
                  Accessibility Features
                </h4>
                <div className="flex flex-wrap gap-2">
                  {location.accessibilityFeatures.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-emerald-600 border-green-600">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Operating Hours */}
          {location.availability && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Operating Hours
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(location.availability).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{day}</span>
                      <span className="text-sm text-muted-foreground">
                        {hours.available ? `${hours.open} - ${hours.close}` : 'Closed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {location.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{location.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span> {new Date(location.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {new Date(location.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
