'use client'

import { 
  Mail, 
  User, 
  Shield, 
  Calendar,
  Clock,
  Activity,
  Edit,
  Lock,
  Phone,
  MapPin,
  Users,
  Building,
  CreditCard,
  Bell,
  FileText,
  Award,
  Star
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { User as UserType, getUserDisplayName, getUserFullAddress, getYearsOfExperience } from '@/types/user'

interface UserDetailsModalProps {
  user: UserType
  open: boolean
  onClose: () => void
  onEdit: () => void
}

export function UserDetailsModal({ user, open, onClose, onEdit }: UserDetailsModalProps) {
  const getUserInitials = (user: UserType) => {
    const displayName = getUserDisplayName(user)
    if (displayName && displayName !== user.email) {
      return displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
    case 'admin':
      return 'destructive'
    case 'assignor':
      return 'default'
    case 'referee':
      return 'secondary'
    default:
      return 'outline'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            View detailed information about this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile Section */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={'/placeholder-user.jpg'} />
              <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{getUserDisplayName(user)}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-muted-foreground">{user.phone}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role.id} variant="default">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">No Roles</Badge>
                )}
                <Badge variant={user.is_active !== false ? 'outline' : 'secondary'}>
                  {user.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
                {user.availability_status && (
                  <Badge variant="outline">
                    {user.availability_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
              </div>
              {user.profile_completion_percentage !== undefined && (
                <div className="mt-2">
                  <div className="text-sm text-muted-foreground mb-1">
                    Profile completion: {user.profile_completion_percentage}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${user.profile_completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Full Name</p>
                    <p className="text-sm text-muted-foreground">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : getUserDisplayName(user)
                      }
                    </p>
                  </div>
                </div>

                {user.date_of_birth && (
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Date of Birth</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(user.date_of_birth).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                {user.phone && (
                  <div className="flex items-start space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    </div>
                  </div>
                )}

                {getUserFullAddress(user) && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {getUserFullAddress(user)}
                      </p>
                    </div>
                  </div>
                )}

                {(user.emergency_contact_name || user.emergency_contact_phone) && (
                  <div className="flex items-start space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Emergency Contact</p>
                      <p className="text-sm text-muted-foreground">
                        {user.emergency_contact_name}
                        {user.emergency_contact_phone && (
                          <><br />{user.emergency_contact_phone}</>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4" />
                Professional Information
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Roles</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role.id} variant="secondary" className="text-xs">
                            {role.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">No roles assigned</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {user.year_started_refereeing && (
                  <div className="flex items-start space-x-2">
                    <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Refereeing Experience</p>
                      <p className="text-sm text-muted-foreground">
                        {getYearsOfExperience(user)} years (since {user.year_started_refereeing})
                      </p>
                    </div>
                  </div>
                )}

                {user.certifications && user.certifications.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Star className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Certifications</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {user.specializations && user.specializations.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Specializations</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.specializations.map((spec, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Information
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Registration Date</p>
                    <p className="text-sm text-muted-foreground">
                      {user.registration_date 
                        ? formatDate(user.registration_date)
                        : user.created_at 
                          ? formatDate(user.created_at)
                          : 'Unknown'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.updated_at || user.created_at || '')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.last_login || '')}
                    </p>
                  </div>
                </div>

                {user.communication_preferences && (
                  <div className="flex items-start space-x-2">
                    <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Preferences</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Language: {user.communication_preferences.preferred_language?.toUpperCase() || 'EN'}</p>
                        <p>Contact: {user.communication_preferences.communication_method || 'Email'}</p>
                        <div className="flex gap-1">
                          {user.communication_preferences.email_notifications && (
                            <Badge variant="outline" className="text-xs">Email</Badge>
                          )}
                          {user.communication_preferences.sms_notifications && (
                            <Badge variant="outline" className="text-xs">SMS</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {user.banking_info?.payment_method && (
                  <div className="flex items-start space-x-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Payment Method</p>
                      <p className="text-sm text-muted-foreground">
                        {user.banking_info.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  </div>
                )}

                {user.notes && (
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Admin Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                        {user.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Referee Profile Information */}
          {user.is_referee && user.referee_profile && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Referee Profile
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Referee Type</p>
                    <Badge variant="default">
                      {user.referee_profile.referee_type?.name || 'Not Set'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Wage per Game</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      ${user.referee_profile.wage_amount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  
                  {user.referee_profile.evaluation_score && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Evaluation Score</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {user.referee_profile.evaluation_score}%
                      </p>
                    </div>
                  )}
                </div>
                
                {user.referee_profile.capabilities && user.referee_profile.capabilities.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {user.referee_profile.capabilities.map((capability) => (
                        <Badge key={capability.id} variant="outline" className="text-xs">
                          {capability.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">White Whistle</span>
                    <Badge variant={user.referee_profile.is_white_whistle ? 'default' : 'outline'}>
                      {user.referee_profile.is_white_whistle ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show White Whistle</span>
                    <Badge variant={user.referee_profile.show_white_whistle ? 'default' : 'outline'}>
                      {user.referee_profile.show_white_whistle ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </Button>
            <Button variant="outline">
              <Lock className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}