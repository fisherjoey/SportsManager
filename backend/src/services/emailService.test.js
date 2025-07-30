/**
 * @fileoverview Unit tests for Email Service
 * @requires jest
 * @requires ../services/emailService
 * 
 * Test Coverage:
 * - Invitation email sending
 * - Password reset email sending
 * - Email template generation
 * - Error handling scenarios
 * - API key validation
 * 
 * @author Claude Agent
 * @date 2025-01-23
 */

const emailService = require('./emailService');
const { 
  validInvitationEmailData, 
  validPasswordResetEmailData,
  emailServiceResponses,
  invitationEmailVariations,
  invalidEmailData
} = require('../../tests/fixtures/emailData');

// Mock Resend
jest.mock('resend', () => {
  const mockSend = jest.fn();
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend
      }
    })),
    mockSend // Export for test access
  };
});

describe('EmailService', () => {
  let mockEmailsSend;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@resend.dev';
    
    // Get the mock send function
    const resend = require('resend');
    const resendInstance = new resend.Resend();
    mockEmailsSend = resendInstance.emails.send;
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email with valid data', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act
      const result = await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      expect(mockEmailsSend).toHaveBeenCalledTimes(1);
      expect(mockEmailsSend).toHaveBeenCalledWith({
        from: 'test@resend.dev',
        to: validInvitationEmailData.email,
        subject: 'Invitation to join Sports Management System',
        html: expect.stringContaining(validInvitationEmailData.firstName),
        text: expect.stringContaining(validInvitationEmailData.invitationLink)
      });
      expect(result).toEqual(emailServiceResponses.success);
    });

    it('should include all required information in email content', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      const callArgs = mockEmailsSend.mock.calls[0][0];
      
      // Check HTML content
      expect(callArgs.html).toContain(validInvitationEmailData.firstName);
      expect(callArgs.html).toContain(validInvitationEmailData.lastName);
      expect(callArgs.html).toContain(validInvitationEmailData.role);
      expect(callArgs.html).toContain(validInvitationEmailData.invitationLink);
      expect(callArgs.html).toContain(validInvitationEmailData.invitedBy);
      expect(callArgs.html).toContain('7 days'); // Expiration notice
      
      // Check text content
      expect(callArgs.text).toContain(validInvitationEmailData.firstName);
      expect(callArgs.text).toContain(validInvitationEmailData.invitationLink);
    });

    it('should handle different role types correctly', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act & Assert for each role variation
      for (const variation of invitationEmailVariations) {
        await emailService.sendInvitationEmail(variation);
        
        const callArgs = mockEmailsSend.mock.calls[mockEmailsSend.mock.calls.length - 1][0];
        expect(callArgs.html).toContain(variation.role);
        expect(callArgs.text).toContain(variation.role);
      }
    });

    it('should handle special characters in names', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);
      const specialCharData = {
        ...validInvitationEmailData,
        firstName: 'José',
        lastName: 'García-López'
      };

      // Act
      await emailService.sendInvitationEmail(specialCharData);

      // Assert
      const callArgs = mockEmailsSend.mock.calls[0][0];
      expect(callArgs.html).toContain('José');
      expect(callArgs.html).toContain('García-López');
    });

    it('should throw error when Resend API fails', async () => {
      // Arrange
      mockEmailsSend.mockRejectedValue(new Error(emailServiceResponses.error.message));

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow(emailServiceResponses.error.message);
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = new Error(emailServiceResponses.rateLimitError.message);
      rateLimitError.name = emailServiceResponses.rateLimitError.name;
      mockEmailsSend.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow(emailServiceResponses.rateLimitError.message);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new Error(emailServiceResponses.authError.message);
      authError.name = emailServiceResponses.authError.name;
      mockEmailsSend.mockRejectedValue(authError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow(emailServiceResponses.authError.message);
    });

    it('should log success message on successful send', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invitation email sent successfully:',
        emailServiceResponses.success.data.id
      );

      consoleSpy.mockRestore();
    });

    it('should log error message on failure', async () => {
      // Arrange
      const error = new Error('Test error');
      mockEmailsSend.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('Test error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send invitation email:',
        error
      );

      consoleSpy.mockRestore();
    });

    it('should use fallback FROM_EMAIL when not configured', async () => {
      // Arrange
      delete process.env.FROM_EMAIL;
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      const callArgs = mockEmailsSend.mock.calls[0][0];
      expect(callArgs.from).toBe('noreply@yourdomain.com');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with valid data', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act
      const result = await emailService.sendPasswordResetEmail(validPasswordResetEmailData);

      // Assert
      expect(mockEmailsSend).toHaveBeenCalledTimes(1);
      expect(mockEmailsSend).toHaveBeenCalledWith({
        from: 'test@resend.dev',
        to: validPasswordResetEmailData.email,
        subject: 'Password Reset - Sports Management System',
        html: expect.stringContaining(validPasswordResetEmailData.firstName),
        text: expect.stringContaining(validPasswordResetEmailData.resetLink)
      });
      expect(result).toEqual(emailServiceResponses.success);
    });

    it('should include reset link and expiration notice', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act
      await emailService.sendPasswordResetEmail(validPasswordResetEmailData);

      // Assert
      const callArgs = mockEmailsSend.mock.calls[0][0];
      
      expect(callArgs.html).toContain(validPasswordResetEmailData.resetLink);
      expect(callArgs.html).toContain('1 hour'); // Password reset expiration
      expect(callArgs.text).toContain(validPasswordResetEmailData.resetLink);
      expect(callArgs.text).toContain('1 hour');
    });

    it('should throw error when Resend API fails', async () => {
      // Arrange
      mockEmailsSend.mockRejectedValue(new Error('Password reset email failed'));

      // Act & Assert
      await expect(
        emailService.sendPasswordResetEmail(validPasswordResetEmailData)
      ).rejects.toThrow('Password reset email failed');
    });

    it('should log success message on successful send', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await emailService.sendPasswordResetEmail(validPasswordResetEmailData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Password reset email sent successfully:',
        emailServiceResponses.success.data.id
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.code = 'ECONNREFUSED';
      mockEmailsSend.mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockEmailsSend.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle malformed API responses', async () => {
      // Arrange
      mockEmailsSend.mockResolvedValue(null);

      // Act
      const result = await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing API key gracefully', async () => {
      // Arrange
      delete process.env.RESEND_API_KEY;
      
      // The service should still attempt to send but Resend will reject
      const authError = new Error('API key is required');
      mockEmailsSend.mockRejectedValue(authError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('API key is required');
    });

    it('should use environment variables correctly', async () => {
      // Arrange
      process.env.FROM_EMAIL = 'custom@test.com';
      mockEmailsSend.mockResolvedValue(emailServiceResponses.success);

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      const callArgs = mockEmailsSend.mock.calls[0][0];
      expect(callArgs.from).toBe('custom@test.com');
    });
  });
});