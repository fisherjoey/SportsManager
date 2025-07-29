import { AvailabilityWindow, AvailabilityResponse } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
  };
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }


  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request<{ user: any }>('/auth/me');
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
    const transformedParams: any = {};
    if (params?.status) transformedParams.status = params.status;
    if (params?.level) transformedParams.level = params.level;
    if (params?.startDate) transformedParams.date_from = params.startDate;
    if (params?.endDate) transformedParams.date_to = params.endDate;
    if (params?.search) transformedParams.search = params.search;
    if (params?.page) transformedParams.page = params.page;
    if (params?.limit) transformedParams.limit = params.limit;
    
    const queryString = Object.keys(transformedParams).length > 0 ? new URLSearchParams(transformedParams).toString() : '';
    const response = await this.request<{ data: any[]; pagination: any }>(`/games${queryString ? `?${queryString}` : ''}`);
    
    // Transform backend response to frontend format
    const transformedGames = response.data.map((game: any) => ({
      id: game.id,
      homeTeam: game.homeTeam || game.home_team_name || 'Home Team',
      awayTeam: game.awayTeam || game.away_team_name || 'Away Team',
      date: game.date || game.game_date,
      time: game.time || game.game_time,
      location: game.location,
      level: game.level,
      payRate: game.payRate || game.pay_rate,
      status: game.status,
      notes: game.notes || '',
      createdAt: game.createdAt || game.created_at,
      updatedAt: game.updatedAt || game.updated_at
    }));
    
    return { data: transformedGames, pagination: response.pagination };
  }

  async getGame(id: string) {
    const response = await this.request<any>(`/games/${id}`);
    
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
    };
  }

  async createGame(gameData: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
    location: string;
    postalCode: string;
    level: string;
    payRate: number;
    notes?: string;
  }) {
    // Transform frontend camelCase to backend snake_case
    const transformedData = {
      home_team_name: gameData.homeTeam,
      away_team_name: gameData.awayTeam,
      game_date: gameData.date,
      game_time: gameData.time,
      location: gameData.location,
      postal_code: gameData.postalCode,
      level: gameData.level,
      pay_rate: gameData.payRate,
      notes: gameData.notes
    };
    
    return this.request<any>('/games', {
      method: 'POST',
      body: JSON.stringify(transformedData),
    });
  }

  async updateGame(id: string, gameData: Partial<any>) {
    // Transform frontend camelCase to backend snake_case
    const transformedData: any = {};
    if (gameData.homeTeam) transformedData.home_team_name = gameData.homeTeam;
    if (gameData.awayTeam) transformedData.away_team_name = gameData.awayTeam;
    if (gameData.date) transformedData.game_date = gameData.date;
    if (gameData.time) transformedData.game_time = gameData.time;
    if (gameData.location) transformedData.location = gameData.location;
    if (gameData.level) transformedData.level = gameData.level;
    if (gameData.payRate) transformedData.pay_rate = gameData.payRate;
    if (gameData.notes) transformedData.notes = gameData.notes;
    if (gameData.status) transformedData.status = gameData.status;
    
    return this.request<{ success: boolean; data: { game: Game } }>(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformedData),
    });
  }

  async updateGameStatus(id: string, status: string) {
    return this.request<{ success: boolean; data: { game: Game } }>(`/games/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteGame(id: string) {
    return this.request<{ success: boolean; message: string }>(`/games/${id}`, {
      method: 'DELETE',
    });
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
    const transformedParams: any = {};
    if (params?.certificationLevel) transformedParams.level = params.certificationLevel;
    if (params?.available !== undefined) transformedParams.available = params.available;
    if (params?.search) transformedParams.search = params.search;
    if (params?.page) transformedParams.page = params.page;
    if (params?.limit) transformedParams.limit = params.limit;
    
    const queryString = Object.keys(transformedParams).length > 0 ? new URLSearchParams(transformedParams).toString() : '';
    const response = await this.request<{ data: any[]; pagination: any }>(`/referees${queryString ? `?${queryString}` : ''}`);
    
    // Transform backend response to frontend format
    const transformedReferees = response.data.map((referee: any) => ({
      id: referee.id,
      name: referee.name,
      email: referee.email,
      phone: referee.phone,
      role: 'referee' as const,
      certificationLevel: referee.level,
      location: referee.location,
      isAvailable: referee.is_available,
      availabilityStrategy: referee.availability_strategy || 'BLACKLIST',
      certifications: referee.certifications || [],
      preferredPositions: referee.preferred_positions || [],
      wagePerGame: referee.wage_per_game,
      notes: referee.notes,
      maxDistance: referee.max_distance,
      postalCode: referee.postal_code,
      createdAt: referee.created_at,
      updatedAt: referee.updated_at
    }));
    
    return { success: true, data: { referees: transformedReferees, pagination: response.pagination } };
  }

  async getReferee(id: string) {
    const response = await this.request<{ success: boolean; data: { referee: any } }>(`/referees/${id}`);
    
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
    };
    
    return { success: true, data: { referee: transformedReferee } };
  }

  async getRefereeProfile() {
    return this.request<{ success: boolean; data: { referee: Referee } }>('/referees/profile');
  }

  async updateReferee(id: string, refereeData: Partial<any>) {
    // Transform frontend camelCase to backend snake_case
    const transformedData: any = {};
    if (refereeData.name) transformedData.name = refereeData.name;
    if (refereeData.email) transformedData.email = refereeData.email;
    if (refereeData.phone) transformedData.phone = refereeData.phone;
    if (refereeData.certificationLevel) transformedData.level = refereeData.certificationLevel;
    if (refereeData.location) transformedData.location = refereeData.location;
    if (refereeData.isAvailable !== undefined) transformedData.is_available = refereeData.isAvailable;
    if (refereeData.availabilityStrategy) transformedData.availability_strategy = refereeData.availabilityStrategy;
    
    return this.request<{ success: boolean; data: { referee: Referee } }>(`/referees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformedData),
    });
  }

  async updateRefereeAvailability(id: string, isAvailable: boolean) {
    return this.request<{ success: boolean; data: { referee: Referee } }>(`/referees/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available: isAvailable }),
    });
  }

  // Availability Windows API
  async getRefereeAvailabilityWindows(id: string, params?: { startDate?: string; endDate?: string }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const url = `/availability/referees/${id}${queryString ? `?${queryString}` : ''}`;
    return this.request<AvailabilityResponse>(url);
  }

  async createAvailabilityWindow(refereeId: string, window: Partial<AvailabilityWindow>) {
    return this.request<{ success: boolean; data: AvailabilityWindow }>(`/availability/referees/${refereeId}`, {
      method: 'POST',
      body: JSON.stringify(window),
    });
  }
  async createBulkAvailabilityWindows(refereeId: string, windows: Partial<AvailabilityWindow>[]) {
    return this.request<{ success: boolean; data: { created: number; windows: AvailabilityWindow[] } }>('/availability/bulk', {
      method: 'POST',
      body: JSON.stringify({ referee_id: refereeId, windows }),
    });
  }

  async updateAvailabilityWindow(windowId: string, updates: Partial<AvailabilityWindow>) {
    return this.request<{ success: boolean; data: AvailabilityWindow }>(`/availability/${windowId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAvailabilityWindow(windowId: string) {
    return this.request<{ success: boolean; message: string }>(`/availability/${windowId}`, {
      method: 'DELETE',
    });
  }

  async checkAvailabilityConflicts(params: {
    date: string;
    start_time: string;
    end_time: string;
    referee_id?: string;
  }) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{
      success: boolean;
      data: {
        availabilityConflicts: any[];
        gameConflicts: any[];
        totalConflicts: number;
      };
    }>(`/availability/conflicts?${queryString}`);
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
        windows,
      }),
    });
  }

  async getRefereeAssignments(id: string, params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    // Transform frontend params to backend format
    const transformedParams: any = {};
    if (params?.status) transformedParams.status = params.status;
    if (params?.startDate) transformedParams.start_date = params.startDate;
    if (params?.endDate) transformedParams.end_date = params.endDate;
    
    const queryString = Object.keys(transformedParams).length > 0 ? new URLSearchParams(transformedParams).toString() : '';
    return this.request<{ success: boolean; data: { assignments: Assignment[] } }>(`/referees/${id}/assignments${queryString ? `?${queryString}` : ''}`);
  }

  async deleteReferee(id: string) {
    return this.request<{ success: boolean; message: string }>(`/referees/${id}`, {
      method: 'DELETE',
    });
  }

  // Assignments endpoints
  async getAssignments(params?: {
    gameId?: string;
    refereeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<{ success: boolean; data: { assignments: Assignment[]; pagination: any } }>(`/assignments${queryString ? `?${queryString}` : ''}`);
  }

  async getAssignment(id: string) {
    return this.request<{ success: boolean; data: { assignment: Assignment } }>(`/assignments/${id}`);
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
    };
    
    return this.request<{ success: boolean; data: { assignment: Assignment } }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(transformedData),
    });
  }

  async updateAssignmentStatus(id: string, status: string, reason?: string) {
    return this.request<{ success: boolean; data: { assignment: Assignment } }>(`/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  async deleteAssignment(id: string) {
    return this.request<{ success: boolean; message: string }>(`/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  async createBulkAssignments(assignments: Array<{
    gameId: string;
    refereeId: string;
  }>) {
    return this.request<{ success: boolean; data: { assignments: Assignment[]; summary: any } }>('/assignments/bulk', {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }

  async getAvailableGames(params?: {
    startDate?: string;
    endDate?: string;
    level?: string;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<{ success: boolean; data: { games: Game[] } }>(`/assignments/available-games${queryString ? `?${queryString}` : ''}`);
  }

  async getAvailableReferees(gameId: string) {
    const response = await this.request<Referee[]>(`/assignments/available-referees/${gameId}`);
    
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
    }));
    
    return transformedReferees;
  }

  // Referee Levels endpoints
  async getRefereeLevels() {
    return this.request<{ success: boolean; data: RefereeLevel[] }>('/referee-levels');
  }

  async assignRefereeLevel(refereeId: string, levelData: {
    referee_level_id: string;
    years_experience?: number;
    evaluation_score?: number;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: { referee: any }; message: string }>(`/referee-levels/${refereeId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(levelData),
    });
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
    }>(`/referee-levels/check-assignment/${gameId}/${refereeId}`);
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
      body: JSON.stringify(gameData),
    });
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
    }>('/self-assignment/available');
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
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<{
      success: boolean;
      data: {
        leagues: League[];
        pagination: any;
      };
    }>(`/leagues${queryString ? `?${queryString}` : ''}`);
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
    }>(`/leagues/${id}`);
  }

  async createLeague(leagueData: Partial<League>) {
    return this.request<{
      success: boolean;
      data: { league: League };
      message: string;
    }>('/leagues', {
      method: 'POST',
      body: JSON.stringify(leagueData),
    });
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
      body: JSON.stringify(data),
    });
  }

  async updateLeague(id: string, leagueData: Partial<League>) {
    return this.request<{
      success: boolean;
      data: { league: League };
      message: string;
    }>(`/leagues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leagueData),
    });
  }

  async deleteLeague(id: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/leagues/${id}`, {
      method: 'DELETE',
    });
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
    }>('/leagues/options/filters');
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
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<{
      success: boolean;
      data: {
        teams: Team[];
        pagination: any;
      };
    }>(`/teams${queryString ? `?${queryString}` : ''}`);
  }

  async getTeam(id: string) {
    return this.request<{
      success: boolean;
      data: {
        team: Team;
        games: Game[];
        stats: any;
      };
    }>(`/teams/${id}`);
  }

  async createTeam(teamData: Partial<Team>) {
    return this.request<{
      success: boolean;
      data: { team: Team };
      message: string;
    }>('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
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
      body: JSON.stringify(data),
    });
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
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, teamData: Partial<Team>) {
    return this.request<{
      success: boolean;
      data: { team: Team };
      message: string;
    }>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(id: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  async getTeamsForLeague(leagueId: string) {
    return this.request<{
      success: boolean;
      data: {
        league: League;
        teams: Team[];
      };
    }>(`/teams/league/${leagueId}`);
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
      body: JSON.stringify(data),
    });
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
      body: JSON.stringify(data),
    });
  }

  async getTournamentFormats() {
    return this.request<{
      success: boolean;
      data: {
        formats: TournamentFormat[];
      };
    }>('/tournaments/formats');
  }

  async estimateTournament(params: {
    tournament_type: string;
    team_count: number;
    rounds?: number;
    group_size?: number;
    advance_per_group?: number;
    games_per_day?: number;
  }) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{
      success: boolean;
      data: {
        tournament_type: string;
        team_count: number;
        estimate: any;
      };
    }>(`/tournaments/estimate?${queryString}`);
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
    };
    
    return this.request<{ success: boolean; data: { invitation: any; invitation_link: string } }>('/invitations', {
      method: 'POST',
      body: JSON.stringify(transformedData),
    });
  }

  async getInvitations(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<{ success: boolean; data: { invitations: any[] } }>(`/invitations${queryString ? `?${queryString}` : ''}`);
  }

  async getInvitation(token: string) {
    return this.request<{ success: boolean; data: { invitation: any } }>(`/invitations/${token}`);
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
    };
    
    return this.request<{ success: boolean; data: { token: string; user: any } }>(`/invitations/${token}/complete`, {
      method: 'POST',
      body: JSON.stringify(transformedData),
    });
  }

  async cancelInvitation(id: string) {
    return this.request<{ success: boolean; message: string }>(`/invitations/${id}`, {
      method: 'DELETE',
    });
  }

  // Organization settings endpoints
  async getOrganizationSettings() {
    return this.request<{ success: boolean; data: OrganizationSettings }>('/organization/settings');
  }

  async updateOrganizationSettings(settings: {
    organization_name: string;
    payment_model: 'INDIVIDUAL' | 'FLAT_RATE';
    default_game_rate?: number;
    availability_strategy?: 'WHITELIST' | 'BLACKLIST';
  }) {
    return this.request<{ success: boolean; data: OrganizationSettings; message: string }>('/organization/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Posts endpoints
  async getPosts(includeDrafts = false) {
    const params = includeDrafts ? '?include_drafts=true' : '';
    return this.request<{ success: boolean; data: { posts: Post[] } }>(`/posts${params}`);
  }

  async getPostCategories() {
    return this.request<{ success: boolean; data: PostCategory[] }>('/posts/categories');
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
      body: JSON.stringify(postData),
    });
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
      body: JSON.stringify(postData),
    });
  }

  async deletePost(id: string) {
    return this.request<{ success: boolean; message: string }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  }

  // AI Assignment Rules endpoints
  async getAIAssignmentRules(params?: {
    enabled?: boolean;
    aiSystemType?: 'algorithmic' | 'llm';
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request<{ success: boolean; data: AIAssignmentRule[] }>(`/ai-assignment-rules${query ? `?${query}` : ''}`);
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
      body: JSON.stringify(ruleData),
    });
  }

  async getAIAssignmentRule(id: string) {
    return this.request<{ success: boolean; data: AIAssignmentRule & { partnerPreferences: any[] } }>(`/ai-assignment-rules/${id}`);
  }

  async updateAIAssignmentRule(id: string, ruleData: any) {
    return this.request<{ success: boolean; data: AIAssignmentRule }>(`/ai-assignment-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ruleData),
    });
  }

  async deleteAIAssignmentRule(id: string) {
    return this.request<{ success: boolean }>(`/ai-assignment-rules/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleAIAssignmentRule(id: string) {
    return this.request<{ success: boolean; data: AIAssignmentRule }>(`/ai-assignment-rules/${id}/toggle`, {
      method: 'POST',
    });
  }

  async runAIAssignmentRule(id: string, params: {
    dryRun?: boolean;
    gameIds?: string[];
    contextComments?: string[];
  }) {
    return this.request<{ success: boolean; data: AIAssignmentResult }>(`/ai-assignment-rules/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAIAssignmentRuleRuns(id: string, params?: {
    status?: 'success' | 'error' | 'partial';
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request<{ success: boolean; data: AIAssignmentRuleRun[] }>(`/ai-assignment-rules/${id}/runs${query ? `?${query}` : ''}`);
  }

  async getAIAssignmentRuleRunDetails(runId: string) {
    return this.request<{ success: boolean; data: AIAssignmentRuleRun }>(`/ai-assignment-rules/runs/${runId}`);
  }

  async getAIAssignmentAnalytics(params?: { days?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
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
    }>(`/ai-assignment-rules/analytics${query ? `?${query}` : ''}`);
  }

  async addPartnerPreference(ruleId: string, preference: {
    referee1Id: string;
    referee2Id: string;
    preferenceType: 'preferred' | 'avoid';
  }) {
    return this.request<{ success: boolean; data: any }>(`/ai-assignment-rules/${ruleId}/partner-preferences`, {
      method: 'POST',
      body: JSON.stringify(preference),
    });
  }

  async deletePartnerPreference(ruleId: string, prefId: string) {
    return this.request<{ success: boolean }>(`/ai-assignment-rules/${ruleId}/partner-preferences/${prefId}`, {
      method: 'DELETE',
    });
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
  status: "assigned" | "unassigned" | "up-for-grabs" | "completed" | "cancelled";
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
  role: "referee";
  certificationLevel: "Level 1" | "Level 2" | "Level 3" | "Level 4";
  location?: string;
  isAvailable: boolean;
  availabilityStrategy?: "WHITELIST" | "BLACKLIST";
  createdAt?: string;
  updatedAt?: string;
}

export interface Assignment {
  id: string;
  gameId: string;
  refereeId: string;
  assignedAt: string;
  assignedBy?: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
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
  role: "admin" | "referee"; // Keep for backward compatibility
  roles: string[]; // New array-based roles system
  referee_id?: string; // Add referee_id for referees
  phone?: string;
  certificationLevel?: string;
  location?: string;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
export const apiClient = new ApiClient(API_BASE_URL);

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

// Hook for easy React integration
export function useApi() {
  return apiClient;
}