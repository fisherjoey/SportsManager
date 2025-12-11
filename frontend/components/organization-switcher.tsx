'use client'

import { useState, useEffect } from 'react'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Organization {
  id: string
  name: string
  type?: string
  status?: 'active' | 'inactive'
}

interface OrganizationSwitcherProps {
  className?: string
  onOrganizationChange?: (organizationId: string) => void
}

/**
 * OrganizationSwitcher Component
 *
 * A dropdown component that allows users to switch between different organizations.
 * Displays the currently active organization and provides a searchable list of
 * available organizations. The selected organization is persisted in localStorage
 * and can trigger permission refreshes.
 *
 * @component
 * @example
 * ```tsx
 * <OrganizationSwitcher
 *   onOrganizationChange={(orgId) => console.log('Switched to:', orgId)}
 * />
 * ```
 */
export function OrganizationSwitcher({
  className,
  onOrganizationChange
}: OrganizationSwitcherProps) {
  const { user, refreshPermissions } = useAuth()
  const [open, setOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(false)

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations()
  }, [user])

  // Load organizations from API or mock data
  const loadOrganizations = async () => {
    if (!user) return

    setLoading(true)
    try {
      // TODO: Replace with actual API call when organization endpoints are available
      // const response = await apiClient.getUserOrganizations()

      // Mock organizations for now - replace with actual API call
      const mockOrganizations: Organization[] = [
        {
          id: 'org-1',
          name: 'Calgary Basketball Association',
          type: 'Sports League',
          status: 'active'
        },
        {
          id: 'org-2',
          name: 'Edmonton Volleyball League',
          type: 'Sports League',
          status: 'active'
        },
        {
          id: 'org-3',
          name: 'Alberta Sports Federation',
          type: 'Federation',
          status: 'active'
        }
      ]

      setOrganizations(mockOrganizations)

      // Load saved organization from localStorage
      const savedOrgId = localStorage.getItem('activeOrganizationId')
      if (savedOrgId) {
        const savedOrg = mockOrganizations.find(org => org.id === savedOrgId)
        if (savedOrg) {
          setCurrentOrganizationState(savedOrg)
        } else {
          // Default to first organization if saved one not found
          setCurrentOrganizationState(mockOrganizations[0])
        }
      } else if (mockOrganizations.length > 0) {
        // Default to first organization
        setCurrentOrganizationState(mockOrganizations[0])
        localStorage.setItem('activeOrganizationId', mockOrganizations[0].id)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle organization selection
  const handleOrganizationSelect = async (organization: Organization) => {
    setCurrentOrganizationState(organization)
    setOpen(false)

    // Save to localStorage
    localStorage.setItem('activeOrganizationId', organization.id)

    // Call optional callback
    if (onOrganizationChange) {
      onOrganizationChange(organization.id)
    }

    // Refresh permissions for new organization context
    try {
      await refreshPermissions()
    } catch (error) {
      console.error('Failed to refresh permissions:', error)
    }
  }

  if (!user || organizations.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select organization"
            className={cn(
              'w-full justify-between',
              !currentOrganization && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {currentOrganization?.name || 'Select organization...'}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Loading organizations...' : 'No organizations found.'}
              </CommandEmpty>
              <CommandGroup heading="Organizations">
                {organizations.map((organization) => (
                  <CommandItem
                    key={organization.id}
                    value={organization.name}
                    onSelect={() => handleOrganizationSelect(organization)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        currentOrganization?.id === organization.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">{organization.name}</div>
                      {organization.type && (
                        <div className="text-xs text-muted-foreground">
                          {organization.type}
                        </div>
                      )}
                    </div>
                    {organization.status === 'active' && (
                      <Badge variant="success" className="ml-auto text-xs">
                        Active
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
