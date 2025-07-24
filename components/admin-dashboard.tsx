"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardOverview } from "@/components/dashboard-overview"
import { LeagueCreation } from "@/components/league-creation"
import { TournamentGenerator } from "@/components/tournament-generator"
import { GameManagement } from "@/components/game-management"
import { GameAssignmentBoard } from "@/components/game-assignment-board"
import { TeamsLocationsPage } from "@/components/teams-locations/teams-locations-page"
import { RefereeManagement } from "@/components/referee-management"
import { CalendarView } from "@/components/calendar-view"
import { ProfileSettings } from "@/components/profile-settings"
import OrganizationSettings from "@/components/organization-settings"
import { ChevronRight } from "lucide-react"

export function AdminDashboard() {
  const [activeView, setActiveView] = useState("dashboard")

  const getPageTitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Dashboard"
      case "leagues":
        return "League Management"
      case "tournaments":
        return "Tournament Generator"
      case "games":
        return "Games"
      case "assigning":
        return "Game Assignment"
      case "locations":
        return "Teams & Locations"
      case "referees":
        return "Referees"
      case "calendar":
        return "Calendar"
      case "profile":
        return "Profile"
      case "organization-settings":
        return "Organization Settings"
      default:
        return "Dashboard"
    }
  }

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardOverview />
      case "leagues":
        return <LeagueCreation />
      case "tournaments":
        return <TournamentGenerator />
      case "games":
        return <GameManagement />
      case "assigning":
        return <GameAssignmentBoard />
      case "locations":
        return <TeamsLocationsPage />
      case "referees":
        return <RefereeManagement />
      case "calendar":
        return <CalendarView />
      case "profile":
        return <ProfileSettings />
      case "organization-settings":
        return <OrganizationSettings />
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
            <h1 className="text-lg font-semibold flex items-center gap-2">
              RefAssign Dashboard
              {activeView !== "dashboard" && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span>{getPageTitle()}</span>
                </>
              )}
            </h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">{renderContent()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
