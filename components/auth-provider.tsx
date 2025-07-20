"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiClient, type User } from "@/lib/api"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = localStorage.getItem("auth_token")
    if (storedToken) {
      apiClient.setToken(storedToken)
      // Verify token by fetching user profile
      apiClient.getProfile()
        .then(response => {
          if (response.user) {
            setUser(response.user)
            setIsAuthenticated(true)
          }
        })
        .catch(() => {
          // Token invalid, clear storage
          localStorage.removeItem("auth_token")
          apiClient.removeToken()
        })
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login(email, password)
      
      if (response.token && response.user) {
        apiClient.setToken(response.token)
        setUser(response.user)
        setIsAuthenticated(true)
        
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = () => {
    apiClient.removeToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (user && user.role === 'referee') {
      try {
        const response = await apiClient.updateReferee(user.id, updates)
        if (response.success && response.data) {
          setUser(response.data.referee)
        }
      } catch (error) {
        console.error('Failed to update profile:', error)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}