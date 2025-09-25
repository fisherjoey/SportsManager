const Sentry = require('@sentry/node');

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out test environment errors
      if (process.env.NODE_ENV === 'test') {
        return null;
      }
      return event;
    }
  });
}

class ProductionMonitor {
  static logError(error, context = {}) {
    const errorData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      url: context.req?.url,
      method: context.req?.method,
      user: context.req?.user?.email,
    };
    
    // Send to Sentry if available
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: context,
        user: context.req?.user ? {
          id: context.req.user.id,
          email: context.req.user.email,
          role: context.req.user.role
        } : undefined
      });
    }
    
    // Always log to console in production
    if (process.env.NODE_ENV === 'production') {
      console.error('PRODUCTION_ERROR:', JSON.stringify(errorData));
    }
  }
  
  static logCriticalPath(action, data) {
    const criticalPaths = [
      'auth.login',
      'auth.register',
      'auth.failure',
      'game.assigned',
      'game.unassigned',
      'payment.processed',
      'payment.failed',
      'referee.registered',
      'referee.availability.updated',
      'assignment.created',
      'assignment.accepted',
      'assignment.declined'
    ];
    
    // Only track defined critical paths
    if (criticalPaths.includes(action)) {
      const eventData = {
        timestamp: new Date().toISOString(),
        action,
        data,
        environment: process.env.NODE_ENV
      };
      
      // Send to Sentry as breadcrumb
      if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          category: 'critical_path',
          message: action,
          level: 'info',
          data
        });
      }
      
      // Log critical paths for analysis
      console.log('CRITICAL_PATH:', JSON.stringify(eventData));
    }
  }
  
  static trackPerformance(operation, duration) {
    if (duration > 1000) { // Log slow operations over 1 second
      const perfData = {
        timestamp: new Date().toISOString(),
        operation,
        duration,
        slow: true
      };
      
      if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(`Slow operation: ${operation}`, {
          level: 'warning',
          extra: { duration }
        });
      }
      
      console.warn('SLOW_OPERATION:', JSON.stringify(perfData));
    }
  }
}

module.exports = {
  Sentry,
  ProductionMonitor
};