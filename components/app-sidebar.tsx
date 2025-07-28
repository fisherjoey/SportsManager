"use client"

import { Calendar, Home, Users, GamepadIcon, User, LogOut, BellIcon as Whistle, Clock, Trophy, Shield, Zap, ChevronLeft, ChevronRight, CalendarClock, MapPin, ClipboardList, Settings, FileText, Bot } from "lucide-react"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

interface AppSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const { state, toggleSidebar } = useSidebar()

  const adminItems = [
    {
      title: "Dashboard",
      url: "dashboard",
      icon: Home,
    },
    {
      title: "League Management",
      url: "leagues",
      icon: Shield,
    },
    {
      title: "Tournament Generator",
      url: "tournaments",
      icon: Zap,
    },
    {
      title: "Game Management",
      url: "games",
      icon: GamepadIcon,
    },
    {
      title: "Assigning",
      url: "assigning",
      icon: ClipboardList,
    },
    {
      title: "AI Assignments",
      url: "ai-assignments",
      icon: Bot,
    },
    {
      title: "Teams & Locations",
      url: "locations",
      icon: MapPin,
    },
    {
      title: "Referees",
      url: "referees",
      icon: Users,
    },
    {
      title: "Calendar",
      url: "calendar",
      icon: Calendar,
    },
    {
      title: "Posts",
      url: "posts",
      icon: FileText,
    },
  ]

  const refereeItems = [
    {
      title: "Dashboard",
      url: "dashboard",
      icon: Home,
    },
    {
      title: "My Assignments",
      url: "assignments",
      icon: Clock,
    },
    {
      title: "Available Games",
      url: "available",
      icon: Trophy,
    },
    {
      title: "Availability",
      url: "availability",
      icon: CalendarClock,
    },
    {
      title: "Calendar",
      url: "calendar",
      icon: Calendar,
    },
  ]

  const items = user?.role === "admin" ? adminItems : refereeItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Whistle className="h-6 w-6 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-bold">RefAssign</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="ml-auto h-7 w-7 group-data-[collapsible=icon]:hidden"
          >
            {state === "expanded" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => setActiveView(item.url)} 
                    isActive={activeView === item.url}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveView("profile")} 
                  isActive={activeView === "profile"}
                  tooltip="Profile"
                >
                  <User />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setActiveView("organization-settings")} 
                    isActive={activeView === "organization-settings"}
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
      <SidebarFooter>
        <div className="p-2">
          <div className="mb-2 px-2 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <SidebarMenuButton 
            onClick={logout} 
            className="w-full justify-start bg-transparent border border-sidebar-border hover:bg-sidebar-accent"
            tooltip="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
