/**
 * Chunk-related type definitions
 */

export interface GameChunk {
  id: string
  name: string
  location: string
  date: string
  start_time: string
  end_time: string
  game_count: number
  total_referees_needed: number
  status: 'unassigned' | 'assigned' | 'completed' | 'cancelled'
  assigned_referee_id?: string
  assigned_referee_name?: string
  notes?: string
  created_at: string
  updated_at?: string
  games?: ChunkGame[]
}

export interface ChunkGame {
  id: string
  home_team_name: string
  away_team_name: string
  game_date: string
  game_time: string
  location: string
  level: string
  refs_needed: number
  sort_order: number
}

export interface CreateChunkRequest {
  name?: string
  location?: string
  date?: string
  start_time?: string
  end_time?: string
  game_ids: string[]
  notes?: string
}

export interface UpdateChunkRequest {
  name?: string
  notes?: string
  add_game_ids?: string[]
  remove_game_ids?: string[]
}

export interface AssignChunkRequest {
  referee_id: string
  position_id?: string
  check_conflicts?: boolean
  override_conflicts?: boolean
}

export interface AutoCreateChunksRequest {
  criteria: {
    group_by: 'location_date' | 'referee' | 'level'
    min_games?: number
    max_time_gap?: number
  }
  date_range?: {
    start_date: string
    end_date: string
  }
}

export interface ChunkListResponse {
  chunks: GameChunk[]
  pagination: {
    page: number
    limit: number
  }
}

export interface ChunkDetailsResponse {
  chunk: GameChunk
}

export interface AssignChunkResponse {
  assignments_created: number
  conflicts_overridden: number
  assignments: Array<{
    id: string
    game_id: string
    referee_id: string
    status: string
  }>
}
