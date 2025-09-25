/**
 * Standardized Responsive Grid System for SportsManager
 *
 * This file defines consistent breakpoints and grid patterns to ensure
 * all components use the full width of the screen at all breakpoints
 * with intelligent column scaling.
 */

// Tailwind breakpoints for reference:
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
// 2xl: 1536px
// 3xl: 1920px (custom)
// 4xl: 2560px (custom)

export const breakpoints = {
  mobile: '<640px',
  tablet: '640px-1024px',
  desktop: '1024px-1536px',
  widescreen: '1536px-1920px',
  ultraWide: '>1920px'
} as const

/**
 * Standardized responsive grid classes for different content types
 */
export const gridPatterns = {
  // Stats cards and metrics (1-8 columns max)
  stats: {
    // Mobile: 1 col, Tablet: 2 cols, Desktop: 4 cols, Widescreen: 6 cols, Ultra-wide: 8 cols
    standard: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4',
    // For 3-item stats
    three: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4',
    // For 4-item stats
    four: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4',
    // For 5-item stats
    five: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4'
  },

  // Game cards and content blocks (1-6 columns max for readability)
  cards: {
    // Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols, Widescreen: 4 cols, Ultra-wide: 5-6 cols
    standard: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6',
    // For larger cards that need more space
    large: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-6',
    // For small compact cards
    compact: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4'
  },

  // Data tables and lists (responsive columns based on content)
  tables: {
    // Mobile: stack, Tablet: 2 cols, Desktop: 3-4 cols, Widescreen: 5-6 cols
    responsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4',
    // For simple 2-column layouts
    split: 'grid grid-cols-1 lg:grid-cols-2 gap-6'
  },

  // Form layouts and detailed content
  forms: {
    // Standard 2-column form layout
    standard: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
    // Multi-column for complex forms on larger screens
    complex: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6',
    // Single column for simple forms
    simple: 'grid grid-cols-1 gap-6'
  },

  // Dashboard layouts with sidebar consideration
  dashboard: {
    // Main content areas that need to work with sidebars
    main: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-6',
    // Section grids within dashboard areas
    section: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4'
  }
} as const

/**
 * Utility function to get grid classes based on content type and item count
 */
export function getResponsiveGridClass(
  contentType: keyof typeof gridPatterns,
  variant: string = 'standard',
  customGap?: number
): string {
  const pattern = gridPatterns[contentType]
  if (!pattern || !(variant in pattern)) {
    return gridPatterns.cards.standard
  }

  let className = (pattern as any)[variant]

  // Replace gap if custom gap provided
  if (customGap) {
    className = className.replace(/gap-\d+/, `gap-${customGap}`)
  }

  return className
}

/**
 * Smart grid class generator based on item count
 */
export function getSmartGridClass(itemCount: number, maxColumns: number = 6): string {
  if (itemCount <= 0) return 'grid grid-cols-1 gap-4'

  // For very few items, limit columns to item count
  const effectiveMaxCols = Math.min(maxColumns, itemCount)

  if (effectiveMaxCols === 1) {
    return 'grid grid-cols-1 gap-6'
  } else if (effectiveMaxCols === 2) {
    return 'grid grid-cols-1 md:grid-cols-2 gap-6'
  } else if (effectiveMaxCols === 3) {
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-6'
  } else if (effectiveMaxCols === 4) {
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
  } else if (effectiveMaxCols === 5) {
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
  } else if (effectiveMaxCols === 6) {
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
  } else if (effectiveMaxCols === 7) {
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-4'
  } else {
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4'
  }
}

/**
 * Container classes for full-width layouts
 */
export const containerClasses = {
  // Full width with responsive padding
  fullWidth: 'w-full px-4 sm:px-6 lg:px-8',
  // Constrained max-width with full width on smaller screens
  constrained: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  // Ultra-wide friendly container
  ultraWide: 'w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12'
} as const

/**
 * Responsive spacing utilities
 */
export const spacing = {
  section: 'space-y-6 sm:space-y-8 lg:space-y-10',
  component: 'space-y-4 sm:space-y-6',
  tight: 'space-y-2 sm:space-y-3',
  loose: 'space-y-8 sm:space-y-10 lg:space-y-12'
} as const

export default {
  breakpoints,
  gridPatterns,
  getResponsiveGridClass,
  getSmartGridClass,
  containerClasses,
  spacing
}