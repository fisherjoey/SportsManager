/**
 * @file ai-suggestions.ts
 * @description TypeScript interfaces for AI suggestions functionality
 */

import { Request } from 'express';

/**
 * AI suggestion generation factors
 */
export interface AISuggestionFactors {
  proximity_weight?: number;
  availability_weight?: number;
  experience_weight?: number;
  performance_weight?: number;
}

/**
 * AI suggestion request body
 */
export interface GenerateSuggestionsRequest {
  game_ids: string[];
  factors?: AISuggestionFactors;
}

/**
 * Reject suggestion request body
 */
export interface RejectSuggestionRequest {
  reason?: string;
}

/**
 * AI suggestion filter parameters
 */
export interface SuggestionFilters {
  status?: 'pending' | 'accepted' | 'rejected';
  game_id?: string;
  referee_id?: string;
  start_date?: string;
  end_date?: string;
  min_confidence?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * AI suggestion record from database
 */
export interface AISuggestion {
  id: string;
  game_id: string;
  referee_id: string;
  confidence_score: number;
  reasoning: string;
  proximity_score: number;
  availability_score: number;
  experience_score: number;
  performance_score: number;
  historical_bonus: number;
  status: 'pending' | 'accepted' | 'rejected';
  rejection_reason?: string;
  created_at: Date;
  processed_by?: string;
  processed_at?: Date;
}

/**
 * Enhanced AI suggestion with game and referee details
 */
export interface EnhancedAISuggestion extends AISuggestion {
  game: {
    id: string;
    game_date: string;
    game_time: string;
    location: string;
    level: string;
    home_team: string;
    away_team: string;
  };
  referee: {
    id: string;
    name: string;
    level: string;
    postal_code?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Game assignment result
 */
export interface GameAssignment {
  id: string;
  game_id: string;
  referee_id: string;
  position_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  assigned_by: string;
  assigned_at: Date;
}

/**
 * Referee conflict check result
 */
export interface RefereeConflictCheck {
  hasConflict: boolean;
  warnings: string[];
}

/**
 * AI assignment factors for calculation
 */
export interface AIAssignmentFactors {
  proximity: number;
  availability: number;
  experience: number;
  level_match: number;
}

/**
 * AI referee assignment result
 */
export interface AIRefereeAssignment {
  refereeId: string;
  confidence: number;
  reasoning: string;
  factors: AIAssignmentFactors;
}

/**
 * AI game assignment result
 */
export interface AIGameAssignment {
  gameId: string;
  assignedReferees: AIRefereeAssignment[];
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  results?: AIGameAssignment[][];
  errors?: Array<{ batchIndex: number; error: string }>;
  batchInfo?: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
  };
}

/**
 * Game data for AI processing
 */
export interface GameData {
  id: string;
  game_date: string;
  game_time: string;
  location: string;
  postal_code?: string;
  level: string;
  home_team_id: string;
  away_team_id: string;
}

/**
 * Referee data for AI processing
 */
export interface RefereeData {
  id: string;
  user_id: string;
  name: string;
  level: string;
  postal_code?: string;
  is_available: boolean;
  phone?: string;
  email?: string;
}

/**
 * Proximity calculation result
 */
export interface ProximityScore {
  score: number;
  distance_estimate?: string;
  fsa_match?: boolean;
}

/**
 * Availability window
 */
export interface AvailabilityWindow {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

/**
 * Historical pattern data
 */
export interface HistoricalPattern {
  referee_id: string;
  game_type: string;
  success_rate: number;
  assignment_count: number;
  avg_rating?: number;
}

/**
 * Request interfaces with Express typing
 */
export interface GenerateSuggestionsRequestBody extends Request {
  body: GenerateSuggestionsRequest;
  user: { userId: string };
}

export interface RejectSuggestionRequestBody extends Request {
  body: RejectSuggestionRequest;
  params: { id: string };
  user: { userId: string };
}

export interface GetSuggestionsRequest extends Request {
  query: SuggestionFilters & PaginationParams;
  user?: { userId: string };
}

export interface AcceptSuggestionRequest extends Request {
  params: { id: string };
  user: { userId: string };
}

/**
 * Response interfaces
 */
export interface GenerateSuggestionsResponse {
  success: boolean;
  data?: {
    suggestions: AISuggestion[];
    generated_count: number;
    request_id: string;
    batchInfo?: {
      totalBatches: number;
      successfulBatches: number;
      failedBatches: number;
    };
  };
  error?: string;
}

export interface GetSuggestionsResponse {
  success: boolean;
  data?: {
    suggestions: EnhancedAISuggestion[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface AcceptSuggestionResponse {
  success: boolean;
  data?: {
    assignment: {
      id: string;
      game_id: string;
      referee_id: string;
      status: string;
      assigned_at: Date;
    };
  };
  message?: string;
  error?: string;
}

export interface RejectSuggestionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Service layer interfaces
 */
export interface AIAssignmentServiceInterface {
  generateSuggestions(
    games: GameData[],
    referees: RefereeData[],
    factors?: AISuggestionFactors
  ): Promise<AISuggestion[]>;

  checkRefereeConflicts(
    game: GameData,
    referee: RefereeData
  ): Promise<RefereeConflictCheck>;

  calculateSuggestion(
    game: GameData,
    referee: RefereeData,
    factors: AISuggestionFactors
  ): Promise<AISuggestion>;

  calculateProximityScore(
    game: GameData,
    referee: RefereeData
  ): Promise<number>;

  calculateAvailabilityScore(
    game: GameData,
    referee: RefereeData
  ): Promise<number>;

  calculateExperienceScore(
    game: GameData,
    referee: RefereeData
  ): number;

  calculatePerformanceScore(
    referee: RefereeData
  ): Promise<number>;

  calculateHistoricalPatternBonus(
    game: GameData,
    referee: RefereeData
  ): Promise<number>;
}

/**
 * Database query interfaces
 */
export interface SuggestionQueryParams {
  filters: SuggestionFilters;
  pagination: Required<PaginationParams>;
}

export interface SuggestionQueryResult {
  suggestions: EnhancedAISuggestion[];
  total: number;
}