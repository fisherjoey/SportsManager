# Production Monitoring Quick Start

## 1. Sign up for Sentry (Free)

1. Go to https://sentry.io and create a free account
2. Create a new project (choose Express for backend, Next.js for frontend)
3. Copy your DSN from the project settings

## 2. Add Environment Variables

Add these to your `.env` file:

```bash
# Backend monitoring
SENTRY_DSN=your-backend-dsn-here

# Frontend monitoring
NEXT_PUBLIC_SENTRY_DSN=your-frontend-dsn-here
```

## 3. Test It's Working

### Backend Test:
```bash
cd backend
npm run dev
# Visit http://localhost:3001/api/test-error
# Check Sentry dashboard for the error
```

### Frontend Test:
```bash
npm run dev
# Open browser console
# Run: throw new Error('Test error')
# Check Sentry dashboard
```

## 4. What Gets Monitored Automatically

### Critical User Paths:
- ✅ Login attempts (success/failure)
- ✅ User registration
- ✅ Assignment creation
- ✅ Assignment acceptance/decline
- ✅ Authentication failures
- ✅ API errors (500s, 404s, etc.)

### Performance:
- ⚠️ Slow API calls (>1 second)
- ⚠️ Slow database queries
- ⚠️ Memory usage spikes

## 5. View Your Data

Go to your Sentry dashboard to see:
- Real-time error alerts
- User sessions with errors
- Performance metrics
- Critical path analytics

## 6. Set Up Alerts (Optional)

In Sentry settings, configure alerts for:
- More than 5 login failures in 10 minutes
- Any payment processing errors
- API response time > 2 seconds
- Error rate > 1%

## That's It!

You now have production monitoring that's 100x more valuable than broken tests.

### What You'll See in Production:

```
[CRITICAL_PATH] auth.login - User #42 logged in from 192.168.1.1
[CRITICAL_PATH] assignment.created - Game #123 assigned to referee #456
[ERROR] Payment processing failed for user #789 - Stripe error: card_declined
[SLOW_OPERATION] GET /api/games taking 3.2s average (needs optimization)
```

### Remember:

- **Tests**: Tell you what MIGHT break
- **Monitoring**: Tell you what IS breaking RIGHT NOW with real users

Which would you rather have in production?