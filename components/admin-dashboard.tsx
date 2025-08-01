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
import { PostsManagement } from "@/components/posts-management"
import { CommunicationsManagement } from "@/components/communications-management"
import { AIAssignmentsEnterprise } from "@/components/ai-assignments-enterprise"
import { FinancialDashboard } from "@/components/financial-dashboard"
import { ReceiptUpload } from "@/components/receipt-upload"
import { BudgetTracker } from "@/components/budget-tracker"
import { ExpenseList } from "@/components/expense-list"
import { OrganizationalDashboard } from "@/components/organizational-dashboard"
import { EmployeeManagement } from "@/components/employee-management"
import { AssetTracking } from "@/components/asset-tracking"
import { DocumentRepository } from "@/components/document-repository"
import { ComplianceTracking } from "@/components/compliance-tracking"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { WorkflowManagement } from "@/components/workflow-management"
import { SecurityAudit } from "@/components/security-audit"
import { SystemSettings } from "@/components/system-settings"
import { ChevronRight } from "lucide-react"

export function AdminDashboard() {
  const [activeView, setActiveView] = useState("dashboard")
  const [gameManagementDateFilter, setGameManagementDateFilter] = useState<string>()

  const getPageTitle = () => {
    switch (activeView) {
      // Sports Management
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
      case "ai-assignments":
        return "AI Assignments"
      case "locations":
        return "Teams & Locations"
      case "referees":
        return "Referees"
      case "calendar":
        return "Calendar"
      case "communications":
        return "Communications"
      case "posts":
        return "Posts"
      
      // Financial Management
      case "financial-dashboard":
        return "Financial Dashboard"
      case "financial-receipts":
        return "Receipt Processing"
      case "financial-budgets":
        return "Budget Management"
      case "financial-expenses":
        return "Expense Tracking"
      case "financial-reports":
        return "Financial Reports"
      
      // Organization Management
      case "organization-dashboard":
        return "Organizational Dashboard"
      case "organization-employees":
        return "Employee Management"
      case "organization-assets":
        return "Asset Tracking"
      case "organization-documents":
        return "Document Repository"
      case "organization-compliance":
        return "Compliance Tracking"
      
      // Analytics
      case "analytics-dashboard":
        return "Analytics Dashboard"
      
      // Administration
      case "admin-workflows":
        return "Workflow Management"
      case "admin-security":
        return "Security & Audit"
      case "admin-settings":
        return "System Settings"
      
      // Account
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
      // Sports Management
      case "dashboard":
        return <DashboardOverview />
      case "leagues":
        return <LeagueCreation />
      case "tournaments":
        return <TournamentGenerator />
      case "games":
        return <GameManagement initialDateFilter={gameManagementDateFilter} />
      case "assigning":
        return <GameAssignmentBoard />
      case "ai-assignments":
        return <AIAssignmentsEnterprise />
      case "locations":
        return <TeamsLocationsPage />
      case "referees":
        return <RefereeManagement />
      case "calendar":
        return <CalendarView 
          onDateClick={(date: string) => {
            setGameManagementDateFilter(date)
            setActiveView("games")
          }} 
        />
      case "communications":
        return <CommunicationsManagement />
      case "posts":
        return <PostsManagement />
      
      // Financial Management
      case "financial-dashboard":
        return <FinancialDashboard />
      case "financial-receipts":
        return <ReceiptUpload />
      case "financial-budgets":
        return <BudgetTracker />
      case "financial-expenses":
        return <ExpenseList />
      case "financial-reports":
        return <FinancialDashboard /> // Financial reports are part of the financial dashboard
      
      // Organization Management
      case "organization-dashboard":
        return <OrganizationalDashboard />
      case "organization-employees":
        return <EmployeeManagement />
      case "organization-assets":
        return <AssetTracking />
      case "organization-documents":
        return <DocumentRepository />
      case "organization-compliance":
        return <ComplianceTracking />
      
      // Analytics
      case "analytics-dashboard":
        return <AnalyticsDashboard />
      
      // Administration
      case "admin-workflows":
        return <WorkflowManagement />
      case "admin-security":
        return <SecurityAudit />
      case "admin-settings":
        return <SystemSettings />
      
      // Account
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
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              SyncedSport Dashboard
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
