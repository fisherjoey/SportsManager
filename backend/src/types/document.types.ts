/**
 * Document Management Types
 * Comprehensive type definitions for document management operations
 */

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  version: string;
  uploaded_by: string;
  approved_by?: string;
  effective_date?: Date;
  expiration_date?: Date;
  tags?: string[];
  access_permissions?: AccessPermissions;
  requires_acknowledgment: boolean;
  checksum: string;
  status: DocumentStatus;
  created_at: Date;
  updated_at: Date;
  uploaded_by_name?: string;
  approved_by_name?: string;
  acknowledgment_count?: number;
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  EXPIRED = 'expired'
}

export interface AccessPermissions {
  roles?: string[];
  users?: string[];
  departments?: string[];
  visibility: 'public' | 'restricted' | 'private';
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  file_path: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  change_notes?: string;
  checksum: string;
  is_current: boolean;
  created_at: Date;
}

export interface DocumentAcknowledgment {
  id: string;
  document_id: string;
  user_id: string;
  user_name?: string;
  acknowledged_at: Date;
  acknowledgment_method: AcknowledgmentMethod;
  ip_address?: string;
  user_agent?: string;
}

export enum AcknowledgmentMethod {
  CLICK = 'click',
  DIGITAL_SIGNATURE = 'digital_signature',
  EMAIL_CONFIRMATION = 'email_confirmation',
  MANUAL_VERIFICATION = 'manual_verification'
}

export interface CreateDocumentRequest {
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  effective_date?: Date;
  expiration_date?: Date;
  tags?: string[];
  access_permissions?: AccessPermissions;
  requires_acknowledgment?: boolean;
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  effective_date?: Date;
  expiration_date?: Date;
  tags?: string[];
  access_permissions?: AccessPermissions;
  requires_acknowledgment?: boolean;
}

export interface CreateDocumentVersionRequest {
  change_notes: string;
}

export interface DocumentQueryFilters {
  category?: string;
  subcategory?: string;
  status?: DocumentStatus;
  uploaded_by?: string;
  requires_acknowledgment?: boolean;
  tags?: string[];
  search?: string;
  effective_date_from?: Date;
  effective_date_to?: Date;
  expiration_date_from?: Date;
  expiration_date_to?: Date;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DocumentWithVersions {
  document: Document;
  versions: DocumentVersion[];
}

export interface DocumentStats {
  total_documents: number;
  pending_approval: number;
  approved: number;
  archived: number;
  expired: number;
  by_category: CategoryStats[];
  recent_uploads: DocumentSummary[];
  pending_acknowledgments: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  category: string;
  uploaded_by_name: string;
  created_at: Date;
  status: DocumentStatus;
}

export interface PendingAcknowledgment {
  document_id: string;
  document_title: string;
  category: string;
  requires_acknowledgment: boolean;
  uploaded_by_name: string;
  effective_date?: Date;
  expiration_date?: Date;
}

// API Response Types
export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface DocumentVersionsResponse {
  versions: DocumentVersion[];
  total: number;
}

export interface DocumentAcknowledgmentsResponse {
  acknowledgments: DocumentAcknowledgment[];
  total: number;
  page: number;
  limit: number;
}

export interface PendingAcknowledgmentsResponse {
  pending: PendingAcknowledgment[];
  total: number;
}

// File Upload Types
export interface FileUploadRequest {
  file: any;
  metadata: CreateDocumentRequest;
}

export interface FileUploadResponse {
  document: Document;
  upload_details: {
    original_name: string;
    file_size: number;
    file_type: string;
    checksum: string;
  };
}

// Error Types
export interface DocumentError {
  code: string;
  message: string;
  details?: any;
}

export interface DocumentValidationError extends DocumentError {
  field: string;
  value: any;
}

export interface FileValidationError extends DocumentError {
  file_info?: {
    name: string;
    size: number;
    type: string;
  };
}

// Database Models
export interface DocumentModel {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  version: string;
  uploaded_by: string;
  approved_by: string | null;
  effective_date: Date | null;
  expiration_date: Date | null;
  tags: string[] | null;
  access_permissions: any | null;
  requires_acknowledgment: boolean;
  checksum: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentVersionModel {
  id: string;
  document_id: string;
  version: string;
  file_path: string;
  uploaded_by: string;
  change_notes: string | null;
  checksum: string;
  is_current: boolean;
  created_at: Date;
}

export interface DocumentAcknowledgmentModel {
  id: string;
  document_id: string;
  user_id: string;
  acknowledged_at: Date;
  acknowledgment_method: string;
  ip_address: string | null;
  user_agent: string | null;
}

// Permission checking utilities
export interface DocumentPermissionContext {
  user_id: string;
  user_role: string;
  organization_id?: string;
  document: Document;
}

export interface DocumentAccessResult {
  has_access: boolean;
  access_level: 'none' | 'read' | 'write' | 'admin';
  restrictions?: string[];
}

// File handling types
export interface DocumentFileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  checksum: string;
}

export interface FileOperationResult {
  success: boolean;
  file_info?: DocumentFileInfo;
  error?: string;
}

// Audit trail types
export interface DocumentAuditEvent {
  document_id: string;
  action: DocumentAuditAction;
  user_id: string;
  timestamp: Date;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

export enum DocumentAuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  DOWNLOADED = 'downloaded',
  ACKNOWLEDGED = 'acknowledged',
  VERSION_CREATED = 'version_created',
  PERMISSIONS_CHANGED = 'permissions_changed',
  METADATA_UPDATED = 'metadata_updated'
}