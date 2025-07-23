"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { RefereeDashboardOverview } from "@/components/referee-dashboard-overview"
import { MyAssignments } from "@/components/my-assignments"
import { AvailableGames } from "@/components/available-games"
import { CalendarView } from "@/components/calendar-view"
import { ProfileSettings } from "@/components/profile-settings"
import { AvailabilityCalendar } from "@/components/availability-calendar"

export function RefereeDashboard() {
  const [activeView, setActiveView] = useState("dashboard")
  const { user } = useAuth()

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <RefereeDashboardOverview />
      case "assignments":
        return <MyAssignments />
      case "available":
        return <AvailableGames />
      case "availability":
        return <AvailabilityCalendar refereeId={user?.referee_id || ""} canEdit={true} />
      case "calendar":
        return <CalendarView />
      case "profile":
        return <ProfileSettings />
      default:
        return <RefereeDashboardOverview />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} setActiveView={setActiveView} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">My Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">{renderContent()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
