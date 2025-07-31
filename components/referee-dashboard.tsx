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
        if (user?.role === "admin") {
          return <div className="p-4 text-center text-muted-foreground">Availability management is only available for referee users. Use the Referees section to view individual referee availability.</div>
        }
        return user?.referee_id ? <AvailabilityCalendar refereeId={user.referee_id} canEdit={true} /> : <div className="p-4 text-center text-muted-foreground">Please complete your referee profile to manage availability.</div>
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
        <header className="flex h-16 md:h-16 shrink-0 items-center gap-2 border-b px-4 touch-manipulation">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-lg font-semibold">My Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">{renderContent()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
