/**
 * @fileoverview Unit tests for Email Service - Focused on core functionality
 * @author Claude Agent
 * @date 2025-01-23
 */

// Create a more direct mock
const mockSend = jest.fn();

// Mock Resend before requiring the service
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend
    }
  }))
}));

// Now require the service
const emailService = require('./emailService');

describe('EmailService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@resend.dev';
  });

  describe('sendInvitationEmail', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe', 
      role: 'referee',
      invitationLink: 'http://localhost:3000/signup?token=abc123',
      invitedBy: 'Admin User'
    };

    it('should send email with correct parameters', async () => {
      // Arrange
      mockSend.mockResolvedValue({ data: { id: 'email-123' } });

      // Act
      await emailService.sendInvitationEmail(validData);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      
      expect(callArgs.from).toBe('test@resend.dev');
      expect(callArgs.to).toBe(validData.email);
      expect(callArgs.subject).toBe('Invitation to join Sports Management System');
      expect(callArgs.html).toContain(validData.firstName);
      expect(callArgs.html).toContain(validData.invitationLink);
      expect(callArgs.text).toContain(validData.firstName);
    });

    it('should handle API errors', async () => {
      // Arrange
      mockSend.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(emailService.sendInvitationEmail(validData))
        .rejects.toThrow('API Error');
    });

    it('should use fallback FROM_EMAIL', async () => {
      // Arrange
      delete process.env.FROM_EMAIL;
      mockSend.mockResolvedValue({ data: { id: 'test' } });

      // Act
      await emailService.sendInvitationEmail(validData);

      // Assert
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('noreply@yourdomain.com');
    });

    it('should include all required content', async () => {
      // Arrange
      mockSend.mockResolvedValue({ data: { id: 'test' } });

      // Act
      await emailService.sendInvitationEmail(validData);

      // Assert
      const callArgs = mockSend.mock.calls[0][0];
      
      // Check HTML content
      expect(callArgs.html).toContain(validData.firstName);
      expect(callArgs.html).toContain(validData.lastName);
      expect(callArgs.html).toContain(validData.role);
      expect(callArgs.html).toContain(validData.invitationLink);
      expect(callArgs.html).toContain(validData.invitedBy);
      
      // Check text content
      expect(callArgs.text).toContain(validData.invitationLink);
    });
  });

  describe('sendPasswordResetEmail', () => {
    const resetData = {
      email: 'test@example.com',
      firstName: 'John',
      resetLink: 'http://localhost:3000/reset?token=xyz789'
    };

    it('should send password reset email', async () => {
      // Arrange
      mockSend.mockResolvedValue({ data: { id: 'reset-123' } });

      // Act
      await emailService.sendPasswordResetEmail(resetData);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      
      expect(callArgs.to).toBe(resetData.email);
      expect(callArgs.subject).toBe('Password Reset - Sports Management System');
      expect(callArgs.html).toContain(resetData.resetLink);
      expect(callArgs.html).toContain('1 hour');
    });
  });

  describe('Error Scenarios', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee',
      invitationLink: 'http://localhost:3000/signup',
      invitedBy: 'Admin'
    };

    it('should handle rate limiting', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      mockSend.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(emailService.sendInvitationEmail(validData))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new Error('Invalid API key');
      authError.status = 401;
      mockSend.mockRejectedValue(authError);

      // Act & Assert
      await expect(emailService.sendInvitationEmail(validData))
        .rejects.toThrow('Invalid API key');
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.code = 'ECONNREFUSED';
      mockSend.mockRejectedValue(networkError);

      // Act & Assert
      await expect(emailService.sendInvitationEmail(validData))
        .rejects.toThrow('Network error');
    });
  });

  describe('Logging', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'referee', 
      invitationLink: 'http://localhost:3000/signup',
      invitedBy: 'Admin'
    };

    afterEach(() => {
      // Restore console methods after each test
      if (console.log.mockRestore) {
        console.log.mockRestore();
      }
      if (console.error.mockRestore) {
        console.error.mockRestore();
      }
    });

    it('should log success', async () => {
      // Arrange
      mockSend.mockResolvedValue({ data: { id: 'success-123' } });
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await emailService.sendInvitationEmail(validData);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Invitation email sent successfully:',
        'success-123'
      );
    });

    it('should log errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockSend.mockRejectedValue(error);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(emailService.sendInvitationEmail(validData))
        .rejects.toThrow('Test error');

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        error
      );
    });
  });
});