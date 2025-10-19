# Multi-Channel Notification System Setup Guide

The Sports Management System includes a comprehensive multi-channel notification system that supports:
- **In-app notifications** (bell icon in the UI)
- **Email notifications** (via Resend)
- **SMS notifications** (via Twilio)

Users can configure their notification preferences for each channel and notification type.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Email Setup (Resend)](#email-setup-resend)
3. [SMS Setup (Twilio)](#sms-setup-twilio)
4. [Testing Notifications](#testing-notifications)
5. [User Preferences](#user-preferences)
6. [Notification Types](#notification-types)

---

## Quick Start

The notification system works out-of-the-box with **in-app notifications only**. Email and SMS are optional and require API keys.

### Without External Services
If you don't configure email/SMS services:
- ✅ In-app notifications work normally
- ✅ Email/SMS content logged to console (for debugging)
- ✅ No errors or failures

### With External Services
Configure environment variables to enable email and/or SMS delivery.

---

## Email Setup (Resend)

### 1. Create Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (includes 100 emails/day)
3. Navigate to **API Keys** in the dashboard
4. Create a new API key

### 2. Add Domain (Optional for Production)
For production environments:
1. Go to **Domains** in Resend dashboard
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records as instructed
4. Verify domain ownership

For development, you can use the default testing mode.

### 3. Configure Environment Variables
Add to your `backend/.env` file:

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

**Testing Mode Notes:**
- Free tier can only send to verified email addresses
- Logs will show email content if delivery fails
- Check console for invitation/reset links

### 4. Test Email Functionality
```bash
# Backend will log email details
cd backend
npm run dev

# Trigger a notification via the Communications page
# or use the broadcast notification API
```

---

## SMS Setup (Twilio)

### 1. Create Twilio Account
1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free trial account ($15 credit)
3. Navigate to **Console Dashboard**

### 2. Get Credentials
From the Twilio Console Dashboard:
- **Account SID**: Found on main dashboard
- **Auth Token**: Click to reveal on main dashboard
- **Phone Number**: Get a trial phone number from **Phone Numbers** → **Manage** → **Buy a number**

### 3. Configure Environment Variables
Add to your `backend/.env` file:

```bash
# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+12345678900
```

**Trial Account Notes:**
- Can only send to verified phone numbers
- Messages include "Sent from your Twilio trial account"
- Limited to verified numbers until you upgrade

### 4. Verify Phone Numbers (Trial)
1. Go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **Add a new caller ID**
3. Enter phone number and complete verification

### 5. Phone Number Format
Phone numbers must be in E.164 format:
- ✅ `+12345678900` (correct)
- ❌ `(234) 567-8900` (incorrect)
- ❌ `234-567-8900` (incorrect)

The system includes auto-formatting for US numbers.

---

## Testing Notifications

### 1. Test Broadcast Notification
Use the Communications Management page in the admin dashboard:

1. Navigate to **Admin** → **Communications**
2. Click **New Communication**
3. Fill in:
   - **Title**: Test Notification
   - **Content**: This is a test message
   - **Type**: System
   - **Priority**: Medium
   - **Target Audience**: Select specific users or all users
4. Click **Create Communication**

### 2. Check Delivery
- **In-app**: Check the bell icon in the top navigation
- **Email**: Check inbox (or console logs if not configured)
- **SMS**: Check phone (or console logs if not configured)

### 3. Console Logging
When services are not configured, detailed logs appear in the backend console:

```
📧 Email service not configured - notification details:
To: user@example.com
Title: Test Notification
Message: This is a test message
Link: http://localhost:3000/dashboard
```

---

## User Preferences

Users can customize their notification preferences via **Settings** → **Notifications**:

### Available Preferences

| Setting | Description | Default |
|---------|-------------|---------|
| `in_app_enabled` | Show in-app notifications (bell icon) | `true` |
| `email_assignments` | Email for new game assignments | `true` |
| `email_reminders` | Email for game reminders | `true` |
| `email_status_changes` | Email for assignment status changes | `true` |
| `sms_assignments` | SMS for new game assignments | `false` |
| `sms_reminders` | SMS for game reminders | `false` |

### Preference Logic
- **Email**: Defaults to enabled for most notification types
- **SMS**: Defaults to disabled (opt-in only)
- **System notifications**: Always sent via email, never via SMS
- Missing phone number → SMS automatically disabled

---

## Notification Types

### 1. Assignment Notifications
**Triggered when:** Referee assigned to a game
**Channels:** In-app, Email, SMS (if enabled)
**Preference keys:** `email_assignments`, `sms_assignments`

### 2. Reminder Notifications
**Triggered when:** Game approaching (24h, 2h before)
**Channels:** In-app, Email, SMS (if enabled)
**Preference keys:** `email_reminders`, `sms_reminders`

### 3. Status Change Notifications
**Triggered when:** Assignment accepted/declined
**Channels:** In-app, Email
**Preference keys:** `email_status_changes`

### 4. System Notifications
**Triggered when:** Admin broadcasts important messages
**Channels:** In-app, Email
**Note:** Always sent via email, never SMS

---

## Architecture Overview

### Notification Flow
```
User Action/Event
    ↓
NotificationService.createNotification()
    ↓
┌─────────────────┬──────────────────┬─────────────────┐
│   In-App        │     Email        │      SMS        │
│  (Database)     │   (Resend API)   │  (Twilio API)   │
└─────────────────┴──────────────────┴─────────────────┘
    ↓                   ↓                    ↓
  User UI           User Inbox          User Phone
```

### Services
- **NotificationService**: Orchestrates multi-channel delivery
- **EmailService**: Handles Resend API integration
- **SMSService**: Handles Twilio API integration

### Database Tables
- `notifications`: In-app notification records
- `notification_preferences`: User-specific settings

---

## Troubleshooting

### Email Not Sending
1. **Check API Key**: Verify `RESEND_API_KEY` in `.env`
2. **Check Domain**: Resend free tier requires verified domain or test mode
3. **Check Logs**: Look for error messages in backend console
4. **Verify Email**: In test mode, only verified emails work

### SMS Not Sending
1. **Check Credentials**: Verify Twilio credentials in `.env`
2. **Check Phone Format**: Must be E.164 format (`+12345678900`)
3. **Trial Restrictions**: Trial accounts can only send to verified numbers
4. **Check Balance**: Ensure Twilio account has credit

### User Not Receiving Notifications
1. **Check Preferences**: User may have disabled that notification type
2. **Check Phone Number**: Must be present and in E.164 format
3. **Check Email**: User must have valid email address
4. **Check Logs**: Backend logs show which channels were attempted

---

## Cost Estimates

### Resend (Email)
- **Free Tier**: 100 emails/day, 3,000/month
- **Pro Tier**: $20/month for 50,000 emails
- **Growth**: $80/month for 100,000 emails

### Twilio (SMS)
- **Trial**: $15 credit (≈150 SMS)
- **Pay-as-you-go**: $0.0079/SMS (US)
- **Monthly**: No base fee, pay per message

### Recommendations
- Start with free/trial tiers
- Monitor usage via dashboards
- Consider budget limits for production
- Email is more cost-effective than SMS

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate keys regularly** (every 90 days recommended)
4. **Limit permissions** on API keys when possible
5. **Monitor usage** for unusual activity
6. **Validate user data** before sending notifications
7. **Rate limit** notification sending to prevent abuse

---

## Support

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Twilio Documentation**: [https://www.twilio.com/docs](https://www.twilio.com/docs)
- **System Issues**: Check backend logs and console output
