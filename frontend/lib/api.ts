/**
 * @fileoverview API Client Library
 * 
 * This module provides a centralized API client for making HTTP requests to the backend.
 * It handles authentication, request/response formatting, error handling, and provides
 * typed methods for all API endpoints in the sports management application.
 * 
 * @module lib/api
 */

import { AvailabilityWindow, AvailabilityResponse, PagePermissionsResponse, PageAccessCheckResponse } from './types'
import { setAuthToken, getAuthToken, deleteAuthToken } from './cookies'

interface ApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
  };
}

/**
 * API Client class for making HTTP requests to the backend
 * 
 * Provides a centralized way to interact with the API, handling authentication,
 * request formatting, and response parsing. Automatically manages JWT tokens
 * and provides methods for all major API endpoints.
 * 
 * @class ApiClient
 */
class ApiClient {
  private token: string | null = null

  /**
   * Create an API client instance
   */
  constructor() {
    this.token = typeof window !== 'undefined' ? getAuthToken() : null
  }

  /**
   * Get the base URL dynamically based on current host
   */
  private getBaseURL(): string {
    // For server-side rendering, use environment variable or localhost
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    }

    // For client-side, check if we're on localhost and use proxy
    const host = window.location.hostname

    if (host === 'localhost' || host === '127.0.0.1') {
      // Use Next.js proxy path (no port, just /api)
      console.log('[API Client] Using Next.js proxy: /api')
      return '/api'
    }

    // For non-localhost, use the environment variable if set
    if (process.env.NEXT_PUBLIC_API_URL) {
      console.log('[API Client] Using env API URL:', process.env.NEXT_PUBLIC_API_URL)
      return process.env.NEXT_PUBLIC_API_URL
    }

    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      console.log('[API Client] Using env API BASE URL:', process.env.NEXT_PUBLIC_API_BASE_URL)
      return process.env.NEXT_PUBLIC_API_BASE_URL
    }

    // Fallback to constructing from current host
    const protocol = window.location.protocol
    const currentHost = window.location.hostname
    console.log(`[API Client] Using constructed URL: ${protocol}//${currentHost}:3001/api`)
    return `${protocol}//${currentHost}:3001/api`
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      // Use cookie utility for consistent cookie management
      setAuthToken(token, {
        maxAge: 604800, // 7 days (matches JWT expiry)
        sameSite: 'lax'
      })
    }
  }

  initializeToken() {
    if (typeof window !== 'undefined') {
      const storedToken = getAuthToken()
      if (storedToken) {
        this.token = storedToken
      }
    }
  }

  removeToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      deleteAuthToken()
    }
  }

  getToken() {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Always check for the latest token from cookies
    if (typeof window !== 'undefined') {
      const currentToken = getAuthToken()
      if (currentToken !== this.token) {
        this.token = currentToken
      }
    }

    const baseURL = this.getBaseURL()
    const url = `${baseURL}${endpoint}`
    const method = options.method || 'GET'
    
    console.log(`[API Client] ${method} request to:`, url)
    
    const headers: HeadersInit = {
      ...options.headers
    }

    // Only set Content-Type to application/json if it's not a FormData request
    // and no Content-Type is already specified
    if (!(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const config: RequestInit = {
      ...options,
      headers
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        let errorData = {}
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        // Try to parse JSON error response
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } else {
            // If not JSON, try to get text
            const text = await response.text()
            if (text) {
              errorMessage = text
            }
          }
        } catch (parseError) {
          // If parsing fails, keep the default error message
          console.warn('Failed to parse error response:', parseError)
        }

        // Handle different error types appropriately
        if (response.status === 403) {
          // Cerbos authorization failure - create a user-friendly error
          const cerbosError = new Error('Access denied. You do not have permission to perform this action.')
          ;(cerbosError as any).status = 403
          ;(cerbosError as any).type = 'PERMISSION_DENIED'
          ;(cerbosError as any).originalError = errorMessage
          throw cerbosError
        } else if (response.status === 401) {
          // Authentication failure - don't log these as they're expected
          const authError = new Error('Authentication required. Please log in.')
          ;(authError as any).status = 401
          ;(authError as any).type = 'AUTHENTICATION_REQUIRED'
          throw authError
        } else {
          // Log other errors for debugging
          console.error(`API Error [${method}] ${url}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            errorData: errorData,
            headers: Object.fromEntries(response.headers.entries()),
            body: config.body
          })
        }

        throw new Error(errorMessage)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && !error.message.includes('HTTP')) {
        console.error(`Network/Parse Error [${method}] ${url}:`, {
          message: error.message,
          name: error.name,
          body: config.body
        })
      }
      throw error
    }
  }


  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async register(userData: any) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async getProfile() {
    return this.request<{ user: any }>('/auth/me')
  }

  // Games endpoints
  async getGames(params?: {
    status?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    // Transform frontend params to backend format
    const transformedParams: any = {}
    if (params?.status) transformedParams.status = params.status
    if (params?.level) transformedParams.level = params.level
    if (params?.startDate) transformedParams.date_from = params.startDate
    if (params?.endDate) transformedParams.date_to = params.endDate
    if (params?.search) transformedParams.search = params.search
    if (params?.page) transformedParams.page = params.page
    if (params?.limit) transformedParams.limit = params.limit
    
    const queryString = Object.keys(transformedParams).length > 0 ? new URLSearchParams(transformedParams).toString() : ''
    const response = await this.request<{ data: any[]; pagination: any }>(`/games${queryString ? `?${queryString}` : ''}`)
    
    // Transform backend response to frontend format
    const transformedGames = response.data.map((game: any) => ({
      id: game.id,
      homeTeam: game.homeTeam || { name: game.home_team_name },
      awayTeam: game.awayTeam || { name: game.away_team_name },
      date: game.date || game.game_date,
      time: game.time || game.game_time,
      startTime: game.startTime || game.time || game.game_time, // Add startTime
      endTime: game.endTime || '', // Add endTime
      location: game.location,
      postalCode: game.postalCode || '',
      level: game.level,
      division: game.division || '',
      payRate: game.payRate || game.pay_rate,
      status: game.status,
      assignments: game.assignments || [],
      assignedReferees: game.assignedReferees || [], // Add assignedReferees array
      refsNeeded: game.refsNeeded || game.refs_needed || 2,
      wageMultiplier: game.wageMultiplier || game.wage_multiplier,
      gameType: game.gameType || game.game_type,
      notes: game.notes || '',
      createdAt: game.createdAt || game.created_at,
      updatedAt: game.updatedAt || game.updated_at
    }))
    
    return { data: transformedGames, pagination: response.pagination }
  }

  async getGame(id: string) {
    const response = await this.request<any>(`/games/${id}`)
    
    // Transform backend response to frontend format
    return {
      id: response.id,
      homeTeam: response.home_team_name,
      awayTeam: response.away_team_name,
      date: response.game_date,
      time: response.game_time,
      location: response.location,
      level: response.level,
      payRate: response.pay_rate,
      status: response.status,
      notes: response.notes,
      createdAt: response.created_at,
      updatedAt: response.updated_at
    }
  }

  async createGame(gameData: {
    homeTeam: {
      organization: string;
      ageGroup: string;
      gender: 'Boys' | 'Girls';
      rank: number;
    };
    awayTeam: {
      organization: string;
      ageGroup: string;
      gender: 'Boys' | 'Girls';
      rank: number;
    };
    date: string;
    time: string;
    location: string;
    postalCode: string;
    level: string;
    gameType: 'Community' | 'Club' | 'Tournament' | 'Private Tournament';
    division: string;
    season: string;
    payRate: number;
    refsNeeded: number;
    wageMultiplier?: number;
    wageMultiplierReason?: string;
  }) {
    // Backend expects this exact format
    const requestBody = {
      homeTeam: gameData.homeTeam,
      awayTeam: gameData.awayTeam,
      date: gameData.date,
      time: gameData.time,
      location: gameData.location,
      postalCode: gameData.postalCode,
      level: gameData.level,
      gameType: gameData.gameType,
      division: gameData.division,
      season: gameData.season,
      payRate: gameData.payRate,
      refsNeeded: gameData.refsNeeded,
      wageMultiplier: gameData.wageMultiplier !== undefined ? gameData.wageMultiplier : 1.0,
      wageMultiplierReason: gameData.wageMultiplierReason !== undefined ? gameData.wageMultiplierReason : ''
    }

    return this.request<any>('/games', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })
  }

  async updateGame(id: string, gameData: Partial<any>) {
    // Transform frontend camelCase to backend snake_case
    const transformedData: any = {}
    if (gameData.homeTeam) transformedData.home_team_name = gameData.homeTeam
    if (gameData.awayTeam) transformedData.away_team_name = gameData.awayTeam
    if (gameData.date) transformedData.game_date = gameData.date
    if (gameData.time) transformedData.game_time = gameData.time
    if (gameData.location) transformedData.location = gameData.location
    if (gameData.level) transformedData.level = gameData.level
    if (gameData.payRate) transformedData.pay_rate = gameData.payRate
    if (gameData.notes) transformedData.notes = gameData.notes
    if (gameData.status) transformedData.status = gameData.status
    
    return this.request<{ success: boolean; data: { game: Game } }>(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformedData)
    })
  }

  async updateGameStatus(id: string, status: string) {
    return this.request<{ success: boolean; data: { game: Game } }>(`/games/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  }

  async deleteGame(id: string) {
    return this.request<{ success: boolean; message: string }>(`/games/${id}`, {
      method: 'DELETE'
    })
  }

  // Referees endpoints
  async getReferees(params?: {
    certificationLevel?: string;
    available?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    // Transform frontend params to backend format
    const transformedParams: any = {}
    if (params?.certificationLevel) transformedParams.level = params.certificationLevel
    if (params?.available !== undefined) transformedParams.available = params.available
    if (params?.search) transformedParams.search = params.search
    if (params?.page) transformedParams.page = params.page
    if (params?.limit) transformedParams.limit = params.limit
    
    const queryString = Object.keys(transformedParams).length > 0 ? new URLSearchParams(transformedParams).toString() : ''
    const response = await this.request<{ success: boolean; data: { data: any[]; pagination: any } }>(`/referees${queryString ? `?${queryString}` : ''}`)
    
    // Transform backend response to frontend format  
    const referees = response.data?.data || []
    const transformedReferees = referees.map((referee: any) => ({
      id: referee.id,
      name: referee.name,
      email: referee.email,
      phone: referee.phone,
      role: 'referee' as const,
      certificationLevel: referee.level_name,
      location: referee.location,
      isAvailable: referee.is_available,
      availabilityStrategy: referee.availability_strategy || 'BLACKLIST',
      certifications: referee.certifications || [],
      preferredPositions: referee.preferred_positions || [],
      wagePerGame: referee.wage_per_game,
      notes: referee.notes,
      maxDistance: referee.max_distance,
      postalCode: referee.postal_code,
      roles: referee.roles || ['Referee'],
      isWhiteWhistle: referee.is_white_whistle || false,
      createdAt: referee.created_at,
      updatedAt: referee.updated_at
    }))
    
    return transformedReferees
  }

  async getReferee(id: string) {
    const response = await this.request<{ success: boolean; data: { referee: any } }>(`/referees/${id}`)
    
    // Transform backend response to frontend format
    const transformedReferee = {
      id: response.data.referee.id,
      name: response.data.referee.name,
      email: response.data.referee.email,
      phone: response.data.referee.phone,
      role: 'referee' as const,
      certificationLevel: response.data.referee.level,
      location: response.data.referee.location,
      isAvailable: response.data.referee.is_available,
      availabilityStrategy: response.data.referee.availability_strategy || 'BLACKLIST',
      certifications: response.data.referee.certifications || [],
      preferredPositions: response.data.referee.preferred_positions || [],
      wagePerGame: response.data.referee.wage_per_game,
      notes: response.data.referee.notes,
      maxDistance: response.data.referee.max_distance,
      postalCode: response.data.referee.postal_code,
      createdAt: response.data.referee.created_at,
      updatedAt: response.data.referee.updated_at
    }
    
    return { success: true, data: { referee: transformedReferee } }
  }

  async getRefereeProfile() {
    return this.request<{ success: boolean; data: { referee: Referee } }>('/referees/profile')
  }

  async updateReferee(id: string, refereeData: Partial<any>) {
    // Transform frontend camelCase to backend snake_case
    const transformedData: any = {}
    if (refereeData.name) transformedData.name = refereeData.name
    if (refereeData.email) transformedData.email = refereeData.email
    if (refereeData.phone) transformedData.phone = refereeData.phone
    if (refereeData.certificationLevel) transformedData.level = refereeData.certificationLevel
    if (refereeData.location) transformedData.location = refereeData.location
    if (refereeData.isAvailable !== undefined) transformedData.is_available = refereeData.isAvailable
    if (refereeData.availabilityStrategy) transformedData.availability_strategy = refereeData.availabilityStrategy
    
    return this.request<{ success: boolean; data: { referee: Referee } }>(`/referees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformedData)
    })
  }

  async updateRefereeAvailability(id: string, isAvailable: boolean) {
    return this.request<{ success: boolean; data: { referee: Referee } }>(`/referees/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available: isAvailable })
    })
  }

  // Availability Windows API
  async getRefereeAvailabilityWindows(id: string, params?: { startDate?: string; endDate?: string }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    const url = `/availability/referees/${id}${queryString ? `?${queryString}` : ''}`
    return this.request<AvailabilityResponse>(url)
  }

  async createAvailabilityWindow(refereeId: string, window: Partial<AvailabilityWindow>) {
    return this.request<{ success: boolean; data: AvailabilityWindow }>(`/availability/referees/${refereeId}`, {
      method: 'POST',
      body: JSON.stringify(window)
    })
  }
  async createBulkAvailabilityWindows(refereeId: string, windows: Partial<AvailabilityWindow>[]) {
    return this.request<{ success: boolean; data: { created: number; windows: AvailabilityWindow[] } }>('/availability/bulk', {
      method: 'POST',
      body: JSON.stringify({ referee_id: refereeId, windows })
    })
  }

  async updateAvailabilityWindow(windowId: string, updates: Partial<AvailabilityWindow>) {
    return this.request<{ success: boolean; data: AvailabilityWindow }>(`/availability/${windowId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteAvailabilityWindow(windowId: string) {
    return this.request<{ success: boolean; message: string }>(`/availability/${windowId}`, {
      method: 'DELETE'
    })
  }

  async checkAvailabilityConflicts(params: {
    date: string;
    start_time: string;
    end_time: string;
    referee_id?: string;
  }) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    return this.request<{
      success: boolean;
      data: {
        availabilityConflicts: any[];
        gameConflicts: any[];
        totalConflicts: number;
      };
    }>(`/availability/conflicts?${queryString}`)
  }

  async createBulkAvailability(refereeId: string, windows: Partial<AvailabilityWindow>[]) {
    return this.request<{
      success: boolean;
      data: {
        created: AvailabilityWindow[];
        skipped: { window: Partial<AvailabilityWindow>; reason: string }[];
      };
      summary: {
        total: number;
        created: number;
        skipped: number;
      };
    }>('/availability/bulk', {
      method: 'POST',
      body: JSON.stringify({
        referee_id: refereeId,
        windows
      })
    })
  }

  async getRefereeAssignments(id: string, params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    // Transform frontend params to backend format
    const transformedParams: any = {}
    if (params?.status) transformedParams.status = params.status
    if (params?.startDate) transformedParams.start_date = params.startDate
    if (params?.endDate) transformedParams.end_date = params.endDate
    
    const queryString = Object.keys(transformedParams).length > 0 ? new URLSearchParams(transformedParams).toString() : ''
    return this.request<{ success: boolean; data: { assignments: Assignment[] } }>(`/referees/${id}/assignments${queryString ? `?${queryString}` : ''}`)
  }

  async deleteReferee(id: string) {
    return this.request<{ success: boolean; message: string }>(`/referees/${id}`, {
      method: 'DELETE'
    })
  }

  // Assignments endpoints
  async getAssignments(params?: {
    gameId?: string;
    refereeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : ''
    return this.request<{ success: boolean; data: { assignments: Assignment[]; pagination: any } }>(`/assignments${queryString ? `?${queryString}` : ''}`)
  }

  async getAssignment(id: string) {
    return this.request<{ success: boolean; data: { assignment: Assignment } }>(`/assignments/${id}`)
  }

  async createAssignment(assignmentData: {
    gameId: string;
    refereeId: string;
    positionId?: string;
    assignedBy?: string;
  }) {
    // Transform frontend camelCase to backend snake_case
    const transformedData = {
      game_id: assignmentData.gameId,
      user_id: assignmentData.refereeId,
      position_id: assignmentData.positionId || 'e468e96b-4ae8-448d-b0f7-86f688f3402b', // Default to Referee 1
      assigned_by: assignmentData.assignedBy
    }
    
    return this.request<{ success: boolean; data: { assignment: Assignment } }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(transformedData)
    })
  }

  async updateAssignmentStatus(id: string, status: string, reason?: string) {
    return this.request<{ success: boolean; data: { assignment: Assignment } }>(`/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    })
  }

  async deleteAssignment(id: string) {
    return this.request<{ success: boolean; message: string }>(`/assignments/${id}`, {
      method: 'DELETE'
    })
  }

  async createBulkAssignments(assignments: Array<{
    gameId: string;
    refereeId: string;
  }>) {
    return this.request<{ success: boolean; data: { assignments: Assignment[]; summary: any } }>('/assignments/bulk', {
      method: 'POST',
      body: JSON.stringify({ assignments })
    })
  }

  async getAvailableGames(params?: {
    startDate?: string;
    endDate?: string;
    level?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : ''
    return this.request<{ success: boolean; data: { games: Game[] } }>(`/assignments/available-games${queryString ? `?${queryString}` : ''}`)
  }

  async getAvailableReferees(gameId: string) {
    const response = await this.request<Referee[]>(`/assignments/available-referees/${gameId}`)
    
    // Transform backend response to frontend format
    const transformedReferees = response.map((referee: any) => ({
      id: referee.id,
      name: referee.name,
      email: referee.email,
      phone: referee.phone,
      role: 'referee' as const,
      certificationLevel: referee.level,
      location: referee.location,
      isAvailable: referee.is_available,
      certifications: referee.certifications || [],
      preferredPositions: referee.preferred_positions || [],
      wagePerGame: referee.wage_per_game,
      notes: referee.notes,
      maxDistance: referee.max_distance,
      postalCode: referee.postal_code,
      createdAt: referee.created_at,
      updatedAt: referee.updated_at
    }))
    
    return transformedReferees
  }

  // Referee Levels endpoints
  async getRefereeLevels() {
    return this.request<{ success: boolean; data: RefereeLevel[] }>('/referee-levels')
  }

  async assignRefereeLevel(refereeId: string, levelData: {
    referee_level_id: string;
    years_experience?: number;
    evaluation_score?: number;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: { referee: any }; message: string }>(`/referee-levels/${refereeId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(levelData)
    })
  }

  async checkAssignmentEligibility(gameId: string, refereeId: string) {
    return this.request<{ 
      success: boolean; 
      data: { 
        canAssign: boolean; 
        warning?: string; 
        referee_level?: string;
        game_level?: string;
        allowed_divisions?: string[];
      } 
    }>(`/referee-levels/check-assignment/${gameId}/${refereeId}`)
  }

  // Self-assignment endpoints
  async selfAssignToGame(gameData: {
    game_id: string;
    position_id: string;
  }) {
    return this.request<{ 
      success: boolean; 
      data: { 
        assignment: Assignment; 
        wageBreakdown: WageBreakdown; 
      }; 
      message: string; 
    }>('/self-assignment', {
      method: 'POST',
      body: JSON.stringify(gameData)
    })
  }

  async getAvailableGamesForSelfAssignment() {
    return this.request<{ 
      success: boolean; 
      data: { 
        games: Game[]; 
        referee_level?: string;
        allowed_divisions?: string[];
      };
      message?: string;
    }>('/self-assignment/available')
  }

  // League endpoints
  async getLeagues(params?: {
    organization?: string;
    age_group?: string;
    gender?: string;
    division?: string;
    season?: string;
    level?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        leagues: League[];
        pagination: any;
      };
    }>(`/leagues${queryString ? `?${queryString}` : ''}`)
  }

  async getLeague(id: string) {
    return this.request<{
      success: boolean;
      data: {
        league: League;
        teams: Team[];
        games: Game[];
        stats: any;
      };
    }>(`/leagues/${id}`)
  }

  async createLeague(leagueData: Partial<League>) {
    return this.request<{
      success: boolean;
      data: { league: League };
      message: string;
    }>('/leagues', {
      method: 'POST',
      body: JSON.stringify(leagueData)
    })
  }

  async createBulkLeagues(data: {
    organization: string;
    age_groups: string[];
    genders: string[];
    divisions: string[];
    season: string;
    level: string;
  }) {
    return this.request<{
      success: boolean;
      data: {
        created: League[];
        duplicates: string[];
        summary: any;
      };
      message: string;
    }>('/leagues/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateLeague(id: string, leagueData: Partial<League>) {
    return this.request<{
      success: boolean;
      data: { league: League };
      message: string;
    }>(`/leagues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leagueData)
    })
  }

  async deleteLeague(id: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/leagues/${id}`, {
      method: 'DELETE'
    })
  }

  async getLeagueFilterOptions() {
    return this.request<{
      success: boolean;
      data: {
        organizations: string[];
        age_groups: string[];
        genders: string[];
        divisions: string[];
        seasons: string[];
        levels: string[];
      };
    }>('/leagues/options/filters')
  }

  // Team endpoints
  async getTeams(params?: {
    league_id?: string;
    organization?: string;
    age_group?: string;
    gender?: string;
    season?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        teams: Team[];
        pagination: any;
      };
    }>(`/teams${queryString ? `?${queryString}` : ''}`)
  }

  async getTeam(id: string) {
    return this.request<{
      success: boolean;
      data: {
        team: Team;
        games: Game[];
        stats: any;
      };
    }>(`/teams/${id}`)
  }

  async createTeam(teamData: Partial<Team>) {
    return this.request<{
      success: boolean;
      data: { team: Team };
      message: string;
    }>('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    })
  }

  async createBulkTeams(data: {
    league_id: string;
    teams: Partial<Team>[];
  }) {
    return this.request<{
      success: boolean;
      data: {
        created: Team[];
        duplicates: string[];
        summary: any;
      };
      message: string;
    }>('/teams/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async generateTeams(data: {
    league_id: string;
    count: number;
    name_pattern?: string;
    location_base?: string;
    auto_rank?: boolean;
  }) {
    return this.request<{
      success: boolean;
      data: {
        created: Team[];
        league: any;
        summary: any;
      };
      message: string;
    }>('/teams/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateTeam(id: string, teamData: Partial<Team>) {
    return this.request<{
      success: boolean;
      data: { team: Team };
      message: string;
    }>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    })
  }

  async deleteTeam(id: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/teams/${id}`, {
      method: 'DELETE'
    })
  }

  async getTeamsForLeague(leagueId: string) {
    return this.request<{
      success: boolean;
      data: {
        league: League;
        teams: Team[];
      };
    }>(`/teams/league/${leagueId}`)
  }

  // Tournament endpoints
  async generateTournament(data: {
    name: string;
    league_id: string;
    tournament_type: 'round_robin' | 'single_elimination' | 'swiss_system' | 'group_stage_playoffs';
    team_ids: string[];
    start_date: string;
    venue?: string;
    time_slots?: string[];
    days_of_week?: number[];
    games_per_day?: number;
    rounds?: number; // for swiss system
    group_size?: number; // for group stage
    advance_per_group?: number; // for group stage
    seeding_method?: 'random' | 'ranked' | 'custom';
  }) {
    return this.request<{
      success: boolean;
      data: {
        tournament: Tournament;
      };
      message: string;
    }>('/tournaments/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createTournamentGames(data: {
    games: any[];
    tournament_name: string;
  }) {
    return this.request<{
      success: boolean;
      data: {
        created: Game[];
        summary: any;
      };
      message: string;
    }>('/tournaments/create-games', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getTournamentFormats() {
    return this.request<{
      success: boolean;
      data: {
        formats: TournamentFormat[];
      };
    }>('/tournaments/formats')
  }

  async estimateTournament(params: {
    tournament_type: string;
    team_count: number;
    rounds?: number;
    group_size?: number;
    advance_per_group?: number;
    games_per_day?: number;
  }) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    return this.request<{
      success: boolean;
      data: {
        tournament_type: string;
        team_count: number;
        estimate: any;
      };
    }>(`/tournaments/estimate?${queryString}`)
  }

  // Invitation endpoints
  async createInvitation(invitationData: {
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) {
    const transformedData = {
      email: invitationData.email,
      first_name: invitationData.firstName,
      last_name: invitationData.lastName,
      role: invitationData.role || 'referee'
    }
    
    return this.request<{ success: boolean; data: { invitation: any; invitation_link: string } }>('/invitations', {
      method: 'POST',
      body: JSON.stringify(transformedData)
    })
  }

  async getInvitations(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : ''
    return this.request<{ success: boolean; data: { invitations: any[] } }>(`/invitations${queryString ? `?${queryString}` : ''}`)
  }

  async getInvitation(token: string) {
    return this.request<{ success: boolean; data: { invitation: any } }>(`/invitations/${token}`)
  }

  async completeInvitation(token: string, signupData: {
    password: string;
    phone?: string;
    location?: string;
    postalCode?: string;
    level?: string;
    maxDistance?: number;
  }) {
    const transformedData = {
      password: signupData.password,
      phone: signupData.phone,
      location: signupData.location,
      postal_code: signupData.postalCode,
      level: signupData.level,
      max_distance: signupData.maxDistance
    }
    
    return this.request<{ success: boolean; data: { token: string; user: any } }>(`/invitations/${token}/complete`, {
      method: 'POST',
      body: JSON.stringify(transformedData)
    })
  }

  async cancelInvitation(id: string) {
    return this.request<{ success: boolean; message: string }>(`/invitations/${id}`, {
      method: 'DELETE'
    })
  }

  // Organization settings endpoints
  async getOrganizationSettings() {
    return this.request<{ success: boolean; data: OrganizationSettings }>('/organization/settings')
  }

  async updateOrganizationSettings(settings: {
    organization_name: string;
    payment_model: 'INDIVIDUAL' | 'FLAT_RATE';
    default_game_rate?: number;
    availability_strategy?: 'WHITELIST' | 'BLACKLIST';
  }) {
    return this.request<{ success: boolean; data: OrganizationSettings; message: string }>('/organization/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  }

  // Posts endpoints
  async getPosts(includeDrafts = false) {
    const params = includeDrafts ? '?include_drafts=true' : ''
    return this.request<{ success: boolean; data: { posts: Post[] } }>(`/posts${params}`)
  }

  async getPostCategories() {
    return this.request<{ success: boolean; data: PostCategory[] }>('/posts/categories')
  }

  async createPost(postData: {
    title: string;
    content: string;
    category: string;
    status?: 'draft' | 'published' | 'archived';
    excerpt?: string;
    tags?: string[];
  }) {
    return this.request<{ success: boolean; data: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    })
  }

  async updatePost(id: string, postData: Partial<{
    title: string;
    content: string;
    category: string;
    status: 'draft' | 'published' | 'archived';
    excerpt: string;
    tags: string[];
  }>) {
    return this.request<{ success: boolean; data: Post }>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    })
  }

  async deletePost(id: string) {
    return this.request<{ success: boolean; message: string }>(`/posts/${id}`, {
      method: 'DELETE'
    })
  }

  // AI Assignment Rules endpoints
  async getAIAssignmentRules(params?: {
    enabled?: boolean;
    aiSystemType?: 'algorithmic' | 'llm';
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }
    const query = searchParams.toString()
    return this.request<{ success: boolean; data: AIAssignmentRule[] }>(`/ai-assignment-rules${query ? `?${query}` : ''}`)
  }

  async createAIAssignmentRule(ruleData: {
    name: string;
    description?: string;
    enabled?: boolean;
    schedule: {
      type: 'manual' | 'recurring' | 'one-time';
      frequency?: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: string;
      dayOfMonth?: number;
      time?: string;
      startDate?: string;
      endDate?: string;
    };
    criteria: {
      gameTypes: string[];
      ageGroups: string[];
      maxDaysAhead: number;
      minRefereeLevel: string;
      prioritizeExperience: boolean;
      avoidBackToBack: boolean;
      maxDistance: number;
    };
    aiSystem: {
      type: 'algorithmic' | 'llm';
      algorithmicSettings?: {
        distanceWeight: number;
        skillWeight: number;
        experienceWeight: number;
        partnerPreferenceWeight: number;
        preferredPairs: Array<{
          referee1Id: string;
          referee2Id: string;
          preference: 'preferred' | 'avoid';
        }>;
      };
      llmSettings?: {
        model: string;
        temperature: number;
        contextPrompt: string;
        includeComments: boolean;
      };
    };
  }) {
    return this.request<{ success: boolean; data: AIAssignmentRule }>('/ai-assignment-rules', {
      method: 'POST',
      body: JSON.stringify(ruleData)
    })
  }

  async getAIAssignmentRule(id: string) {
    return this.request<{ success: boolean; data: AIAssignmentRule & { partnerPreferences: any[] } }>(`/ai-assignment-rules/${id}`)
  }

  async updateAIAssignmentRule(id: string, ruleData: any) {
    return this.request<{ success: boolean; data: AIAssignmentRule }>(`/ai-assignment-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ruleData)
    })
  }

  async deleteAIAssignmentRule(id: string) {
    return this.request<{ success: boolean }>(`/ai-assignment-rules/${id}`, {
      method: 'DELETE'
    })
  }

  async toggleAIAssignmentRule(id: string) {
    return this.request<{ success: boolean; data: AIAssignmentRule }>(`/ai-assignment-rules/${id}/toggle`, {
      method: 'POST'
    })
  }

  async runAIAssignmentRule(id: string, params: {
    dryRun?: boolean;
    gameIds?: string[];
    contextComments?: string[];
  }) {
    return this.request<{ success: boolean; data: AIAssignmentResult }>(`/ai-assignment-rules/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async getAIAssignmentRuleRuns(id: string, params?: {
    status?: 'success' | 'error' | 'partial';
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }
    const query = searchParams.toString()
    return this.request<{ success: boolean; data: AIAssignmentRuleRun[] }>(`/ai-assignment-rules/${id}/runs${query ? `?${query}` : ''}`)
  }

  async getAIAssignmentRuleRunDetails(runId: string) {
    return this.request<{ success: boolean; data: AIAssignmentRuleRun }>(`/ai-assignment-rules/runs/${runId}`)
  }

  async getAIAssignmentAnalytics(params?: { days?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString() : ''
    
    return this.request<{ 
      success: boolean; 
      data: {
        summary: {
          totalAssignments: number;
          assignmentGrowth: string;
          successRate: number;
          successRateGrowth: string;
          activeRules: number;
          totalRules: number;
          period: string;
        };
        performance: {
          averageDuration: number;
          totalRuns: number;
          successfulRuns: number;
          runSuccessRate: number;
        };
        trends: {
          performanceOverTime: Array<{
            date: string;
            assignments: number;
            games: number;
            successRate: number;
            avgDuration: number;
            runs: number;
          }>;
        };
        aiSystems: Array<{
          type: string;
          runs: number;
          assignments: number;
          avgDuration: number;
          successRate: number;
        }>;
        conflicts: {
          totalConflicts: number;
          avgConflictsPerRun: number;
          conflictRate: number;
          runsWithConflicts: number;
        };
      }
    }>(`/ai-assignment-rules/analytics${query ? `?${query}` : ''}`)
  }

  async addPartnerPreference(ruleId: string, preference: {
    referee1Id: string;
    referee2Id: string;
    preferenceType: 'preferred' | 'avoid';
  }) {
    return this.request<{ success: boolean; data: any }>(`/ai-assignment-rules/${ruleId}/partner-preferences`, {
      method: 'POST',
      body: JSON.stringify(preference)
    })
  }

  async deletePartnerPreference(ruleId: string, prefId: string) {
    return this.request<{ success: boolean }>(`/ai-assignment-rules/${ruleId}/partner-preferences/${prefId}`, {
      method: 'DELETE'
    })
  }

  // Employee Management API endpoints
  async getEmployeeDepartments(params?: { hierarchy?: boolean }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<Department[]>(`/employees/departments${queryString ? `?${queryString}` : ''}`)
  }

  async createEmployeeDepartment(departmentData: {
    name: string;
    description?: string;
    parent_department_id?: string;
    manager_id?: string;
    cost_center?: string;
    budget_allocated?: number;
  }) {
    return this.request<{ success: boolean; data: Department }>('/employees/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData)
    })
  }

  async updateEmployeeDepartment(id: string, departmentData: Partial<Department>) {
    return this.request<{ success: boolean; data: Department }>(`/employees/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData)
    })
  }

  async getEmployeePositions(params?: {
    department_id?: string;
    level?: string;
    active?: boolean;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<JobPosition[]>(`/employees/positions${queryString ? `?${queryString}` : ''}`)
  }

  async createEmployeePosition(positionData: {
    title: string;
    description?: string;
    department_id: string;
    level: string;
    min_salary?: number;
    max_salary?: number;
    required_skills?: string[];
    preferred_skills?: string[];
    responsibilities?: string;
  }) {
    return this.request<{ success: boolean; data: JobPosition }>('/employees/positions', {
      method: 'POST',
      body: JSON.stringify(positionData)
    })
  }

  async getEmployees(params?: {
    department_id?: string;
    position_id?: string;
    employment_status?: string;
    manager_id?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      employees: Employee[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/employees${queryString ? `?${queryString}` : ''}`)
  }

  async getEmployee(id: string) {
    return this.request<{ success: boolean; data: Employee }>(`/employees/${id}`)
  }

  async createEmployee(employeeData: {
    user_id: string;
    employee_id?: string;
    department_id: string;
    position_id: string;
    manager_id?: string;
    hire_date: string;
    employment_status?: string;
    base_salary?: number;
    hourly_rate?: number;
    employment_type?: string;
    work_location?: string;
  }) {
    return this.request<{ success: boolean; data: Employee }>('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData)
    })
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>) {
    return this.request<{ success: boolean; data: Employee }>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData)
    })
  }

  async getEmployeeEvaluations(id: string) {
    return this.request<{ success: boolean; data: EmployeeEvaluation[] }>(`/employees/${id}/evaluations`)
  }

  async createEmployeeEvaluation(id: string, evaluationData: {
    evaluation_date: string;
    evaluation_period_start: string;
    evaluation_period_end: string;
    overall_rating: number;
    performance_goals: any;
    achievements: any;
    areas_for_improvement: any;
    evaluator_id: string;
    evaluator_comments?: string;
    employee_comments?: string;
    status?: string;
  }) {
    return this.request<{ success: boolean; data: EmployeeEvaluation }>(`/employees/${id}/evaluations`, {
      method: 'POST',
      body: JSON.stringify(evaluationData)
    })
  }

  async getEmployeeTraining(id: string) {
    return this.request<{ success: boolean; data: TrainingRecord[] }>(`/employees/${id}/training`)
  }

  async createEmployeeTraining(id: string, trainingData: {
    training_name: string;
    training_provider?: string;
    start_date: string;
    end_date?: string;
    completion_date?: string;
    status: string;
    cost?: number;
    certification_earned?: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: TrainingRecord }>(`/employees/${id}/training`, {
      method: 'POST',
      body: JSON.stringify(trainingData)
    })
  }

  async getEmployeeStats() {
    return this.request<{
      success: boolean;
      data: {
        totalEmployees: number;
        activeEmployees: number;
        departmentBreakdown: any[];
        positionBreakdown: any[];
        newHiresThisMonth: number;
        upcomingEvaluations: number;
        activeTrainingPrograms: number;
        averageTenure: number;
      };
    }>('/employees/stats/overview')
  }

  // Asset Management API endpoints
  async getAssets(params?: {
    category?: string;
    status?: string;
    location?: string;
    assigned_to?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      assets: Asset[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/assets${queryString ? `?${queryString}` : ''}`)
  }

  async getAsset(id: string) {
    return this.request<{ success: boolean; data: Asset }>(`/assets/${id}`)
  }

  async createAsset(assetData: {
    name: string;
    description?: string;
    category: string;
    asset_tag: string;
    serial_number?: string;
    model?: string;
    manufacturer?: string;
    purchase_date?: string;
    purchase_cost?: number;
    warranty_expiry?: string;
    location?: string;
    status?: string;
  }) {
    return this.request<{ success: boolean; data: Asset }>('/assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    })
  }

  async updateAsset(id: string, assetData: Partial<Asset>) {
    return this.request<{ success: boolean; data: Asset }>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    })
  }

  async getAssetMaintenance(id: string) {
    return this.request<{ success: boolean; data: AssetMaintenance[] }>(`/assets/${id}/maintenance`)
  }

  async createAssetMaintenance(id: string, maintenanceData: {
    maintenance_type: string;
    scheduled_date: string;
    description?: string;
    assigned_to?: string;
    estimated_cost?: number;
    priority?: string;
  }) {
    return this.request<{ success: boolean; data: AssetMaintenance }>(`/assets/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(maintenanceData)
    })
  }

  async checkoutAsset(id: string, checkoutData: {
    assigned_to: string;
    checkout_date: string;
    expected_return_date?: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: AssetCheckout }>(`/assets/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    })
  }

  async checkinAsset(checkoutId: string, checkinData: {
    checkin_date: string;
    condition_on_return?: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: AssetCheckout }>(`/assets/checkout/${checkoutId}/checkin`, {
      method: 'POST',
      body: JSON.stringify(checkinData)
    })
  }

  async getAssetStats() {
    return this.request<{
      success: boolean;
      data: {
        totalAssets: number;
        availableAssets: number;
        checkedOutAssets: number;
        maintenanceAssets: number;
        retiredAssets: number;
        categoryBreakdown: any[];
        recentActivity: any[];
        maintenanceDue: any[];
        overallValue: number;
      };
    }>('/assets/stats/overview')
  }

  // Document Management API endpoints
  async getDocuments(params?: {
    category?: string;
    status?: string;
    uploaded_by?: string;
    requires_acknowledgment?: boolean;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      documents: Document[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/documents${queryString ? `?${queryString}` : ''}`)
  }

  async getDocument(id: string) {
    return this.request<{ success: boolean; data: Document }>(`/documents/${id}`)
  }

  async createDocument(formData: FormData) {
    return this.request<{ success: boolean; data: Document }>('/documents', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set content-type for FormData
    })
  }

  async updateDocument(id: string, documentData: {
    title?: string;
    description?: string;
    category?: string;
    requires_acknowledgment?: boolean;
    effective_date?: string;
    expiry_date?: string;
  }) {
    return this.request<{ success: boolean; data: Document }>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(documentData)
    })
  }

  async approveDocument(id: string, approvalData: {
    status: 'approved' | 'rejected';
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: Document }>(`/documents/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(approvalData)
    })
  }

  async acknowledgeDocument(id: string, acknowledgmentData: {
    acknowledged: boolean;
    comments?: string;
  }) {
    return this.request<{ success: boolean; data: DocumentAcknowledgment }>(`/documents/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(acknowledgmentData)
    })
  }

  async downloadDocument(id: string) {
    return this.request<Blob>(`/documents/${id}/download`, {}, true)
  }

  async getPendingAcknowledgments() {
    return this.request<{ success: boolean; data: DocumentAcknowledgment[] }>('/documents/acknowledgments/pending')
  }

  // Compliance Management API endpoints
  async getComplianceTracking(params?: {
    category?: string;
    status?: string;
    priority?: string;
    assigned_to?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      items: ComplianceItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/compliance/tracking${queryString ? `?${queryString}` : ''}`)
  }

  async createComplianceItem(itemData: {
    title: string;
    description?: string;
    category: string;
    priority: string;
    due_date: string;
    assigned_to?: string;
    requirements?: any;
    evidence_required?: boolean;
  }) {
    return this.request<{ success: boolean; data: ComplianceItem }>('/compliance/tracking', {
      method: 'POST',
      body: JSON.stringify(itemData)
    })
  }

  async updateComplianceItem(id: string, itemData: Partial<ComplianceItem>) {
    return this.request<{ success: boolean; data: ComplianceItem }>(`/compliance/tracking/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    })
  }

  async getComplianceIncidents(params?: {
    severity?: string;
    status?: string;
    category?: string;
    reported_by?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      incidents: ComplianceIncident[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/compliance/incidents${queryString ? `?${queryString}` : ''}`)
  }

  async createComplianceIncident(incidentData: {
    title: string;
    description: string;
    severity: string;
    category: string;
    incident_date: string;
    location?: string;
    people_involved?: string[];
    immediate_actions?: string;
    root_cause?: string;
  }) {
    return this.request<{ success: boolean; data: ComplianceIncident }>('/compliance/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData)
    })
  }

  async getRiskAssessments(params?: {
    category?: string;
    risk_level?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      assessments: RiskAssessment[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/compliance/risks${queryString ? `?${queryString}` : ''}`)
  }

  async createRiskAssessment(assessmentData: {
    title: string;
    description?: string;
    category: string;
    probability: number;
    impact: number;
    current_controls?: string;
    additional_controls?: string;
    responsible_person?: string;
    review_date?: string;
  }) {
    return this.request<{ success: boolean; data: RiskAssessment }>('/compliance/risks', {
      method: 'POST',
      body: JSON.stringify(assessmentData)
    })
  }

  async getComplianceDashboard() {
    return this.request<{
      success: boolean;
      data: {
        overview: {
          totalItems: number;
          overdue: number;
          dueSoon: number;
          completed: number;
        };
        incidents: {
          totalIncidents: number;
          openIncidents: number;
          criticalIncidents: number;
        };
        risks: {
          totalRisks: number;
          highRisks: number;
          mediumRisks: number;
          lowRisks: number;
        };
        trends: any[];
        upcomingDeadlines: any[];
      };
    }>('/compliance/stats/dashboard')
  }

  // Budget Management API endpoints
  async getBudgetPeriods() {
    return this.request<{ success: boolean; data: BudgetPeriod[] }>('/budgets/periods')
  }

  async createBudgetPeriod(periodData: {
    name: string;
    start_date: string;
    end_date: string;
    fiscal_year: number;
    status?: string;
  }) {
    return this.request<{ success: boolean; data: BudgetPeriod }>('/budgets/periods', {
      method: 'POST',
      body: JSON.stringify(periodData)
    })
  }

  async getBudgetCategories() {
    return this.request<{ success: boolean; data: BudgetCategory[] }>('/budgets/categories')
  }

  async createBudgetCategory(categoryData: {
    name: string;
    description?: string;
    category_code: string;
    parent_category_id?: string;
    active?: boolean;
  }) {
    return this.request<{ success: boolean; data: BudgetCategory }>('/budgets/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    })
  }

  async getBudgets(params?: {
    period_id?: string;
    category_id?: string;
    department_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      budgets: Budget[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/budgets${queryString ? `?${queryString}` : ''}`)
  }

  async createBudget(budgetData: {
    name: string;
    description?: string;
    period_id: string;
    category_id: string;
    department_id?: string;
    allocated_amount: number;
    responsible_person?: string;
  }) {
    return this.request<{ success: boolean; data: Budget }>('/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData)
    })
  }

  async getBudget(id: string) {
    return this.request<{
      success: boolean;
      data: {
        budget: Budget;
        allocations: BudgetAllocation[];
        expenses: any[];
        variance: {
          allocated: number;
          spent: number;
          remaining: number;
          utilizationRate: number;
          variance: number;
          variancePercentage: number;
        };
      };
    }>(`/budgets/${id}`)
  }

  async updateBudget(id: string, budgetData: Partial<Budget>) {
    return this.request<{ success: boolean; data: Budget }>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(budgetData)
    })
  }

  async deleteBudget(id: string) {
    return this.request<{ success: boolean; message?: string }>(`/budgets/${id}`, {
      method: 'DELETE'
    })
  }

  // Expense Management API endpoints
  async uploadReceipt(formData: FormData) {
    return this.request<{
      message: string;
      receipt: {
        id: string;
        filename: string;
        size: number;
        uploadedAt: string;
        status: string;
      };
      jobId: string;
    }>('/expenses/receipts/upload', {
      method: 'POST',
      body: formData
      // Don't set headers at all - let browser set multipart/form-data automatically
    })
  }

  async getReceipts(params?: {
    status?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      receipts: Receipt[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/expenses/receipts${queryString ? `?${queryString}` : ''}`)
  }

  async getReceipt(id: string) {
    return this.request<{
      receipt: Receipt;
      processingLogs: ProcessingLog[];
    }>(`/expenses/receipts/${id}`)
  }

  // Alias for getReceipt - used by receipt upload component
  async getReceiptDetails(id: string) {
    return this.getReceipt(id)
  }

  async processReceipt(id: string) {
    return this.request<{
      message: string;
      jobId: string;
      status: string;
    }>(`/expenses/receipts/${id}/process`, {
      method: 'POST'
    })
  }

  async approveExpense(id: string, approvalData: {
    status: 'approved' | 'rejected' | 'requires_information';
    notes?: string;
    approvedAmount?: number;
    rejectionReason?: string;
    requiredInformation?: string[];
  }) {
    return this.request<{ success: boolean; data: Receipt }>(`/expenses/receipts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(approvalData)
    })
  }

  async deleteReceipt(id: string) {
    return this.request<{ success: boolean; message: string }>(`/expenses/receipts/${id}`, {
      method: 'DELETE'
    })
  }

  async downloadReceipt(id: string) {
    const token = this.getToken()
    const response = await fetch(`${this.baseURL}/expenses/receipts/${id}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'receipt'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Create blob and trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  async getExpenseCategories() {
    return this.request<{
      categories: ExpenseCategory[];
    }>('/expenses/categories')
  }

  async getExpenseReports(params?: {
    period?: string;
    department?: string;
    category?: string;
    status?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      reports: any[];
      summary: {
        totalExpenses: number;
        totalAmount: number;
        averageAmount: number;
        pendingApprovals: number;
      };
    }>(`/expenses/reports${queryString ? `?${queryString}` : ''}`)
  }

  // Payment Methods API endpoints
  async getPaymentMethods() {
    return this.request<{
      paymentMethods: Array<{
        id: string;
        name: string;
        type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor';
        description: string;
        requiresApproval: boolean;
        spendingLimit?: number;
        monthlySpent?: number;
        remainingBudget?: number;
        restrictions?: string[];
        approvalWorkflow?: {
          stages: number;
          estimatedDays: number;
        };
        isActive: boolean;
        confidence?: number;
        reason?: string;
      }>;
    }>('/payment-methods')
  }

  async detectPaymentMethod(data: {
    receiptId: string;
    vendorName: string;
    amount: number;
    urgency: string;
  }) {
    return this.request<{
      suggestions: Array<{
        id: string;
        name: string;
        type: string;
        confidence: number;
        reason: string;
      }>;
    }>('/payment-methods/detect', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Purchase Orders API endpoints
  async getPurchaseOrders(params?: {
    status?: string;
    vendorName?: string;
    minRemainingAmount?: number;
    department?: string;
    search?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      purchaseOrders: Array<{
        id: string;
        poNumber: string;
        description: string;
        vendorName: string;
        originalAmount: number;
        remainingAmount: number;
        spentAmount: number;
        status: 'draft' | 'approved' | 'pending' | 'closed' | 'cancelled';
        approvedBy?: {
          id: string;
          name: string;
          email: string;
        };
        createdBy: {
          id: string;
          name: string;
          email: string;
        };
        department?: string;
        projectCode?: string;
        expirationDate?: string;
        createdAt: string;
        updatedAt: string;
        lineItems?: Array<{
          id: string;
          description: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
          remainingAmount: number;
        }>;
        restrictions?: string[];
        approvalNotes?: string;
      }>;
    }>(`/purchase-orders${queryString ? `?${queryString}` : ''}`)
  }

  async getPurchaseOrder(id: string) {
    return this.request<{
      purchaseOrder: any;
      lineItems: any[];
      usage: any[];
    }>(`/purchase-orders/${id}`)
  }

  // Company Credit Cards API endpoints
  async getCompanyCreditCards(params?: {
    status?: string;
    cardType?: string;
    minRemainingLimit?: number;
    department?: string;
    search?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      creditCards: Array<{
        id: string;
        cardName: string;
        cardType: 'visa' | 'mastercard' | 'amex' | 'discover';
        last4Digits: string;
        cardholderName: string;
        issuingBank: string;
        monthlyLimit: number;
        monthlySpent: number;
        remainingLimit: number;
        billingCycle: {
          startDate: string;
          endDate: string;
          dueDate: string;
        };
        status: 'active' | 'suspended' | 'expired' | 'cancelled';
        expirationDate: string;
        authorizedUsers: Array<{
          id: string;
          name: string;
          email: string;
          spendingLimit?: number;
        }>;
        restrictions: {
          categories?: string[];
          vendors?: string[];
          maxTransactionAmount?: number;
          requiresApproval?: boolean;
          approvalThreshold?: number;
        };
        recentTransactions?: Array<{
          id: string;
          amount: number;
          merchant: string;
          date: string;
          category: string;
          status: 'posted' | 'pending';
        }>;
        securityFeatures: {
          hasChipAndPin: boolean;
          hasContactless: boolean;
          hasVirtualCard: boolean;
          fraudProtection: boolean;
        };
        department?: string;
        projectCode?: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/company-credit-cards${queryString ? `?${queryString}` : ''}`)
  }

  async getCompanyCreditCard(id: string) {
    return this.request<{
      creditCard: any;
      transactions: any[];
      usage: any[];
    }>(`/company-credit-cards/${id}`)
  }

  // Enhanced Expense Management API endpoints
  async createExpense(expenseData: {
    receiptId: string;
    paymentMethodId: string;
    amount: number;
    vendorName: string;
    transactionDate: string;
    categoryId?: string;
    description?: string;
    businessPurpose: string;
    projectCode?: string;
    purchaseOrderId?: string;
    creditCardId?: string;
    expenseUrgency: 'low' | 'normal' | 'high' | 'urgent';
    urgencyJustification?: string;
  }) {
    return this.request<{
      success: boolean;
      data: {
        expense: any;
        approvalWorkflow?: any;
      };
      message: string;
    }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    })
  }

  async updateExpense(id: string, expenseData: Partial<{
    amount: number;
    vendorName: string;
    transactionDate: string;
    categoryId: string;
    description: string;
    businessPurpose: string;
    projectCode: string;
    expenseUrgency: 'low' | 'normal' | 'high' | 'urgent';
    urgencyJustification: string;
  }>) {
    return this.request<{
      success: boolean;
      data: {
        expense: any;
      };
      message: string;
    }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData)
    })
  }

  async getExpenses(params?: {
    status?: string;
    paymentMethod?: string;
    category?: string;
    department?: string;
    urgency?: string;
    needsReview?: boolean;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      expenses: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/expenses${queryString ? `?${queryString}` : ''}`)
  }

  async getExpense(id: string) {
    return this.request<{
      expense: any;
      receipt?: any;
      approvalHistory: any[];
      paymentMethod: any;
      purchaseOrder?: any;
      creditCard?: any;
    }>(`/expenses/${id}`)
  }

  async saveDraftExpense(expenseData: any) {
    return this.request<{
      success: boolean;
      data: {
        expense: any;
      };
      message: string;
    }>('/expenses/draft', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    })
  }

  // Expense Approval API endpoints
  async getPendingExpenses(params?: {
    payment_method?: string;
    category?: string;
    urgency?: string;
    amount_min?: string;
    amount_max?: string;
    search?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      expenses: any[];
      summary: {
        total_pending: number;
        overdue_count: number;
        high_priority_count: number;
        total_amount: number;
      };
    }>(`/expenses/pending-approval${queryString ? `?${queryString}` : ''}`)
  }

  async approveExpense(expenseId: string, data: {
    decision: 'approved';
    notes?: string;
    approved_amount?: number;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      expense: any;
    }>(`/expenses/${expenseId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async rejectExpense(expenseId: string, data: {
    decision: 'rejected';
    rejection_reason: string;
    notes?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      expense: any;
    }>(`/expenses/${expenseId}/reject`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async delegateExpense(expenseId: string, data: {
    delegate_to_user_id: string;
    delegation_notes?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      expense: any;
    }>(`/expenses/${expenseId}/delegate`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getExpenseApprovalHistory(expenseId: string) {
    return this.request<{
      history: any[];
    }>(`/expenses/${expenseId}/approval-history`)
  }

  // Financial Reports API endpoints
  async getBudgetVarianceReport(params?: {
    period_id?: string;
    department_id?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        report: any;
        summary: any;
        variances: any[];
      };
    }>(`/financial-reports/budget-variance${queryString ? `?${queryString}` : ''}`)
  }

  async getCashFlowReport(params?: {
    start_date?: string;
    end_date?: string;
    granularity?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        report: any;
        summary: any;
        periods: any[];
      };
    }>(`/financial-reports/cash-flow${queryString ? `?${queryString}` : ''}`)
  }

  async getExpenseAnalysisReport(params?: {
    start_date?: string;
    end_date?: string;
    group_by?: string;
    category_id?: string;
    department_id?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        report: any;
        summary: any;
        breakdown: any[];
      };
    }>(`/financial-reports/expense-analysis${queryString ? `?${queryString}` : ''}`)
  }

  async getFinancialKPIs(params?: {
    period?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        kpis: any[];
        trends: any[];
        benchmarks: any[];
      };
    }>(`/financial-reports/kpis${queryString ? `?${queryString}` : ''}`)
  }

  // Organizational Analytics API endpoints
  async getEmployeePerformanceAnalytics(params?: {
    department_id?: string;
    period?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        summary: any;
        departmentBreakdown: any[];
        trends: any[];
        topPerformers: any[];
      };
    }>(`/analytics/organizational/employees/performance${queryString ? `?${queryString}` : ''}`)
  }

  async getEmployeeRetentionAnalytics(params?: {
    period?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        retentionRate: number;
        turnoverRate: number;
        trends: any[];
        departmentBreakdown: any[];
        exitReasons: any[];
      };
    }>(`/analytics/organizational/employees/retention${queryString ? `?${queryString}` : ''}`)
  }

  async getTrainingAnalytics(params?: {
    period?: string;
    department_id?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        summary: any;
        completionRates: any[];
        programEffectiveness: any[];
        upcomingTraining: any[];
      };
    }>(`/analytics/organizational/employees/training${queryString ? `?${queryString}` : ''}`)
  }

  async getOrganizationalHealthMetrics() {
    return this.request<{
      success: boolean;
      data: {
        overallScore: number;
        categories: any[];
        trends: any[];
        recommendations: any[];
      };
    }>('/analytics/organizational/health/overview')
  }

  async getExecutiveDashboard() {
    return this.request<{
      success: boolean;
      data: {
        kpis: any[];
        charts: any[];
        alerts: any[];
        recentActivity: any[];
      };
    }>('/analytics/organizational/dashboard/executive')
  }

  // Workflow Management API endpoints
  async getWorkflowDefinitions() {
    return this.request<{
      success: boolean;
      data: WorkflowDefinition[];
    }>('/workflows/definitions')
  }

  async createWorkflowDefinition(workflowData: {
    name: string;
    description?: string;
    category: string;
    version: string;
    definition: any;
    active?: boolean;
  }) {
    return this.request<{ success: boolean; data: WorkflowDefinition }>('/workflows/definitions', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    })
  }

  async getWorkflowInstances(params?: {
    definition_id?: string;
    status?: string;
    initiated_by?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      instances: WorkflowInstance[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/workflows/instances${queryString ? `?${queryString}` : ''}`)
  }

  async startWorkflow(workflowData: {
    definition_id: string;
    input_data?: any;
    priority?: string;
  }) {
    return this.request<{ success: boolean; data: WorkflowInstance }>('/workflows/instances', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    })
  }

  async getWorkflowInstance(id: string) {
    return this.request<{
      success: boolean;
      data: {
        instance: WorkflowInstance;
        steps: WorkflowStep[];
        history: any[];
      };
    }>(`/workflows/instances/${id}`)
  }

  async completeWorkflowStep(stepId: string, stepData: {
    status: 'completed' | 'failed';
    output_data?: any;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: WorkflowStep }>(`/workflows/steps/${stepId}/complete`, {
      method: 'POST',
      body: JSON.stringify(stepData)
    })
  }

  async getAssignedTasks(params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      tasks: WorkflowTask[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/workflows/tasks/assigned${queryString ? `?${queryString}` : ''}`)
  }

  // Communications API endpoints
  async getCommunications(params?: {
    type?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      communications: Communication[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/communications${queryString ? `?${queryString}` : ''}`)
  }

  async createCommunication(communicationData: {
    title: string;
    content: string;
    type: string;
    priority: string;
    target_audience: any;
    requires_acknowledgment?: boolean;
    scheduled_send_date?: string;
  }) {
    return this.request<{ success: boolean; data: Communication }>('/communications', {
      method: 'POST',
      body: JSON.stringify(communicationData)
    })
  }

  async getCommunication(id: string) {
    return this.request<{ success: boolean; data: Communication }>(`/communications/${id}`)
  }

  async updateCommunication(id: string, communicationData: Partial<Communication>) {
    return this.request<{ success: boolean; data: Communication }>(`/communications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(communicationData)
    })
  }

  async publishCommunication(id: string) {
    return this.request<{ success: boolean; data: Communication }>(`/communications/${id}/publish`, {
      method: 'POST'
    })
  }

  async acknowledgeCommunication(id: string, acknowledgmentData: {
    acknowledged: boolean;
    comments?: string;
  }) {
    return this.request<{ success: boolean; data: any }>(`/communications/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(acknowledgmentData)
    })
  }

  async getUnreadCommunicationsCount() {
    return Promise.resolve({
      success: true,
      data: {
        unreadCount: 0,
        byPriority: {},
        byType: {}
      }
    })
  }

  // Notification broadcast endpoint
  async broadcastNotification(notificationData: {
    title: string;
    message: string;
    type: 'assignment' | 'status_change' | 'reminder' | 'system';
    link?: string;
    target_audience: {
      roles?: string[];
      specific_users?: string[];
      all_users?: boolean;
    };
    metadata?: any;
  }) {
    return this.request<{
      success: boolean;
      recipientCount: number;
      createdCount: number;
      message: string;
    }>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    })
  }

  // Employee Management API
  async getEmployees(params?: {
    department?: string;
    position?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        employees: Employee[];
        pagination: any;
      };
    }>(`/employees${queryString ? `?${queryString}` : ''}`)
  }

  async getEmployee(id: string) {
    return this.request<{
      success: boolean;
      data: { employee: Employee };
    }>(`/employees/${id}`)
  }

  async createEmployee(employeeData: Partial<Employee>) {
    return this.request<{
      success: boolean;
      data: { employee: Employee };
      message: string;
    }>('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData)
    })
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>) {
    return this.request<{
      success: boolean;
      data: { employee: Employee };
      message: string;
    }>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData)
    })
  }

  async deleteEmployee(id: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/employees/${id}`, {
      method: 'DELETE'
    })
  }

  // Asset Management API
  async getAssets(params?: {
    category?: string;
    status?: string;
    location?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        assets: Asset[];
        pagination: any;
      };
    }>(`/assets${queryString ? `?${queryString}` : ''}`)
  }

  async getAsset(id: string) {
    return this.request<{
      success: boolean;
      data: { asset: Asset };
    }>(`/assets/${id}`)
  }

  async createAsset(assetData: Partial<Asset>) {
    return this.request<{
      success: boolean;
      data: { asset: Asset };
      message: string;
    }>('/assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    })
  }

  async updateAsset(id: string, assetData: Partial<Asset>) {
    return this.request<{
      success: boolean;
      data: { asset: Asset };
      message: string;
    }>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    })
  }

  async checkoutAsset(id: string, checkoutData: {
    checked_out_to: string;
    checkout_notes?: string;
    expected_return_date?: string;
  }) {
    return this.request<{
      success: boolean;
      data: { asset: Asset };
      message: string;
    }>(`/assets/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    })
  }

  async checkinAsset(id: string, checkinData: {
    checkin_notes?: string;
    condition?: string;
  }) {
    return this.request<{
      success: boolean;
      data: { asset: Asset };
      message: string;
    }>(`/assets/${id}/checkin`, {
      method: 'POST',
      body: JSON.stringify(checkinData)
    })
  }

  // Document Management API
  async getDocuments(params?: {
    category?: string;
    department?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        documents: Document[];
        pagination: any;
      };
    }>(`/documents${queryString ? `?${queryString}` : ''}`)
  }

  async uploadDocument(formData: FormData) {
    return this.request<{
      success: boolean;
      data: { document: Document };
      message: string;
    }>('/documents/upload', {
      method: 'POST',
      body: formData
    })
  }

  async getDocument(id: string) {
    return this.request<{
      success: boolean;
      data: { document: Document };
    }>(`/documents/${id}`)
  }

  async acknowledgeDocument(id: string, acknowledgmentData: {
    acknowledged: boolean;
    comments?: string;
  }) {
    return this.request<{
      success: boolean;
      data: any;
    }>(`/documents/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(acknowledgmentData)
    })
  }

  // Budget Management API
  async getBudgets(params?: {
    category?: string;
    period?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        budgets: Budget[];
        pagination: any;
      };
    }>(`/budgets${queryString ? `?${queryString}` : ''}`)
  }

  async createBudget(budgetData: Partial<Budget>) {
    return this.request<{
      success: boolean;
      data: { budget: Budget };
      message: string;
    }>('/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData)
    })
  }

  async updateBudget(id: string, budgetData: Partial<Budget>) {
    return this.request<{
      success: boolean;
      data: { budget: Budget };
      message: string;
    }>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(budgetData)
    })
  }

  // Organizational Analytics API
  async getOrganizationalAnalytics(params?: {
    period?: string;
    department?: string;
    metric?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        analytics: any;
        insights: any[];
        kpis: any;
      };
    }>(`/organizational-analytics${queryString ? `?${queryString}` : ''}`)
  }

  async getFinancialReports(params?: {
    type?: string;
    period?: string;
    format?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        reports: any[];
        summary: any;
      };
    }>(`/financial-reports${queryString ? `?${queryString}` : ''}`)
  }

  // Workflow Management API
  async getWorkflows(params?: {
    status?: string;
    type?: string;
    assigned_to?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        workflows: WorkflowInstance[];
        pagination: any;
      };
    }>(`/workflows${queryString ? `?${queryString}` : ''}`)
  }

  async triggerWorkflow(workflowType: string, inputData: any) {
    return this.request<{
      success: boolean;
      data: { workflow: WorkflowInstance };
      message: string;
    }>('/workflows/trigger', {
      method: 'POST',
      body: JSON.stringify({
        workflow_type: workflowType,
        input_data: inputData
      })
    })
  }

  // AI Assignment Suggestions endpoints
  async generateAISuggestions(gameIds: string[], factors?: {
    proximity_weight?: number;
    availability_weight?: number;
    experience_weight?: number;
    performance_weight?: number;
  }) {
    return this.request<{
      success: boolean;
      data: {
        suggestions: Array<{
          id: string;
          game_id: string;
          referee_id: string;
          confidence_score: number;
          reasoning: string;
          factors: {
            proximity: number;
            availability: number;
            experience: number;
            past_performance: number;
            historical_bonus?: number;
          };
          score_breakdown: {
            base_score: number;
            proximity_points: number;
            availability_points: number;
            experience_points: number;
            performance_points: number;
            historical_bonus_points: number;
            final_score: number;
          };
          conflict_warnings?: string[];
          created_at: string;
        }>;
      };
    }>('/assignments/ai-suggestions', {
      method: 'POST',
      body: JSON.stringify({
        game_ids: gameIds,
        factors: factors || {}
      })
    })
  }

  async getAISuggestions(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : ''
    return this.request<{
      success: boolean;
      data: {
        suggestions: Array<{
          id: string;
          game_id: string;
          referee_id: string;
          referee_name: string;
          game_details: {
            date: string;
            time: string;
            location: string;
            home_team: string;
            away_team: string;
          };
          confidence_score: number;
          reasoning: string;
          factors: {
            proximity: number;
            availability: number;
            experience: number;
            past_performance: number;
            historical_bonus?: number;
          };
          score_breakdown: {
            base_score: number;
            proximity_points: number;
            availability_points: number;
            experience_points: number;
            performance_points: number;
            historical_bonus_points: number;
            final_score: number;
          };
          status: string;
          created_at: string;
        }>;
      };
    }>(`/assignments/ai-suggestions${queryString ? `?${queryString}` : ''}`)
  }

  async acceptAISuggestion(suggestionId: string) {
    return this.request<{
      success: boolean;
      data: {
        assignment: {
          id: string;
          game_id: string;
          referee_id: string;
          status: string;
          assigned_at: string;
        };
      };
      message: string;
    }>(`/assignments/ai-suggestions/${suggestionId}/accept`, {
      method: 'PUT'
    })
  }

  async rejectAISuggestion(suggestionId: string, reason?: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/assignments/ai-suggestions/${suggestionId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({
        reason: reason || ''
      })
    })
  }

  // Permission Management API Methods
  async getUserPermissions(userId?: string) {
    const endpoint = userId ? `/admin/permissions/users/${userId}` : '/auth/refresh-permissions'
    return this.request<{
      success: boolean;
      permissions: Permission[];
    }>(endpoint)
  }

  async refreshUserPermissions() {
    return this.request<{
      success: boolean;
      permissions: Permission[];
    }>('/auth/refresh-permissions', {
      method: 'POST'
    })
  }

  async getAllPermissions() {
    return this.request<{
      success: boolean;
      data: { permissions: Permission[] };
    }>('/admin/permissions')
  }

  async getPermissions() {
    return this.request<{
      success: boolean;
      data: { 
        permissions: PermissionsByCategory;
        statistics?: {
          total: number;
          categories: number;
        };
      };
    }>('/admin/permissions')
  }

  async getPermissionsByCategory(category: string) {
    return this.request<{
      success: boolean;
      data: { permissions: Permission[] };
    }>(`/admin/permissions/category/${category}`)
  }

  async getPermissionCategories() {
    return this.request<{
      success: boolean;
      data: { categories: string[] };
    }>('/admin/permissions/categories')
  }

  async bulkCheckPermissions(permissions: string[]) {
    return this.request<{
      success: boolean;
      data: { [key: string]: boolean };
    }>('/admin/permissions/users/bulk-check', {
      method: 'POST',
      body: JSON.stringify({ permissions })
    })
  }

  // RBAC Role Management
  async getRoles(params?: { include_inactive?: boolean }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : ''
    return this.request<{
      success: boolean;
      data: { roles: any[] };
    }>(`/admin/roles${queryString ? `?${queryString}` : ''}`)
  }

  // Get available roles for user assignment
  async getAvailableRoles() {
    return this.request<{
      success: boolean;
      data: { roles: any[] };
    }>('/users/roles')
  }

  async getRoleById(roleId: string) {
    return this.request<{
      success: boolean;
      data: { role: any };
    }>(`/admin/roles/${roleId}`)
  }

  // RBAC Access Control Management
  async getRolePageAccess(roleId: string) {
    return this.request<{
      success: boolean;
      data: { 
        role: any;
        pageAccess: Array<{
          page_path: string;
          page_name: string;
          page_category: string;
          page_description?: string;
          can_access: boolean;
          conditions?: any;
        }>;
      };
    }>(`/admin/access/roles/${roleId}/pages`)
  }

  async updateRolePageAccess(roleId: string, pageAccess: any[]) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/access/roles/${roleId}/pages`, {
      method: 'PUT',
      body: JSON.stringify({ pageAccess })
    })
  }

  async getPageRegistry() {
    return this.request<{
      success: boolean;
      data: Array<{
        path: string;
        name: string;
        category: string;
        description: string;
      }>;
    }>('/admin/access/page-registry')
  }

  async getRoleApiAccess(roleId: string) {
    return this.request<{
      success: boolean;
      data: {
        role: any;
        apiAccess: Array<{
          http_method: string;
          endpoint_pattern: string;
          endpoint_category: string;
          endpoint_description?: string;
          can_access: boolean;
          rate_limit?: number;
          conditions?: any;
        }>;
      };
    }>(`/admin/access/roles/${roleId}/apis`)
  }

  async updateRoleApiAccess(roleId: string, apiAccess: any[]) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/access/roles/${roleId}/apis`, {
      method: 'PUT',
      body: JSON.stringify({ apiAccess })
    })
  }

  async getApiRegistry() {
    return this.request<{
      success: boolean;
      data: Array<{
        method: string;
        pattern: string;
        category: string;
        description: string;
      }>;
    }>('/admin/access/api-registry')
  }

  async getRoleFeatures(roleId: string) {
    return this.request<{
      success: boolean;
      data: {
        role: any;
        features: Array<{
          feature_code: string;
          feature_name: string;
          feature_category?: string;
          feature_description?: string;
          is_enabled: boolean;
          configuration?: any;
        }>;
      };
    }>(`/admin/access/roles/${roleId}/features`)
  }

  async updateRoleFeatures(roleId: string, features: any[]) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/access/roles/${roleId}/features`, {
      method: 'PUT',
      body: JSON.stringify({ features })
    })
  }

  async checkPageAccess(pageId: string) {
    return this.request<PageAccessCheckResponse>('/pages/check-access', {
      method: 'POST',
      body: JSON.stringify({ pageId })
    })
  }

  async checkApiAccess(method: string, endpoint: string) {
    return this.request<{
      success: boolean;
      hasAccess: boolean;
    }>('/admin/access/check-api', {
      method: 'POST',
      body: JSON.stringify({ method, endpoint })
    })
  }

  async checkFeature(feature: string) {
    return this.request<{
      success: boolean;
      isEnabled: boolean;
    }>('/admin/access/check-feature', {
      method: 'POST',
      body: JSON.stringify({ feature })
    })
  }

  async clearAccessCache() {
    return this.request<{
      success: boolean;
      message: string;
    }>('/admin/access/clear-cache', {
      method: 'POST'
    })
  }

  async getMyAccessiblePages() {
    return this.request<{
      success: boolean;
      data: Array<{
        page_path: string;
        page_name: string;
        page_category: string;
      }>;
    }>('/admin/access/my-pages')
  }

  async getMyAccessibleApis() {
    return this.request<{
      success: boolean;
      data: Array<{
        http_method: string;
        endpoint_pattern: string;
        endpoint_category: string;
      }>;
    }>('/admin/access/my-apis')
  }

  async getPagePermissions() {
    return this.request<PagePermissionsResponse>('/pages/permissions')
  }

  async getRole(roleId: string) {
    return this.request<{
      success: boolean;
      data: { role: any };
    }>(`/admin/roles/${roleId}`)
  }

  async createRole(roleData: any) {
    return this.request<{
      success: boolean;
      data: { role: any };
      message: string;
    }>('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData)
    })
  }

  async updateRole(roleId: string, roleData: any) {
    return this.request<{
      success: boolean;
      data: { role: any };
      message: string;
    }>(`/admin/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    })
  }

  async deleteRole(roleId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/roles/${roleId}`, {
      method: 'DELETE'
    })
  }

  async updateRoleStatus(roleId: string, isActive: boolean) {
    return this.request<{
      success: boolean;
      data: { role: any };
      message: string;
    }>(`/admin/roles/${roleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    })
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    return this.request<{
      success: boolean;
      data: { role: any };
      message: string;
    }>(`/admin/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission_ids: permissionIds })
    })
  }

  async getRoleUsers(roleId: string) {
    return this.request<{
      success: boolean;
      data: { 
        data: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        }
      };
    }>(`/admin/roles/${roleId}/users`)
  }

  async getUserRoles(userId: string) {
    return this.request<{
      success: boolean;
      data: { roles: any[] };
    }>(`/admin/users/${userId}/roles`)
  }

  async assignRolesToUser(userId: string, roleIds: string[]) {
    return this.request<{
      success: boolean;
      data: { user: any };
      message: string;
    }>(`/admin/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ role_ids: roleIds })
    })
  }

  async addRolesToUser(userId: string, roleIds: string[]) {
    return this.request<{
      success: boolean;
      data: { user: any };
      message: string;
    }>(`/admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_ids: roleIds })
    })
  }

  async removeRolesFromUser(userId: string, roleIds: string[]) {
    return this.request<{
      success: boolean;
      data: { user: any };
      message: string;
    }>(`/admin/users/${userId}/roles`, {
      method: 'DELETE',
      body: JSON.stringify({ role_ids: roleIds })
    })
  }

  async getUsers(params?: { page?: number; limit?: number; role?: string }) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.role && params.role !== 'all') queryParams.append('role', params.role)
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    
    return this.request<{
      success: boolean;
      data: { users: any[] } | { data: any[]; pagination: any };
    }>(`/users${query}`)
  }

  async createUser(userData: any) {
    return this.request<{
      success: boolean;
      data: { user: any };
    }>('/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })
  }

  async updateUser(userId: string, userData: any) {
    return this.request<{
      success: boolean;
      data: { user: any };
    }>(`/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })
  }

  async deleteUser(userId: string) {
    return this.request<{
      success: boolean;
    }>(`/users/${userId}`, {
      method: 'DELETE'
    })
  }

  // Cerbos Policy Management endpoints
  async getCerbosPolicies() {
    return this.request<{
      success: boolean;
      data: { policies: any[] };
      message: string;
    }>('/admin/cerbos-policies')
  }

  async getCerbosPolicy(policyId: string) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/admin/cerbos-policies/${policyId}`)
  }

  async createCerbosPolicy(policyData: any) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>('/admin/cerbos-policies', {
      method: 'POST',
      body: JSON.stringify(policyData)
    })
  }

  async updateCerbosPolicy(policyId: string, policyData: any) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/admin/cerbos-policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(policyData)
    })
  }

  async deleteCerbosPolicy(policyId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/cerbos-policies/${policyId}`, {
      method: 'DELETE'
    })
  }

  async updateRolePermissionsInCerbos(role: string, permissions: string[]) {
    return this.request<{
      success: boolean;
      data: {
        role: string;
        updatedPolicies: string[];
        permissions: string[];
      };
      message: string;
    }>('/admin/cerbos-policies/role-permissions', {
      method: 'POST',
      body: JSON.stringify({ role, permissions })
    })
  }

  async getRolePermissionsFromCerbos(roleName: string) {
    return this.request<{
      success: boolean;
      data: {
        role: string;
        permissions: string[];
      };
      message: string;
    }>(`/admin/cerbos-policies/role/${roleName}/permissions`)
  }

  async getCerbosRoles() {
    return this.request<{
      success: boolean;
      data: { roles: any[] };
      message: string;
    }>('/admin/cerbos-policies/roles')
  }

  async createCerbosRole(roleData: { name: string; parentRoles?: string[]; condition?: string }) {
    return this.request<{
      success: boolean;
      data: { role: any };
      message: string;
    }>('/admin/cerbos-policies/roles', {
      method: 'POST',
      body: JSON.stringify(roleData)
    })
  }

  async updateCerbosRole(roleName: string, roleData: { name?: string; parentRoles?: string[]; condition?: string }) {
    return this.request<{
      success: boolean;
      data: { role: any };
      message: string;
    }>(`/admin/cerbos-policies/roles/${roleName}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    })
  }

  async deleteCerbosRole(roleName: string, force = false) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/cerbos-policies/roles/${roleName}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    })
  }

  // Cerbos Admin API endpoints (PostgreSQL-backed)
  async getCerbosResources() {
    return this.request<{
      success: boolean;
      data: { resources: string[] };
      message: string;
    }>('/cerbos/resources')
  }

  async getCerbosResource(kind: string) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/cerbos/resources/${kind}`)
  }

  async createCerbosResource(data: { kind: string; version?: string; importDerivedRoles?: string[] }) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>('/cerbos/resources', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateCerbosResource(kind: string, policy: any) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/cerbos/resources/${kind}`, {
      method: 'PUT',
      body: JSON.stringify(policy)
    })
  }

  async deleteCerbosResource(kind: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/cerbos/resources/${kind}`, {
      method: 'DELETE'
    })
  }

  async getCerbosResourceActions(kind: string) {
    return this.request<{
      success: boolean;
      data: { actions: string[] };
      message: string;
    }>(`/cerbos/resources/${kind}/actions`)
  }

  async addCerbosResourceAction(kind: string, data: { action: string; roles?: Record<string, { effect: string; condition?: string }> }) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/cerbos/resources/${kind}/actions`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async removeCerbosResourceAction(kind: string, action: string) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/cerbos/resources/${kind}/actions/${action}`, {
      method: 'DELETE'
    })
  }

  async getCerbosRoleRules(kind: string, role: string) {
    return this.request<{
      success: boolean;
      data: { rules: Record<string, { effect: string; condition?: string }> };
      message: string;
    }>(`/cerbos/resources/${kind}/roles/${role}`)
  }

  async setCerbosRoleRules(kind: string, role: string, rules: Record<string, { effect: string; condition?: string }>) {
    return this.request<{
      success: boolean;
      data: { policy: any };
      message: string;
    }>(`/cerbos/resources/${kind}/roles/${role}`, {
      method: 'PUT',
      body: JSON.stringify(rules)
    })
  }

  async getCerbosDerivedRoles() {
    return this.request<{
      success: boolean;
      data: { derivedRoles: any };
      message: string;
    }>('/cerbos/derived-roles')
  }

  async getAllCerbosPoliciesFromAdmin() {
    return this.request<{
      success: boolean;
      data: { policies: any[] };
      message: string;
    }>('/cerbos/policies')
  }

  async uploadCerbosPolicy(policy: any) {
    return this.request<{
      success: boolean;
      data: any;
      message: string;
    }>('/cerbos/policies', {
      method: 'PUT',
      body: JSON.stringify(policy)
    })
  }

  async getCerbosHealth() {
    return this.request<{
      success: boolean;
      data: { healthy: boolean; status?: string };
      message: string;
    }>('/cerbos/health')
  }

  async getCerbosStats() {
    return this.request<{
      success: boolean;
      data: {
        totalPolicies: number;
        resourcePolicies: number;
        derivedRoles: number;
        principalPolicies: number;
      };
      message: string;
    }>('/cerbos/stats')
  }

  // Unified Role Management endpoints
  async getUnifiedRoles() {
    return this.request<{
      success: boolean;
      data: {
        roles: Array<{
          name: string;
          description?: string;
          permissions: string[];
          userCount?: number;
          color?: string;
          source: 'cerbos' | 'database' | 'both';
        }>;
      };
      message: string;
    }>('/admin/roles')
  }

  async getUnifiedRole(name: string) {
    return this.request<{
      success: boolean;
      data: {
        role: {
          name: string;
          description?: string;
          permissions: string[];
          userCount?: number;
          color?: string;
          source: 'cerbos' | 'database' | 'both';
        };
      };
      message: string;
    }>(`/admin/unified-roles/${name}`)
  }

  async createUnifiedRole(roleData: {
    name: string;
    description?: string;
    permissions: string[];
    color?: string;
  }) {
    return this.request<{
      success: boolean;
      data: {
        role: {
          name: string;
          description?: string;
          permissions: string[];
          color?: string;
          userCount: number;
          source: string;
        };
      };
      message: string;
    }>('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData)
    })
  }

  async updateUnifiedRole(idOrName: string, roleData: {
    description?: string;
    permissions?: string[];
    color?: string;
  }) {
    return this.request<{
      success: boolean;
      data: {
        role: {
          name: string;
          description?: string;
          permissions: string[];
          color?: string;
          source: string;
        };
      };
      message: string;
    }>(`/admin/roles/${idOrName}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    })
  }

  async deleteUnifiedRole(name: string, force = false) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/admin/unified-roles/${name}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    })
  }

  async getAvailablePermissions() {
    return this.request<{
      success: boolean;
      data: {
        permissions: string[];
        groupedByResource: Record<string, string[]>;
      };
      message: string;
    }>('/admin/unified-roles/available-permissions')
  }

  // Generic HTTP methods for resources and other endpoints
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET'
    })
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE'
    })
  }

  // ===== MENTORSHIP API METHODS =====

  /**
   * Get all mentorships for the current user (as mentor or mentee)
   */
  async getMentorships(params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive' | 'completed';
    role?: 'mentor' | 'mentee';
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.role) searchParams.append('role', params.role)

    const queryString = searchParams.toString()
    return this.get(`/mentorships${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * Get mentorship details
   */
  async getMentorship(id: string): Promise<ApiResponse<any>> {
    return this.get(`/mentorships/${id}`)
  }

  /**
   * Get mentees for a specific mentor
   */
  async getMenteesByMentor(mentorId?: string, params?: {
    status?: 'active' | 'inactive' | 'completed';
    includeDetails?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.includeDetails) searchParams.append('include_details', params.includeDetails.toString())

    const queryString = searchParams.toString()
    const endpoint = mentorId 
      ? `/mentorships/mentor/${mentorId}/mentees${queryString ? `?${queryString}` : ''}`
      : `/mentorships/my-mentees${queryString ? `?${queryString}` : ''}`
    
    return this.get(endpoint)
  }

  /**
   * Get mentee's games with comprehensive details
   */
  async getMenteeGames(menteeId: string, params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'accepted' | 'completed' | 'declined';
    date_from?: string;
    date_to?: string;
    sort_by?: 'game_date' | 'wage';
    sort_order?: 'asc' | 'desc';
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.date_from) searchParams.append('date_from', params.date_from)
    if (params?.date_to) searchParams.append('date_to', params.date_to)
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by)
    if (params?.sort_order) searchParams.append('sort_order', params.sort_order)

    const queryString = searchParams.toString()
    return this.get(`/mentees/${menteeId}/games${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * Get mentee's upcoming games
   */
  async getMenteeUpcomingGames(menteeId: string, params?: {
    limit?: number;
    days_ahead?: number;
    include_details?: boolean;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.days_ahead) searchParams.append('days_ahead', params.days_ahead.toString())
    if (params?.include_details) searchParams.append('include_details', params.include_details.toString())

    const queryString = searchParams.toString()
    return this.get(`/mentees/${menteeId}/games/upcoming${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * Get mentee's game history with analytics
   */
  async getMenteeGameHistory(menteeId: string, params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    season?: string;
    include_analytics?: boolean;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.date_from) searchParams.append('date_from', params.date_from)
    if (params?.date_to) searchParams.append('date_to', params.date_to)
    if (params?.season) searchParams.append('season', params.season)
    if (params?.include_analytics !== undefined) searchParams.append('include_analytics', params.include_analytics.toString())

    const queryString = searchParams.toString()
    return this.get(`/mentees/${menteeId}/games/history${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * Get comprehensive analytics for mentee's refereeing performance
   */
  async getMenteeGameAnalytics(menteeId: string, params?: {
    date_from?: string;
    date_to?: string;
    season?: string;
    compare_to_previous?: boolean;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams()
    if (params?.date_from) searchParams.append('date_from', params.date_from)
    if (params?.date_to) searchParams.append('date_to', params.date_to)
    if (params?.season) searchParams.append('season', params.season)
    if (params?.compare_to_previous) searchParams.append('compare_to_previous', params.compare_to_previous.toString())

    const queryString = searchParams.toString()
    return this.get(`/mentees/${menteeId}/games/analytics${queryString ? `?${queryString}` : ''}`)
  }

  // ==================== CHUNK METHODS ====================

  /**
   * Get list of game chunks
   */
  async getChunks(params?: {
    location?: string
    date?: string
    status?: string
    page?: number
    limit?: number
  }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return this.request<import('./types/chunks').ChunkListResponse>(`/chunks${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * Get chunk details with games
   */
  async getChunk(id: string) {
    return this.request<import('./types/chunks').ChunkDetailsResponse>(`/chunks/${id}`)
  }

  /**
   * Create a new chunk
   */
  async createChunk(data: import('./types/chunks').CreateChunkRequest) {
    return this.request<{ chunk: import('./types/chunks').GameChunk }>('/chunks', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Update an existing chunk
   */
  async updateChunk(id: string, data: import('./types/chunks').UpdateChunkRequest) {
    return this.request<{ chunk: import('./types/chunks').GameChunk }>(`/chunks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * Delete a chunk
   */
  async deleteChunk(id: string, force?: boolean) {
    const queryString = force ? '?force=true' : ''
    return this.request<{ assignments_removed: number }>(`/chunks/${id}${queryString}`, {
      method: 'DELETE'
    })
  }

  /**
   * Assign a chunk to a referee
   */
  async assignChunk(id: string, data: import('./types/chunks').AssignChunkRequest) {
    return this.request<import('./types/chunks').AssignChunkResponse>(`/chunks/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Auto-create chunks based on criteria
   */
  async autoCreateChunks(data: import('./types/chunks').AutoCreateChunksRequest) {
    return this.request<{ chunks_created: number; chunks: import('./types/chunks').GameChunk[] }>('/chunks/auto-create', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}

// Types (updated to match backend schema)
export interface OrganizationSettings {
  id: string;
  organization_name: string;
  payment_model: 'INDIVIDUAL' | 'FLAT_RATE';
  default_game_rate: number | null;
  availability_strategy: 'WHITELIST' | 'BLACKLIST';
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  location: string;
  level: string;
  payRate: number;
  status: 'assigned' | 'unassigned' | 'up-for-grabs' | 'completed' | 'cancelled';
  wageMultiplier?: number;
  wageMultiplierReason?: string;
  finalWage?: number;
  refsNeeded?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Referee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'referee';
  certificationLevel: 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4';
  location?: string;
  isAvailable: boolean;
  availabilityStrategy?: 'WHITELIST' | 'BLACKLIST';
  createdAt?: string;
  updatedAt?: string;
}

export interface Assignment {
  id: string;
  gameId: string;
  refereeId: string;
  assignedAt: string;
  assignedBy?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  calculatedWage?: number;
  reason?: string;
  game?: Game;
  referee?: Referee;
  createdAt?: string;
  updatedAt?: string;
}

export interface WageBreakdown {
  baseWage: number;
  multiplier: number;
  multiplierReason?: string;
  finalWage: number;
  isMultiplied: boolean;
  calculation: string;
}

export interface RefereeLevel {
  id: string;
  name: string;
  wage_amount: number;
  description?: string;
  allowed_divisions?: string[];
  experience_requirements?: any;
  capability_requirements?: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'referee'; // Keep for backward compatibility
  roles: string[]; // New array-based roles system
  permissions?: Permission[]; // User permissions from RBAC system
  referee_id?: string; // Add referee_id for referees
  phone?: string;
  certificationLevel?: string;
  location?: string;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}


export interface League {
  id: string;
  organization: string;
  age_group: string;
  gender: string;
  division: string;
  season: string;
  level: string;
  team_count?: number;
  game_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  league_id: string;
  rank: number;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  game_count?: number;
  // League information when joined
  organization?: string;
  age_group?: string;
  gender?: string;
  division?: string;
  season?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tournament {
  name: string;
  type: 'round_robin' | 'single_elimination' | 'swiss_system' | 'group_stage_playoffs';
  league: League;
  teams: Team[];
  total_games: number;
  total_rounds: number;
  games: Game[];
  rounds: TournamentRound[];
  groups?: TournamentGroup[];
  summary: TournamentSummary;
}

export interface TournamentRound {
  round: number;
  round_name?: string;
  stage?: string;
  games: Game[];
}

export interface TournamentGroup {
  id: number;
  name: string;
  teams: Team[];
}

export interface TournamentSummary {
  teams_count: number;
  games_per_team?: number;
  max_games_per_team?: number;
  estimated_duration_days: number;
  format: string;
  [key: string]: any;
}

export interface TournamentFormat {
  id: string;
  name: string;
  description: string;
  min_teams: number;
  max_teams: number;
  pros: string[];
  cons: string[];
  games_formula: string;
  suitable_for: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'archived';
  category: string;
  tags: string[];
  author_id: string;
  author_name?: string;
  author_email?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  hasRead?: boolean;
  readCount?: number;
  media?: any[];
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

// Create and export API client instance
export const apiClient = new ApiClient()

// AI Assignment Rule interfaces
export interface AIAssignmentRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule_type: 'manual' | 'recurring' | 'one-time';
  frequency?: 'daily' | 'weekly' | 'monthly';
  day_of_week?: string;
  day_of_month?: number;
  schedule_time?: string;
  start_date?: string;
  end_date?: string;
  next_run?: string;
  game_types: string[];
  age_groups: string[];
  max_days_ahead: number;
  min_referee_level: string;
  prioritize_experience: boolean;
  avoid_back_to_back: boolean;
  max_distance: number;
  ai_system_type: 'algorithmic' | 'llm';
  distance_weight?: number;
  skill_weight?: number;
  experience_weight?: number;
  partner_preference_weight?: number;
  llm_model?: string;
  temperature?: number;
  context_prompt?: string;
  include_comments?: boolean;
  last_run?: string;
  last_run_status?: 'success' | 'error' | 'partial';
  assignments_created: number;
  conflicts_found: number;
  created_at: string;
  updated_at: string;
}

export interface AIAssignmentRuleRun {
  id: string;
  rule_id: string;
  run_date: string;
  status: 'success' | 'error' | 'partial';
  ai_system_used: 'algorithmic' | 'llm';
  games_processed: number;
  assignments_created: number;
  conflicts_found: number;
  duration_seconds: number;
  context_comments: string[];
  run_details: {
    assignments: any[];
    conflicts: any[];
    algorithmicScores?: any;
    llmAnalysis?: any;
  };
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AIAssignmentResult {
  runId: string;
  status: 'success' | 'error' | 'partial';
  gamesProcessed: number;
  assignmentsCreated: number;
  conflictsFound: number;
  duration: number;
  aiSystemUsed: 'algorithmic' | 'llm';
  assignments: {
    gameId: string;
    gameInfo: string;
    assignedReferees: {
      refereeId: string;
      refereeName: string;
      position: string;
      confidence: number;
      reasoning?: string;
    }[];
    conflicts?: string[];
    notes?: string;
  }[];
  algorithmicScores?: {
    weights: any;
    averageConfidence: number;
  };
  llmAnalysis?: {
    model: string;
    temperature: number;
    contextUsed: boolean;
    processingTime: number;
  };
}

// Enterprise TypeScript Interfaces

export interface Department {
  id: string;
  name: string;
  description?: string;
  parent_department_id?: string;
  manager_id?: string;
  cost_center?: string;
  budget_allocated?: number;
  budget_spent?: number;
  manager_name?: string;
  employee_count?: number;
  position_count?: number;
  level?: number;
  path?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface JobPosition {
  id: string;
  title: string;
  description?: string;
  department_id: string;
  department_name?: string;
  level: string;
  min_salary?: number;
  max_salary?: number;
  required_skills?: string[];
  preferred_skills?: string[];
  responsibilities?: string;
  current_employees?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_id?: string;
  employee_name?: string;
  employee_email?: string;
  department_id: string;
  department_name?: string;
  position_id: string;
  position_title?: string;
  position_level?: string;
  manager_id?: string;
  manager_name?: string;
  hire_date: string;
  employment_status: string;
  base_salary?: number;
  hourly_rate?: number;
  employment_type?: string;
  work_location?: string;
  active_trainings?: number;
  completed_trainings?: number;
  latest_evaluation_date?: string;
  latest_overall_rating?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeEvaluation {
  id: string;
  employee_id: string;
  evaluation_date: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  overall_rating: number;
  performance_goals: any;
  achievements: any;
  areas_for_improvement: any;
  evaluator_id: string;
  evaluator_name?: string;
  evaluator_comments?: string;
  employee_comments?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingRecord {
  id: string;
  employee_id: string;
  training_name: string;
  training_provider?: string;
  start_date: string;
  end_date?: string;
  completion_date?: string;
  status: string;
  cost?: number;
  certification_earned?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  category: string;
  asset_tag: string;
  serial_number?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiry?: string;
  location?: string;
  status: string;
  assigned_to?: string;
  assigned_to_name?: string;
  condition?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  maintenance_type: string;
  scheduled_date: string;
  completed_date?: string;
  description?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  estimated_cost?: number;
  actual_cost?: number;
  priority: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssetCheckout {
  id: string;
  asset_id: string;
  assigned_to: string;
  assigned_to_name?: string;
  checkout_date: string;
  expected_return_date?: string;
  checkin_date?: string;
  condition_on_checkout?: string;
  condition_on_return?: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  version: number;
  status: string;
  requires_acknowledgment: boolean;
  effective_date?: string;
  expiry_date?: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentAcknowledgment {
  id: string;
  document_id: string;
  user_id: string;
  user_name?: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  due_date: string;
  assigned_to?: string;
  assigned_to_name?: string;
  completed_date?: string;
  requirements?: any;
  evidence_required: boolean;
  evidence_provided?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceIncident {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  incident_date: string;
  location?: string;
  people_involved?: string[];
  immediate_actions?: string;
  root_cause?: string;
  corrective_actions?: string;
  reported_by: string;
  reported_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiskAssessment {
  id: string;
  title: string;
  description?: string;
  category: string;
  probability: number;
  impact: number;
  risk_level: string;
  current_controls?: string;
  additional_controls?: string;
  responsible_person?: string;
  responsible_person_name?: string;
  review_date?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  category_code: string;
  parent_category_id?: string;
  parent_category_name?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  period_id: string;
  period_name?: string;
  category_id: string;
  category_name?: string;
  department_id?: string;
  department_name?: string;
  allocated_amount: number;
  spent_amount?: number;
  remaining_amount?: number;
  utilization_rate?: number;
  responsible_person?: string;
  responsible_person_name?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  allocation_amount: number;
  allocation_date: string;
  description?: string;
  allocated_by: string;
  allocated_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Receipt {
  id: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  processing_status: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  uploaded_at: string;
  vendor_name?: string;
  total_amount?: number;
  tax_amount?: number;
  transaction_date?: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  payment_method?: string;
  line_items?: any[];
  approval_status?: string;
  approval_notes?: string;
  approved_amount?: number;
  approved_by?: string;
  approved_at?: string;
  business_purpose?: string;
  department?: string;
  project_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProcessingLog {
  id: string;
  receipt_id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  ai_provider?: string;
  processing_time_seconds?: number;
  confidence_score?: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color_code: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Communication {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  status: string;
  target_audience: any;
  requires_acknowledgment: boolean;
  scheduled_send_date?: string;
  sent_at?: string;
  created_by: string;
  created_by_name?: string;
  acknowledgment_count?: number;
  total_recipients?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: string;
  definition: any;
  active: boolean;
  created_by: string;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowInstance {
  id: string;
  definition_id: string;
  definition_name?: string;
  status: string;
  initiated_by: string;
  initiated_by_name?: string;
  initiated_at: string;
  completed_at?: string;
  input_data?: any;
  output_data?: any;
  priority?: string;
  current_step?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowStep {
  id: string;
  instance_id: string;
  step_name: string;
  step_type: string;
  status: string;
  assigned_to?: string;
  assigned_to_name?: string;
  started_at?: string;
  completed_at?: string;
  input_data?: any;
  output_data?: any;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowTask {
  id: string;
  instance_id: string;
  step_id: string;
  task_name: string;
  description?: string;
  assigned_to: string;
  assigned_to_name?: string;
  status: string;
  priority?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Hook for easy React integration
export function useApi() {
  return apiClient
}