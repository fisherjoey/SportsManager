/**
 * @fileoverview Mock data fixtures for email service testing
 * @author Claude Agent
 * @date 2025-01-23
 */

const validInvitationEmailData = {
  email: 'test.referee@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'referee',
  invitationLink: 'http://localhost:3000/complete-signup?token=abc123',
  invitedBy: 'Admin User'
};

const validPasswordResetEmailData = {
  email: 'test.user@example.com',
  firstName: 'Jane',
  resetLink: 'http://localhost:3000/reset-password?token=xyz789'
};

const emailServiceResponses = {
  success: {
    data: {
      id: 'email-123-456',
      from: 'onboarding@resend.dev',
      to: 'test@example.com',
      subject: 'Test Email',
      created_at: '2025-01-23T10:00:00.000Z'
    }
  },
  error: {
    name: 'validation_error',
    message: 'Invalid email address'
  },
  rateLimitError: {
    name: 'rate_limit_exceeded',
    message: 'Rate limit exceeded'
  },
  authError: {
    name: 'invalid_access',
    message: 'Invalid API key'
  }
};

const invitationEmailVariations = [
  { ...validInvitationEmailData, role: 'referee' },
  { ...validInvitationEmailData, role: 'admin' },
  { ...validInvitationEmailData, firstName: 'María', lastName: 'González' }, // Special characters
  { ...validInvitationEmailData, invitedBy: 'System Administrator' }
];

const invalidEmailData = [
  { ...validInvitationEmailData, email: '' },
  { ...validInvitationEmailData, email: 'invalid-email' },
  { ...validInvitationEmailData, firstName: '' },
  { ...validInvitationEmailData, lastName: '' },
  { ...validInvitationEmailData, invitationLink: '' }
];

module.exports = {
  validInvitationEmailData,
  validPasswordResetEmailData,
  emailServiceResponses,
  invitationEmailVariations,
  invalidEmailData
};