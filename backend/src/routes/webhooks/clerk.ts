/**
 * @fileoverview Clerk Webhook Handler
 * @description Handles Clerk authentication events and maps them to audit logging
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Webhook } from 'svix';
import { asyncHandler } from '../../middleware/errorHandling';
import { createAuditLog, AUDIT_EVENTS } from '../../middleware/auditTrail';

const router = Router();

/**
 * Clerk webhook event types
 */
interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      email_address: string;
      id: string;
    }>;
    primary_email_address_id?: string;
    created_at?: number;
    updated_at?: number;
    user_id?: string;
    status?: string;
    [key: string]: any;
  };
  object: string;
  timestamp: number;
}

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events
 */
const handleClerkWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not configured');
    res.status(500).json({
      success: false,
      error: 'Webhook configuration error'
    });
    return;
  }

  // Get Svix headers for verification
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  // Verify required headers are present
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('Missing Svix headers for webhook verification');
    res.status(400).json({
      success: false,
      error: 'Missing webhook verification headers'
    });
    return;
  }

  // Get the raw body (required for signature verification)
  const payload = JSON.stringify(req.body);

  try {
    // Create Svix webhook instance for verification
    const wh = new Webhook(webhookSecret);

    // Verify the webhook signature
    const evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;

    // Extract event type and data
    const { type, data } = evt;

    // Get user email from the event data
    const getUserEmail = (eventData: ClerkWebhookEvent['data']): string | null => {
      if (eventData.email_addresses && eventData.email_addresses.length > 0) {
        // Find primary email or use first email
        if (eventData.primary_email_address_id) {
          const primaryEmail = eventData.email_addresses.find(
            email => email.id === eventData.primary_email_address_id
          );
          if (primaryEmail) {
            return primaryEmail.email_address;
          }
        }
        return eventData.email_addresses[0].email_address;
      }
      return null;
    };

    const userEmail = getUserEmail(data);
    const userId = data.id || data.user_id || null;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      req.headers['x-real-ip'] as string ||
                      req.ip ||
                      'unknown';

    // Handle different Clerk event types
    switch (type) {
      case 'user.created':
        // Log user creation event
        await createAuditLog({
          event_type: AUDIT_EVENTS.USER_CREATE,
          user_id: userId,
          user_email: userEmail,
          ip_address: ipAddress,
          user_agent: req.headers['user-agent'],
          success: true,
          additional_data: {
            clerk_user_id: data.id,
            created_at: data.created_at,
            source: 'clerk_webhook'
          }
        });
        console.log(`User created via Clerk: ${userEmail} (${userId})`);
        break;

      case 'session.created':
        // Log login/session creation event
        await createAuditLog({
          event_type: AUDIT_EVENTS.AUTH_LOGIN_SUCCESS,
          user_id: data.user_id,
          user_email: userEmail,
          ip_address: ipAddress,
          user_agent: req.headers['user-agent'],
          success: true,
          additional_data: {
            session_id: data.id,
            clerk_user_id: data.user_id,
            created_at: data.created_at,
            source: 'clerk_webhook'
          }
        });
        console.log(`User session created via Clerk: ${userEmail}`);
        break;

      case 'session.ended':
        // Log logout/session end event
        await createAuditLog({
          event_type: AUDIT_EVENTS.AUTH_LOGOUT,
          user_id: data.user_id,
          user_email: userEmail,
          ip_address: ipAddress,
          user_agent: req.headers['user-agent'],
          success: true,
          additional_data: {
            session_id: data.id,
            clerk_user_id: data.user_id,
            status: data.status,
            source: 'clerk_webhook'
          }
        });
        console.log(`User session ended via Clerk: ${userEmail}`);
        break;

      case 'user.deleted':
        // Log user deletion event
        await createAuditLog({
          event_type: AUDIT_EVENTS.USER_DELETE,
          user_id: userId,
          user_email: userEmail,
          ip_address: ipAddress,
          user_agent: req.headers['user-agent'],
          success: true,
          additional_data: {
            clerk_user_id: data.id,
            deleted_at: new Date().toISOString(),
            source: 'clerk_webhook'
          }
        });
        console.log(`User deleted via Clerk: ${userEmail} (${userId})`);
        break;

      default:
        // Log unhandled event types for monitoring
        console.log(`Unhandled Clerk webhook event type: ${type}`);
        break;
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      event_type: type
    });

  } catch (error) {
    console.error('Error verifying Clerk webhook:', error);

    // Log webhook verification failure
    await createAuditLog({
      event_type: AUDIT_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY,
      ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                  req.headers['x-real-ip'] as string ||
                  req.ip ||
                  'unknown',
      user_agent: req.headers['user-agent'],
      success: false,
      error_message: `Clerk webhook verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      additional_data: {
        source: 'clerk_webhook',
        svix_id: svixId
      }
    });

    res.status(400).json({
      success: false,
      error: 'Webhook verification failed'
    });
  }
};

// Route definition
router.post('/', asyncHandler(handleClerkWebhook));

export default router;
