/**
 * @fileoverview Communication Service - Business logic for internal communications
 * @description Handles communication management, recipient resolution, and delivery tracking
 * @author Claude Assistant
 * @date 2025-01-23
 */

import { Pool, PoolClient } from 'pg';
import {
  InternalCommunication,
  CommunicationRecipient,
  CreateCommunicationRequest,
  UpdateCommunicationRequest,
  TargetAudience,
  CommunicationFilters,
  CommunicationWithRecipientInfo,
  RecipientWithDetails,
  CommunicationStatistics,
  CommunicationOverviewStats,
  CommunicationEngagementStats,
  CommunicationTypeBreakdown,
  CommunicationStatsResponse,
  PaginatedCommunications,
  RecipientsResponse,
  PendingAcknowledgment,
  CommunicationResponse,
  DatabaseCommunication,
  CommunicationAttachment,
  UserInfo,
  DeliveryStatus
} from '../types/communication';

export class CommunicationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all communications with filtering and pagination
   */
  async getCommunications(
    userId: string,
    userRole: string,
    filters: CommunicationFilters = {}
  ): Promise<PaginatedCommunications> {
    try {
      const { type, priority, status, unread_only, page = 1, limit = 50 } = filters;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          c.*,
          u.name as author_name,
          cr.sent_at,
          cr.read_at,
          cr.acknowledged_at,
          cr.delivery_status,
          CASE WHEN cr.read_at IS NULL THEN true ELSE false END as is_unread,
          CASE WHEN c.requires_acknowledgment = true AND cr.acknowledged_at IS NULL THEN true ELSE false END as requires_ack
        FROM internal_communications c
        JOIN users u ON c.author_id = u.id
        LEFT JOIN communication_recipients cr ON c.id = cr.communication_id AND cr.recipient_id = $1
        WHERE c.status = 'published'
          AND (cr.recipient_id = $1 OR c.author_id = $1 OR $2 IN ('admin', 'hr'))
          AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_TIMESTAMP)
      `;

      const params: any[] = [userId, userRole];
      let paramCount = 2;

      if (type) {
        paramCount++;
        query += ` AND c.type = $${paramCount}`;
        params.push(type);
      }

      if (priority) {
        paramCount++;
        query += ` AND c.priority = $${paramCount}`;
        params.push(priority);
      }

      if (status) {
        paramCount++;
        query += ` AND c.status = $${paramCount}`;
        params.push(status);
      }

      if (unread_only) {
        query += ` AND cr.read_at IS NULL`;
      }

      query += ` ORDER BY c.priority DESC, c.publish_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      return {
        communications: result.rows.map(this.transformDatabaseCommunication),
        pagination: {
          page: parseInt(page.toString()),
          limit: parseInt(limit.toString()),
          total: result.rows.length
        }
      };
    } catch (error) {
      console.error('Error fetching communications:', error);
      throw new Error('Failed to fetch communications');
    }
  }

  /**
   * Get single communication by ID
   */
  async getCommunicationById(
    communicationId: string,
    userId: string,
    userRole: string
  ): Promise<CommunicationWithRecipientInfo | null> {
    try {
      const query = `
        SELECT
          c.*,
          u.name as author_name,
          cr.sent_at,
          cr.read_at,
          cr.acknowledged_at,
          cr.delivery_status
        FROM internal_communications c
        JOIN users u ON c.author_id = u.id
        LEFT JOIN communication_recipients cr ON c.id = cr.communication_id AND cr.recipient_id = $2
        WHERE c.id = $1
          AND (cr.recipient_id = $2 OR c.author_id = $2 OR $3 IN ('admin', 'hr'))
      `;

      const result = await this.pool.query(query, [communicationId, userId, userRole]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformDatabaseCommunication(result.rows[0]);
    } catch (error) {
      console.error('Error fetching communication:', error);
      throw new Error('Failed to fetch communication');
    }
  }

  /**
   * Mark communication as read for a user
   */
  async markAsRead(communicationId: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE communication_recipients SET read_at = CURRENT_TIMESTAMP WHERE communication_id = $1 AND recipient_id = $2',
        [communicationId, userId]
      );
    } catch (error) {
      console.error('Error marking communication as read:', error);
      throw new Error('Failed to mark communication as read');
    }
  }

  /**
   * Create new communication
   */
  async createCommunication(
    communicationData: CreateCommunicationRequest,
    authorId: string,
    attachments: CommunicationAttachment[] = []
  ): Promise<CommunicationResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        title,
        content,
        type,
        priority = 'normal',
        target_audience,
        publish_date = new Date(),
        expiration_date,
        requires_acknowledgment = false,
        tags
      } = communicationData;

      // Create communication record
      const commQuery = `
        INSERT INTO internal_communications (
          title, content, type, priority, author_id, target_audience,
          publish_date, expiration_date, requires_acknowledgment, attachments, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const commResult = await client.query(commQuery, [
        title,
        content,
        type,
        priority,
        authorId,
        JSON.stringify(target_audience),
        publish_date,
        expiration_date,
        requires_acknowledgment,
        JSON.stringify(attachments),
        JSON.stringify(tags)
      ]);

      const communication = commResult.rows[0];

      // Get target recipients
      const recipients = await this.getTargetRecipients(target_audience);

      // Send to recipients
      if (recipients.length > 0) {
        await this.sendToRecipients(client, communication.id, recipients);
      }

      // Update status to published if publish_date is now or in the past
      if (new Date(publish_date) <= new Date()) {
        await client.query(
          'UPDATE internal_communications SET status = $1 WHERE id = $2',
          ['published', communication.id]
        );
        communication.status = 'published';
      }

      await client.query('COMMIT');

      return {
        ...this.transformDatabaseCommunication(communication),
        recipient_count: recipients.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating communication:', error);
      throw new Error('Failed to create communication');
    } finally {
      client.release();
    }
  }

  /**
   * Update communication (only drafts)
   */
  async updateCommunication(
    communicationId: string,
    updateData: UpdateCommunicationRequest,
    userId: string,
    userRole: string
  ): Promise<InternalCommunication | null> {
    try {
      // Check if communication exists and is editable
      const checkQuery = `
        SELECT status, author_id
        FROM internal_communications
        WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin'))
      `;

      const checkResult = await this.pool.query(checkQuery, [communicationId, userId, userRole]);

      if (checkResult.rows.length === 0) {
        return null;
      }

      if (checkResult.rows[0].status !== 'draft') {
        throw new Error('Only draft communications can be edited');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          paramCount++;
          updates.push(`${key} = $${paramCount}`);
          if (['target_audience', 'attachments', 'tags'].includes(key)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      paramCount++;
      values.push(communicationId);

      const query = `
        UPDATE internal_communications
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return this.transformDatabaseCommunication(result.rows[0]);
    } catch (error) {
      console.error('Error updating communication:', error);
      throw new Error('Failed to update communication');
    }
  }

  /**
   * Publish communication
   */
  async publishCommunication(
    communicationId: string,
    userId: string,
    userRole: string
  ): Promise<CommunicationResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get communication details
      const commQuery = `
        SELECT *, target_audience
        FROM internal_communications
        WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin')) AND status = 'draft'
      `;

      const commResult = await client.query(commQuery, [communicationId, userId, userRole]);

      if (commResult.rows.length === 0) {
        throw new Error('Draft communication not found or permission denied');
      }

      const communication = commResult.rows[0];
      const targetAudience = JSON.parse(communication.target_audience);

      // Get target recipients
      const recipients = await this.getTargetRecipients(targetAudience);

      // Send to recipients
      if (recipients.length > 0) {
        await this.sendToRecipients(client, communicationId, recipients, true);
      }

      // Update status to published
      const updateQuery = `
        UPDATE internal_communications
        SET status = 'published', publish_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [communicationId]);

      await client.query('COMMIT');

      return {
        ...this.transformDatabaseCommunication(updateResult.rows[0]),
        recipient_count: recipients.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error publishing communication:', error);
      throw new Error('Failed to publish communication');
    } finally {
      client.release();
    }
  }

  /**
   * Archive communication
   */
  async archiveCommunication(
    communicationId: string,
    userId: string,
    userRole: string
  ): Promise<InternalCommunication | null> {
    try {
      const query = `
        UPDATE internal_communications
        SET status = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin'))
        RETURNING *
      `;

      const result = await this.pool.query(query, [communicationId, userId, userRole]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformDatabaseCommunication(result.rows[0]);
    } catch (error) {
      console.error('Error archiving communication:', error);
      throw new Error('Failed to archive communication');
    }
  }

  /**
   * Acknowledge communication
   */
  async acknowledgeCommunication(
    communicationId: string,
    userId: string,
    acknowledgmentText?: string
  ): Promise<boolean> {
    try {
      // Check if user is a recipient and communication requires acknowledgment
      const checkQuery = `
        SELECT c.requires_acknowledgment
        FROM internal_communications c
        JOIN communication_recipients cr ON c.id = cr.communication_id
        WHERE c.id = $1 AND cr.recipient_id = $2 AND c.requires_acknowledgment = true
      `;

      const checkResult = await this.pool.query(checkQuery, [communicationId, userId]);

      if (checkResult.rows.length === 0) {
        return false;
      }

      // Update acknowledgment
      const query = `
        UPDATE communication_recipients
        SET acknowledged_at = CURRENT_TIMESTAMP, delivery_status = 'acknowledged'
        WHERE communication_id = $1 AND recipient_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, [communicationId, userId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error acknowledging communication:', error);
      throw new Error('Failed to acknowledge communication');
    }
  }

  /**
   * Get communication recipients and their status
   */
  async getCommunicationRecipients(
    communicationId: string,
    userId: string,
    userRole: string
  ): Promise<RecipientsResponse | null> {
    try {
      // Check if user has permission to view recipients
      const permQuery = `
        SELECT author_id
        FROM internal_communications
        WHERE id = $1 AND (author_id = $2 OR $3 IN ('admin', 'hr'))
      `;

      const permResult = await this.pool.query(permQuery, [communicationId, userId, userRole]);

      if (permResult.rows.length === 0) {
        return null;
      }

      const query = `
        SELECT
          cr.*,
          u.name as recipient_name,
          u.email as recipient_email,
          e.employee_id,
          d.name as department_name
        FROM communication_recipients cr
        JOIN users u ON cr.recipient_id = u.id
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE cr.communication_id = $1
        ORDER BY u.name
      `;

      const result = await this.pool.query(query, [communicationId]);

      // Calculate statistics
      const stats: CommunicationStatistics = {
        total_recipients: result.rows.length,
        delivered: result.rows.filter(r => r.delivery_status === 'delivered').length,
        read: result.rows.filter(r => r.read_at !== null).length,
        acknowledged: result.rows.filter(r => r.acknowledged_at !== null).length,
        failed: result.rows.filter(r => r.delivery_status === 'failed').length
      };

      return {
        recipients: result.rows,
        statistics: stats
      };
    } catch (error) {
      console.error('Error fetching communication recipients:', error);
      throw new Error('Failed to fetch communication recipients');
    }
  }

  /**
   * Get user's unread communications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM internal_communications c
        JOIN communication_recipients cr ON c.id = cr.communication_id
        WHERE cr.recipient_id = $1
          AND cr.read_at IS NULL
          AND c.status = 'published'
          AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_TIMESTAMP)
      `;

      const result = await this.pool.query(query, [userId]);
      return parseInt(result.rows[0].unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw new Error('Failed to fetch unread count');
    }
  }

  /**
   * Get pending acknowledgments for user
   */
  async getPendingAcknowledgments(userId: string): Promise<PendingAcknowledgment[]> {
    try {
      const query = `
        SELECT
          c.id, c.title, c.type, c.priority, c.publish_date,
          c.requires_acknowledgment, cr.sent_at, cr.read_at
        FROM internal_communications c
        JOIN communication_recipients cr ON c.id = cr.communication_id
        WHERE cr.recipient_id = $1
          AND c.requires_acknowledgment = true
          AND cr.acknowledged_at IS NULL
          AND c.status = 'published'
          AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_TIMESTAMP)
        ORDER BY c.priority DESC, c.publish_date DESC
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching pending acknowledgments:', error);
      throw new Error('Failed to fetch pending acknowledgments');
    }
  }

  /**
   * Get communication statistics
   */
  async getCommunicationStats(): Promise<CommunicationStatsResponse> {
    try {
      // Overview statistics
      const overviewQuery = `
        SELECT
          COUNT(*) as total_communications,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_communications,
          COUNT(*) FILTER (WHERE status = 'published') as published_communications,
          COUNT(*) FILTER (WHERE status = 'archived') as archived_communications,
          COUNT(*) FILTER (WHERE type = 'emergency') as emergency_communications,
          COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_communications,
          COUNT(*) FILTER (WHERE requires_acknowledgment = true) as acknowledgment_required
        FROM internal_communications
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const overviewResult = await this.pool.query(overviewQuery);

      // Engagement statistics
      const engagementQuery = `
        SELECT
          COUNT(*) as total_recipients,
          COUNT(*) FILTER (WHERE read_at IS NOT NULL) as total_read,
          COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL) as total_acknowledged,
          COUNT(*) FILTER (WHERE delivery_status = 'failed') as delivery_failures,
          AVG(EXTRACT(EPOCH FROM (read_at - sent_at))/3600) as avg_hours_to_read
        FROM communication_recipients cr
        JOIN internal_communications c ON cr.communication_id = c.id
        WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const engagementResult = await this.pool.query(engagementQuery);

      // Type breakdown
      const typeQuery = `
        SELECT
          type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'published') as published_count
        FROM internal_communications
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY type
        ORDER BY count DESC
      `;

      const typeResult = await this.pool.query(typeQuery);

      return {
        overview: this.transformOverviewStats(overviewResult.rows[0]),
        engagement: this.transformEngagementStats(engagementResult.rows[0]),
        typeBreakdown: typeResult.rows.map(this.transformTypeBreakdown)
      };
    } catch (error) {
      console.error('Error fetching communication statistics:', error);
      throw new Error('Failed to fetch communication statistics');
    }
  }

  /**
   * Get target recipients based on audience criteria
   */
  private async getTargetRecipients(targetAudience: TargetAudience): Promise<string[]> {
    try {
      let recipients: string[] = [];

      if (targetAudience.all_users) {
        const query = 'SELECT id FROM users WHERE active = true';
        const result = await this.pool.query(query);
        recipients = result.rows.map(row => row.id);
      } else {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramCount = 0;

        // Add specific users
        if (targetAudience.specific_users && targetAudience.specific_users.length > 0) {
          paramCount++;
          conditions.push(`u.id = ANY($${paramCount})`);
          params.push(targetAudience.specific_users);
        }

        // Add users by department
        if (targetAudience.departments && targetAudience.departments.length > 0) {
          paramCount++;
          conditions.push(`e.department_id = ANY($${paramCount})`);
          params.push(targetAudience.departments);
        }

        // Add users by role
        if (targetAudience.roles && targetAudience.roles.length > 0) {
          paramCount++;
          conditions.push(`u.role = ANY($${paramCount})`);
          params.push(targetAudience.roles);
        }

        if (conditions.length > 0) {
          const query = `
            SELECT DISTINCT u.id
            FROM users u
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE u.active = true AND (${conditions.join(' OR ')})
          `;

          const result = await this.pool.query(query, params);
          recipients = result.rows.map(row => row.id);
        }
      }

      return [...new Set(recipients)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting target recipients:', error);
      return [];
    }
  }

  /**
   * Send communication to recipients
   */
  private async sendToRecipients(
    client: PoolClient,
    communicationId: string,
    recipients: string[],
    onConflictDoNothing: boolean = false
  ): Promise<void> {
    if (recipients.length === 0) {
      return;
    }

    const values = recipients.map((recipientId, index) =>
      `($1, $${index + 2}, 'app', 'delivered')`
    ).join(', ');

    const conflictClause = onConflictDoNothing
      ? 'ON CONFLICT (communication_id, recipient_id) DO NOTHING'
      : '';

    const query = `
      INSERT INTO communication_recipients (communication_id, recipient_id, delivery_method, delivery_status)
      VALUES ${values}
      ${conflictClause}
    `;

    await client.query(query, [communicationId, ...recipients]);
  }

  /**
   * Transform database communication to domain model
   */
  private transformDatabaseCommunication(dbComm: any): CommunicationWithRecipientInfo {
    return {
      ...dbComm,
      target_audience: typeof dbComm.target_audience === 'string'
        ? JSON.parse(dbComm.target_audience)
        : dbComm.target_audience,
      attachments: dbComm.attachments
        ? JSON.parse(dbComm.attachments)
        : [],
      tags: dbComm.tags
        ? JSON.parse(dbComm.tags)
        : []
    };
  }

  /**
   * Transform overview statistics
   */
  private transformOverviewStats(stats: any): CommunicationOverviewStats {
    return {
      total_communications: parseInt(stats.total_communications),
      draft_communications: parseInt(stats.draft_communications),
      published_communications: parseInt(stats.published_communications),
      archived_communications: parseInt(stats.archived_communications),
      emergency_communications: parseInt(stats.emergency_communications),
      urgent_communications: parseInt(stats.urgent_communications),
      acknowledgment_required: parseInt(stats.acknowledgment_required)
    };
  }

  /**
   * Transform engagement statistics
   */
  private transformEngagementStats(stats: any): CommunicationEngagementStats {
    return {
      total_recipients: parseInt(stats.total_recipients),
      total_read: parseInt(stats.total_read),
      total_acknowledged: parseInt(stats.total_acknowledged),
      delivery_failures: parseInt(stats.delivery_failures),
      avg_hours_to_read: stats.avg_hours_to_read ? parseFloat(stats.avg_hours_to_read) : null
    };
  }

  /**
   * Transform type breakdown
   */
  private transformTypeBreakdown(breakdown: any): CommunicationTypeBreakdown {
    return {
      type: breakdown.type,
      count: parseInt(breakdown.count),
      published_count: parseInt(breakdown.published_count)
    };
  }
}
export default CommunicationService;
