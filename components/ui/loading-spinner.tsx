"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
  centered?: boolean
}

export function LoadingSpinner({ 
  size = "md", 
  className, 
  text,
  centered = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  }

  const spinner = (
    <div className={cn(
      "flex items-center gap-2",
      centered && "justify-center",
      className
    )}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && (
        <span className={cn("text-muted-foreground", textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    )
  }

  return spinner
}

// Specialized loading states
export function TableLoadingSpinner({ text = "Loading data..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

export function PageLoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="xl" text={text} />
    </div>
  )
}

export function CardLoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="md" text={text} />
    </div>
  )
}

export function ButtonLoadingSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  return <Loader2 className={cn("animate-spin", size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
}