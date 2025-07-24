const emailService = require('../../src/services/emailService');

// Mock Resend module
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn()
    }
  }))
}));

describe('EmailService', () => {
  let originalEnv;
  let mockResendSend;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Get the mocked send function
    const { Resend } = require('resend');
    mockResendSend = new Resend().emails.send;
    mockResendSend.mockClear();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Email Service Initialization', () => {
    it('should initialize Resend when API key is provided', () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      
      // Re-require the module to test initialization
      delete require.cache[require.resolve('../../src/services/emailService')];
      require('../../src/services/emailService');
      
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should warn when no API key is provided', () => {
      delete process.env.RESEND_API_KEY;
      
      // Re-require the module to test initialization
      delete require.cache[require.resolve('../../src/services/emailService')];
      require('../../src/services/emailService');
      
      expect(console.warn).toHaveBeenCalledWith('RESEND_API_KEY not set - email functionality will be disabled');
    });
  });

  describe('sendInvitationEmail', () => {
    const invitationData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee',
      invitationLink: 'http://localhost:3000/complete-signup?token=abc123',
      invitedBy: 'Admin User'
    };

    describe('when Resend is configured', () => {
      beforeEach(() => {
        process.env.RESEND_API_KEY = 'test-api-key';
        process.env.FROM_EMAIL = 'test@sports.com';
      });

      it('should send invitation email successfully', async () => {
        const mockResult = { data: { id: 'email-123' } };
        mockResendSend.mockResolvedValue(mockResult);

        const result = await emailService.sendInvitationEmail(invitationData);

        expect(mockResendSend).toHaveBeenCalledWith({
          from: 'test@sports.com',
          to: 'test@example.com',
          subject: 'Invitation to join Sports Management System',
          html: expect.stringContaining('Hello John Doe'),
          text: expect.stringContaining('Hello John Doe')
        });

        expect(result).toBe(mockResult);
        expect(console.log).toHaveBeenCalledWith('Invitation email sent successfully:', 'email-123');
      });

      it('should include correct content in email', async () => {
        mockResendSend.mockResolvedValue({ data: { id: 'email-123' } });

        await emailService.sendInvitationEmail(invitationData);

        const callArgs = mockResendSend.mock.calls[0][0];
        
        // Check HTML content
        expect(callArgs.html).toContain('Hello John Doe');
        expect(callArgs.html).toContain('invited by Admin User');
        expect(callArgs.html).toContain('referee');
        expect(callArgs.html).toContain('http://localhost:3000/complete-signup?token=abc123');
        expect(callArgs.html).toContain('expire in 7 days');

        // Check text content
        expect(callArgs.text).toContain('Hello John Doe');
        expect(callArgs.text).toContain('invited by Admin User');
        expect(callArgs.text).toContain('referee');
        expect(callArgs.text).toContain('http://localhost:3000/complete-signup?token=abc123');
      });

      it('should use default FROM_EMAIL when not specified', async () => {
        delete process.env.FROM_EMAIL;
        mockResendSend.mockResolvedValue({ data: { id: 'email-123' } });

        await emailService.sendInvitationEmail(invitationData);

        const callArgs = mockResendSend.mock.calls[0][0];
        expect(callArgs.from).toBe('noreply@yourdomain.com');
      });

      it('should throw error when email sending fails', async () => {
        const error = new Error('Email service error');
        mockResendSend.mockRejectedValue(error);

        await expect(emailService.sendInvitationEmail(invitationData))
          .rejects.toThrow('Email service error');

        expect(console.error).toHaveBeenCalledWith('Failed to send invitation email:', error);
      });
    });

    describe('when Resend is not configured', () => {
      beforeEach(() => {
        delete process.env.RESEND_API_KEY;
        // Re-require to reinitialize without API key
        delete require.cache[require.resolve('../../src/services/emailService')];
      });

      it('should log invitation details to console', async () => {
        const emailService = require('../../src/services/emailService');
        
        const result = await emailService.sendInvitationEmail(invitationData);

        expect(console.log).toHaveBeenCalledWith('Email service not configured - invitation details:');
        expect(console.log).toHaveBeenCalledWith('To: test@example.com');
        expect(console.log).toHaveBeenCalledWith('Name: John Doe');
        expect(console.log).toHaveBeenCalledWith('Role: referee');
        expect(console.log).toHaveBeenCalledWith('Invitation Link: http://localhost:3000/complete-signup?token=abc123');
        expect(console.log).toHaveBeenCalledWith('Invited By: Admin User');

        expect(result).toEqual({
          success: true,
          message: 'Email service not configured - invitation logged to console'
        });

        expect(mockResendSend).not.toHaveBeenCalled();
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    const resetData = {
      email: 'test@example.com',
      firstName: 'John',
      resetLink: 'http://localhost:3000/reset-password?token=reset123'
    };

    describe('when Resend is configured', () => {
      beforeEach(() => {
        process.env.RESEND_API_KEY = 'test-api-key';
        process.env.FROM_EMAIL = 'test@sports.com';
      });

      it('should send password reset email successfully', async () => {
        const mockResult = { data: { id: 'email-456' } };
        mockResendSend.mockResolvedValue(mockResult);

        const result = await emailService.sendPasswordResetEmail(resetData);

        expect(mockResendSend).toHaveBeenCalledWith({
          from: 'test@sports.com',
          to: 'test@example.com',
          subject: 'Password Reset - Sports Management System',
          html: expect.stringContaining('Hello John'),
          text: expect.stringContaining('Hello John')
        });

        expect(result).toBe(mockResult);
      });

      it('should include reset link in email content', async () => {
        mockResendSend.mockResolvedValue({ data: { id: 'email-456' } });

        await emailService.sendPasswordResetEmail(resetData);

        const callArgs = mockResendSend.mock.calls[0][0];
        expect(callArgs.html).toContain('http://localhost:3000/reset-password?token=reset123');
        expect(callArgs.text).toContain('http://localhost:3000/reset-password?token=reset123');
      });
    });

    describe('when Resend is not configured', () => {
      beforeEach(() => {
        delete process.env.RESEND_API_KEY;
        delete require.cache[require.resolve('../../src/services/emailService')];
      });

      it('should log reset details to console', async () => {
        const emailService = require('../../src/services/emailService');
        
        const result = await emailService.sendPasswordResetEmail(resetData);

        expect(console.log).toHaveBeenCalledWith('Email service not configured - password reset details:');
        expect(console.log).toHaveBeenCalledWith('To: test@example.com');
        expect(console.log).toHaveBeenCalledWith('Name: John');
        expect(console.log).toHaveBeenCalledWith('Reset Link: http://localhost:3000/reset-password?token=reset123');

        expect(result).toEqual({
          success: true,
          message: 'Email service not configured - reset logged to console'
        });
      });
    });
  });
});