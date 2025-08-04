'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useApi } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

function CompleteSignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const api = useApi()
  const {} = useAuth()
  const { toast } = useToast()

  const [invitation, setInvitation] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    postalCode: '',
    level: 'Rookie',
    maxDistance: 25
  })

  useEffect(() => {
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Invalid Link',
        description: 'This invitation link is invalid or missing.'
      })
      router.push('/')
      return
    }

    // Fetch invitation details
    api.getInvitation(token)
      .then(response => {
        setInvitation(response.data.invitation)
        setLoading(false)
      })
      .catch(() => {
        // console.error('Failed to fetch invitation:', error)
        toast({
          variant: 'destructive',
          title: 'Invalid Invitation',
          description: 'This invitation link is invalid or has expired.'
        })
        router.push('/')
      })
  }, [token, api, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'Passwords do not match.'
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.'
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await api.completeInvitation(token as string, {
        password: formData.password,
        phone: formData.phone || undefined,
        location: formData.location || undefined,
        postalCode: formData.postalCode || undefined,
        level: formData.level,
        maxDistance: formData.maxDistance
      })

      // Auto-login the user
      api.setToken(response.data.token)
      
      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully!'
      })

      // Redirect to appropriate dashboard
      if (response.data.user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/referee')
      }
    } catch {
      // console.error('Failed to complete signup:', error)
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: 'Failed to create your account. Please try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Complete Your Signup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome {invitation.first_name} {invitation.last_name}!
          </p>
          <p className="text-sm text-gray-600">
            Complete your {invitation.role} account setup
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Complete your profile information to finish setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              {invitation.role === 'referee' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City or area"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Certification Level</Label>
                    <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rookie">Rookie ($25/game)</SelectItem>
                        <SelectItem value="Junior">Junior ($35/game)</SelectItem>
                        <SelectItem value="Senior">Senior ($45/game)</SelectItem>
                      </SelectContent>
                    </Select>
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
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating Account...' : 'Complete Signup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CompleteSignupContent />
    </Suspense>
  )
}