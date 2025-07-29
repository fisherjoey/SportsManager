/**
 * @fileoverview Fixed unit tests for Email Service
 */

// Mock Resend before requiring the service
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend
    }
  }))
}));

// Clear modules to ensure fresh import
jest.resetModules();

describe('EmailService Fixed Tests', () => {
  // Import after mocking
  const emailService = require('./emailService');

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure API key is set for tests that expect Resend to be configured
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@resend.dev';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  describe('sendInvitationEmail - Successful Cases', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee',
      invitationLink: 'http://localhost:3000/signup?token=abc123',
      invitedBy: 'Admin User'
    };

    it('should send email successfully when Resend is configured', async () => {
      // Arrange
      mockSend.mockResolvedValue({ data: { id: 'email-123' } });

      // Act
      const result = await emailService.sendInvitationEmail(validData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('test@resend.dev');
      expect(callArgs.to).toBe(validData.email);
      expect(callArgs.subject).toBe('Invitation to join Sports Management System');
      expect(callArgs.html).toContain(validData.firstName);
      expect(callArgs.html).toContain(validData.invitationLink);
    });

    it('should handle fallback scenarios gracefully', async () => {
      // Arrange - no API key
      delete process.env.RESEND_API_KEY;
      
      // Act
      const result = await emailService.sendInvitationEmail(validData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Email service not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('sendInvitationEmail - Error Handling', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee',
      invitationLink: 'http://localhost:3000/signup',
      invitedBy: 'Admin'
    };

    it('should handle Resend API errors gracefully', async () => {
      // Arrange
      mockSend.mockResolvedValue({ 
        error: { 
          statusCode: 500,
          message: 'API Error' 
        } 
      });

      // Act
      const result = await emailService.sendInvitationEmail(validData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.logged).toBe(true);
    });

    it('should handle testing restrictions', async () => {
      // Arrange
      mockSend.mockResolvedValue({ 
        error: { 
          statusCode: 403,
          message: 'Domain not configured for testing emails' 
        } 
      });

      // Act
      const result = await emailService.sendInvitationEmail(validData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.logged).toBe(true);
      expect(result.invitationLink).toBe(validData.invitationLink);
      expect(result.message).toContain('testing restrictions');
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error');
      mockSend.mockRejectedValue(networkError);

      // Act
      const result = await emailService.sendInvitationEmail(validData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('sendPasswordResetEmail', () => {
    const resetData = {
      email: 'test@example.com',
      firstName: 'John',
      resetLink: 'http://localhost:3000/reset?token=xyz789'
    };

    it('should send password reset email successfully', async () => {
      // Arrange
      mockSend.mockResolvedValue({ data: { id: 'reset-123' } });

      // Act
      const result = await emailService.sendPasswordResetEmail(resetData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe(resetData.email);
      expect(callArgs.subject).toBe('Password Reset - Sports Management System');
      expect(callArgs.html).toContain(resetData.resetLink);
    });

    it('should handle password reset errors', async () => {
      // Arrange
      mockSend.mockResolvedValue({ 
        error: { message: 'Reset failed' } 
      });

      // Act
      const result = await emailService.sendPasswordResetEmail(resetData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reset failed');
    });
  });
});