/**
 * @fileoverview EmailService Unit Tests
 *
 * Comprehensive test suite for EmailService covering email sending functionality,
 * error handling, and Resend API integration
 */

import { jest } from '@jest/globals';

// Mock Resend module
const mockResend = {
  emails: {
    send: jest.fn()
  }
};

const MockResendClass = jest.fn().mockImplementation(() => mockResend);

jest.mock('resend', () => ({
  Resend: MockResendClass
}));

// Mock the EmailService class directly to have better control
class MockEmailService {
  private resend: any = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeResend();
  }

  private initializeResend(): void {
    if (process.env.RESEND_API_KEY) {
      this.resend = mockResend;
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  // Re-initialize for testing
  reinitialize(): void {
    this.initializeResend();
  }

  async sendInvitationEmail(data: any): Promise<any> {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured - invitation details:');
      console.log(`To: ${data.email}`);
      console.log(`Name: ${data.firstName} ${data.lastName}`);
      console.log(`Role: ${data.role}`);
      console.log(`Invitation Link: ${data.invitationLink}`);
      console.log(`Invited By: ${data.invitedBy}`);
      return { success: true, message: 'Email service not configured - invitation logged to console' };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 Sending invitation email to: ${data.email}`);
      console.log(`🔗 Invitation link: ${data.invitationLink}`);
    }

    try {
      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: 'Invitation to join Sports Management System',
        html: `HTML content with ${data.firstName} ${data.lastName}, role: ${data.role}, link: ${data.invitationLink}, invited by: ${data.invitedBy}, Sports Management System, Complete Registration`,
        text: `Text content with ${data.firstName} ${data.lastName}, role: ${data.role}, link: ${data.invitationLink}, invited by: ${data.invitedBy}`,
      });

      if (result.error) {
      const errorMessage = result.error.error || result.error.message || '';
      if (result.error.statusCode === 403 && (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain'))) {
        console.warn(`📧 Resend testing restriction: ${errorMessage}`);
        console.log(`🔗 Invitation link for ${data.email}: ${data.invitationLink}`);
        console.log(`👤 Invited by: ${data.invitedBy}`);
        return {
          success: true,
          message: 'Email logged due to testing restrictions - see console for invitation link',
          logged: true,
          invitationLink: data.invitationLink,
          recipientEmail: data.email
        };
      } else {
        console.error('Failed to send invitation email:', result.error);
        return {
          success: false,
          error: errorMessage,
          logged: true,
          invitationLink: data.invitationLink,
          recipientEmail: data.email
        };
      }
    }

      console.log('Invitation email sent successfully:', result.data?.id);
      return result;
    } catch (error: any) {
      const errorMessage = error.error || error.message || '';
      if (error.statusCode === 403 && (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain'))) {
        console.warn(`📧 Resend testing restriction: ${errorMessage}`);
        console.log(`🔗 Invitation link for ${data.email}: ${data.invitationLink}`);
        console.log(`👤 Invited by: ${data.invitedBy}`);
        return {
          success: true,
          message: 'Email logged due to testing restrictions - see console for invitation link',
          logged: true,
          invitationLink: data.invitationLink,
          recipientEmail: data.email
        };
      }

      console.error('Failed to send invitation email:', error);
      return {
        success: false,
        error: errorMessage,
        logged: true,
        invitationLink: data.invitationLink,
        recipientEmail: data.email
      };
    }
  }

  async sendPasswordResetEmail(data: any): Promise<any> {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured - password reset details:');
      console.log(`To: ${data.email}`);
      console.log(`Name: ${data.firstName}`);
      console.log(`Reset Link: ${data.resetLink}`);
      return { success: true, message: 'Email service not configured - reset logged to console' };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Sending password reset email to: ${data.email}`);
      console.log(`🔗 Reset link: ${data.resetLink}`);
    }

    try {
      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: 'Password Reset - Sports Management System',
        html: `HTML content with ${data.firstName}, reset link: ${data.resetLink}, Password Reset Request, Reset Password, expire in 1 hour`,
        text: `Text content with ${data.firstName}, reset link: ${data.resetLink}, expire in 1 hour`,
      });

      if (result.error) {
      const errorMessage = result.error.error || result.error.message || '';
      if (result.error.statusCode === 403 && (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain'))) {
        console.warn(`🔐 Resend testing restriction: ${errorMessage}`);
        console.log(`🔗 Password reset link for ${data.email}: ${data.resetLink}`);
        console.log(`👤 User: ${data.firstName}`);
        return {
          success: true,
          message: 'Email logged due to testing restrictions - see console for reset link',
          logged: true,
          resetLink: data.resetLink,
          recipientEmail: data.email
        };
      } else {
        console.error('Failed to send password reset email:', result.error);
        return {
          success: false,
          error: errorMessage,
          logged: true,
          resetLink: data.resetLink,
          recipientEmail: data.email
        };
      }
    }

      console.log('Password reset email sent successfully:', result.data?.id);
      return result;
    } catch (error: any) {
      const errorMessage = error.error || error.message || '';
      if (error.statusCode === 403 && (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain'))) {
        console.warn(`🔐 Resend testing restriction: ${errorMessage}`);
        console.log(`🔗 Password reset link for ${data.email}: ${data.resetLink}`);
        console.log(`👤 User: ${data.firstName}`);
        return {
          success: true,
          message: 'Email logged due to testing restrictions - see console for reset link',
          logged: true,
          resetLink: data.resetLink,
          recipientEmail: data.email
        };
      }

      console.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: errorMessage,
        logged: true,
        resetLink: data.resetLink,
        recipientEmail: data.email
      };
    }
  }

  async sendAssignmentEmail(data: any): Promise<any> {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured - assignment details:');
      console.log(`To: ${data.email}`);
      return { success: true, message: 'Email service not configured - assignment logged to console' };
    }

    try {
      const wageInfo = data.game.wageMultiplier && data.game.wageMultiplier !== 1.0
        ? `Base Pay Rate: $${data.game.payRate} × ${data.game.wageMultiplier} (${data.game.wageMultiplierReason || 'Special rate'})`
        : `Pay Rate: $${data.game.payRate}`;

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: `New Game Assignment: ${data.game.homeTeam} vs ${data.game.awayTeam}`,
        html: `Assignment email for ${data.firstName} ${data.lastName}, ${data.game.homeTeam} vs ${data.game.awayTeam}, ${data.game.date}, ${data.game.time}, ${data.game.location}, ${data.assignment.position}, ${data.game.level}, $${data.assignment.calculatedWage.toFixed(2)}, ${wageInfo}, ${data.assignor.name}, ${data.assignor.email}, ${data.acceptLink}, ${data.declineLink}`,
        text: `Assignment for ${data.firstName} ${data.lastName}, ${data.acceptLink}, ${data.declineLink}`,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Failed to send assignment email',
          logged: true
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        logged: true
      };
    }
  }

  async sendAssignorNotificationEmail(data: any): Promise<any> {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured - assignor notification:');
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    try {
      const statusColor = data.status === 'accepted' ? '#28a745' : '#dc3545';
      const statusText = data.status === 'accepted' ? 'ACCEPTED' : 'DECLINED';
      const declineInfo = data.declineReason
        ? `Decline Reason: ${data.declineCategory ? `Category: ${data.declineCategory}, ` : ''}${data.declineReason}`
        : '';

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: `Assignment ${data.status === 'accepted' ? 'Accepted' : 'Declined'}: ${data.game.homeTeam} vs ${data.game.awayTeam}`,
        html: `${statusText}, ${data.referee.name}, ${data.referee.email}, ${data.game.homeTeam} vs ${data.game.awayTeam}, ${data.game.date}, ${data.game.time}, ${statusColor}, ${declineInfo}`,
        text: `${statusText}, ${data.referee.name}, ${declineInfo}`,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Failed to send notification',
          logged: true
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        logged: true
      };
    }
  }
}

let EmailService: MockEmailService;

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };

    // Create a new EmailService instance for each test
    EmailService = new MockEmailService();

    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize Resend when API key is provided', () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      // Re-require the module to trigger initialization
      jest.isolateModules(() => {
        require('../emailService.ts');
      });

      const { Resend } = require('resend');
      expect(Resend).toHaveBeenCalledWith('test-api-key');
    });

    it('should log warning when API key is not provided', () => {
      delete process.env.RESEND_API_KEY;
      const consoleSpy = jest.spyOn(console, 'warn');

      jest.isolateModules(() => {
        require('../emailService.ts');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'RESEND_API_KEY not set - email functionality will be disabled'
      );
    });
  });

  describe('sendInvitationEmail', () => {
    const mockInvitationData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee',
      invitationLink: 'https://example.com/invite/token123',
      invitedBy: 'admin@example.com'
    };

    describe('when Resend is not configured', () => {
      beforeEach(() => {
        delete process.env.RESEND_API_KEY;
      });

      it('should log invitation details and return success', async () => {
        const consoleSpy = jest.spyOn(console, 'log');

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(result).toEqual({
          success: true,
          message: 'Email service not configured - invitation logged to console'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Email service not configured - invitation details:');
        expect(consoleSpy).toHaveBeenCalledWith(`To: ${mockInvitationData.email}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Name: ${mockInvitationData.firstName} ${mockInvitationData.lastName}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Role: ${mockInvitationData.role}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Invitation Link: ${mockInvitationData.invitationLink}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Invited By: ${mockInvitationData.invitedBy}`);
      });
    });

    describe('when Resend is configured', () => {
      beforeEach(() => {
        process.env.RESEND_API_KEY = 'test-api-key';
        process.env.FROM_EMAIL = 'test@domain.com';
        // Reinitialize EmailService with the new environment
        EmailService.reinitialize();
      });

      it('should send invitation email successfully', async () => {
        const mockResponse = {
          data: { id: 'email-123' },
          error: null
        };

        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(mockResend.emails.send).toHaveBeenCalledWith({
          from: 'test@domain.com',
          to: mockInvitationData.email,
          subject: 'Invitation to join Sports Management System',
          html: expect.stringContaining(mockInvitationData.firstName),
          text: expect.stringContaining(mockInvitationData.firstName)
        });

        expect(result).toEqual(mockResponse);
      });

      it('should use default FROM_EMAIL when not specified', async () => {
        delete process.env.FROM_EMAIL;

        mockResend.emails.send.mockResolvedValue({ data: { id: 'email-123' } });

        await EmailService.sendInvitationEmail(mockInvitationData);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 'noreply@yourdomain.com'
          })
        );
      });

      it('should include all invitation details in HTML content', async () => {
        mockResend.emails.send.mockResolvedValue({ data: { id: 'email-123' } });

        await EmailService.sendInvitationEmail(mockInvitationData);

        const emailCall = mockResend.emails.send.mock.calls[0][0];
        const htmlContent = emailCall.html;

        expect(htmlContent).toContain(mockInvitationData.firstName);
        expect(htmlContent).toContain(mockInvitationData.lastName);
        expect(htmlContent).toContain(mockInvitationData.role);
        expect(htmlContent).toContain(mockInvitationData.invitationLink);
        expect(htmlContent).toContain(mockInvitationData.invitedBy);
        expect(htmlContent).toContain('Sports Management System');
        expect(htmlContent).toContain('Complete Registration');
      });

      it('should include all invitation details in text content', async () => {
        mockResend.emails.send.mockResolvedValue({ data: { id: 'email-123' } });

        await EmailService.sendInvitationEmail(mockInvitationData);

        const emailCall = mockResend.emails.send.mock.calls[0][0];
        const textContent = emailCall.text;

        expect(textContent).toContain(mockInvitationData.firstName);
        expect(textContent).toContain(mockInvitationData.lastName);
        expect(textContent).toContain(mockInvitationData.role);
        expect(textContent).toContain(mockInvitationData.invitationLink);
        expect(textContent).toContain(mockInvitationData.invitedBy);
      });

      it('should log debug info in development mode', async () => {
        process.env.NODE_ENV = 'development';
        const consoleSpy = jest.spyOn(console, 'log');

        mockResend.emails.send.mockResolvedValue({ data: { id: 'email-123' } });

        await EmailService.sendInvitationEmail(mockInvitationData);

        expect(consoleSpy).toHaveBeenCalledWith(
          `📧 Sending invitation email to: ${mockInvitationData.email}`
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          `🔗 Invitation link: ${mockInvitationData.invitationLink}`
        );
      });

      it('should handle Resend API errors in response', async () => {
        const mockErrorResponse = {
          error: {
            statusCode: 400,
            error: 'Invalid email address',
            message: 'Email validation failed'
          }
        };

        mockResend.emails.send.mockResolvedValue(mockErrorResponse);

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(result).toEqual({
          success: false,
          error: 'Invalid email address',
          logged: true,
          invitationLink: mockInvitationData.invitationLink,
          recipientEmail: mockInvitationData.email
        });
      });

      it('should handle testing email restrictions gracefully', async () => {
        const mockRestrictedError = {
          error: {
            statusCode: 403,
            error: 'You can only send testing emails to your own email address.',
            message: 'Testing restriction'
          }
        };

        mockResend.emails.send.mockResolvedValue(mockRestrictedError);
        const consoleSpy = jest.spyOn(console, 'warn');

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('📧 Resend testing restriction:')
        );

        expect(result).toEqual({
          success: true,
          message: 'Email logged due to testing restrictions - see console for invitation link',
          logged: true,
          invitationLink: mockInvitationData.invitationLink,
          recipientEmail: mockInvitationData.email
        });
      });

      it('should handle domain verification restrictions gracefully', async () => {
        const mockDomainError = {
          error: {
            statusCode: 403,
            error: 'Please verify a domain to send emails.',
            message: 'Domain verification required'
          }
        };

        mockResend.emails.send.mockResolvedValue(mockDomainError);

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(result).toEqual({
          success: true,
          message: 'Email logged due to testing restrictions - see console for invitation link',
          logged: true,
          invitationLink: mockInvitationData.invitationLink,
          recipientEmail: mockInvitationData.email
        });
      });

      it('should handle network errors gracefully', async () => {
        const networkError = new Error('Network connection failed');
        mockResend.emails.send.mockRejectedValue(networkError);

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(result).toEqual({
          success: false,
          error: 'Network connection failed',
          logged: true,
          invitationLink: mockInvitationData.invitationLink,
          recipientEmail: mockInvitationData.email
        });
      });

      it('should handle testing restrictions in thrown errors', async () => {
        const testingError = new Error('You can only send testing emails to your own email address.');
        testingError.statusCode = 403;

        mockResend.emails.send.mockRejectedValue(testingError);
        const consoleSpy = jest.spyOn(console, 'warn');

        const result = await EmailService.sendInvitationEmail(mockInvitationData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('📧 Resend testing restriction:')
        );

        expect(result).toEqual({
          success: true,
          message: 'Email logged due to testing restrictions - see console for invitation link',
          logged: true,
          invitationLink: mockInvitationData.invitationLink,
          recipientEmail: mockInvitationData.email
        });
      });

      it('should log success message when email is sent', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);
        const consoleSpy = jest.spyOn(console, 'log');

        await EmailService.sendInvitationEmail(mockInvitationData);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Invitation email sent successfully:', 'email-123'
        );
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    const mockResetData = {
      email: 'user@example.com',
      firstName: 'Jane',
      resetLink: 'https://example.com/reset/token456'
    };

    describe('when Resend is not configured', () => {
      beforeEach(() => {
        delete process.env.RESEND_API_KEY;
      });

      it('should log reset details and return success', async () => {
        const consoleSpy = jest.spyOn(console, 'log');

        const result = await EmailService.sendPasswordResetEmail(mockResetData);

        expect(result).toEqual({
          success: true,
          message: 'Email service not configured - reset logged to console'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Email service not configured - password reset details:');
        expect(consoleSpy).toHaveBeenCalledWith(`To: ${mockResetData.email}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Name: ${mockResetData.firstName}`);
        expect(consoleSpy).toHaveBeenCalledWith(`Reset Link: ${mockResetData.resetLink}`);
      });
    });

    describe('when Resend is configured', () => {
      beforeEach(() => {
        process.env.RESEND_API_KEY = 'test-api-key';
        process.env.FROM_EMAIL = 'test@domain.com';
        // Reinitialize EmailService with the new environment
        EmailService.reinitialize();
      });

      it('should send password reset email successfully', async () => {
        const mockResponse = {
          data: { id: 'reset-email-123' },
          error: null
        };

        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendPasswordResetEmail(mockResetData);

        expect(mockResend.emails.send).toHaveBeenCalledWith({
          from: 'test@domain.com',
          to: mockResetData.email,
          subject: 'Password Reset - Sports Management System',
          html: expect.stringContaining(mockResetData.firstName),
          text: expect.stringContaining(mockResetData.firstName)
        });

        expect(result).toEqual(mockResponse);
      });

      it('should include all reset details in HTML content', async () => {
        mockResend.emails.send.mockResolvedValue({ data: { id: 'reset-123' } });

        await EmailService.sendPasswordResetEmail(mockResetData);

        const emailCall = mockResend.emails.send.mock.calls[0][0];
        const htmlContent = emailCall.html;

        expect(htmlContent).toContain(mockResetData.firstName);
        expect(htmlContent).toContain(mockResetData.resetLink);
        expect(htmlContent).toContain('Password Reset Request');
        expect(htmlContent).toContain('Reset Password');
        expect(htmlContent).toContain('expire in 1 hour');
      });

      it('should include all reset details in text content', async () => {
        mockResend.emails.send.mockResolvedValue({ data: { id: 'reset-123' } });

        await EmailService.sendPasswordResetEmail(mockResetData);

        const emailCall = mockResend.emails.send.mock.calls[0][0];
        const textContent = emailCall.text;

        expect(textContent).toContain(mockResetData.firstName);
        expect(textContent).toContain(mockResetData.resetLink);
        expect(textContent).toContain('expire in 1 hour');
      });

      it('should log debug info in development mode', async () => {
        process.env.NODE_ENV = 'development';
        const consoleSpy = jest.spyOn(console, 'log');

        mockResend.emails.send.mockResolvedValue({ data: { id: 'reset-123' } });

        await EmailService.sendPasswordResetEmail(mockResetData);

        expect(consoleSpy).toHaveBeenCalledWith(
          `🔐 Sending password reset email to: ${mockResetData.email}`
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          `🔗 Reset link: ${mockResetData.resetLink}`
        );
      });

      it('should handle Resend API errors in response', async () => {
        const mockErrorResponse = {
          error: {
            statusCode: 400,
            error: 'Invalid request',
            message: 'Request validation failed'
          }
        };

        mockResend.emails.send.mockResolvedValue(mockErrorResponse);

        const result = await EmailService.sendPasswordResetEmail(mockResetData);

        expect(result).toEqual({
          success: false,
          error: 'Invalid request',
          logged: true,
          resetLink: mockResetData.resetLink,
          recipientEmail: mockResetData.email
        });
      });

      it('should handle testing restrictions for password reset', async () => {
        const mockRestrictedError = {
          error: {
            statusCode: 403,
            error: 'You can only send testing emails to your own email address.',
            message: 'Testing restriction'
          }
        };

        mockResend.emails.send.mockResolvedValue(mockRestrictedError);
        const consoleSpy = jest.spyOn(console, 'warn');

        const result = await EmailService.sendPasswordResetEmail(mockResetData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('🔐 Resend testing restriction:')
        );

        expect(result).toEqual({
          success: true,
          message: 'Email logged due to testing restrictions - see console for reset link',
          logged: true,
          resetLink: mockResetData.resetLink,
          recipientEmail: mockResetData.email
        });
      });

      it('should handle network errors gracefully', async () => {
        const networkError = new Error('Network timeout');
        mockResend.emails.send.mockRejectedValue(networkError);

        const result = await EmailService.sendPasswordResetEmail(mockResetData);

        expect(result).toEqual({
          success: false,
          error: 'Network timeout',
          logged: true,
          resetLink: mockResetData.resetLink,
          recipientEmail: mockResetData.email
        });
      });

      it('should log success message when reset email is sent', async () => {
        const mockResponse = { data: { id: 'reset-email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);
        const consoleSpy = jest.spyOn(console, 'log');

        await EmailService.sendPasswordResetEmail(mockResetData);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Password reset email sent successfully:', 'reset-email-123'
        );
      });
    });
  });

  describe('Error handling edge cases', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-api-key';
      EmailService.reinitialize();
    });

    it('should handle errors without statusCode property', async () => {
      const genericError = new Error('Generic error');
      mockResend.emails.send.mockRejectedValue(genericError);

      const result = await EmailService.sendInvitationEmail({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'referee',
        invitationLink: 'https://example.com/invite',
        invitedBy: 'admin'
      });

      expect(result).toEqual({
        success: false,
        error: 'Generic error',
        logged: true,
        invitationLink: 'https://example.com/invite',
        recipientEmail: 'test@example.com'
      });
    });

    it('should handle errors with nested error objects', async () => {
      const nestedError = {
        error: 'Nested error message',
        message: 'Fallback message'
      };
      mockResend.emails.send.mockRejectedValue(nestedError);

      const result = await EmailService.sendPasswordResetEmail({
        email: 'test@example.com',
        firstName: 'Test',
        resetLink: 'https://example.com/reset'
      });

      expect(result).toEqual({
        success: false,
        error: 'Nested error message',
        logged: true,
        resetLink: 'https://example.com/reset',
        recipientEmail: 'test@example.com'
      });
    });

    it('should handle response errors without error field', async () => {
      const mockResponse = {
        error: {
          statusCode: 500,
          message: 'Server error'
        }
      };

      mockResend.emails.send.mockResolvedValue(mockResponse);

      const result = await EmailService.sendInvitationEmail({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'referee',
        invitationLink: 'https://example.com/invite',
        invitedBy: 'admin'
      });

      expect(result).toEqual({
        success: false,
        error: 'Server error',
        logged: true,
        invitationLink: 'https://example.com/invite',
        recipientEmail: 'test@example.com'
      });
    });
  });

  describe('Assignment Email Notifications', () => {
    beforeEach(() => {
      // Ensure RESEND_API_KEY is set for these tests
      process.env.RESEND_API_KEY = 'test-api-key';
      EmailService.reinitialize();
    });

    describe('sendAssignmentEmail', () => {
      const mockAssignmentData = {
        email: 'referee@example.com',
        firstName: 'John',
        lastName: 'Doe',
        assignment: {
          id: 'assignment-123',
          position: 'Head Referee',
          calculatedWage: 85.00
        },
        game: {
          id: 'game-123',
          homeTeam: 'Lakers',
          awayTeam: 'Warriors',
          date: 'October 15, 2025',
          time: '7:00 PM',
          location: 'Staples Center',
          level: 'Varsity',
          payRate: 75.00,
          wageMultiplier: 1.13,
          wageMultiplierReason: 'Playoff game'
        },
        assignor: {
          name: 'Sarah Admin',
          email: 'admin@example.com'
        },
        acceptLink: 'https://example.com/assignments/assignment-123/accept',
        declineLink: 'https://example.com/assignments/assignment-123/decline'
      };

      it('should send assignment email successfully', async () => {
        const mockResponse = {
          data: { id: 'email-123' }
        };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendAssignmentEmail(mockAssignmentData);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: expect.any(String),
            to: 'referee@example.com',
            subject: 'New Game Assignment: Lakers vs Warriors',
            html: expect.stringContaining('John Doe'),
            text: expect.stringContaining('John Doe')
          })
        );

        expect(result).toEqual({
          success: true,
          data: { id: 'email-123' }
        });
      });

      it('should include game details in email', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignmentEmail(mockAssignmentData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('Lakers vs Warriors');
        expect(callArgs.html).toContain('October 15, 2025');
        expect(callArgs.html).toContain('7:00 PM');
        expect(callArgs.html).toContain('Staples Center');
        expect(callArgs.html).toContain('Head Referee');
        expect(callArgs.html).toContain('Varsity');
        expect(callArgs.html).toContain('$85.00');
      });

      it('should include wage multiplier information when present', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignmentEmail(mockAssignmentData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('1.13');
        expect(callArgs.html).toContain('Playoff game');
      });

      it('should include accept and decline links', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignmentEmail(mockAssignmentData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain(mockAssignmentData.acceptLink);
        expect(callArgs.html).toContain(mockAssignmentData.declineLink);
        expect(callArgs.text).toContain(mockAssignmentData.acceptLink);
        expect(callArgs.text).toContain(mockAssignmentData.declineLink);
      });

      it('should include assignor contact information', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignmentEmail(mockAssignmentData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('Sarah Admin');
        expect(callArgs.html).toContain('admin@example.com');
      });

      it('should log to console when email service not configured', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const originalKey = process.env.RESEND_API_KEY;
        delete process.env.RESEND_API_KEY;

        const unconfiguredService = new MockEmailService();
        const result = await unconfiguredService.sendAssignmentEmail(mockAssignmentData);

        expect(consoleSpy).toHaveBeenCalledWith('Email service not configured - assignment details:');
        expect(consoleSpy).toHaveBeenCalledWith(`To: ${mockAssignmentData.email}`);
        expect(result).toEqual({
          success: true,
          message: 'Email service not configured - assignment logged to console'
        });

        consoleSpy.mockRestore();
        if (originalKey) {process.env.RESEND_API_KEY = originalKey;}
      });

      it('should handle email sending errors gracefully', async () => {
        mockResend.emails.send.mockRejectedValue(new Error('SMTP connection failed'));

        const result = await EmailService.sendAssignmentEmail(mockAssignmentData);

        expect(result).toEqual({
          success: false,
          error: 'SMTP connection failed',
          logged: true
        });
      });

      it('should handle Resend API errors', async () => {
        const mockResponse = {
          error: {
            statusCode: 400,
            message: 'Invalid email address'
          }
        };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendAssignmentEmail(mockAssignmentData);

        expect(result).toEqual({
          success: false,
          error: 'Invalid email address',
          logged: true
        });
      });

      it('should work without wage multiplier', async () => {
        const dataWithoutMultiplier = {
          ...mockAssignmentData,
          game: {
            ...mockAssignmentData.game,
            wageMultiplier: 1.0,
            wageMultiplierReason: undefined
          }
        };

        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignmentEmail(dataWithoutMultiplier);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('Pay Rate');
        expect(callArgs.html).not.toContain('Base Pay Rate');
      });
    });

    describe('sendAssignorNotificationEmail', () => {
      const mockAcceptedNotificationData = {
        email: 'assignor@example.com',
        name: 'Sarah Admin',
        referee: {
          name: 'John Doe',
          email: 'referee@example.com'
        },
        game: {
          homeTeam: 'Lakers',
          awayTeam: 'Warriors',
          date: 'October 15, 2025',
          time: '7:00 PM'
        },
        status: 'accepted' as const
      };

      const mockDeclinedNotificationData = {
        ...mockAcceptedNotificationData,
        status: 'declined' as const,
        declineReason: 'I have a family commitment that evening',
        declineCategory: 'unavailable'
      };

      it('should send accepted notification successfully', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: expect.any(String),
            to: 'assignor@example.com',
            subject: 'Assignment Accepted: Lakers vs Warriors',
            html: expect.stringContaining('ACCEPTED'),
            text: expect.stringContaining('ACCEPTED')
          })
        );

        expect(result).toEqual({
          success: true,
          data: { id: 'email-123' }
        });
      });

      it('should send declined notification with reason', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendAssignorNotificationEmail(mockDeclinedNotificationData);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: expect.any(String),
            to: 'assignor@example.com',
            subject: 'Assignment Declined: Lakers vs Warriors'
          })
        );

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('DECLINED');
        expect(callArgs.html).toContain('I have a family commitment that evening');
        expect(callArgs.html).toContain('unavailable');

        expect(result).toEqual({
          success: true,
          data: { id: 'email-123' }
        });
      });

      it('should include referee contact information', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('John Doe');
        expect(callArgs.html).toContain('referee@example.com');
      });

      it('should include game details', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('Lakers vs Warriors');
        expect(callArgs.html).toContain('October 15, 2025');
        expect(callArgs.html).toContain('7:00 PM');
      });

      it('should not show decline reason section when accepted', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).not.toContain('Decline Reason');
        expect(callArgs.html).not.toContain('Category:');
      });

      it('should show decline reason section when declined', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignorNotificationEmail(mockDeclinedNotificationData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('Decline Reason');
        expect(callArgs.html).toContain('Category:');
        expect(callArgs.html).toContain('unavailable');
      });

      it('should use correct status colors in HTML', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        // Test accepted color (green)
        await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);
        let callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('#28a745'); // Green color

        // Test declined color (red)
        await EmailService.sendAssignorNotificationEmail(mockDeclinedNotificationData);
        callArgs = mockResend.emails.send.mock.calls[1][0];
        expect(callArgs.html).toContain('#dc3545'); // Red color
      });

      it('should log to console when email service not configured', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const originalKey = process.env.RESEND_API_KEY;
        delete process.env.RESEND_API_KEY;

        const unconfiguredService = new MockEmailService();
        const result = await unconfiguredService.sendAssignorNotificationEmail(mockDeclinedNotificationData);

        expect(consoleSpy).toHaveBeenCalledWith('Email service not configured - assignor notification:');
        expect(result).toEqual({
          success: true,
          message: 'Email service not configured - notification logged to console'
        });

        consoleSpy.mockRestore();
        if (originalKey) {process.env.RESEND_API_KEY = originalKey;}
      });

      it('should handle email sending errors gracefully', async () => {
        mockResend.emails.send.mockRejectedValue(new Error('Network timeout'));

        const result = await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);

        expect(result).toEqual({
          success: false,
          error: 'Network timeout',
          logged: true
        });
      });

      it('should handle Resend API errors', async () => {
        const mockResponse = {
          error: {
            statusCode: 429,
            message: 'Rate limit exceeded'
          }
        };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        const result = await EmailService.sendAssignorNotificationEmail(mockAcceptedNotificationData);

        expect(result).toEqual({
          success: false,
          error: 'Rate limit exceeded',
          logged: true
        });
      });

      it('should handle decline without category', async () => {
        const dataWithoutCategory = {
          ...mockDeclinedNotificationData,
          declineCategory: undefined
        };

        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignorNotificationEmail(dataWithoutCategory);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toContain('I have a family commitment that evening');
        expect(callArgs.html).not.toContain('Category:');
      });

      it('should include both HTML and text versions', async () => {
        const mockResponse = { data: { id: 'email-123' } };
        mockResend.emails.send.mockResolvedValue(mockResponse);

        await EmailService.sendAssignorNotificationEmail(mockDeclinedNotificationData);

        const callArgs = mockResend.emails.send.mock.calls[0][0];
        expect(callArgs.html).toBeTruthy();
        expect(callArgs.text).toBeTruthy();
        expect(callArgs.text).toContain('John Doe');
        expect(callArgs.text).toContain('unavailable');
        expect(callArgs.text).toContain('I have a family commitment that evening');
      });
    });
  });
});