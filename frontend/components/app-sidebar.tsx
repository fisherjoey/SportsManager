'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Calendar, Home, Users, GamepadIcon, User, LogOut, Zap as Whistle, Clock, Trophy, Shield, Zap, ChevronLeft, ChevronRight, CalendarClock, MapPin, ClipboardList, Settings, FileText, Bot, Moon, Sun, DollarSign, Receipt, BarChart3, Building2, FileX, Users2, Package, Shield as ShieldIcon, Workflow, Database, MessageSquare, Plus, CheckCircle, BookOpen, UserCheck, Grid3X3, Pin, PinOff, MoreVertical, Key, Layout, Bell, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from 'next-themes'

import { NotificationsBell } from '@/components/notifications-bell'
import { usePageAccess } from '@/hooks/usePageAccess'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'
import { useAuth } from '@/components/auth-provider'
import { usePermissions } from '@/hooks/usePermissions'
// Legacy RBAC config removed - now using database-driven access control
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const { hasAnyPermission } = usePermissions()
  const { hasPageAccess, accessiblePages } = usePageAccess()
  const { state, toggleSidebar, setOpen } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isPinned, setIsPinned] = useState<boolean>(false)
  const [interactionMode, setInteractionMode] = useState<'hover' | 'click'>('hover')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const sidebarRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const hoverIntentRef = useRef<boolean>(false)
  const lastClickTime = useRef<number>(0)
  const hoveredItemRef = useRef<HTMLElement | null>(null)
  const mouseYRef = useRef<number>(0)

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedPinned = localStorage.getItem('sidebar-pinned')
    const savedMode = localStorage.getItem('sidebar-mode') as 'hover' | 'click'
    const savedCollapsed = localStorage.getItem('sidebar-collapsed-sections')

    if (savedPinned === 'true') {
      setIsPinned(true)
      if (state === 'collapsed') {
        setOpen(true)
      }
    }

    if (savedMode) {
      setInteractionMode(savedMode)
    }

    if (savedCollapsed) {
      try {
        setCollapsedSections(JSON.parse(savedCollapsed))
      } catch (e) {
        console.error('Failed to parse collapsed sections:', e)
      }
    }
  }, [])

  // Handle scroll indicators
  const checkScroll = useCallback(() => {
    if (!contentRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current
    const hasScroll = scrollHeight > clientHeight
    setShowScrollTop(hasScroll && scrollTop > 5)
    setShowScrollBottom(hasScroll && scrollTop < scrollHeight - clientHeight - 5)
  }, [])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    checkScroll()
    content.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      content.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  // Hybrid approach with hover intent detection
  const handleMouseEnter = (e: React.MouseEvent) => {
    // Clear any pending collapse
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Only auto-expand on hover if in hover mode, not pinned, and actually hovering
    if (state === 'collapsed' && !isPinned && interactionMode === 'hover') {
      // Use hover intent - wait 150ms to confirm user wants to open
      hoverIntentRef.current = true
      setTimeout(() => {
        if (hoverIntentRef.current && state === 'collapsed' && !isPinned) {
          setOpen(true)
          // After expansion, scroll to maintain mouse position
          setTimeout(() => {
            if (hoveredItemRef.current && contentRef.current) {
              const item = hoveredItemRef.current
              const container = contentRef.current
              const itemRect = item.getBoundingClientRect()
              const containerRect = container.getBoundingClientRect()
              
              // Calculate the offset to keep item at same position
              const targetScroll = item.offsetTop - (itemRect.top - containerRect.top)
              container.scrollTop = targetScroll
            }
          }, 0)
        }
      }, 150)
    }
  }

  const handleMouseLeave = () => {
    hoverIntentRef.current = false
    
    // Only auto-collapse if not pinned and in hover mode
    if (state === 'expanded' && !isPinned && interactionMode === 'hover') {
      timeoutRef.current = setTimeout(() => {
        setOpen(false)
      }, 800) // Generous delay for better UX
    }
  }

  // Handle manual pin toggle
  const handlePinToggle = () => {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    localStorage.setItem('sidebar-pinned', newPinned.toString())
    
    if (newPinned && state === 'collapsed') {
      setOpen(true)
    } else if (!newPinned && state === 'expanded') {
      // Give visual feedback by briefly collapsing
      setTimeout(() => setOpen(false), 300)
    }
  }

  // Track mouse position for scroll adjustment
  const handleItemMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    mouseYRef.current = e.clientY
    hoveredItemRef.current = e.currentTarget
  }

  // Sports Management Section - Core Operations
  const sportsManagementItems = [
    {
      title: 'Dashboard',
      url: 'dashboard',
      icon: Home
    },
    {
      title: 'Calendar',
      url: 'calendar',
      icon: Calendar
    },
    {
      title: 'Game Management',
      url: 'games',
      icon: GamepadIcon
    },
    {
      title: 'Teams & Locations',
      url: 'locations',
      icon: MapPin
    },
    {
      title: 'League Management',
      url: 'leagues',
      icon: Shield
    },
    {
      title: 'Tournament Generator',
      url: 'tournaments',
      icon: Zap
    },
    {
      title: 'Communications',
      url: 'communications',
      icon: MessageSquare
    },
    {
      title: 'Resource Centre',
      url: 'resources',
      icon: BookOpen
    }
  ]

  // Assignor Management Section - For users with assignor role
  const assignorItems = [
    {
      title: 'Assignment Board',
      url: 'assigning',
      icon: ClipboardList
    },
    {
      title: 'AI Assignments',
      url: 'ai-assignments', 
      icon: Bot
    },
    {
      title: 'Referee Management',
      url: 'referees',
      icon: Users
    }
  ]

  // Financial Management Section - DEACTIVATED (Coming in next month)
  // const financialItems = [
  //   {
  //     title: 'Financial Dashboard',
  //     url: 'financial-dashboard',
  //     icon: DollarSign
  //   },
  //   {
  //     title: 'Receipt Processing',
  //     url: 'financial-receipts',
  //     icon: Receipt
  //   },
  //   {
  //     title: 'Budget Management',
  //     url: 'financial-budgets',
  //     icon: BarChart3
  //   },
  //   {
  //     title: 'Expense Management',
  //     url: 'financial-expenses',
  //     icon: FileX
  //   },
  //   {
  //     title: 'Expense Approvals',
  //     url: 'financial-expense-approvals',
  //     icon: CheckCircle
  //   },
  //   {
  //     title: 'Financial Reports',
  //     url: 'financial-reports',
  //     icon: FileText
  //   }
  // ]
  const financialItems = [] // Temporarily empty - coming next month

  // Organization Management Section
  const organizationItems = [
    {
      title: 'Organizational Dashboard',
      url: 'organization-dashboard',
      icon: Building2
    },
    {
      title: 'Employee Management',
      url: 'organization-employees',
      icon: Users2
    },
    {
      title: 'Asset Tracking',
      url: 'organization-assets',
      icon: Package
    },
    {
      title: 'Document Repository',
      url: 'organization-documents',
      icon: FileText
    },
    {
      title: 'Compliance Tracking',
      url: 'organization-compliance',
      icon: ShieldIcon
    }
  ]

  // Analytics Section
  const analyticsItems = [
    {
      title: 'Analytics Dashboard',
      url: 'analytics-dashboard',
      icon: BarChart3
    }
  ]

  // Administration Section
  const administrationItems = [
    {
      title: 'Access Control',
      url: 'admin-access-control',
      icon: ShieldIcon
    },
    {
      title: 'Broadcast Notification',
      url: 'admin/notifications/broadcast',
      icon: Bell
    },
    {
      title: 'Workflow Management',
      url: 'admin-workflows',
      icon: Workflow
    },
    {
      title: 'Security & Audit',
      url: 'admin-security',
      icon: Key
    },
    {
      title: 'System Settings',
      url: 'admin-settings',
      icon: Database
    }
  ]

  const refereeItems = [
    {
      title: 'Dashboard',
      url: 'dashboard',
      icon: Home
    },
    {
      title: 'My Assignments',
      url: 'assignments',
      icon: Clock
    },
    {
      title: 'Available Games',
      url: 'available',
      icon: Trophy
    },
    {
      title: 'Availability',
      url: 'availability',
      icon: CalendarClock
    },
    {
      title: 'My Expenses',
      url: 'expenses',
      icon: Receipt
    },
    {
      title: 'Calendar',
      url: 'calendar',
      icon: Calendar
    },
    {
      title: 'Resource Centre',
      url: 'resources',
      icon: BookOpen
    }
  ]

  // Filter navigation items based on database permissions
  const filterItemsByPermissions = (items: any[]) => {
    return items.filter(item => {
      // Use database-driven access check
      return hasPageAccess(item.url)
    })
  }

  // Apply database-driven permission filter only
  const filterNavigationItems = (items: any[]) => {
    return filterItemsByPermissions(items)
  }

  // Toggle section collapsed state
  const toggleSection = (sectionName: string) => {
    const newCollapsedSections = {
      ...collapsedSections,
      [sectionName]: !collapsedSections[sectionName]
    }
    setCollapsedSections(newCollapsedSections)
    localStorage.setItem('sidebar-collapsed-sections', JSON.stringify(newCollapsedSections))
  }

  // Build navigation sections based on user role and permissions
  const buildNavigationSections = () => {
    if (!user) return []
    
    const sections = []
    
    // Sports Management - available to most roles
    const filteredSportsItems = filterNavigationItems(sportsManagementItems)
    if (filteredSportsItems.length > 0) {
      sections.push({ section: 'Sports Management', items: filteredSportsItems })
    }
    
    // Assignor Management - for assignor-related roles
    const filteredAssignorItems = filterNavigationItems(assignorItems)
    if (filteredAssignorItems.length > 0) {
      sections.push({ section: 'Assignor Management', items: filteredAssignorItems })
    }
    
    // Financial Management - when enabled
    const filteredFinancialItems = filterNavigationItems(financialItems)
    if (filteredFinancialItems.length > 0) {
      sections.push({ section: 'Financial Management', items: filteredFinancialItems })
    }
    
    // Organization - for managers and admin
    const filteredOrgItems = filterNavigationItems(organizationItems)
    if (filteredOrgItems.length > 0) {
      sections.push({ section: 'Organization', items: filteredOrgItems })
    }
    
    // Analytics - for roles with report access
    const filteredAnalyticsItems = filterNavigationItems(analyticsItems)
    if (filteredAnalyticsItems.length > 0) {
      sections.push({ section: 'Analytics', items: filteredAnalyticsItems })
    }
    
    // Administration - for admin roles
    const filteredAdminItems = filterNavigationItems(administrationItems)
    if (filteredAdminItems.length > 0) {
      sections.push({ section: 'Administration', items: filteredAdminItems })
    }
    
    return sections
  }
  
  const navigationSections = buildNavigationSections()

  return (
    <Sidebar 
      collapsible="icon" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col h-screen transition-none"
      data-no-transition="true"
    >
      <SidebarHeader className="border-b border-sidebar-border flex-shrink-0 h-16">
        <div className="flex items-center justify-between gap-3 px-6 h-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <img
              src="/sportsync-icon.svg"
              alt="SyncedSport Icon"
              className="h-7 w-7 object-contain transition-all duration-150 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6"
            />
            <div className="group-data-[collapsible=icon]:hidden overflow-hidden transition-all duration-150">
              <h2 className="text-lg font-bold text-foreground leading-none">SyncedSport</h2>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="group-data-[collapsible=icon]:hidden p-1.5 rounded-md hover:bg-sidebar-accent transition-all duration-100"
                title="Sidebar settings"
              >
                <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handlePinToggle}>
                {isPinned ? 
                  <Pin className="h-4 w-4 mr-2 text-primary" /> : 
                  <PinOff className="h-4 w-4 mr-2" />
                }
                <span>{isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const newMode = interactionMode === 'hover' ? 'click' : 'hover'
                setInteractionMode(newMode)
                localStorage.setItem('sidebar-mode', newMode)
                toast({
                  title: `Switched to ${newMode} mode`,
                  description: newMode === 'click' 
                    ? 'Click icons to expand sidebar, double-click to pin' 
                    : 'Hover over sidebar to expand automatically'
                })
              }}>
                {interactionMode === 'hover' ? 
                  <Clock className="h-4 w-4 mr-2" /> : 
                  <GamepadIcon className="h-4 w-4 mr-2" />
                }
                <span>Mode: {interactionMode === 'hover' ? 'Auto-expand' : 'Click'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? 
                  <Sun className="h-4 w-4 mr-2" /> : 
                  <Moon className="h-4 w-4 mr-2" />
                }
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>
      <SidebarContent
        ref={contentRef}
        className="px-0 pt-3 pb-2 overflow-y-scroll overflow-x-hidden relative flex-grow min-h-0 max-h-full [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-sidebar-border/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-sidebar-border group-data-[collapsible=icon]:[&::-webkit-scrollbar]:w-[3px]"
      >
        {/* Scroll indicators - subtle gradients */}
        {showScrollTop && (
          <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-sidebar via-sidebar/80 to-transparent pointer-events-none z-10 -mb-6" />
        )}
        {showScrollBottom && (
          <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent pointer-events-none z-10 -mt-6" />
        )}
        {navigationSections.length > 0 ? (
          <>
            {navigationSections.map((section) => {
              const isCollapsed = collapsedSections[section.section]
              return (
                <SidebarGroup key={section.section}>
                  <div
                    className="flex items-center justify-between px-3 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center cursor-pointer hover:bg-sidebar-accent/50 transition-colors rounded-md mx-1"
                    onClick={() => {
                      if (state !== 'collapsed') {
                        toggleSection(section.section)
                      }
                    }}
                  >
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden cursor-pointer m-0 p-0">
                      {section.section}
                    </SidebarGroupLabel>
                    {state !== 'collapsed' && (
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSection(section.section)
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {!isCollapsed && (
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-0">
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                          onMouseEnter={(e) => {
                            hoveredItemRef.current = e.currentTarget
                          }}
                          onClick={() => {
                            // In click mode when collapsed, expand sidebar on icon click
                            if (state === 'collapsed' && interactionMode === 'click') {
                              const now = Date.now()
                              // Double-click detection (within 500ms)
                              if (now - lastClickTime.current < 500) {
                                // Double-click: toggle pin
                                handlePinToggle()
                              } else {
                                // Single click: expand temporarily
                                setOpen(true)
                                // Auto-collapse after 5 seconds if not pinned
                                if (!isPinned) {
                                  setTimeout(() => {
                                    if (!isPinned) setOpen(false)
                                  }, 5000)
                                }
                              }
                              lastClickTime.current = now
                            }
                            setActiveView(item.url)
                          }} 
                          isActive={activeView === item.url}
                          tooltip={state === 'collapsed' ? `${item.title}${interactionMode === 'click' ? ' (Double-click to pin)' : ''}` : item.title}
                          className="relative h-10 md:h-8 px-3 text-[15px] md:text-[14px] font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold data-[active=true]:border-primary data-[active=true]:border-l-2 rounded-none transition-colors duration-100 justify-start touch-manipulation group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-8"
                        >
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground group-data-[active=true]:text-accent-foreground group-data-[collapsible=icon]:mr-0" />
                          <span className="truncate text-left group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
                  )}
              </SidebarGroup>
              )
            })}
          </>
        ) : (
          // If no sections available, show a basic menu for referee role
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0">
                {filterNavigationItems(refereeItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => {
                        // In click mode when collapsed, expand sidebar on icon click
                        if (state === 'collapsed' && interactionMode === 'click') {
                          const now = Date.now()
                          // Double-click detection (within 500ms)
                          if (now - lastClickTime.current < 500) {
                            // Double-click: toggle pin
                            handlePinToggle()
                          } else {
                            // Single click: expand temporarily
                            setOpen(true)
                            // Auto-collapse after 5 seconds if not pinned
                            if (!isPinned) {
                              setTimeout(() => {
                                if (!isPinned) setOpen(false)
                              }, 5000)
                            }
                          }
                          lastClickTime.current = now
                        }
                        setActiveView(item.url)
                      }} 
                      isActive={activeView === item.url}
                      tooltip={state === 'collapsed' ? `${item.title}${interactionMode === 'click' ? ' (Double-click to pin)' : ''}` : item.title}
                      className="relative h-10 md:h-8 px-3 text-[15px] md:text-[14px] font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold data-[active=true]:border-primary data-[active=true]:border-l-2 rounded-none transition-colors duration-100 justify-start touch-manipulation"
                    >
                      <item.icon className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground group-data-[active=true]:text-accent-foreground" />
                      <span className="truncate text-left">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onMouseEnter={(e) => {
                    hoveredItemRef.current = e.currentTarget
                  }}
                  onClick={() => setActiveView('profile')} 
                  isActive={activeView === 'profile'}
                  tooltip="Profile"
                  className="relative h-10 md:h-8 px-3 text-[15px] md:text-[14px] font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold data-[active=true]:border-primary data-[active=true]:border-l-2 rounded-none transition-colors duration-100 justify-start touch-manipulation group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-8"
                >
                  <User className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground group-data-[active=true]:text-accent-foreground group-data-[collapsible=icon]:mr-0" />
                  <span className="truncate text-left group-data-[collapsible=icon]:hidden">Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(user?.roles?.includes('Super Admin') || user?.roles?.includes('admin') || user?.role === 'admin') && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setActiveView('organization-settings')} 
                    isActive={activeView === 'organization-settings'}
                    tooltip="Organization Settings"
                    className="relative h-10 md:h-8 px-3 text-[15px] md:text-[14px] font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold data-[active=true]:border-primary data-[active=true]:border-l-2 rounded-none transition-colors duration-100 justify-start touch-manipulation group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-8"
                  >
                    <Settings className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground group-data-[active=true]:text-accent-foreground group-data-[collapsible=icon]:mr-0" />
                    <span className="truncate text-left group-data-[collapsible=icon]:hidden">Organization Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onMouseEnter={handleItemMouseMove}
                  onMouseMove={handleItemMouseMove}
                  onClick={logout}
                  tooltip="Sign Out"
                  className="relative h-10 md:h-8 px-3 text-[15px] md:text-[14px] font-normal text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold data-[active=true]:border-primary data-[active=true]:border-l-2 rounded-none transition-colors duration-100 justify-start touch-manipulation group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-8"
                >
                  <LogOut className="h-4 w-4 mr-3 flex-shrink-0 text-destructive/70 group-data-[collapsible=icon]:mr-0" />
                  <span className="truncate text-left group-data-[collapsible=icon]:hidden">Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
