'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [showPasswordToggle, setShowPasswordToggle] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError(null)

    const success = await login(email, password)

    if (success) {
      if (rememberMe) {
        localStorage.setItem('remembered_email', email)
      } else {
        localStorage.removeItem('remembered_email')
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.'
      })
    } else {
      setLoginError('Invalid email or password. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 650)

      toast({
        title: 'Login failed',
        description: 'Invalid email or password.',
        variant: 'destructive'
      })
    }

    setIsLoading(false)
  }

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('password')
    setShowDemoAccounts(false)
    // Don't show password toggle for auto-filled demo passwords
    setShowPasswordToggle(false)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setLoginError(null)
    // Only show toggle when user manually types (not autofill)
    setShowPasswordToggle(true)
  }

  const handlePasswordInput = () => {
    // Show toggle on any manual input interaction
    if (password.length > 0) {
      setShowPasswordToggle(true)
    }
  }

  const handlePasswordFocus = () => {
    // When field is focused, check if there's content to show toggle
    // Small delay to distinguish between autofill and manual entry
    setTimeout(() => {
      if (password.length > 0 && document.activeElement?.id === 'password') {
        setShowPasswordToggle(true)
      }
    }, 100)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className={cn(
        "w-full max-w-md transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-5",
        shake && "animate-shake"
      )}>
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 relative animate-in zoom-in-50 duration-500">
              <Image
                src="/sportsync-icon.svg"
                alt="SyncedSport Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">SyncedSport</CardTitle>
          <CardDescription>Sign in to your sports management account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" role="form" aria-label="Login form">
            {loginError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 animate-in fade-in-50 slide-in-from-top-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{loginError}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@refassign.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setLoginError(null)
                }}
                disabled={isLoading}
                required
                autoComplete="email"
                aria-label="Email address"
                aria-required="true"
                aria-invalid={!!loginError}
                className="transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  onInput={handlePasswordInput}
                  onFocus={handlePasswordFocus}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  aria-label="Password"
                  aria-required="true"
                  aria-invalid={!!loginError}
                  className={cn(
                    "transition-all",
                    showPasswordToggle && "pr-10"
                  )}
                />
                {showPasswordToggle && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-0.5"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer select-none"
              >
                Remember my email
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full transition-all"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <Collapsible
            open={showDemoAccounts}
            onOpenChange={setShowDemoAccounts}
            className="mt-6"
          >
            <CollapsibleTrigger className="w-full p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-sm font-medium text-left flex items-center justify-between group">
              <span>Demo Accounts</span>
              <span className={cn(
                "text-muted-foreground transition-transform",
                showDemoAccounts && "rotate-180"
              )}>▼</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Click any account to auto-fill the login form:
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin@test.com')}
                    className="w-full text-left p-2 rounded hover:bg-background transition-colors text-xs group"
                  >
                    <strong className="block text-foreground group-hover:text-primary">Admin</strong>
                    <span className="text-muted-foreground">admin@test.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin@cmba.ca')}
                    className="w-full text-left p-2 rounded hover:bg-background transition-colors text-xs group"
                  >
                    <strong className="block text-foreground group-hover:text-primary">CMBA Admin</strong>
                    <span className="text-muted-foreground">admin@cmba.ca</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin@refassign.com')}
                    className="w-full text-left p-2 rounded hover:bg-background transition-colors text-xs group"
                  >
                    <strong className="block text-foreground group-hover:text-primary">System Admin</strong>
                    <span className="text-muted-foreground">admin@refassign.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('referee@test.com')}
                    className="w-full text-left p-2 rounded hover:bg-background transition-colors text-xs group"
                  >
                    <strong className="block text-foreground group-hover:text-primary">Test Referee</strong>
                    <span className="text-muted-foreground">referee@test.com</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  <strong>Password for all accounts:</strong> password
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
}
