"use client"

import { Calendar, Home, Users, GamepadIcon, User, LogOut, BellIcon as Whistle, Clock, Trophy, Shield, Zap } from "lucide-react"

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
} from "@/components/ui/sidebar"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

interface AppSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const { user, logout } = useAuth()

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
      title: "Referees",
      url: "referees",
      icon: Users,
    },
    {
      title: "Calendar",
      url: "calendar",
      icon: Calendar,
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
      title: "Calendar",
      url: "calendar",
      icon: Calendar,
    },
  ]

  const items = user?.role === "admin" ? adminItems : refereeItems

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Whistle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">RefAssign</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={() => setActiveView(item.url)} isActive={activeView === item.url}>
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
                <SidebarMenuButton onClick={() => setActiveView("profile")} isActive={activeView === "profile"}>
                  <User />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <div className="mb-2 px-2">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="w-full bg-transparent">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
