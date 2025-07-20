"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardOverview } from "@/components/dashboard-overview"
import { GameManagement } from "@/components/game-management"
import { RefereeManagement } from "@/components/referee-management"
import { CalendarView } from "@/components/calendar-view"
import { ProfileSettings } from "@/components/profile-settings"

export function AdminDashboard() {
  const [activeView, setActiveView] = useState("dashboard")

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardOverview />
      case "games":
        return <GameManagement />
      case "referees":
        return <RefereeManagement />
      case "calendar":
        return <CalendarView />
      case "profile":
        return <ProfileSettings />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} setActiveView={setActiveView} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">RefAssign Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">{renderContent()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
