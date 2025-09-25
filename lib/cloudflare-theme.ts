export const syncedSportTheme = {
  colors: {
    // Background colors
    background: {
      main: '#0f0f0f',      // Main content background
      header: '#0a0a0a',    // Header background
      sidebar: '#0a0a0a',   // Sidebar background
      card: '#1a1a1a',      // Card background
      hover: 'rgba(255, 255, 255, 0.05)',  // Hover state
      selected: '#0051c3',  // SyncedSport blue for selected items
    },

    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#d1d5db',
      muted: '#9ca3af',
      destructive: '#ef4444',
    },

    // Border colorsThi
    border: {
      default: '#2d2d2d',
      input: '#374151',
      focus: '#0051c3',
    },

    // Badge colors
    badge: {
      beta: '#f97316',  // Orange
      new: '#0ea5e9',   // Blue
      success: '#10b981',
      warning: '#f97316',
    },

    // Accent colors
    accent: {
      primary: '#0051c3',    // SyncedSport blue
      secondary: '#60a5fa',  // Light blue
    },
  },

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
      height: '32px',
    },
    icon: {
      size: '20px',
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },

  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },

  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
    },
    fontWeight: {
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
}

export type SyncedSportTheme = typeof syncedSportTheme