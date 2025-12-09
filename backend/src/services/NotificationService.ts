import { UUID } from '../types';
import db from '../config/database';
import emailService from './emailService';
import smsService from './smsService';

export interface NotificationEntity {
  id: UUID;
  user_id: UUID;
  type: 'assignment' | 'status_change' | 'reminder' | 'system';
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

export interface CreateNotificationData {
  user_id: UUID;
  type: NotificationEntity['type'];
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

export interface NotificationListResult {
  notifications: NotificationEntity[];
  unreadCount: number;
  total: number;
}

export class NotificationService {
  /**
   * Create a new notification and send via enabled channels
   */
  async createNotification(data: CreateNotificationData): Promise<NotificationEntity | null> {
    try {
      // Get user preferences and details
      const prefs = await (db as any)('notification_preferences')
        .where('user_id', data.user_id)
        .first();

      const user = await (db as any)('users')
        .where('id', data.user_id)
        .select('email', 'first_name', 'last_name', 'phone')
        .first();

      if (!user) {
        console.error(`User not found: ${data.user_id}`);
        return null;
      }

      // Create in-app notification if enabled
      let notification = null;
      if (!prefs || prefs.in_app_enabled !== false) {
        [notification] = await (db as any)('notifications')
          .insert({
            ...data,
            created_at: new Date()
          })
          .returning('*');

        console.log(`✅ In-app notification created for user ${data.user_id}: ${data.title}`);
      }

      // Send email notification based on type and preferences
      if (this.shouldSendEmail(data.type, prefs)) {
        await this.sendEmailNotification(user, data);
      }

      // Send SMS notification based on type and preferences
      if (this.shouldSendSMS(data.type, prefs, user.phone)) {
        await this.sendSMSNotification(user, data);
      }

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Determine if email should be sent based on type and preferences
   */
  private shouldSendEmail(type: string, prefs: any): boolean {
    if (!prefs) {return true;} // Default to sending if no preferences set

    switch (type) {
      case 'assignment':
        return prefs.email_assignments !== false;
      case 'reminder':
        return prefs.email_reminders !== false;
      case 'status_change':
        return prefs.email_status_changes !== false;
      case 'system':
        return true; // Always send system notifications
      default:
        return true;
    }
  }

  /**
   * Determine if SMS should be sent based on type and preferences
   */
  private shouldSendSMS(type: string, prefs: any, phone: string | null): boolean {
    if (!phone) {return false;} // Can't send SMS without phone number
    if (!prefs) {return false;} // Default to not sending SMS unless explicitly enabled

    switch (type) {
      case 'assignment':
        return prefs.sms_assignments === true;
      case 'reminder':
        return prefs.sms_reminders === true;
      case 'system':
        return false; // Don't send system notifications via SMS
      default:
        return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(user: any, data: CreateNotificationData): Promise<void> {
    try {
      await emailService.sendGenericNotificationEmail({
        email: user.email,
        firstName: user.first_name || 'User',
        title: data.title,
        message: data.message,
        link: data.link,
        type: data.type
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't throw - notification creation should succeed even if email fails
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(user: any, data: CreateNotificationData): Promise<void> {
    try {
      await smsService.sendGenericNotificationSMS({
        phoneNumber: user.phone,
        firstName: user.first_name || 'User',
        message: data.message,
        type: data.type
      });
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Don't throw - notification creation should succeed even if SMS fails
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: UUID,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<NotificationListResult> {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;

    let query = (db as any)('notifications').where('user_id', userId);

    if (unreadOnly) {
      query = query.where('is_read', false);
    }

    // Get notifications
    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get unread count
    const [{ count: unreadCount }] = await (db as any)('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count');

    // Get total count
    const [{ count: total }] = await (db as any)('notifications')
      .where('user_id', userId)
      .count('* as count');

    return {
      notifications,
      unreadCount: parseInt(unreadCount as any) || 0,
      total: parseInt(total as any) || 0
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: UUID): Promise<void> {
    await (db as any)('notifications')
      .where('id', notificationId)
      .update({
        is_read: true,
        read_at: new Date()
      });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: UUID): Promise<number> {
    const updated = await (db as any)('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date()
      });

    return updated;
  }

  /**
   * Delete old read notifications (cleanup job)
   */
  async deleteOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await (db as any)('notifications')
      .where('created_at', '<', cutoffDate)
      .where('is_read', true)
      .delete();

    console.log(`🗑️  Deleted ${deleted} old notifications`);
    return deleted;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: UUID): Promise<number> {
    const [{ count }] = await (db as any)('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count');

    return parseInt(count as any) || 0;
  }

  /**
   * Delete notification by ID
   */
  async deleteNotification(notificationId: UUID): Promise<void> {
    await (db as any)('notifications')
      .where('id', notificationId)
      .delete();
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: UUID): Promise<any> {
    const prefs = await (db as any)('notification_preferences')
      .where('user_id', userId)
      .first();

    // If no preferences exist, create default ones
    if (!prefs) {
      return await this.createDefaultPreferences(userId);
    }

    return prefs;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: UUID, preferences: Partial<any>): Promise<any> {
    // Check if preferences exist
    const existing = await (db as any)('notification_preferences')
      .where('user_id', userId)
      .first();

    if (!existing) {
      // Create new preferences
      return await (db as any)('notification_preferences')
        .insert({
          user_id: userId,
          ...preferences,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*')
        .then((rows: any[]) => rows[0]);
    }

    // Update existing preferences
    return await (db as any)('notification_preferences')
      .where('user_id', userId)
      .update({
        ...preferences,
        updated_at: new Date()
      })
      .returning('*')
      .then((rows: any[]) => rows[0]);
  }

  /**
   * Create default notification preferences for a user
   */
  private async createDefaultPreferences(userId: UUID): Promise<any> {
    return await (db as any)('notification_preferences')
      .insert({
        user_id: userId,
        email_assignments: true,
        email_reminders: true,
        email_status_changes: true,
        sms_assignments: true,
        sms_reminders: true,
        in_app_enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')
      .then((rows: any[]) => rows[0]);
  }
}

export default new NotificationService();
