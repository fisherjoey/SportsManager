# Clerk Webhook Implementation Summary

## Overview

This document summarizes the Clerk webhook integration added to SportsManager. The webhook handler processes authentication events from Clerk and maps them to the existing audit logging system.

## Files Created/Modified

### New Files

1. **C:\dev\Synced\SportsManager\backend\src\routes\webhooks\clerk.ts**
   - Main webhook handler implementation
   - Verifies webhook signatures using Svix
   - Maps Clerk events to audit log events
   - Handles 4 event types: user.created, session.created, session.ended, user.deleted

2. **C:\dev\Synced\SportsManager\backend\src\routes\webhooks\README.md**
   - Comprehensive documentation for webhook setup and usage
   - Includes troubleshooting guide
   - Contains example requests and responses

### Modified Files

1. **C:\dev\Synced\SportsManager\backend\src\app.ts**
   - Added import for Clerk webhook routes (line 97)
   - Registered webhook route at `/api/webhooks/clerk` (line 183)

## Implementation Details

### Event Mapping

The webhook handler maps Clerk events to existing audit events as follows:

| Clerk Event | Audit Event | Description |
|------------|-------------|-------------|
| `user.created` | `AUDIT_EVENTS.USER_CREATE` | New user account created in Clerk |
| `session.created` | `AUDIT_EVENTS.AUTH_LOGIN_SUCCESS` | User logged in (session started) |
| `session.ended` | `AUDIT_EVENTS.AUTH_LOGOUT` | User logged out (session ended) |
| `user.deleted` | `AUDIT_EVENTS.USER_DELETE` | User account deleted from Clerk |

### Security Features

1. **Svix Signature Verification**: All webhook requests are verified using Svix headers
2. **Failed Attempt Logging**: Failed verification attempts logged as `SECURITY_SUSPICIOUS_ACTIVITY`
3. **IP Address Tracking**: All events capture the originating IP address
4. **Comprehensive Metadata**: Events include user email, Clerk user ID, session ID, timestamps

### Key Features

- **TypeScript Support**: Fully typed with interfaces for Clerk webhook events
- **Error Handling**: Uses existing `asyncHandler` middleware for consistent error handling
- **Existing Patterns**: Follows the same coding style as other route files
- **Audit Integration**: Seamlessly integrates with existing `auditTrail.ts` middleware
- **Console Logging**: Provides console output for monitoring and debugging

## Configuration Required

### Environment Variable

Add to your `.env` file:

```env
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

The `.env.example` file already includes this variable (line 35).

### Clerk Dashboard Setup

1. Navigate to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Go to **Webhooks** section
3. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Subscribe to events:
   - `user.created`
   - `session.created`
   - `session.ended`
   - `user.deleted`
5. Copy the signing secret to your `.env` file

## Dependencies

All required dependencies are already installed:

- `svix`: ^1.82.0 (already in package.json line 103)
- `express`: ^4.18.2
- TypeScript types for Express

## Testing

### Local Development

Use ngrok to expose your local server for webhook testing:

```bash
# Start your local server
npm run dev

# In another terminal, start ngrok
ngrok http 3001

# Use the ngrok URL in Clerk Dashboard
https://your-ngrok-url.ngrok.io/api/webhooks/clerk
```

### Manual Testing

Use Clerk's webhook testing interface:

1. Go to Clerk Dashboard > Webhooks > Your endpoint
2. Navigate to the **Testing** tab
3. Send test events

### Example cURL Request

```bash
curl -X POST http://localhost:3001/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test123" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,test_signature" \
  -d '{
    "type": "user.created",
    "data": {
      "id": "user_test123",
      "email_addresses": [{
        "id": "email_test123",
        "email_address": "test@example.com"
      }],
      "created_at": 1234567890000
    },
    "timestamp": 1234567890
  }'
```

## Endpoint Details

**URL**: `POST /api/webhooks/clerk`

**Authentication**: Webhook signature verification (no bearer token required)

**Response Codes**:
- `200`: Success - Webhook processed
- `400`: Bad Request - Missing headers or verification failed
- `500`: Server Error - Configuration issue (missing CLERK_WEBHOOK_SECRET)

**Success Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "event_type": "user.created"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Webhook verification failed"
}
```

## Audit Log Schema

Events are logged to the `audit_logs` table with the following structure:

```sql
{
  event_type: string,           -- e.g., 'user.create', 'auth.login.success'
  user_id: string,              -- Clerk user ID
  user_email: string,           -- User's email address
  ip_address: string,           -- Request IP address
  user_agent: string,           -- User agent string
  success: boolean,             -- Whether the event was successful
  additional_data: jsonb,       -- Event-specific metadata
  created_at: timestamp         -- Event timestamp
}
```

## Code Architecture

### Design Patterns

1. **Express Router Pattern**: Uses Express Router for modular route handling
2. **Async/Await**: Consistent async error handling with `asyncHandler`
3. **TypeScript Interfaces**: Strong typing for webhook events
4. **Environment Configuration**: Externalized configuration via environment variables
5. **Separation of Concerns**: Webhook logic separated from audit logging

### File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── webhooks/
│   │       ├── clerk.ts          # Webhook handler
│   │       └── README.md         # Documentation
│   ├── middleware/
│   │   ├── auditTrail.ts         # Audit logging (existing)
│   │   └── errorHandling.ts     # Error handling (existing)
│   └── app.ts                    # Route registration (modified)
└── package.json                  # Dependencies (svix already present)
```

## Monitoring and Debugging

### Console Logs

The webhook handler provides console output for:

- **Success Events**: `User created via Clerk: user@example.com (user_123)`
- **Session Events**: `User session created via Clerk: user@example.com`
- **Logout Events**: `User session ended via Clerk: user@example.com`
- **Deletion Events**: `User deleted via Clerk: user@example.com (user_123)`
- **Unhandled Events**: `Unhandled Clerk webhook event type: <type>`
- **Errors**: `Error verifying Clerk webhook: <error message>`

### Database Monitoring

Query recent webhook events:

```sql
SELECT * FROM audit_logs
WHERE additional_data->>'source' = 'clerk_webhook'
ORDER BY created_at DESC
LIMIT 10;
```

Query failed verification attempts:

```sql
SELECT * FROM audit_logs
WHERE event_type = 'security.suspicious_activity'
  AND additional_data->>'source' = 'clerk_webhook'
  AND success = false
ORDER BY created_at DESC;
```

## Future Enhancements

Potential improvements for future iterations:

1. **Additional Event Types**: Support for `user.updated`, `session.revoked`
2. **Rate Limiting**: Add rate limiting specifically for webhook endpoints
3. **Retry Logic**: Implement automatic retry for failed audit log writes
4. **Metrics**: Add metrics collection for webhook processing times
5. **Alerting**: Set up alerts for high failure rates
6. **User Synchronization**: Automatically sync Clerk users to local database

## Related Documentation

- [Clerk Webhooks Documentation](https://clerk.com/docs/integration/webhooks)
- [Svix Webhook Verification](https://docs.svix.com/receiving/verifying-payloads/how)
- [SportsManager Audit Trail](src/middleware/auditTrail.ts)
- [Webhook Setup Guide](src/routes/webhooks/README.md)

## Support

For issues or questions:

1. Check the webhook logs in Clerk Dashboard
2. Review application logs for error messages
3. Verify `CLERK_WEBHOOK_SECRET` is correctly configured
4. Consult the [Troubleshooting Guide](src/routes/webhooks/README.md#troubleshooting)
