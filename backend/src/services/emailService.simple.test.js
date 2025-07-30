/**
 * @fileoverview Simplified unit tests for Email Service
 * @requires jest
 * 
 * Test Coverage:
 * - Basic email sending functionality
 * - Error handling
 * - Template content validation
 * 
 * @author Claude Agent
 * @date 2025-01-23
 */

const { validInvitationEmailData } = require('../../tests/fixtures/emailData');

// Mock the entire Resend module
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn()
    }
  }))
}));

// Import the email service after mocking
const emailService = require('./emailService');

describe('EmailService - Basic Tests', () => {
  let mockResendSend;

  beforeEach(() => {
    // Get the mocked Resend constructor
    const { Resend } = require('resend');
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a fresh instance and get the send method
    const resendInstance = new Resend('test-key');
    mockResendSend = resendInstance.emails.send;
    
    // Set up environment
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@resend.dev';
  });

  describe('sendInvitationEmail', () => {
    it('should call Resend send method with correct parameters', async () => {
      // Arrange
      const expectedResponse = { data: { id: 'email-123' } };
      mockResendSend.mockResolvedValue(expectedResponse);

      // Act
      const result = await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'test@resend.dev',
        to: validInvitationEmailData.email,
        subject: 'Invitation to join Sports Management System',
        html: expect.stringContaining(validInvitationEmailData.firstName),
        text: expect.stringContaining(validInvitationEmailData.invitationLink)
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should include all required data in email content', async () => {
      // Arrange
      mockResendSend.mockResolvedValue({ data: { id: 'test' } });

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      const callArgs = mockResendSend.mock.calls[0][0];
      
      // Check that all important content is included
      expect(callArgs.html).toContain(validInvitationEmailData.firstName);
      expect(callArgs.html).toContain(validInvitationEmailData.lastName);
      expect(callArgs.html).toContain(validInvitationEmailData.role);
      expect(callArgs.html).toContain(validInvitationEmailData.invitationLink);
      expect(callArgs.html).toContain(validInvitationEmailData.invitedBy);
      
      expect(callArgs.text).toContain(validInvitationEmailData.firstName);
      expect(callArgs.text).toContain(validInvitationEmailData.invitationLink);
    });

    it('should throw error when Resend API fails', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockResendSend.mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('API Error');
      
      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should handle different role types', async () => {
      // Arrange
      mockResendSend.mockResolvedValue({ data: { id: 'test' } });
      const adminInvitation = { ...validInvitationEmailData, role: 'admin' };

      // Act
      await emailService.sendInvitationEmail(adminInvitation);

      // Assert
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('admin');
      expect(callArgs.text).toContain('admin');
    });

    it('should use fallback FROM_EMAIL when not configured', async () => {
      // Arrange
      delete process.env.FROM_EMAIL;
      mockResendSend.mockResolvedValue({ data: { id: 'test' } });

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.from).toBe('noreply@yourdomain.com');
    });
  });

  describe('sendPasswordResetEmail', () => {
    const passwordResetData = {
      email: 'test@example.com',
      firstName: 'John',
      resetLink: 'http://localhost:3000/reset?token=abc123'
    };

    it('should send password reset email with correct parameters', async () => {
      // Arrange
      mockResendSend.mockResolvedValue({ data: { id: 'reset-email-123' } });

      // Act
      const result = await emailService.sendPasswordResetEmail(passwordResetData);

      // Assert
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'test@resend.dev',
        to: passwordResetData.email,
        subject: 'Password Reset - Sports Management System',
        html: expect.stringContaining(passwordResetData.firstName),
        text: expect.stringContaining(passwordResetData.resetLink)
      });
    });

    it('should include reset link and expiration notice', async () => {
      // Arrange
      mockResendSend.mockResolvedValue({ data: { id: 'test' } });

      // Act
      await emailService.sendPasswordResetEmail(passwordResetData);

      // Assert
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain(passwordResetData.resetLink);
      expect(callArgs.html).toContain('1 hour'); // Expiration time
      expect(callArgs.text).toContain(passwordResetData.resetLink);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.code = 'ECONNREFUSED';
      mockResendSend.mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('Network error');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      mockResendSend.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new Error('Invalid API key');
      authError.status = 401;
      mockResendSend.mockRejectedValue(authError);

      // Act & Assert
      await expect(
        emailService.sendInvitationEmail(validInvitationEmailData)
      ).rejects.toThrow('Invalid API key');
    });
  });

  describe('Logging', () => {
    it('should log success message on successful send', async () => {
      // Arrange
      const successResponse = { data: { id: 'email-success-123' } };
      mockResendSend.mockResolvedValue(successResponse);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await emailService.sendInvitationEmail(validInvitationEmailData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invitation email sent successfully:',
        'email-success-123'
      );

      consoleSpy.mockRestore();
    });

    it('should log error message on failure', async () => {
      // Arrange
      const error = new Error('Test error');
      mockResendSend.mockRejectedValue(error);
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
  });
});