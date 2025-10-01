import { UUID } from '../types';
import db from '../config/database';

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
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<NotificationEntity | null> {
    try {
      // Check if user has in-app notifications enabled
      const prefs = await (db as any)('notification_preferences')
        .where('user_id', data.user_id)
        .first();

      if (prefs && !prefs.in_app_enabled) {
        console.log(`In-app notifications disabled for user ${data.user_id}`);
        return null;
      }

      // Insert notification
      const [notification] = await (db as any)('notifications')
        .insert({
          ...data,
          created_at: new Date()
        })
        .returning('*');

      console.log(`✅ Notification created for user ${data.user_id}: ${data.title}`);

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
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
