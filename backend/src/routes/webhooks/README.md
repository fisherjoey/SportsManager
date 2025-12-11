# Clerk Webhook Integration

This directory contains webhook handlers for external services integrated with SportsManager.

## Clerk Webhook Handler

The Clerk webhook handler (`clerk.ts`) processes authentication events from Clerk and maps them to the application's audit logging system.

### Features

- **Webhook Signature Verification**: Uses Svix to verify webhook authenticity
- **Event Mapping**: Maps Clerk events to audit log events
- **Security**: Logs failed verification attempts as suspicious activity
- **Comprehensive Logging**: Captures user details, IP addresses, and event metadata

### Supported Events

| Clerk Event | Audit Event | Description |
|------------|-------------|-------------|
| `user.created` | `USER_CREATE` | New user account created |
| `session.created` | `AUTH_LOGIN_SUCCESS` | User logged in (session started) |
| `session.ended` | `AUTH_LOGOUT` | User logged out (session ended) |
| `user.deleted` | `USER_DELETE` | User account deleted |

### Setup

#### 1. Configure Environment Variables

Add your Clerk webhook secret to your `.env` file:

```env
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

You can find this in your Clerk Dashboard under **Webhooks** > **Add Endpoint**.

#### 2. Configure Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **Webhooks** in the sidebar
4. Click **Add Endpoint**
5. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/clerk`
6. Subscribe to the following events:
   - `user.created`
   - `session.created`
   - `session.ended`
   - `user.deleted`
7. Copy the **Signing Secret** and add it to your `.env` file as `CLERK_WEBHOOK_SECRET`

#### 3. Test the Webhook

Clerk provides a testing interface in the dashboard:

1. Go to **Webhooks** > Your endpoint
2. Click on the **Testing** tab
3. Send test events to verify the integration

### Endpoint Details

**URL:** `POST /api/webhooks/clerk`

**Authentication:** Webhook signature verification via Svix headers

**Required Headers:**
- `svix-id`: Webhook message ID
- `svix-timestamp`: Webhook timestamp
- `svix-signature`: Webhook signature

**Response Codes:**
- `200`: Webhook processed successfully
- `400`: Missing headers or signature verification failed
- `500`: Server configuration error

### Example Request

```bash
curl -X POST https://yourdomain.com/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_xxxxx" \
  -H "svix-timestamp: 1234567890" \
  -H "svix-signature: v1,signature_here" \
  -d '{
    "type": "user.created",
    "data": {
      "id": "user_xxxxx",
      "email_addresses": [
        {
          "id": "email_xxxxx",
          "email_address": "user@example.com"
        }
      ],
      "created_at": 1234567890000
    }
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "event_type": "user.created"
}
```

### Security Features

1. **Signature Verification**: All webhooks are verified using Svix to ensure they come from Clerk
2. **Failed Attempt Logging**: Failed verification attempts are logged as suspicious activity
3. **IP Tracking**: All events capture the originating IP address
4. **Audit Trail**: All events are logged to the `audit_logs` table for compliance

### Monitoring

The webhook handler logs all events to the console and database:

- **Success Events**: `console.log()` with event type and user email
- **Failed Verifications**: `console.error()` with error details
- **Unhandled Events**: `console.log()` for monitoring new event types

### Troubleshooting

#### Webhook Verification Fails

1. Verify `CLERK_WEBHOOK_SECRET` is correctly set in `.env`
2. Check that the secret matches the one in Clerk Dashboard
3. Ensure the webhook endpoint URL in Clerk matches your deployment URL
4. Verify Svix headers are being sent correctly

#### Events Not Logging

1. Check application logs for errors
2. Verify the `audit_logs` table exists in the database
3. Ensure the event type is in the supported events list
4. Check database connectivity

#### 500 Error

1. Verify `CLERK_WEBHOOK_SECRET` is set in environment variables
2. Check application logs for configuration errors
3. Ensure all required dependencies are installed (`svix` package)

### Development

#### Testing Locally

For local development, you can use Clerk's webhook testing feature or tools like [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start ngrok
ngrok http 3001

# Update Clerk webhook URL to: https://your-ngrok-url.ngrok.io/api/webhooks/clerk
```

#### Adding New Events

To add support for new Clerk events:

1. Add a new case in the switch statement in `clerk.ts`
2. Map to an appropriate `AUDIT_EVENTS` constant
3. Update this README with the new event mapping
4. Subscribe to the new event in Clerk Dashboard

### Related Files

- **Route Handler**: `backend/src/routes/webhooks/clerk.ts`
- **Route Registration**: `backend/src/app.ts`
- **Audit Logging**: `backend/src/middleware/auditTrail.ts`
- **Error Handling**: `backend/src/middleware/errorHandling.ts`

### Additional Resources

- [Clerk Webhooks Documentation](https://clerk.com/docs/integration/webhooks)
- [Svix Webhook Verification](https://docs.svix.com/receiving/verifying-payloads/how)
- [SportsManager Audit Logging](../../middleware/auditTrail.ts)
