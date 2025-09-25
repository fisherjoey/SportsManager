/**
 * @fileoverview Main TypeScript type definitions export
 * @description Central export file for all TypeScript type definitions used throughout
 * the Sports Manager backend application. This enables consistent type usage across
 * the entire application during the migration from JavaScript to TypeScript.
 */

// Database entity types
export * from './database.types';
export type { Database } from './database.types';
export { Knex } from './database.types';

// API request/response types
export * from './api.types';

// Authentication and authorization types
export * from './auth.types';

// Business logic types
export * from './business.types';

// Common utility types
export type UUID = string;
export type Timestamp = string | Date;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Query options
export interface QueryOptions {
  select?: string[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  include?: JoinOptions[];
}

export interface JoinOptions {
  table: string;
  on: string;
  type?: 'left' | 'right' | 'inner' | 'outer';
}

// Error types
export interface AppError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

// Service response types
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

// Audit trail types
export interface AuditTrail {
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
  updated_by?: UUID;
}

// Environment types
export type Environment = 'development' | 'test' | 'staging' | 'production';

// Express middleware types
export interface RequestUser {
  id: UUID;
  email: string;
  role: string;
  permissions: string[];
}

// Common enums
export enum UserRole {
  ADMIN = 'admin',
  ASSIGNOR = 'assignor', 
  REFEREE = 'referee',
  MANAGER = 'manager'
}

export enum GameType {
  COMMUNITY = 'Community',
  CLUB = 'Club', 
  TOURNAMENT = 'Tournament',
  PRIVATE_TOURNAMENT = 'Private Tournament'
}

export enum Gender {
  BOYS = 'Boys',
  GIRLS = 'Girls'
}

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  COMPLETED = 'completed'
}

export enum AvailabilityStrategy {
  WHITELIST = 'WHITELIST',
  BLACKLIST = 'BLACKLIST'
}