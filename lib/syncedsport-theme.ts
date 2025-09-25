// SyncedSport Theme Configuration
// Based on Cloudflare's design system with light and dark mode support

export const syncedSportTheme = {
  light: {
    colors: {
      // Background colors - Light Mode
      background: {
        main: '#ffffff',          // Pure white main background
        secondary: '#f8f8f8',     // Slightly off-white
        header: '#ffffff',        // White header
        sidebar: '#ffffff',       // White sidebar
        card: '#ffffff',          // White cards
        hover: 'rgba(0, 0, 0, 0.04)', // Light hover state
        selected: '#e5f2ff',      // Light blue selection
        overlay: 'rgba(0, 0, 0, 0.5)',
      },

      // Text colors - Light Mode
      text: {
        primary: '#1a1a1a',       // Near black
        secondary: '#4a5568',     // Dark gray
        muted: '#718096',         // Medium gray
        inverse: '#ffffff',       // White text on dark backgrounds
        destructive: '#dc2626',   // Red
        success: '#059669',       // Green
        warning: '#d97706',       // Orange
        info: '#0284c7',          // Blue
      },

      // Border colors - Light Mode
      border: {
        default: '#e5e7eb',       // Light gray border
        light: '#f3f4f6',         // Very light border
        focus: '#0051c3',         // Blue focus
        input: '#d1d5db',         // Input border
      },

      // Interactive elements - Light Mode
      interactive: {
        primary: '#0051c3',       // Cloudflare blue
        primaryHover: '#003d94',  // Darker blue
        secondary: '#6b7280',     // Gray
        secondaryHover: '#4b5563',
        accent: '#f48120',        // Orange accent
        accentHover: '#dc6e0a',
      },

      // Badge colors - Light Mode
      badge: {
        beta: '#f97316',          // Orange
        new: '#0ea5e9',           // Light blue
        success: '#10b981',       // Green
        warning: '#f59e0b',       // Yellow
        error: '#ef4444',         // Red
      },
    },
  },

  dark: {
    colors: {
      // Background colors - Dark Mode
      background: {
        main: '#0f0f0f',          // Very dark background
        secondary: '#1a1a1a',     // Slightly lighter
        header: '#0a0a0a',        // Darker header
        sidebar: '#0a0a0a',       // Dark sidebar
        card: '#1a1a1a',          // Dark cards
        hover: 'rgba(255, 255, 255, 0.05)', // Light hover state
        selected: '#0051c3',      // Blue selection
        overlay: 'rgba(0, 0, 0, 0.7)',
      },

      // Text colors - Dark Mode
      text: {
        primary: '#ffffff',       // White
        secondary: '#d1d5db',     // Light gray
        muted: '#9ca3af',         // Medium gray
        inverse: '#1a1a1a',       // Dark text on light backgrounds
        destructive: '#ef4444',   // Bright red
        success: '#10b981',       // Bright green
        warning: '#f59e0b',       // Bright orange
        info: '#3b82f6',          // Bright blue
      },

      // Border colors - Dark Mode
      border: {
        default: '#2d2d2d',       // Dark border
        light: '#1f1f1f',         // Very dark border
        focus: '#0051c3',         // Blue focus
        input: '#374151',         // Input border
      },

      // Interactive elements - Dark Mode
      interactive: {
        primary: '#0051c3',       // Cloudflare blue
        primaryHover: '#0066ff',  // Brighter blue
        secondary: '#4b5563',     // Gray
        secondaryHover: '#6b7280',
        accent: '#f48120',        // Orange accent
        accentHover: '#ff9633',
      },

      // Badge colors - Dark Mode
      badge: {
        beta: '#f97316',          // Orange
        new: '#0ea5e9',           // Light blue
        success: '#10b981',       // Green
        warning: '#f59e0b',       // Yellow
        error: '#ef4444',         // Red
      },
    },
  },

  // Shared dimensions and spacing
  dimensions: {
    header: {
      height: '56px',
    },
    sidebar: {
      expanded: '240px',
      collapsed: '56px',
      itemHeight: '36px',
    },
    button: {
      sm: '28px',
      md: '32px',
      lg: '40px',
    },
    icon: {
      sm: '16px',
      md: '20px',
      lg: '24px',
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    xxxl: '48px',
  },

  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
      mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Fira Mono", "Droid Sans Mono", monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
}

export type SyncedSportTheme = typeof syncedSportTheme

// Helper function to get theme based on mode
export function getTheme(mode: 'light' | 'dark') {
  return {
    ...syncedSportTheme[mode],
    dimensions: syncedSportTheme.dimensions,
    spacing: syncedSportTheme.spacing,
    radius: syncedSportTheme.radius,
    transitions: syncedSportTheme.transitions,
    typography: syncedSportTheme.typography,
    shadows: syncedSportTheme.shadows,
    breakpoints: syncedSportTheme.breakpoints,
  }
}

// CSS variables for runtime theme switching
export function getThemeCSSVariables(mode: 'light' | 'dark') {
  const theme = syncedSportTheme[mode]

  return {
    '--bg-main': theme.colors.background.main,
    '--bg-secondary': theme.colors.background.secondary,
    '--bg-header': theme.colors.background.header,
    '--bg-sidebar': theme.colors.background.sidebar,
    '--bg-card': theme.colors.background.card,
    '--bg-hover': theme.colors.background.hover,
    '--bg-selected': theme.colors.background.selected,

    '--text-primary': theme.colors.text.primary,
    '--text-secondary': theme.colors.text.secondary,
    '--text-muted': theme.colors.text.muted,
    '--text-inverse': theme.colors.text.inverse,

    '--border-default': theme.colors.border.default,
    '--border-light': theme.colors.border.light,
    '--border-focus': theme.colors.border.focus,
    '--border-input': theme.colors.border.input,

    '--interactive-primary': theme.colors.interactive.primary,
    '--interactive-primary-hover': theme.colors.interactive.primaryHover,
    '--interactive-accent': theme.colors.interactive.accent,
  }
}