'use client'

import React from 'react'
import { Search, ChevronDown, Plus, Globe, User, HelpCircle, LogOut, Moon, Sun } from 'lucide-react'
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

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 h-14",
      "bg-background dark:bg-background",
      "border-b border-border",
      "flex items-center justify-between px-4",
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
          <span className="text-foreground font-medium text-sm hidden sm:inline">
            SYNCED SPORTS
          </span>
        </div>

        {/* Account info */}
        <div className="text-muted-foreground text-sm hidden md:flex items-center gap-1">
          <span>{user?.email || 'user@example.com'}'s Account</span>
        </div>
      </div>

      {/* Center section: Search */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Go to..."
            className={cn(
              "w-full h-8 pl-10 pr-16",
              "bg-secondary/50 dark:bg-secondary",
              "border border-input rounded-md",
              "text-foreground placeholder-muted-foreground text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "transition-all duration-150"
            )}
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground font-mono">
            CMD+K
          </kbd>
        </div>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            "h-8 w-8 flex items-center justify-center",
            "text-muted-foreground",
            "border border-input rounded-md",
            "hover:bg-accent hover:text-accent-foreground",
            "transition-all duration-150"
          )}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* Support button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 px-3 flex items-center gap-1.5",
              "text-muted-foreground text-sm",
              "border border-input rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-all duration-150"
            )}>
              <span>Support</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <HelpCircle className="w-4 h-4 mr-2" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem>
              Contact Support
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 px-3 flex items-center gap-1.5",
              "text-muted-foreground text-sm",
              "border border-input rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-all duration-150"
            )}>
              <Plus className="w-3 h-3" />
              <span>Add</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              Add League
            </DropdownMenuItem>
            <DropdownMenuItem>
              Add Team
            </DropdownMenuItem>
            <DropdownMenuItem>
              Add Referee
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 px-3 flex items-center gap-1.5",
              "text-muted-foreground text-sm",
              "border border-input rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-all duration-150"
            )}>
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">English</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>English</DropdownMenuItem>
            <DropdownMenuItem>Español</DropdownMenuItem>
            <DropdownMenuItem>Français</DropdownMenuItem>
            <DropdownMenuItem>Deutsch</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "h-8 w-8 flex items-center justify-center",
              "text-muted-foreground",
              "border border-input rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-all duration-150"
            )}>
              <User className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm text-foreground font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
            </div>
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
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