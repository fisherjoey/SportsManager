import * as Sentry from '@sentry/nextjs'

// Initialize Sentry (called in _app.tsx or app/layout.tsx)
export function initMonitoring() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
          return null
        }
        return event
      }
    })
  }
}

// Track critical user actions
export function trackCriticalAction(action: string, data?: Record<string, any>) {
  const criticalActions = [
    'login_attempt',
    'registration_complete',
    'game_assigned',
    'assignment_accepted',
    'assignment_declined',
    'payment_initiated',
    'profile_updated',
    'availability_changed'
  ]

  if (criticalActions.includes(action)) {
    // Send to Sentry as breadcrumb
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'user_action',
        message: action,
        level: 'info',
        data
      })
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('CRITICAL_ACTION:', action, data)
    }
  }
}

// Log errors with context
export function logError(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context
    })
  }

  // Always log to console
  console.error('APPLICATION_ERROR:', error, context)
}

// Track performance issues
export function trackPerformance(operation: string, duration: number) {
  if (duration > 1000) { // Log operations taking more than 1 second
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureMessage(`Slow operation: ${operation}`, {
        level: 'warning',
        extra: { duration }
      })
    }

    console.warn(`SLOW_OPERATION: ${operation} took ${duration}ms`)
  }
}

// Track page views and user navigation
export function trackPageView(path: string, userId?: string) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Page view: ${path}`,
      level: 'info',
      data: { userId }
    })
  }
}

// Set user context for error tracking
export function setUserContext(user: { id: string; email: string; role: string } | null) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role
      })
    } else {
      Sentry.setUser(null)
    }
  }
}