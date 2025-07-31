"use client"

import { useAuth } from "@/components/auth-provider"
import { LoginForm } from "@/components/login-form"
import { GamesManagementPage } from "@/components/games-management-page"

export default function GamesPage() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div data-testid="games">
      <GamesManagementPage />
    </div>
  )
}