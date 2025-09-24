'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Eye, Trash2, DollarSign, Phone, Mail, User } from 'lucide-react'
import { useState } from 'react'

interface Role {
  id: string
  name: string
  description?: string
}

interface RefereeProfile {
  id: string
  wage_amount: number
  evaluation_score?: number
  is_white_whistle: boolean
  show_white_whistle: boolean
  referee_type: Role | null
  capabilities: Role[]
  computed_fields: {
    type_config: any
    capability_count: number
    is_senior: boolean
    is_junior: boolean
    is_rookie: boolean
  }
}

interface User {
  id: string
  name: string
  email: string
  phone?: string
  roles?: Role[]
  role?: string
  is_available?: boolean
  is_active?: boolean
  is_referee?: boolean
  referee_profile?: RefereeProfile | null
  year_started_refereeing?: number
  created_at: string
  updated_at?: string
}

interface UserMobileCardProps {
  user: User
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onEditUser?: (user: User) => void
  onViewProfile?: (user: User) => void
  onDeleteUser?: (userId: string) => void
  onWageUpdate?: (userId: string, wage: number) => void
  onTypeChange?: (userId: string, type: string) => void
  showRefereeColumns?: boolean
}

export function UserMobileCard({
  user,
  isSelected,
  onSelect,
  onEditUser,
  onViewProfile,
  onDeleteUser,
  onWageUpdate,
  onTypeChange,
  showRefereeColumns = false
}: UserMobileCardProps) {
  const [editingWage, setEditingWage] = useState(false)
  const [wageValue, setWageValue] = useState(user.referee_profile?.wage_amount || 0)
  
  const isActive = user.is_active !== false
  const roles = user.roles?.map(r => r.name) || [user.role] || ['User']
  const refereeType = user.referee_profile?.referee_type?.name || 'N/A'
  const currentWage = user.referee_profile?.wage_amount || 0
  const isAvailable = user.is_available !== false

  const handleWageSave = () => {
    if (onWageUpdate) {
      onWageUpdate(user.id, wageValue)
    }
    setEditingWage(false)
  }

  const handleWageCancel = () => {
    setWageValue(currentWage)
    setEditingWage(false)
  }

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              aria-label={`Select ${user.name || user.email}`}
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm">{user.name || 'N/A'}</h3>
                <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {onViewProfile && (
                <DropdownMenuItem onClick={() => onViewProfile(user)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEditUser && (
                <DropdownMenuItem onClick={() => onEditUser(user)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit User
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDeleteUser && (
                <DropdownMenuItem 
                  onClick={() => onDeleteUser(user.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{user.email}</span>
          </div>
          
          {user.phone && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{user.phone}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {roles.map((role, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>

          {showRefereeColumns && (
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Type:</span>
                {onTypeChange ? (
                  <Select
                    value={refereeType}
                    onValueChange={(value) => onTypeChange(user.id, value)}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rookie Referee">Rookie</SelectItem>
                      <SelectItem value="Junior Referee">Junior</SelectItem>
                      <SelectItem value="Senior Referee">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {refereeType}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wage:</span>
                {editingWage ? (
                  <div className="flex items-center space-x-1">
                    <Input
                      type="number"
                      value={wageValue}
                      onChange={(e) => setWageValue(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                      step="0.01"
                    />
                    <Button size="sm" onClick={handleWageSave} className="h-8 px-2">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleWageCancel} className="h-8 px-2">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium">${currentWage.toFixed(2)}</span>
                    {onWageUpdate && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setEditingWage(true)}
                        className="h-6 w-6 p-0"
                      >
                        <DollarSign className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Available:</span>
                <Badge variant={isAvailable ? 'default' : 'secondary'} className="text-xs">
                  {isAvailable ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}