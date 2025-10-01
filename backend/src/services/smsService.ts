import Twilio from 'twilio';

export interface AssignmentSMSData {
  phoneNumber: string;
  firstName: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
  };
  dashboardLink: string;
}

export interface ReminderSMSData {
  phoneNumber: string;
  firstName: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    time: string;
    location: string;
  };
  hoursUntilGame: number;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logged?: boolean;
}

export class SMSService {
  private client: Twilio.Twilio | null = null;
  private isConfigured: boolean = false;
  private fromNumber: string = '';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';

    if (accountSid && authToken && this.fromNumber) {
      this.client = Twilio(accountSid, authToken);
      this.isConfigured = true;
      console.log('✅ SMS Service initialized with Twilio');
    } else {
      console.warn('⚠️ TWILIO credentials not set - SMS functionality will be disabled');
      this.isConfigured = false;
    }
  }

  /**
   * Reinitialize service (useful for testing)
   */
  reinitialize(): void {
    this.initialize();
  }

  /**
   * Send assignment notification SMS
   */
  async sendAssignmentSMS(data: AssignmentSMSData): Promise<SMSResult> {
    try {
      if (!this.isConfigured || !this.client) {
        console.log('SMS service not configured - assignment SMS logged:');
        console.log(`To: ${data.phoneNumber}`);
        console.log(`Message: New game assigned: ${data.game.homeTeam} vs ${data.game.awayTeam} on ${new Date(data.game.date).toLocaleDateString()} at ${data.game.time}`);
        return {
          success: true,
          logged: true
        };
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(data.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      const message = this.formatAssignmentSMS(data);

      const result = await this.client.messages.create({
        to: data.phoneNumber,
        from: this.fromNumber,
        body: message
      });

      console.log(`✅ Assignment SMS sent to ${data.phoneNumber}: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid
      };

    } catch (error: any) {
      console.error('Failed to send assignment SMS:', error);
      return {
        success: false,
        error: error.message,
        logged: true
      };
    }
  }

  /**
   * Send game reminder SMS
   */
  async sendReminderSMS(data: ReminderSMSData): Promise<SMSResult> {
    try {
      if (!this.isConfigured || !this.client) {
        console.log('SMS service not configured - reminder SMS logged');
        return { success: true, logged: true };
      }

      if (!this.isValidPhoneNumber(data.phoneNumber)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      const message = this.formatReminderSMS(data);

      const result = await this.client.messages.create({
        to: data.phoneNumber,
        from: this.fromNumber,
        body: message
      });

      console.log(`✅ Reminder SMS sent to ${data.phoneNumber}: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid
      };

    } catch (error: any) {
      console.error('Failed to send reminder SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format assignment notification SMS
   */
  private formatAssignmentSMS(data: AssignmentSMSData): string {
    const gameDate = new Date(data.game.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return `Hi ${data.firstName}, you've been assigned: ${data.game.homeTeam} vs ${data.game.awayTeam} on ${gameDate} at ${data.game.time}. Check your email or visit ${data.dashboardLink} to respond.`;
  }

  /**
   * Format reminder SMS
   */
  private formatReminderSMS(data: ReminderSMSData): string {
    return `⚽ Game Reminder: ${data.game.homeTeam} vs ${data.game.awayTeam} in ${data.hoursUntilGame} hours at ${data.game.time}. Location: ${data.game.location}`;
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   */
  static formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If already starts with country code, return with +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }

    // If 10 digits, add country code
    if (cleaned.length === 10) {
      return countryCode + cleaned;
    }

    // Return as-is if already formatted
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    return phoneNumber;
  }
}

export default new SMSService();
