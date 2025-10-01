/**
 * EmailService - Email sending service using Resend API
 *
 * This service handles sending various types of emails including invitations
 * and password resets with proper error handling and testing environment support.
 */

import { Resend } from 'resend';

// Type definitions for email operations
export interface InvitationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  invitationLink: string;
  invitedBy: string;
}

export interface PasswordResetEmailData {
  email: string;
  firstName: string;
  resetLink: string;
}

export interface AssignmentEmailData {
  email: string;
  firstName: string;
  lastName: string;
  assignment: {
    id: string;
    position: string;
    calculatedWage: number;
  };
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
    location: string;
    level: string;
    payRate: number;
    wageMultiplier?: number;
    wageMultiplierReason?: string;
  };
  assignor: {
    name: string;
    email: string;
  };
  acceptLink: string;
  declineLink: string;
}

export interface AssignorNotificationData {
  email: string;
  name: string;
  referee: {
    name: string;
    email: string;
  };
  game: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
  };
  status: 'accepted' | 'declined';
  declineReason?: string;
  declineCategory?: string;
}

export interface EmailResult {
  success: boolean;
  message?: string;
  error?: string;
  logged?: boolean;
  invitationLink?: string;
  resetLink?: string;
  recipientEmail?: string;
  data?: {
    id: string;
    [key: string]: any;
  };
}

export interface ResendError {
  statusCode?: number;
  error?: string;
  message?: string;
}

export interface ResendResponse {
  data?: {
    id: string;
    [key: string]: any;
  };
  error?: ResendError;
}

export class EmailService {
  private resend: Resend | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeResend();
  }

  /**
   * Initialize Resend client if API key is available
   * @private
   */
  private initializeResend(): void {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.isConfigured = true;
    } else {
      console.warn('RESEND_API_KEY not set - email functionality will be disabled');
      this.isConfigured = false;
    }
  }

  /**
   * Send invitation email to a new user
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailResult> {
    try {
      // If Resend is not configured, log the invitation details and return
      if (!this.isConfigured || !this.resend) {
        console.log('Email service not configured - invitation details:');
        console.log(`To: ${data.email}`);
        console.log(`Name: ${data.firstName} ${data.lastName}`);
        console.log(`Role: ${data.role}`);
        console.log(`Invitation Link: ${data.invitationLink}`);
        console.log(`Invited By: ${data.invitedBy}`);
        return {
          success: true,
          message: 'Email service not configured - invitation logged to console'
        };
      }

      // In development/testing mode, log details for any email restrictions
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 Sending invitation email to: ${data.email}`);
        console.log(`🔗 Invitation link: ${data.invitationLink}`);
      }

      const subject = `Invitation to join Sports Management System`;

      const htmlContent = this.generateInvitationHtml(data);
      const textContent = this.generateInvitationText(data);

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }) as ResendResponse;

      // Check if the result contains an error (Resend API can return errors without throwing)
      if (result.error) {
        return this.handleResendError(result.error, {
          type: 'invitation',
          email: data.email,
          link: data.invitationLink,
          userName: data.invitedBy
        });
      }

      console.log('Invitation email sent successfully:', result.data?.id);
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return this.handleEmailError(error as Error, {
        type: 'invitation',
        email: data.email,
        link: data.invitationLink,
        userName: data.invitedBy
      });
    }
  }

  /**
   * Send password reset email to a user
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
    try {
      // If Resend is not configured, log the reset details and return
      if (!this.isConfigured || !this.resend) {
        console.log('Email service not configured - password reset details:');
        console.log(`To: ${data.email}`);
        console.log(`Name: ${data.firstName}`);
        console.log(`Reset Link: ${data.resetLink}`);
        return {
          success: true,
          message: 'Email service not configured - reset logged to console'
        };
      }

      // In development/testing mode, log details for any email restrictions
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Sending password reset email to: ${data.email}`);
        console.log(`🔗 Reset link: ${data.resetLink}`);
      }

      const subject = `Password Reset - Sports Management System`;

      const htmlContent = this.generatePasswordResetHtml(data);
      const textContent = this.generatePasswordResetText(data);

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }) as ResendResponse;

      // Check if the result contains an error (Resend API can return errors without throwing)
      if (result.error) {
        return this.handleResendError(result.error, {
          type: 'reset',
          email: data.email,
          link: data.resetLink,
          userName: data.firstName
        });
      }

      console.log('Password reset email sent successfully:', result.data?.id);
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return this.handleEmailError(error as Error, {
        type: 'reset',
        email: data.email,
        link: data.resetLink,
        userName: data.firstName
      });
    }
  }

  /**
   * Generate HTML content for invitation email
   * @private
   */
  private generateInvitationHtml(data: InvitationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to Sports Management System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
          .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Sports Management System</h1>
            <h2>You're Invited!</h2>
          </div>

          <div class="content">
            <p>Hello ${data.firstName} ${data.lastName},</p>

            <p>You have been invited by ${data.invitedBy} to join our Sports Management System as a <strong>${data.role}</strong>.</p>

            <p>Our platform helps manage:</p>
            <ul>
              <li>Game assignments and scheduling</li>
              <li>Referee management and availability</li>
              <li>Payment tracking and reporting</li>
              <li>League and tournament organization</li>
            </ul>

            <p>To complete your registration and access the system, please click the button below:</p>

            <div style="text-align: center;">
              <a href="${data.invitationLink}" class="button">Complete Registration</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${data.invitationLink}
            </p>

            <p><strong>Important:</strong> This invitation link will expire in 7 days for security reasons.</p>
          </div>

          <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>For support, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for invitation email
   * @private
   */
  private generateInvitationText(data: InvitationEmailData): string {
    return `
Hello ${data.firstName} ${data.lastName},

You have been invited by ${data.invitedBy} to join our Sports Management System as a ${data.role}.

Our platform helps manage game assignments, referee scheduling, payment tracking, and league organization.

To complete your registration, please visit:
${data.invitationLink}

Important: This invitation link will expire in 7 days for security reasons.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim();
  }

  /**
   * Generate HTML content for password reset email
   * @private
   */
  private generatePasswordResetHtml(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
          .button {
            display: inline-block;
            background-color: #dc3545;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Sports Management System</h1>
            <h2>Password Reset Request</h2>
          </div>

          <div class="content">
            <p>Hello ${data.firstName},</p>

            <p>We received a request to reset your password for your Sports Management System account.</p>

            <p>To reset your password, please click the button below:</p>

            <div style="text-align: center;">
              <a href="${data.resetLink}" class="button">Reset Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${data.resetLink}
            </p>

            <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
          </div>

          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>For support, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for password reset email
   * @private
   */
  private generatePasswordResetText(data: PasswordResetEmailData): string {
    return `
Hello ${data.firstName},

We received a request to reset your password for your Sports Management System account.

To reset your password, please visit:
${data.resetLink}

Important: This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.
    `.trim();
  }

  /**
   * Handle Resend API errors that come in the response
   * @private
   */
  private handleResendError(error: ResendError, context: {
    type: 'invitation' | 'reset';
    email: string;
    link: string;
    userName: string;
  }): EmailResult {
    const errorMessage = error.error || error.message || '';

    if (error.statusCode === 403 && (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain'))) {
      const emoji = context.type === 'invitation' ? '📧' : '🔐';
      console.warn(`${emoji} Resend testing restriction: ${errorMessage}`);
      console.log(`🔗 ${context.type === 'invitation' ? 'Invitation' : 'Password reset'} link for ${context.email}: ${context.link}`);
      console.log(`👤 ${context.type === 'invitation' ? 'Invited by' : 'User'}: ${context.userName}`);

      return {
        success: true,
        message: 'Email logged due to testing restrictions - see console for invitation link',
        logged: true,
        [context.type === 'invitation' ? 'invitationLink' : 'resetLink']: context.link,
        recipientEmail: context.email
      };
    } else {
      console.error(`Failed to send ${context.type} email:`, error);
      return {
        success: false,
        error: errorMessage,
        logged: true,
        [context.type === 'invitation' ? 'invitationLink' : 'resetLink']: context.link,
        recipientEmail: context.email
      };
    }
  }

  /**
   * Handle errors thrown during email sending
   * @private
   */
  private handleEmailError(error: Error & { statusCode?: number; error?: string }, context: {
    type: 'invitation' | 'reset';
    email: string;
    link: string;
    userName: string;
  }): EmailResult {
    const errorMessage = error.error || error.message || '';

    if (error.statusCode === 403 && (errorMessage.includes('testing emails') || errorMessage.includes('verify a domain'))) {
      const emoji = context.type === 'invitation' ? '📧' : '🔐';
      console.warn(`${emoji} Resend testing restriction: ${errorMessage}`);
      console.log(`🔗 ${context.type === 'invitation' ? 'Invitation' : 'Password reset'} link for ${context.email}: ${context.link}`);
      console.log(`👤 ${context.type === 'invitation' ? 'Invited by' : 'User'}: ${context.userName}`);

      return {
        success: true,
        message: 'Email logged due to testing restrictions - see console for invitation link',
        logged: true,
        [context.type === 'invitation' ? 'invitationLink' : 'resetLink']: context.link,
        recipientEmail: context.email
      };
    }

    console.error(`Failed to send ${context.type} email:`, error);
    // Don't throw the error - let invitation/reset creation succeed even if email fails
    return {
      success: false,
      error: error.message,
      logged: true,
      [context.type === 'invitation' ? 'invitationLink' : 'resetLink']: context.link,
      recipientEmail: context.email
    };
  }

  /**
   * Send game assignment notification email to referee
   */
  async sendAssignmentEmail(data: AssignmentEmailData): Promise<EmailResult> {
    try {
      if (!this.isConfigured || !this.resend) {
        console.log('Email service not configured - assignment details:');
        console.log(`To: ${data.email}`);
        console.log(`Game: ${data.game.homeTeam} vs ${data.game.awayTeam}`);
        console.log(`Position: ${data.assignment.position}`);
        console.log(`Date/Time: ${data.game.date} at ${data.game.time}`);
        console.log(`Location: ${data.game.location}`);
        console.log(`Wage: $${data.assignment.calculatedWage}`);
        console.log(`Accept Link: ${data.acceptLink}`);
        console.log(`Decline Link: ${data.declineLink}`);
        return {
          success: true,
          message: 'Email service not configured - assignment logged to console'
        };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🏀 Sending assignment email to: ${data.email}`);
        console.log(`📅 Game: ${data.game.homeTeam} vs ${data.game.awayTeam}`);
      }

      const subject = `New Game Assignment: ${data.game.homeTeam} vs ${data.game.awayTeam}`;
      const htmlContent = this.generateAssignmentHtml(data);
      const textContent = this.generateAssignmentText(data);

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }) as ResendResponse;

      if (result.error) {
        console.error('Assignment email error:', result.error);
        return {
          success: false,
          error: result.error.message || 'Failed to send assignment email',
          logged: true
        };
      }

      console.log('Assignment email sent successfully:', result.data?.id);
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error sending assignment email:', error);
      return {
        success: false,
        error: (error as Error).message,
        logged: true
      };
    }
  }

  /**
   * Send status update notification to assignor
   */
  async sendAssignorNotificationEmail(data: AssignorNotificationData): Promise<EmailResult> {
    try {
      if (!this.isConfigured || !this.resend) {
        console.log('Email service not configured - assignor notification:');
        console.log(`To: ${data.email}`);
        console.log(`Referee: ${data.referee.name} ${data.status} assignment`);
        console.log(`Game: ${data.game.homeTeam} vs ${data.game.awayTeam}`);
        if (data.declineReason) {
          console.log(`Reason: ${data.declineReason}`);
        }
        return {
          success: true,
          message: 'Email service not configured - notification logged to console'
        };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`📬 Sending assignor notification to: ${data.email}`);
      }

      const subject = `Assignment ${data.status === 'accepted' ? 'Accepted' : 'Declined'}: ${data.game.homeTeam} vs ${data.game.awayTeam}`;
      const htmlContent = this.generateAssignorNotificationHtml(data);
      const textContent = this.generateAssignorNotificationText(data);

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: data.email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }) as ResendResponse;

      if (result.error) {
        console.error('Assignor notification error:', result.error);
        return {
          success: false,
          error: result.error.message || 'Failed to send assignor notification',
          logged: true
        };
      }

      console.log('Assignor notification sent successfully:', result.data?.id);
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error sending assignor notification:', error);
      return {
        success: false,
        error: (error as Error).message,
        logged: true
      };
    }
  }

  /**
   * Generate HTML content for assignment email
   * @private
   */
  private generateAssignmentHtml(data: AssignmentEmailData): string {
    const wageInfo = data.game.wageMultiplier && data.game.wageMultiplier !== 1.0
      ? `<p><strong>Base Pay Rate:</strong> $${data.game.payRate} × ${data.game.wageMultiplier} (${data.game.wageMultiplierReason || 'Special rate'})</p>`
      : `<p><strong>Pay Rate:</strong> $${data.game.payRate}</p>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Game Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
          .game-details { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 5px;
            font-weight: bold;
          }
          .accept-btn { background-color: #28a745; color: white; }
          .decline-btn { background-color: #dc3545; color: white; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Game Assignment</h1>
          </div>

          <div class="content">
            <p>Hello ${data.firstName} ${data.lastName},</p>

            <p>You have been assigned to referee a game by <strong>${data.assignor.name}</strong>.</p>

            <div class="game-details">
              <h3>📋 Game Details</h3>
              <p><strong>Match:</strong> ${data.game.homeTeam} vs ${data.game.awayTeam}</p>
              <p><strong>Date:</strong> ${data.game.date}</p>
              <p><strong>Time:</strong> ${data.game.time}</p>
              <p><strong>Location:</strong> ${data.game.location}</p>
              <p><strong>Position:</strong> ${data.assignment.position}</p>
              <p><strong>Level:</strong> ${data.game.level}</p>
              ${wageInfo}
              <p style="font-size: 18px; color: #28a745;"><strong>Your Wage: $${data.assignment.calculatedWage.toFixed(2)}</strong></p>
            </div>

            <p><strong>Please respond to this assignment:</strong></p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${data.acceptLink}" class="button accept-btn">✓ Accept Assignment</a>
              <a href="${data.declineLink}" class="button decline-btn">✗ Decline Assignment</a>
            </div>

            <p style="font-size: 14px; color: #666;">
              If the buttons don't work, copy and paste these links:<br>
              Accept: ${data.acceptLink}<br>
              Decline: ${data.declineLink}
            </p>
          </div>

          <div class="footer">
            <p>If you have questions about this assignment, please contact ${data.assignor.name} at ${data.assignor.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for assignment email
   * @private
   */
  private generateAssignmentText(data: AssignmentEmailData): string {
    return `
Game Assignment - ${data.game.homeTeam} vs ${data.game.awayTeam}

Hello ${data.firstName} ${data.lastName},

You have been assigned to referee a game by ${data.assignor.name}.

GAME DETAILS:
Match: ${data.game.homeTeam} vs ${data.game.awayTeam}
Date: ${data.game.date}
Time: ${data.game.time}
Location: ${data.game.location}
Position: ${data.assignment.position}
Level: ${data.game.level}
Your Wage: $${data.assignment.calculatedWage.toFixed(2)}

RESPOND TO ASSIGNMENT:
Accept: ${data.acceptLink}
Decline: ${data.declineLink}

If you have questions, contact ${data.assignor.name} at ${data.assignor.email}
    `.trim();
  }

  /**
   * Generate HTML content for assignor notification
   * @private
   */
  private generateAssignorNotificationHtml(data: AssignorNotificationData): string {
    const statusColor = data.status === 'accepted' ? '#28a745' : '#dc3545';
    const statusIcon = data.status === 'accepted' ? '✓' : '✗';
    const statusText = data.status === 'accepted' ? 'ACCEPTED' : 'DECLINED';

    const declineInfo = data.declineReason
      ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3>📝 Decline Reason</h3>
          ${data.declineCategory ? `<p><strong>Category:</strong> ${data.declineCategory}</p>` : ''}
          <p><strong>Details:</strong> ${data.declineReason}</p>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Assignment ${statusText}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
          .game-details { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusIcon} Assignment ${statusText}</h1>
          </div>

          <div class="content">
            <p>Hello ${data.name},</p>

            <p><strong>${data.referee.name}</strong> has <strong>${data.status}</strong> the assignment for:</p>

            <div class="game-details">
              <p><strong>Match:</strong> ${data.game.homeTeam} vs ${data.game.awayTeam}</p>
              <p><strong>Date:</strong> ${data.game.date}</p>
              <p><strong>Time:</strong> ${data.game.time}</p>
            </div>

            ${declineInfo}

            <p>You can view and manage this assignment in the system dashboard.</p>
          </div>

          <div class="footer">
            <p>Referee Contact: ${data.referee.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for assignor notification
   * @private
   */
  private generateAssignorNotificationText(data: AssignorNotificationData): string {
    const statusText = data.status === 'accepted' ? 'ACCEPTED' : 'DECLINED';
    const declineInfo = data.declineReason
      ? `\n\nDECLINE REASON:\n${data.declineCategory ? `Category: ${data.declineCategory}\n` : ''}Details: ${data.declineReason}`
      : '';

    return `
Assignment ${statusText}

Hello ${data.name},

${data.referee.name} has ${data.status} the assignment for:

GAME DETAILS:
Match: ${data.game.homeTeam} vs ${data.game.awayTeam}
Date: ${data.game.date}
Time: ${data.game.time}${declineInfo}

Referee Contact: ${data.referee.email}
    `.trim();
  }
}

// Export a singleton instance
export default new EmailService();