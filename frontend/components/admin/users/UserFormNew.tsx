"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mail, User, Shield, Key, Check, X, Phone, MapPin, Calendar, Users, Building, CreditCard, Bell } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { User as UserType, CommunicationPreferences, BankingInfo } from '@/types/user'

interface Role {
  id: string
  name: string
  description?: string
}

// Using the full User type from types/user.ts

interface UserFormProps {
  user: UserType | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserForm({ user, open, onClose, onSuccess }: UserFormProps) {
  const [loading, setSaving] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [rolesOpen, setRolesOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<UserType>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    street_address: '',
    city: '',
    province_state: '',
    postal_zip_code: '',
    country: '',
    year_started_refereeing: undefined,
    certifications: [],
    specializations: [],
    availability_status: 'active',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    communication_preferences: {
      email_notifications: true,
      sms_notifications: false,
      preferred_language: 'en',
      communication_method: 'email'
    },
    banking_info: {
      account_holder_name: '',
      account_number: '',
      routing_number: '',
      bank_name: '',
      payment_method: 'direct_deposit'
    },
    is_active: true
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)
  const { toast } = useToast()

  // Fetch available roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await apiClient.getUserRoles()
        console.log('Roles response:', response)

        // The backend returns { success: true, data: { roles: [...] } }
        // But apiClient might already extract the nested structure
        let roles = []
        if (response?.success && response?.data?.roles) {
          roles = response.data.roles
        } else if (response?.data?.roles) {
          roles = response.data.roles
        } else if (response?.roles) {
          roles = response.roles
        } else if (Array.isArray(response)) {
          roles = response
        }

        console.log('Extracted roles:', roles)
        setAvailableRoles(roles)

        if (roles.length === 0) {
          toast({
            title: 'Warning',
            description: 'No roles found. Please contact system administrator.',
            variant: 'default'
          })
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error)
        
        // Show error to user
        toast({
          title: 'Error Loading Roles',
          description: 'Failed to load user roles. Some features may not work properly.',
          variant: 'destructive'
        })
        
        // Try fallback with error handling
        try {
          const token = localStorage.getItem('auth_token')
          if (!token) {
            throw new Error('No authentication token found')
          }
          
          const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/roles`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!fallbackResponse.ok) {
            throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}`)
          }
          
          const data = await fallbackResponse.json()
          console.log('Fallback response:', data)
          
          if (data.success && data.data?.roles) {
            setAvailableRoles(data.data.roles)
            toast({
              title: 'Roles Loaded',
              description: 'Successfully loaded roles using fallback method.',
              variant: 'default'
            })
          } else {
            throw new Error(data.error || 'Invalid response format')
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
          toast({
            title: 'Critical Error',
            description: 'Unable to load user roles. Please refresh the page or contact support.',
            variant: 'destructive'
          })
        }
      }
    }
    fetchRoles()
  }, [])

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        // Ensure all form fields are properly initialized
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        street_address: user.street_address || '',
        city: user.city || '',
        province_state: user.province_state || '',
        postal_zip_code: user.postal_zip_code || '',
        country: user.country || '',
        year_started_refereeing: user.year_started_refereeing,
        certifications: user.certifications || [],
        specializations: user.specializations || [],
        availability_status: user.availability_status || 'active',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
        notes: user.notes || '',
        communication_preferences: {
          email_notifications: user.communication_preferences?.email_notifications ?? true,
          sms_notifications: user.communication_preferences?.sms_notifications ?? false,
          preferred_language: user.communication_preferences?.preferred_language || 'en',
          communication_method: user.communication_preferences?.communication_method || 'email'
        },
        banking_info: {
          account_holder_name: user.banking_info?.account_holder_name || '',
          account_number: user.banking_info?.account_number || '',
          routing_number: user.banking_info?.routing_number || '',
          bank_name: user.banking_info?.bank_name || '',
          payment_method: user.banking_info?.payment_method || 'direct_deposit'
        },
        is_active: user.is_active !== false
      })
      // Set selected roles from user's current roles
      if (user.roles && user.roles.length > 0) {
        setSelectedRoles(user.roles.map(r => r.id))
      } else {
        setSelectedRoles([])
      }
      setPassword('')
      setConfirmPassword('')
      setSendWelcomeEmail(false)
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        street_address: '',
        city: '',
        province_state: '',
        postal_zip_code: '',
        country: '',
        year_started_refereeing: undefined,
        certifications: [],
        specializations: [],
        availability_status: 'active',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: '',
        communication_preferences: {
          email_notifications: true,
          sms_notifications: false,
          preferred_language: 'en',
          communication_method: 'email'
        },
        banking_info: {
          account_holder_name: '',
          account_number: '',
          routing_number: '',
          bank_name: '',
          payment_method: 'direct_deposit'
        },
        is_active: true
      })
      setSelectedRoles([])
      setPassword('')
      setConfirmPassword('')
      setSendWelcomeEmail(true)
    }
  }, [user])

  const validateForm = () => {
    if (!formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive'
      })
      return false
    }

    if (!formData.first_name) {
      toast({
        title: 'Validation Error',
        description: 'First name is required',
        variant: 'destructive'
      })
      return false
    }

    if (!formData.last_name) {
      toast({
        title: 'Validation Error',
        description: 'Last name is required',
        variant: 'destructive'
      })
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      })
      return false
    }

    // Phone validation if provided
    if (formData.phone && formData.phone.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive'
      })
      return false
    }

    // Password validation for new users
    if (!user && !password) {
      toast({
        title: 'Validation Error',
        description: 'Password is required for new users',
        variant: 'destructive'
      })
      return false
    }

    // Password match validation
    if (password && password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return false
    }

    // Role validation
    if (selectedRoles.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one role',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)
    
    try {
      const payload: any = {
        ...formData,
        roles: selectedRoles,  // Send role IDs
        send_welcome_email: sendWelcomeEmail
      }

      if (password) {
        payload.password = password
      }

      if (user) {
        // Update existing user
        await apiClient.updateUser(user.id!, payload)
        toast({
          title: 'User Updated',
          description: `${formData.name || formData.email} has been updated successfully`
        })
      } else {
        // Create new user
        await apiClient.createUser(payload)
        toast({
          title: 'User Created',
          description: `${formData.name || formData.email} has been created successfully`
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save user'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const getSelectedRoleNames = () => {
    return selectedRoles
      .map(id => availableRoles.find(r => r.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? 'Update comprehensive user information and settings' 
              : 'Add a new user with complete profile information'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      <User className="inline h-3 w-3 mr-1" />
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">
                      <User className="inline h-3 w-3 mr-1" />
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="inline h-3 w-3 mr-1" />
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Date of Birth
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="inline h-3 w-3 mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street_address">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    Street Address
                  </Label>
                  <Input
                    id="street_address"
                    value={formData.street_address || ''}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      <Building className="inline h-3 w-3 mr-1" />
                      City
                    </Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Toronto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province_state">
                      Province/State
                    </Label>
                    <Input
                      id="province_state"
                      value={formData.province_state || ''}
                      onChange={(e) => setFormData({ ...formData, province_state: e.target.value })}
                      placeholder="ON"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_zip_code">
                      Postal/Zip Code
                    </Label>
                    <Input
                      id="postal_zip_code"
                      value={formData.postal_zip_code || ''}
                      onChange={(e) => setFormData({ ...formData, postal_zip_code: e.target.value })}
                      placeholder="M5V 3A8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Canada"
                  />
                </div>

                <Separator />
                
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Emergency Contact
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">
                      Emergency Contact Name
                    </Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">
                      Emergency Contact Phone
                    </Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="professional" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="year_started_refereeing">
                    Year Started Refereeing
                  </Label>
                  <Input
                    id="year_started_refereeing"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={formData.year_started_refereeing || ''}
                    onChange={(e) => setFormData({ ...formData, year_started_refereeing: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="2020"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability_status">
                    Availability Status
                  </Label>
                  <Select 
                    value={formData.availability_status || 'active'} 
                    onValueChange={(value: 'active' | 'inactive' | 'on_break') => setFormData({ ...formData, availability_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_break">On Break</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications">
                    Certifications (comma-separated)
                  </Label>
                  <Textarea
                    id="certifications"
                    value={formData.certifications?.join(', ') || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      certifications: e.target.value.split(',').map(cert => cert.trim()).filter(Boolean)
                    })}
                    placeholder="Level 1, Level 2, Youth Referee"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specializations">
                    Specializations (comma-separated)
                  </Label>
                  <Textarea
                    id="specializations"
                    value={formData.specializations?.join(', ') || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      specializations: e.target.value.split(',').map(spec => spec.trim()).filter(Boolean)
                    })}
                    placeholder="Youth Games, Senior Games, Tournament Games"
                    rows={2}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-4 mt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Communication Preferences
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_notifications">
                      Email Notifications
                    </Label>
                    <Switch
                      id="email_notifications"
                      checked={formData.communication_preferences?.email_notifications ?? true}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        communication_preferences: { 
                          ...formData.communication_preferences!, 
                          email_notifications: checked 
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms_notifications">
                      SMS Notifications
                    </Label>
                    <Switch
                      id="sms_notifications"
                      checked={formData.communication_preferences?.sms_notifications ?? false}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        communication_preferences: { 
                          ...formData.communication_preferences!, 
                          sms_notifications: checked 
                        }
                      })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_language">
                      Preferred Language
                    </Label>
                    <Select 
                      value={formData.communication_preferences?.preferred_language || 'en'} 
                      onValueChange={(value: 'en' | 'fr' | 'es' | 'other') => setFormData({ 
                        ...formData, 
                        communication_preferences: { 
                          ...formData.communication_preferences!, 
                          preferred_language: value 
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="communication_method">
                      Preferred Contact Method
                    </Label>
                    <Select 
                      value={formData.communication_preferences?.communication_method || 'email'} 
                      onValueChange={(value: 'email' | 'phone' | 'sms') => setFormData({ 
                        ...formData, 
                        communication_preferences: { 
                          ...formData.communication_preferences!, 
                          communication_method: value 
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Banking Information
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_method">
                    Payment Method
                  </Label>
                  <Select 
                    value={formData.banking_info?.payment_method || 'direct_deposit'} 
                    onValueChange={(value: 'direct_deposit' | 'check' | 'cash' | 'e_transfer') => setFormData({ 
                      ...formData, 
                      banking_info: { 
                        ...formData.banking_info!, 
                        payment_method: value 
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                      <SelectItem value="e_transfer">E-Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.banking_info?.payment_method === 'direct_deposit' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="account_holder_name">
                        Account Holder Name
                      </Label>
                      <Input
                        id="account_holder_name"
                        value={formData.banking_info?.account_holder_name || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          banking_info: { 
                            ...formData.banking_info!, 
                            account_holder_name: e.target.value 
                          }
                        })}
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="account_number">
                          Account Number
                        </Label>
                        <Input
                          id="account_number"
                          value={formData.banking_info?.account_number || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            banking_info: { 
                              ...formData.banking_info!, 
                              account_number: e.target.value 
                            }
                          })}
                          placeholder="123456789"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="routing_number">
                          Routing Number
                        </Label>
                        <Input
                          id="routing_number"
                          value={formData.banking_info?.routing_number || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            banking_info: { 
                              ...formData.banking_info!, 
                              routing_number: e.target.value 
                            }
                          })}
                          placeholder="123456789"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">
                        Bank Name
                      </Label>
                      <Input
                        id="bank_name"
                        value={formData.banking_info?.bank_name || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          banking_info: { 
                            ...formData.banking_info!, 
                            bank_name: e.target.value 
                          }
                        })}
                        placeholder="Royal Bank of Canada"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="system" className="space-y-4 mt-4">

                <div className="space-y-2">
                  <Label>
                    <Shield className="inline h-3 w-3 mr-1" />
                    Roles <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={rolesOpen}
                        className="w-full justify-between"
                      >
                        {selectedRoles.length > 0 
                          ? getSelectedRoleNames()
                          : "Select roles..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search roles..." />
                        <CommandEmpty>No role found.</CommandEmpty>
                        <CommandGroup>
                          {availableRoles.map((role) => (
                            <CommandItem
                              key={role.id}
                              onSelect={() => toggleRole(role.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedRoles.includes(role.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{role.name}</div>
                                {role.description && (
                                  <div className="text-sm text-muted-foreground">{role.description}</div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedRoles.map(roleId => {
                      const role = availableRoles.find(r => r.id === roleId)
                      if (!role) return null
                      return (
                        <Badge key={roleId} variant="secondary">
                          {role.name}
                          <button
                            type="button"
                            onClick={() => toggleRole(roleId)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {(!user || password) && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        <Key className="inline h-3 w-3 mr-1" />
                        Password {!user && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={user ? "Leave blank to keep current" : "Enter password"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        <Key className="inline h-3 w-3 mr-1" />
                        Confirm Password {!user && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="active" className="flex items-center">
                    Account Active
                  </Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                {!user && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="welcome" className="flex items-center">
                      Send Welcome Email
                    </Label>
                    <Switch
                      id="welcome"
                      checked={sendWelcomeEmail}
                      onCheckedChange={setSendWelcomeEmail}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Admin Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal administrative notes about this user..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes are only visible to administrators with appropriate permissions.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}