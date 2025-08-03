'use client'

import { useRef } from 'react'
import { Calendar, Home, Users, GamepadIcon, User, LogOut, Zap as Whistle, Clock, Trophy, Shield, Zap, ChevronLeft, ChevronRight, CalendarClock, MapPin, ClipboardList, Settings, FileText, Bot, Moon, Sun, DollarSign, Receipt, BarChart3, Building2, FileX, Users2, Package, Shield as ShieldIcon, Workflow, Database, MessageSquare, Plus, CheckCircle } from 'lucide-react'
import { useTheme } from 'next-themes'

import { NotificationsBell } from '@/components/notifications-bell'
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
import { Button } from '@/components/ui/button'

interface AppSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const { state, toggleSidebar, setOpen } = useSidebar()
  const { theme, setTheme } = useTheme()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-hide functionality with delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (state === 'collapsed') {
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (state === 'expanded') {
      timeoutRef.current = setTimeout(() => {
        setOpen(false)
      }, 200) // 200ms delay before auto-collapsing
    }
  }

  // Sports Management Section
  const sportsManagementItems = [
    {
      title: 'Dashboard',
      url: 'dashboard',
      icon: Home
    },
    {
      title: 'Game Management',
      url: 'games',
      icon: GamepadIcon
    },
    {
      title: 'Assigning',  
      url: 'assigning',
      icon: ClipboardList
    },
    {
      title: 'AI Assignments',
      url: 'ai-assignments', 
      icon: Bot
    },
    {
      title: 'Referees',
      url: 'referees',
      icon: Users
    },
    {
      title: 'Calendar',
      url: 'calendar',
      icon: Calendar
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
      title: 'Posts',
      url: 'posts',
      icon: FileText
    }
  ]

  // Financial Management Section
  const financialItems = [
    {
      title: 'Financial Dashboard',
      url: 'financial-dashboard',
      icon: DollarSign
    },
    {
      title: 'Receipt Processing',
      url: 'financial-receipts',
      icon: Receipt
    },
    {
      title: 'Budget Management',
      url: 'financial-budgets',
      icon: BarChart3
    },
    {
      title: 'Expense Management',
      url: 'financial-expenses',
      icon: FileX
    },
    {
      title: 'Expense Approvals',
      url: 'financial-expense-approvals',
      icon: CheckCircle
    },
    {
      title: 'Financial Reports',
      url: 'financial-reports',
      icon: FileText
    }
  ]

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
      title: 'Workflow Management',
      url: 'admin-workflows',
      icon: Workflow
    },
    {
      title: 'Security & Audit',
      url: 'admin-security',
      icon: ShieldIcon
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
    }
  ]

  const allAdminItems = user?.role === 'admin' ? [
    { section: 'Sports Management', items: sportsManagementItems },
    { section: 'Financial Management', items: financialItems },
    { section: 'Organization', items: organizationItems },
    { section: 'Analytics', items: analyticsItems },
    { section: 'Administration', items: administrationItems }
  ] : null

  return (
    <Sidebar 
      collapsible="icon" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-6 py-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <img 
              src="/sportsync-icon.png" 
              alt="SyncedSport Icon" 
              className="h-7 w-7 object-contain transition-all duration-150 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6"
            />
            <div className="group-data-[collapsible=icon]:hidden overflow-hidden transition-all duration-150">
              <h2 className="text-lg font-bold text-foreground">SyncedSport</h2>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="capitalize">{user?.email}</span>
            </div>
            <NotificationsBell />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-0 py-0">
        {user?.role === 'admin' ? (
          <>
            {allAdminItems?.map((section) => (
              <SidebarGroup key={section.section}>
                <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.section}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0">
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          onClick={() => setActiveView(item.url)} 
                          isActive={activeView === item.url}
                          tooltip={item.title}
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
            ))}
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0">
                {refereeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => setActiveView(item.url)} 
                      isActive={activeView === item.url}
                      tooltip={item.title}
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
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveView('profile')} 
                  isActive={activeView === 'profile'}
                  tooltip="Profile"
                >
                  <User />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setActiveView('organization-settings')} 
                    isActive={activeView === 'organization-settings'}
                    tooltip="Organization Settings"
                  >
                    <Settings />
                    <span>Organization Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-3">
          <div className="space-y-1 group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 px-3 text-[15px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors duration-100"
              tooltip={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px] mr-3 text-muted-foreground" /> : <Moon className="h-[18px] w-[18px] mr-3 text-muted-foreground" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </SidebarMenuButton>
            <SidebarMenuButton 
              onClick={logout} 
              className="h-9 px-3 text-[15px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors duration-100"
              tooltip="Sign Out"
            >
              <LogOut className="h-[18px] w-[18px] mr-3 text-muted-foreground" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </div>
          <div className="mt-3 px-3 py-2 group-data-[collapsible=icon]:hidden">
            <button
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-100"
              onClick={toggleSidebar}
            >
              <ChevronLeft className="h-3 w-3 text-muted-foreground" />
              <span>Collapse sidebar</span>
            </button>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
