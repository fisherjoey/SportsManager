/**
 * Theme-aware color utilities for SportsManager
 * Provides consistent color usage across the application
 * Updated with new vibrant blue primary (hsl(220, 100%, 50%))
 */

// Chart colors that adapt to light/dark mode
export const chartColors = {
  primary: 'hsl(var(--chart-1))', // Vibrant Blue
  success: 'hsl(var(--chart-2))', // Cyan
  warning: 'hsl(var(--chart-3))', // Purple
  destructive: 'hsl(var(--chart-4))', // Sky Blue
  info: 'hsl(var(--chart-5))' // Light Sky
}

// Chart color arrays for data visualization
export const chartColorArray = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
]

// Status colors with semantic meaning
export const statusColors = {
  // Success states
  success: 'hsl(var(--success))',
  completed: 'hsl(var(--success))',
  available: 'hsl(var(--success))',
  assigned: 'hsl(var(--success))',
  active: 'hsl(var(--success))',
  approved: 'hsl(var(--success))',
  
  // Warning states
  warning: 'hsl(var(--warning))',
  pending: 'hsl(var(--warning))',
  partial: 'hsl(var(--warning))',
  review: 'hsl(var(--warning))',
  
  // Error states
  error: 'hsl(var(--destructive))',
  failed: 'hsl(var(--destructive))',
  unavailable: 'hsl(var(--destructive))',
  unassigned: 'hsl(var(--destructive))',
  cancelled: 'hsl(var(--destructive))',
  rejected: 'hsl(var(--destructive))',
  
  // Info states
  info: 'hsl(var(--info))',
  inProgress: 'hsl(var(--info))',
  scheduled: 'hsl(var(--info))',
  
  // Neutral states
  draft: 'hsl(var(--muted))',
  inactive: 'hsl(var(--muted))',
  disabled: 'hsl(var(--muted))'
}

// Get status color class names for Tailwind
export function getStatusColorClass(status: string, type: 'text' | 'bg' | 'border' = 'text') {
  const baseClasses = {
    // Success states
    success: {
      text: 'text-success',
      bg: 'bg-success/10 dark:bg-success/20',
      border: 'border-success/20 dark:border-success/30'
    },
    completed: {
      text: 'text-success',
      bg: 'bg-success/10 dark:bg-success/20',
      border: 'border-success/20 dark:border-success/30'
    },
    available: {
      text: 'text-success',
      bg: 'bg-success/10 dark:bg-success/20',
      border: 'border-success/20 dark:border-success/30'
    },
    assigned: {
      text: 'text-success',
      bg: 'bg-success/10 dark:bg-success/20',
      border: 'border-success/20 dark:border-success/30'
    },
    active: {
      text: 'text-success',
      bg: 'bg-success/10 dark:bg-success/20',
      border: 'border-success/20 dark:border-success/30'
    },
    
    // Warning states
    warning: {
      text: 'text-warning',
      bg: 'bg-warning/10 dark:bg-warning/20',
      border: 'border-warning/20 dark:border-warning/30'
    },
    pending: {
      text: 'text-warning',
      bg: 'bg-warning/10 dark:bg-warning/20',
      border: 'border-warning/20 dark:border-warning/30'
    },
    partial: {
      text: 'text-warning',
      bg: 'bg-warning/10 dark:bg-warning/20',
      border: 'border-warning/20 dark:border-warning/30'
    },
    
    // Error states
    error: {
      text: 'text-destructive',
      bg: 'bg-destructive/10 dark:bg-destructive/20',
      border: 'border-destructive/20 dark:border-destructive/30'
    },
    failed: {
      text: 'text-destructive',
      bg: 'bg-destructive/10 dark:bg-destructive/20',
      border: 'border-destructive/20 dark:border-destructive/30'
    },
    unavailable: {
      text: 'text-destructive',
      bg: 'bg-destructive/10 dark:bg-destructive/20',
      border: 'border-destructive/20 dark:border-destructive/30'
    },
    unassigned: {
      text: 'text-destructive',
      bg: 'bg-destructive/10 dark:bg-destructive/20',
      border: 'border-destructive/20 dark:border-destructive/30'
    },
    
    // Info states
    info: {
      text: 'text-info',
      bg: 'bg-info/10 dark:bg-info/20',
      border: 'border-info/20 dark:border-info/30'
    },
    inProgress: {
      text: 'text-info',
      bg: 'bg-info/10 dark:bg-info/20',
      border: 'border-info/20 dark:border-info/30'
    },
    
    // Primary/neutral states
    default: {
      text: 'text-foreground',
      bg: 'bg-muted',
      border: 'border-border'
    },
    draft: {
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-muted'
    },
    inactive: {
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-muted'
    }
  }
  
  const statusKey = status.toLowerCase().replace(/[\s-_]/g, '')
  const classes = baseClasses[statusKey as keyof typeof baseClasses] || baseClasses.default
  
  return classes[type]
}

// Level/difficulty color mapping
export function getLevelColorClass(level: string, type: 'text' | 'bg' | 'border' = 'text') {
  const levelClasses = {
    recreational: {
      text: 'text-primary',
      bg: 'bg-primary/10 dark:bg-primary/20',
      border: 'border-primary/20 dark:border-primary/30'
    },
    competitive: {
      text: 'text-warning',
      bg: 'bg-warning/10 dark:bg-warning/20',
      border: 'border-warning/20 dark:border-warning/30'
    },
    elite: {
      text: 'text-destructive',
      bg: 'bg-destructive/10 dark:bg-destructive/20',
      border: 'border-destructive/20 dark:border-destructive/30'
    },
    rookie: {
      text: 'text-primary',
      bg: 'bg-primary/10 dark:bg-primary/20',
      border: 'border-primary/20 dark:border-primary/30'
    },
    junior: {
      text: 'text-info',
      bg: 'bg-info/10 dark:bg-info/20',
      border: 'border-info/20 dark:border-info/30'
    },
    senior: {
      text: 'text-accent-foreground',
      bg: 'bg-accent',
      border: 'border-accent'
    }
  }
  
  const levelKey = level.toLowerCase().replace(/[\s-_+]/g, '')
  const classes = levelClasses[levelKey as keyof typeof levelClasses] || {
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-muted'
  }
  
  return classes[type]
}

// Convert hex colors to HSL for theme compatibility
export function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '')
  
  // Parse hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  const sum = max + min
  const l = sum / 2
  
  let h = 0
  let s = 0
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum
    
    switch (max) {
    case r:
      h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / diff + 2) / 6
      break
    case b:
      h = ((r - g) / diff + 4) / 6
      break
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Get CSS variable value at runtime
export function getCSSVariableValue(variable: string): string {
  if (typeof window === 'undefined') return ''
  
  const root = document.documentElement
  const value = getComputedStyle(root).getPropertyValue(variable).trim()
  
  // If it's an HSL value, convert to hex for use in charts
  if (value.includes(' ')) {
    const [h, s, l] = value.split(' ').map(v => parseFloat(v))
    return `hsl(${h}, ${s}%, ${l}%)`
  }
  
  return value
}

// Theme-aware gradient generator
export function getGradient(from: 'primary' | 'success' | 'warning' | 'info', to?: 'primary' | 'success' | 'warning' | 'info') {
  const toColor = to || from
  return `bg-gradient-to-r from-${from}/10 to-${toColor}/5 dark:from-${from}/20 dark:to-${toColor}/10`
}

// Primary gradient using new design tokens
export function getPrimaryGradient() {
  return 'bg-gradient-to-r from-[hsl(var(--primary-gradient-from))] to-[hsl(var(--primary-gradient-to))]'
}

// Primary gradient with opacity
export function getPrimaryGradientWithOpacity(opacity: number = 0.1) {
  return `bg-gradient-to-r from-[hsl(var(--primary-gradient-from)/${opacity})] to-[hsl(var(--primary-gradient-to)/${opacity})]`
}

export default {
  chartColors,
  chartColorArray,
  statusColors,
  getStatusColorClass,
  getLevelColorClass,
  hexToHSL,
  getCSSVariableValue,
  getGradient,
  getPrimaryGradient,
  getPrimaryGradientWithOpacity
}