'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Home,
  Shield,
  Users,
  FileText,
  BarChart3,
  Activity,
  Wifi,
  Target,
  Scale,
  MapPin,
  Cloud,
  Code,
  Lock,
  Database,
  Globe,
  Settings,
  LogOut,
  User,
  Calendar,
  GamepadIcon,
  ClipboardList,
  Bot,
  MessageSquare,
  BookOpen,
  Trophy,
  Clock,
  CalendarClock,
  Receipt,
  DollarSign,
  Building2,
  Users2,
  Package,
  Workflow,
  Key,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { usePageAccess } from '@/hooks/usePageAccess'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: 'Beta' | 'New'
  expandable?: boolean
  children?: NavItem[]
}

interface SidebarSection {
  title?: string
  icon?: React.ComponentType<{ className?: string }>
  items: NavItem[]
  expandable?: boolean
}

interface SyncedSportSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
  className?: string
}

export function SyncedSportSidebar({ activeView, setActiveView, className }: SyncedSportSidebarProps) {
  const { user, logout } = useAuth()
  const { hasPageAccess } = usePageAccess()
  const { state, toggleSidebar, setOpen } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Dashboard', 'Scheduling', 'Assignments']))
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  // Use the sidebar state from context
  const isCollapsed = state === 'collapsed'

  // Handle toggle using the existing sidebar system
  const handleToggleCollapse = () => {
    toggleSidebar()
  }

  // Update the CSS variable for main content margin
  React.useEffect(() => {
    const root = document.documentElement
    if (isCollapsed && !isHovering) {
      root.style.setProperty('--sidebar-current-width', '3.5rem')
    } else {
      root.style.setProperty('--sidebar-current-width', '15rem')
    }
  }, [isCollapsed, isHovering])

  // Handle hover expand (only when collapsed)
  const handleMouseEnter = () => {
    if (isCollapsed) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      setIsHovering(true)
    }
  }

  const handleMouseLeave = () => {
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(false)
      }, 300)
    }
  }

  const toggleExpand = (url: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(url)) {
      newExpanded.delete(url)
    } else {
      newExpanded.add(url)
    }
    setExpandedItems(newExpanded)
  }

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle)
    } else {
      newExpanded.add(sectionTitle)
    }
    setExpandedSections(newExpanded)
  }

  // Define navigation sections based on user permissions
  const dashboardItems: NavItem[] = [
    { title: 'Overview', url: 'dashboard', icon: Home },
    { title: 'Activity Feed', url: 'activity', icon: Activity },
    { title: 'Notifications', url: 'notifications', icon: MessageSquare },
  ]

  const schedulingItems: NavItem[] = [
    { title: 'Calendar View', url: 'calendar', icon: Calendar },
    { title: 'Game Schedule', url: 'games', icon: GamepadIcon },
    { title: 'Availability Management', url: 'availability', icon: CalendarClock },
    { title: 'Blackout Dates', url: 'blackouts', icon: Clock },
  ]

  const leagueItems: NavItem[] = [
    { title: 'Leagues', url: 'leagues', icon: Shield },
    { title: 'Divisions', url: 'divisions', icon: Trophy },
    { title: 'Teams', url: 'teams', icon: Users2 },
    { title: 'Venues & Fields', url: 'locations', icon: MapPin },
    { title: 'Seasons', url: 'seasons', icon: Calendar },
  ]

  const assignmentItems: NavItem[] = [
    { title: 'Assignment Board', url: 'assigning', icon: ClipboardList },
    { title: 'AI Auto-Assign', url: 'ai-assignments', icon: Bot, badge: 'Beta' },
    { title: 'Conflict Resolution', url: 'conflicts', icon: Scale },
    { title: 'Assignment History', url: 'assignment-history', icon: Clock },
  ]

  const refereeItems: NavItem[] = [
    { title: 'Referee Directory', url: 'referees', icon: Users },
    { title: 'Certifications', url: 'certifications', icon: Shield },
    { title: 'Performance Reviews', url: 'performance', icon: Target },
    { title: 'Mentorship Program', url: 'mentorship', icon: Users2 },
    { title: 'Training Resources', url: 'training', icon: BookOpen },
  ]

  const financialItems: NavItem[] = [
    { title: 'Payroll', url: 'payroll', icon: DollarSign },
    { title: 'Invoices', url: 'invoices', icon: Receipt },
    { title: 'Payment History', url: 'payments', icon: Clock },
    { title: 'Budget Reports', url: 'budget', icon: BarChart3 },
  ]

  const communicationItems: NavItem[] = [
    { title: 'Announcements', url: 'announcements', icon: MessageSquare },
    { title: 'Email Templates', url: 'email-templates', icon: FileText },
    { title: 'SMS Notifications', url: 'sms', icon: MessageSquare },
    { title: 'Broadcast Messages', url: 'broadcast', icon: Wifi },
  ]

  const tournamentItems: NavItem[] = [
    { title: 'Tournament Creator', url: 'tournaments', icon: Zap },
    { title: 'Bracket Management', url: 'brackets', icon: Trophy },
    { title: 'Playoff Scheduler', url: 'playoffs', icon: Target },
    { title: 'Tournament History', url: 'tournament-history', icon: Clock },
  ]

  const reportsItems: NavItem[] = [
    { title: 'Game Reports', url: 'game-reports', icon: FileText },
    { title: 'Referee Reports', url: 'referee-reports', icon: ClipboardList },
    { title: 'League Statistics', url: 'statistics', icon: BarChart3 },
    { title: 'Custom Reports', url: 'custom-reports', icon: FileText },
  ]

  const integrationsItems: NavItem[] = [
    { title: 'API Access', url: 'api', icon: Code },
    { title: 'Webhooks', url: 'webhooks', icon: Zap },
    { title: 'Export Data', url: 'export', icon: Package },
    { title: 'Import Tools', url: 'import', icon: Database },
  ]

  const systemItems: NavItem[] = [
    { title: 'User Management', url: 'admin-users', icon: Users },
    { title: 'Roles & Permissions', url: 'admin-access-control', icon: Shield },
    { title: 'Audit Logs', url: 'admin-security', icon: Key },
    { title: 'System Settings', url: 'admin-settings', icon: Database },
    { title: 'Backup & Recovery', url: 'backup', icon: Shield },
  ]

  const accountItems: NavItem[] = [
    { title: 'My Profile', url: 'profile', icon: User },
    { title: 'Preferences', url: 'preferences', icon: Settings },
    { title: 'Security', url: 'security', icon: Lock },
    { title: 'Billing', url: 'billing', icon: DollarSign },
  ]

  // Filter items based on permissions
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => hasPageAccess(item.url))
  }

  // Build sections dynamically
  const buildSections = (): SidebarSection[] => {
    const sections: SidebarSection[] = []

    // Dashboard section
    const filteredDashboard = filterItems(dashboardItems)
    if (filteredDashboard.length > 0) {
      sections.push({ title: 'Dashboard', icon: Home, items: filteredDashboard, expandable: true })
    }

    // Scheduling section
    const filteredScheduling = filterItems(schedulingItems)
    if (filteredScheduling.length > 0) {
      sections.push({ title: 'Scheduling', icon: Calendar, items: filteredScheduling, expandable: true })
    }

    // League Management
    const filteredLeague = filterItems(leagueItems)
    if (filteredLeague.length > 0) {
      sections.push({ title: 'League Management', icon: Shield, items: filteredLeague, expandable: true })
    }

    // Assignments section
    const filteredAssignments = filterItems(assignmentItems)
    if (filteredAssignments.length > 0) {
      sections.push({ title: 'Assignments', icon: ClipboardList, items: filteredAssignments, expandable: true })
    }

    // Referee Management
    const filteredReferees = filterItems(refereeItems)
    if (filteredReferees.length > 0) {
      sections.push({ title: 'Referee Management', icon: Users, items: filteredReferees, expandable: true })
    }

    // Financial section
    const filteredFinancial = filterItems(financialItems)
    if (filteredFinancial.length > 0) {
      sections.push({ title: 'Financial', icon: DollarSign, items: filteredFinancial, expandable: true })
    }

    // Communication section
    const filteredComms = filterItems(communicationItems)
    if (filteredComms.length > 0) {
      sections.push({ title: 'Communications', icon: MessageSquare, items: filteredComms, expandable: true })
    }

    // Tournaments section
    const filteredTournaments = filterItems(tournamentItems)
    if (filteredTournaments.length > 0) {
      sections.push({ title: 'Tournaments', icon: Trophy, items: filteredTournaments, expandable: true })
    }

    // Reports & Analytics
    const filteredReports = filterItems(reportsItems)
    if (filteredReports.length > 0) {
      sections.push({ title: 'Reports & Analytics', icon: BarChart3, items: filteredReports, expandable: true })
    }

    // Integrations
    const filteredIntegrations = filterItems(integrationsItems)
    if (filteredIntegrations.length > 0) {
      sections.push({ title: 'Integrations', icon: Zap, items: filteredIntegrations, expandable: true })
    }

    // System Administration
    const filteredSystem = filterItems(systemItems)
    if (filteredSystem.length > 0) {
      sections.push({ title: 'System Admin', icon: Database, items: filteredSystem, expandable: true })
    }

    // Always show account section
    sections.push({ title: 'Account', icon: User, items: accountItems, expandable: true })

    return sections
  }

  const sections = buildSections()
  const shouldExpand = isCollapsed && isHovering

  return (
    <TooltipProvider>
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "fixed left-0 top-14 bottom-0 z-40",
          "bg-background border-r border-border",
          "transition-all duration-200 ease-in-out",
          isCollapsed && !shouldExpand ? "w-14" : "w-60",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto py-3 sidebar-scroll">
            {sections.map((section, sectionIdx) => {
              const isSectionExpanded = expandedSections.has(section.title || '')
              const isSingleItem = section.items.length === 1
              const shouldShowSection = isSingleItem || isSectionExpanded || (isCollapsed && !shouldExpand)

              return (
                <div key={sectionIdx} className={isCollapsed && !shouldExpand ? "" : "mb-4"}>
                  {/* Section title - clickable only if multiple items */}
                  {section.title && !isSingleItem && (
                    <button
                      onClick={() => section.title && toggleSection(section.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1 mb-1",
                        "hover:bg-accent/50 rounded-md transition-all duration-150",
                        "group",
                        isCollapsed && !shouldExpand ? "opacity-0 pointer-events-none" : "opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {section.icon && (
                          <section.icon className="w-3 h-3 flex-shrink-0" />
                        )}
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-inter">
                          {section.title}
                        </h3>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-muted-foreground transition-transform duration-200",
                          !isSectionExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  )}

                  {/* Section title for single items - not clickable */}
                  {section.title && isSingleItem && (
                    <div
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1 mb-1",
                        "cursor-default",
                        isCollapsed && !shouldExpand ? "opacity-0 pointer-events-none" : "opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {section.icon && (
                          <section.icon className="w-3 h-3 flex-shrink-0" />
                        )}
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-inter">
                          {section.title}
                        </h3>
                      </div>
                    </div>
                  )}

                  {/* Section items - show always for single items and when collapsed, only when section expanded for multi-item sections */}
                  {(isSingleItem || isSectionExpanded || (isCollapsed && !shouldExpand)) && (
                    <div className={isCollapsed && !shouldExpand ? "" : "space-y-0.5"}>
                      {section.items.map((item) => {
                    const isActive = activeView === item.url
                    const isExpanded = expandedItems.has(item.url)

                    const buttonContent = (
                      <button
                        onClick={() => {
                          if (item.expandable) {
                            toggleExpand(item.url)
                          } else {
                            setActiveView(item.url)
                          }
                        }}
                        className={cn(
                          "w-full flex items-center",
                          isCollapsed && !shouldExpand ? "justify-center" : "justify-between",
                          isCollapsed && !shouldExpand ? "h-9 px-1" : "h-9 px-3",
                          "text-[13px] font-medium",
                          "font-inter tracking-tight",
                          "transition-all duration-150",
                          "rounded-md",
                          isActive ? [
                            "bg-[#0051c3] text-white",
                            "hover:bg-[#0051c3]",
                          ] : isCollapsed && !shouldExpand ? [
                            "hover:bg-[#0051c3]/10",
                          ] : [
                            "text-muted-foreground",
                            "hover:bg-[#e5f2ff] dark:hover:bg-[#0051c3]/20",
                            "hover:text-foreground dark:hover:text-white"
                          ],
                          "group relative"
                        )}
                      >
                        {/* Active indicator - Cloudflare style */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-white dark:bg-white rounded-r" />
                        )}

                        <div className="flex items-center gap-3">
                          <item.icon className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isCollapsed && !shouldExpand
                              ? isActive ? "text-white" : "text-[#0051c3]"
                              : isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          {(!isCollapsed || shouldExpand) && (
                            <>
                              <span className="truncate">{item.title}</span>

                              {item.badge && (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 text-[10px] font-medium rounded",
                                    item.badge === 'Beta'
                                      ? "bg-[#3b82f6] text-white"
                                      : item.badge === 'New'
                                      ? "bg-[#0ea5e9] text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {item.expandable && (!isCollapsed || shouldExpand) && (
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 text-[#9ca3af] transition-transform duration-150",
                              isExpanded && "rotate-180"
                            )}
                          />
                        )}
                      </button>
                    )

                    // Wrap in tooltip when collapsed
                    if (isCollapsed && !shouldExpand) {
                      return (
                        <Tooltip key={item.url} delayDuration={0}>
                          <TooltipTrigger asChild>
                            {buttonContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return <div key={item.url}>{buttonContent}</div>
                  })}
                </div>
              )}
            </div>
          )
        })}

            {/* Sign out button */}
            <div className="mt-6 px-3">
              <button
                onClick={logout}
                className={cn(
                  "w-full flex items-center gap-3",
                  "h-9 px-3 text-[13px] font-medium",
                  "font-inter tracking-tight",
                  "text-muted-foreground",
                  "hover:bg-destructive/10 hover:text-destructive",
                  "transition-all duration-150",
                  "rounded-md"
                )}
              >
                <LogOut className="w-4 h-4 flex-shrink-0 text-destructive" />
                {(!isCollapsed || shouldExpand) && <span>Sign Out</span>}
              </button>
            </div>
          </div>

          {/* Collapse/Expand button */}
          <div className="border-t border-border">
            <button
              onClick={handleToggleCollapse}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "h-8 text-sm text-muted-foreground",
                "hover:bg-[#e5f2ff] dark:hover:bg-[#0051c3]/20",
                "hover:text-[#0051c3] dark:hover:text-white",
                "transition-all duration-150",
                "rounded-md"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <>
                  <ChevronLeft className="w-3 h-3" />
                  <span className="text-[12px]">Collapse sidebar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}