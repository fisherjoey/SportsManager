'use client'

import React from 'react'
import { Search, ChevronDown, Plus, Globe, User, HelpCircle, LogOut, Moon, Sun, Monitor } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SyncedSportHeaderProps {
  className?: string
}

export function SyncedSportHeader({ className }: SyncedSportHeaderProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 h-14",
      "flex items-center justify-between px-4",
      "transition-colors duration-200",
      isDark
        ? "bg-[#0a0a0a] border-b border-[#2d2d2d]"
        : "bg-white border-b border-gray-200",
      className
    )}>
      {/* Left section: Logo and Account */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/synced-sports-icon.svg"
            alt="Synced Sports Icon"
            className="h-8 w-8 object-contain"
          />
          <span className={cn(
            "font-medium text-sm hidden sm:inline",
            isDark ? "text-white" : "text-gray-900"
          )}>
            SYNCED SPORTS
          </span>
        </div>

        {/* Account info */}
        <div className={cn(
          "text-sm hidden md:flex items-center gap-1",
          isDark ? "text-[#d1d5db]" : "text-gray-600"
        )}>
          <span>{user?.email || 'user@example.com'}'s Account</span>
        </div>
      </div>

      {/* Center section: Search */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
            isDark ? "text-[#9ca3af]" : "text-gray-400"
          )} />
          <input
            type="text"
            placeholder="Go to..."
            className={cn(
              "w-full h-8 pl-10 pr-16 rounded-md",
              "text-sm transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#0051c3] focus:ring-opacity-50",
              isDark ? [
                "bg-[#1a1a1a] border border-[#374151]",
                "text-[#d1d5db] placeholder-[#9ca3af]",
                "focus:bg-[#0f0f0f]"
              ] : [
                "bg-gray-50 border border-gray-300",
                "text-gray-900 placeholder-gray-400",
                "focus:bg-white"
              ]
            )}
          />
          <kbd className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5",
            "rounded text-[10px] font-mono",
            isDark
              ? "bg-[#2d2d2d] border border-[#374151] text-[#9ca3af]"
              : "bg-gray-100 border border-gray-300 text-gray-500"
          )}>
            {mounted && (navigator.platform.includes('Mac') ? 'CMD' : 'CTRL')}+K
          </kbd>
        </div>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 w-8 flex items-center justify-center",
              "rounded-md transition-all duration-150",
              isDark ? [
                "border border-[#374151]",
                "hover:border-[#60a5fa] hover:bg-[#1a1a1a]"
              ] : [
                "border border-gray-300",
                "hover:border-blue-500 hover:bg-gray-50"
              ]
            )}>
              {mounted && (
                <>
                  {theme === 'dark' && <Moon className="w-4 h-4 text-[#d1d5db]" />}
                  {theme === 'light' && <Sun className="w-4 h-4 text-gray-600" />}
                  {theme === 'system' && <Monitor className="w-4 h-4 text-gray-600" />}
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(
            "w-36",
            isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"
          )}>
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className={cn(
                isDark
                  ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Sun className="w-4 h-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className={cn(
                isDark
                  ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('system')}
              className={cn(
                isDark
                  ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Monitor className="w-4 h-4 mr-2" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Support button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 px-3 flex items-center gap-1.5",
              "text-sm rounded-md",
              "transition-all duration-150",
              isDark ? [
                "text-[#d1d5db] border border-[#374151]",
                "hover:border-[#60a5fa] hover:text-white"
              ] : [
                "text-gray-600 border border-gray-300",
                "hover:border-blue-500 hover:text-gray-900"
              ]
            )}>
              <span>Support</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(
            "w-48",
            isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"
          )}>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              <HelpCircle className="w-4 h-4 mr-2" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Contact Support
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 px-3 flex items-center gap-1.5",
              "text-sm rounded-md",
              "transition-all duration-150",
              isDark ? [
                "text-[#d1d5db] border border-[#374151]",
                "hover:border-[#60a5fa] hover:text-white"
              ] : [
                "text-gray-600 border border-gray-300",
                "hover:border-blue-500 hover:text-gray-900"
              ]
            )}>
              <Plus className="w-3 h-3" />
              <span>Add</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(
            "w-48",
            isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"
          )}>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Add League
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Add Team
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Add Referee
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 px-3 flex items-center gap-1.5",
              "text-sm rounded-md",
              "transition-all duration-150",
              isDark ? [
                "text-[#d1d5db] border border-[#374151]",
                "hover:border-[#60a5fa] hover:text-white"
              ] : [
                "text-gray-600 border border-gray-300",
                "hover:border-blue-500 hover:text-gray-900"
              ]
            )}>
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">English</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(
            "w-48",
            isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"
          )}>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Español
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Français
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Deutsch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 w-8 flex items-center justify-center",
              "rounded-md transition-all duration-150",
              isDark ? [
                "text-[#d1d5db] border border-[#374151]",
                "hover:border-[#60a5fa] hover:text-white"
              ] : [
                "text-gray-600 border border-gray-300",
                "hover:border-blue-500 hover:text-gray-900"
              ]
            )}>
              <User className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(
            "w-56",
            isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"
          )}>
            <div className={cn(
              "px-3 py-2 border-b",
              isDark ? "border-[#2d2d2d]" : "border-gray-200"
            )}>
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {user?.name || 'User'}
              </p>
              <p className={cn(
                "text-xs",
                isDark ? "text-[#9ca3af]" : "text-gray-500"
              )}>
                {user?.email || 'user@example.com'}
              </p>
            </div>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className={cn(
              isDark
                ? "text-[#d1d5db] hover:bg-[#2d2d2d] hover:text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className={isDark ? "bg-[#2d2d2d]" : "bg-gray-200"} />
            <DropdownMenuItem
              onClick={logout}
              className={cn(
                "text-red-500",
                isDark
                  ? "hover:bg-[#2d2d2d] hover:text-red-400 focus:text-red-400"
                  : "hover:bg-red-50 hover:text-red-600 focus:text-red-600"
              )}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}