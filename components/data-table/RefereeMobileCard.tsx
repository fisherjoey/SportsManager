"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  MoreVertical,
  Copy,
  Edit,
  Eye,
  MessageSquare,
  Shield,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Referee } from "./types"

interface RefereeMobileCardProps {
  referee: Referee
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onEditReferee?: (referee: Referee) => void
  onViewProfile?: (referee: Referee) => void
}

export function RefereeMobileCard({ 
  referee, 
  isSelected, 
  onSelect, 
  onEditReferee,
  onViewProfile 
}: RefereeMobileCardProps) {
  const levelColors = {
    "Recreational": "bg-green-100 text-green-800 border-green-200",
    "Competitive": "bg-yellow-100 text-yellow-800 border-yellow-200", 
    "Elite": "bg-red-100 text-red-800 border-red-200",
  }

  const StatusIcon = referee.isAvailable ? CheckCircle : XCircle

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with selection and referee name */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  className="mt-1"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg leading-tight">
                    {referee.name}
                  </h3>
                </div>
                {referee.certificationLevel && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {referee.certificationLevel}
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(referee.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy referee ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewProfile?.(referee)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditReferee?.(referee)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit referee
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />
              <span className="truncate">{referee.email}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="mr-2 h-4 w-4" />
              <span className="truncate">{referee.phone}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" />
            <div>
              <span className="font-medium">{referee.location}</span>
              <span className="mx-2">•</span>
              <span>{referee.maxDistance} km radius</span>
            </div>
          </div>

          {/* Level and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <Badge 
                variant="outline" 
                className={levelColors[referee.level] || ""}
              >
                {referee.level}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-4 w-4 ${referee.isAvailable ? 'text-green-600' : 'text-gray-500'}`} />
              <Badge 
                variant={referee.isAvailable ? "default" : "secondary"}
                className={referee.isAvailable ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}
              >
                {referee.isAvailable ? "Available: July 20" : "Unavailable"}
              </Badge>
            </div>
          </div>

          {/* Certifications */}
          <div className="border-t pt-3">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Certifications:</span>
                {referee.certifications.length === 0 ? (
                  <span className="text-sm text-muted-foreground ml-1">None listed</span>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {referee.certifications.slice(0, 3).map((cert, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                    {referee.certifications.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{referee.certifications.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preferred Positions */}
          {referee.preferredPositions.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-start space-x-2">
                <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">Preferred positions:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {referee.preferredPositions.slice(0, 2).map((position, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {position}
                      </Badge>
                    ))}
                    {referee.preferredPositions.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{referee.preferredPositions.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}