/**
 * @fileoverview Notifications API Client
 *
 * This module provides API methods for interacting with the notifications system.
 * It handles fetching notifications, marking as read, managing preferences, etc.
 *
 * @module lib/notifications-api
 */

export interface Notification {
  id: string;
  user_id: string;
  type: 'assignment' | 'status_change' | 'reminder' | 'system';
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResult {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  email_assignments: boolean;
  email_reminders: boolean;
  email_status_changes: boolean;
  sms_assignments: boolean;
  sms_reminders: boolean;
  in_app_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Notifications API Client
 */
class NotificationsApiClient {
  private getBaseURL(): string {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    }

    const host = window.location.hostname;

    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }

    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    const protocol = window.location.protocol;
    return `${protocol}//${host}:3001/api`;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseURL = this.getBaseURL();
    const url = `${baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Ignore JSON parse errors
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return { success: true } as T;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get notifications for the current user
   */
  async getNotifications(params?: {
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResult> {
    const searchParams = new URLSearchParams();
    if (params?.unread_only) searchParams.append('unread_only', 'true');
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const response = await this.request<ApiResponse<NotificationListResult>>(
      `/notifications${queryString ? `?${queryString}` : ''}`
    );

    return response.data || { notifications: [], unreadCount: 0, total: 0 };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await this.request<ApiResponse<{ unreadCount: number }>>(
      '/notifications/unread-count'
    );
    return response.data?.unreadCount || 0;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const response = await this.request<ApiResponse<{ success: boolean }>>(
      `/notifications/${notificationId}/read`,
      { method: 'PATCH' }
    );
    return response.data?.success || response.success || false;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const response = await this.request<ApiResponse<{ markedAsRead: number }>>(
      '/notifications/mark-all-read',
      { method: 'PATCH' }
    );
    return response.data?.markedAsRead || 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const response = await this.request<ApiResponse<{ success: boolean }>>(
      `/notifications/${notificationId}`,
      { method: 'DELETE' }
    );
    return response.data?.success || response.success || false;
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await this.request<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences'
    );
    return response.data || {
      email_assignments: true,
      email_reminders: true,
      email_status_changes: true,
      sms_assignments: true,
      sms_reminders: true,
      in_app_enabled: true
    };
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const response = await this.request<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      }
    );
    return response.data || preferences as NotificationPreferences;
  }
}

export const notificationsApi = new NotificationsApiClient();
