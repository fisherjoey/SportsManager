const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  async sendInvitationEmail({ email, firstName, lastName, role, invitationLink, invitedBy }) {
    try {
      const subject = `Invitation to join Sports Management System`;
      
      const htmlContent = `
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
              <p>Hello ${firstName} ${lastName},</p>
              
              <p>You have been invited by ${invitedBy} to join our Sports Management System as a <strong>${role}</strong>.</p>
              
              <p>Our platform helps manage:</p>
              <ul>
                <li>Game assignments and scheduling</li>
                <li>Referee management and availability</li>
                <li>Payment tracking and reporting</li>
                <li>League and tournament organization</li>
              </ul>
              
              <p>To complete your registration and access the system, please click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Complete Registration</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${invitationLink}
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

      const textContent = `
Hello ${firstName} ${lastName},

You have been invited by ${invitedBy} to join our Sports Management System as a ${role}.

Our platform helps manage game assignments, referee scheduling, payment tracking, and league organization.

To complete your registration, please visit:
${invitationLink}

Important: This invitation link will expire in 7 days for security reasons.

If you didn't expect this invitation, you can safely ignore this email.
      `.trim();

      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('Invitation email sent successfully:', result.data?.id);
      return result;
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail({ email, firstName, resetLink }) {
    try {
      const subject = `Password Reset - Sports Management System`;
      
      const htmlContent = `
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
              <p>Hello ${firstName},</p>
              
              <p>We received a request to reset your password for your Sports Management System account.</p>
              
              <p>To reset your password, please click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetLink}
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

      const textContent = `
Hello ${firstName},

We received a request to reset your password for your Sports Management System account.

To reset your password, please visit:
${resetLink}

Important: This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.
      `.trim();

      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('Password reset email sent successfully:', result.data?.id);
      return result;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();