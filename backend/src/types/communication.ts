/**
 * @fileoverview TypeScript interfaces for Communication domain models
 * @description Defines types for communications, recipients, and related entities
 * @author Claude Assistant
 * @date 2025-01-23
 */

export type CommunicationType =
  | 'announcement'
  | 'memo'
  | 'policy_update'
  | 'emergency'
  | 'newsletter';

export type CommunicationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type CommunicationStatus = 'draft' | 'published' | 'archived';

export type DeliveryMethod = 'app' | 'email' | 'sms';

export type DeliveryStatus =
  | 'pending'
  | 'delivered'
  | 'read'
  | 'acknowledged'
  | 'failed';

export interface TargetAudience {
  departments?: string[] | null;
  roles?: string[] | null;
  specific_users?: string[] | null;
  all_users?: boolean;
}

export interface CommunicationAttachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface CreateCommunicationRequest {
  title: string;
  content: string;
  type: CommunicationType;
  priority?: CommunicationPriority;
  target_audience: TargetAudience;
  publish_date?: Date;
  expiration_date?: Date | null;
  requires_acknowledgment?: boolean;
  tags?: string[] | null;
}

export interface UpdateCommunicationRequest {
  title?: string;
  content?: string;
  type?: CommunicationType;
  priority?: CommunicationPriority;
  target_audience?: TargetAudience;
  publish_date?: Date;
  expiration_date?: Date | null;
  requires_acknowledgment?: boolean;
  tags?: string[] | null;
}

export interface InternalCommunication {
  id: string;
  title: string;
  content: string;
  type: CommunicationType;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  author_id: string;
  target_audience: TargetAudience;
  publish_date: Date;
  expiration_date?: Date | null;
  requires_acknowledgment: boolean;
  attachments?: CommunicationAttachment[];
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CommunicationRecipient {
  id: string;
  communication_id: string;
  recipient_id: string;
  delivery_method: DeliveryMethod;
  delivery_status: DeliveryStatus;
  sent_at?: Date;
  read_at?: Date;
  acknowledged_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CommunicationWithAuthor extends InternalCommunication {
  author_name: string;
}

export interface CommunicationWithRecipientInfo extends CommunicationWithAuthor {
  sent_at?: Date;
  read_at?: Date;
  acknowledged_at?: Date;
  delivery_status: DeliveryStatus;
  is_unread: boolean;
  requires_ack: boolean;
}

export interface RecipientWithDetails extends CommunicationRecipient {
  recipient_name: string;
  recipient_email: string;
  employee_id?: string;
  department_name?: string;
}

export interface CommunicationFilters {
  type?: CommunicationType;
  priority?: CommunicationPriority;
  status?: CommunicationStatus;
  unread_only?: boolean;
  page?: number;
  limit?: number;
}

export interface CommunicationStatistics {
  total_recipients: number;
  delivered: number;
  read: number;
  acknowledged: number;
  failed: number;
}

export interface CommunicationOverviewStats {
  total_communications: number;
  draft_communications: number;
  published_communications: number;
  archived_communications: number;
  emergency_communications: number;
  urgent_communications: number;
  acknowledgment_required: number;
}

export interface CommunicationEngagementStats {
  total_recipients: number;
  total_read: number;
  total_acknowledged: number;
  delivery_failures: number;
  avg_hours_to_read: number | null;
}

export interface CommunicationTypeBreakdown {
  type: CommunicationType;
  count: number;
  published_count: number;
}

export interface CommunicationStatsResponse {
  overview: CommunicationOverviewStats;
  engagement: CommunicationEngagementStats;
  typeBreakdown: CommunicationTypeBreakdown[];
}

export interface PaginatedCommunications {
  communications: CommunicationWithRecipientInfo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface RecipientsResponse {
  recipients: RecipientWithDetails[];
  statistics: CommunicationStatistics;
}

export interface PendingAcknowledgment {
  id: string;
  title: string;
  type: CommunicationType;
  priority: CommunicationPriority;
  publish_date: Date;
  requires_acknowledgment: boolean;
  sent_at: Date;
  read_at?: Date;
}

export interface AcknowledgmentRequest {
  acknowledgment_text?: string;
}

export interface CommunicationResponse extends InternalCommunication {
  recipient_count?: number;
}

export interface UserInfo {
  id: string;
  role: string;
  name: string;
  email?: string;
}

export interface RequestWithUser {
  user: UserInfo;
  files?: any[];
}

// Validation schemas interface
export interface CommunicationValidationError {
  field: string;
  message: string;
}

// Helper type for partial updates
export type PartialCommunication = Partial<InternalCommunication>;

// Database query result types
export interface DatabaseCommunication {
  id: string;
  title: string;
  content: string;
  type: CommunicationType;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  author_id: string;
  target_audience: string; // JSON string
  publish_date: Date;
  expiration_date?: Date | null;
  requires_acknowledgment: boolean;
  attachments?: string; // JSON string
  tags?: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseRecipient {
  id: string;
  communication_id: string;
  recipient_id: string;
  delivery_method: DeliveryMethod;
  delivery_status: DeliveryStatus;
  sent_at?: Date;
  read_at?: Date;
  acknowledged_at?: Date;
  created_at: Date;
  updated_at: Date;
}