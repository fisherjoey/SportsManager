# Production Monitoring Setup (More Important Than Tests!)

## Why Monitoring > 100% Test Coverage

Tests tell you what MIGHT break. Monitoring tells you what IS breaking.

## Quick Setup Options

### Option 1: Sentry (Recommended - Free tier available)

```bash
npm install @sentry/node @sentry/nextjs
```

Backend setup (in app.js):
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1, // 10% of requests
});

// Add as first middleware
app.use(Sentry.Handlers.requestHandler());

// Add before error handlers
app.use(Sentry.Handlers.errorHandler());
```

Frontend setup (in _app.tsx):
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Option 2: Simple Custom Logger

```javascript
// backend/src/utils/monitor.js
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
    
    // Send to your logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to CloudWatch, Datadog, etc.
      console.error(JSON.stringify(errorData));
    }
  }
  
  static logCriticalPath(action, data) {
    // Track what users actually do
    const events = {
      'game.assigned': data,
      'payment.processed': data,
      'referee.registered': data,
    };
    
    console.log('CRITICAL_PATH:', action, data);
  }
}
```

## What to Monitor (Priority Order)

### 1. Authentication Failures
```javascript
// In auth.js
if (!user) {
  ProductionMonitor.logError(new Error('Login failed'), {
    email,
    ip: req.ip,
    timestamp: Date.now()
  });
}
```

### 2. Payment/Transaction Errors
```javascript
// In payment processing
try {
  await processPayment(data);
} catch (error) {
  ProductionMonitor.logError(error, {
    amount: data.amount,
    user: req.user.id,
    critical: true  // Page the on-call dev!
  });
}
```

### 3. Game Assignment Issues
```javascript
// Track assignment success rate
ProductionMonitor.logCriticalPath('assignment.created', {
  gameId,
  refereeId,
  success: true
});
```

## Quick Wins Checklist

- [ ] Add Sentry (30 minutes)
- [ ] Log all 500 errors
- [ ] Track login success/failure rate
- [ ] Monitor game assignment completion
- [ ] Alert on payment failures
- [ ] Track API response times

## Real User Monitoring

Add this to your frontend:
```javascript
// Track what users actually click
window.addEventListener('click', (e) => {
  const target = e.target.closest('[data-track]');
  if (target) {
    analytics.track('user_action', {
      action: target.dataset.track,
      timestamp: Date.now()
    });
  }
});
```

## Instead of 100% Test Coverage, Aim For:

1. **100% error monitoring** in production
2. **Critical path tracking** (auth, payment, assignments)
3. **Performance monitoring** (slow queries, API times)
4. **User behavior analytics** (what features actually get used)

## The Truth About Tests vs Monitoring

- Tests: "This worked on my machine 3 months ago"
- Monitoring: "This is working/failing RIGHT NOW for user #42"

Which would you rather have?