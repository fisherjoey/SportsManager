/**
 * AI-powered referee assignment algorithm
 * Optimizes assignments based on proximity, level, availability, and historic patterns
 */

export interface RefereeProfile {
  id: string
  name: string
  level: 'Rookie' | 'Junior' | 'Senior'
  isWhiteWhistle?: boolean
  postalCode: string
  maxDistance: number
  isAvailable: boolean
  wagePerGame: number
  roles: string[]
  availabilityStrategy: 'WHITELIST' | 'BLACKLIST'
  pastGames: PastGame[]
  preferences?: RefereePreferences
}

export interface PastGame {
  gameId: string
  date: string
  location: string
  teams: string[]
  role: 'referee' | 'evaluator' | 'mentor'
  rating?: number
}

export interface RefereePreferences {
  maxGamesPerDay?: number
  preferredLocations?: string[]
  preferredPartners?: string[]
  unavailableDates?: string[]
  comments?: string
}

export interface GameAssignment {
  gameId: string
  date: string
  time: string
  endTime: string
  location: string
  homeTeam: string
  awayTeam: string
  division: string
  gameType: 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
  requiredReferees: number
  requiredLevel?: 'Rookie' | 'Junior' | 'Senior'
  needsEvaluator?: boolean
  needsMentor?: boolean
}

export interface AssignmentSuggestion {
  referee: RefereeProfile
  confidence: number
  reasons: string[]
  warnings?: string[]
}

export interface ChunkSuggestion {
  games: GameAssignment[]
  location: string
  date: string
  startTime: string
  endTime: string
  suggestedReferees: AssignmentSuggestion[]
  efficiency: number
  hasLunchBreak?: boolean
}

export class AIAssignmentAlgorithm {
  private readonly PROXIMITY_WEIGHT = 0.3
  private readonly LEVEL_MATCH_WEIGHT = 0.25
  private readonly AVAILABILITY_WEIGHT = 0.2
  private readonly HISTORIC_PATTERN_WEIGHT = 0.15
  private readonly WORKLOAD_BALANCE_WEIGHT = 0.1

  /**
   * Calculate distance between two postal codes (simplified)
   * In production, this would use a proper geocoding service
   */
  private calculateDistance(postalCode1: string, postalCode2: string): number {
    // Simplified distance calculation - in production use Google Maps API
    const code1 = postalCode1.replace(/\s/g, '').toUpperCase()
    const code2 = postalCode2.replace(/\s/g, '').toUpperCase()
    
    if (code1 === code2) return 0
    
    // Basic proximity based on postal code prefix similarity
    const prefix1 = code1.substring(0, 3)
    const prefix2 = code2.substring(0, 3)
    
    if (prefix1 === prefix2) return Math.random() * 15 + 5 // 5-20km
    return Math.random() * 50 + 20 // 20-70km
  }

  /**
   * Calculate proximity score (higher is better)
   */
  private calculateProximityScore(referee: RefereeProfile, game: GameAssignment): number {
    // In production, use actual facility locations, not game location strings
    const gamePostalCode = this.extractPostalCodeFromLocation(game.location)
    const distance = this.calculateDistance(referee.postalCode, gamePostalCode)
    
    if (distance > referee.maxDistance) return 0
    
    // Score decreases with distance
    return Math.max(0, 1 - (distance / referee.maxDistance))
  }

  /**
   * Extract postal code from location string (simplified)
   */
  private extractPostalCodeFromLocation(location: string): string {
    // In production, maintain a facility database with actual postal codes
    const locationMap: Record<string, string> = {
      'Downtown Arena': 'M5V 3A8',
      'Northside Complex': 'M2N 6K1',
      'Westside Sports Centre': 'M9W 1P6',
      'Eastside Facility': 'M4E 3M5'
    }
    
    return locationMap[location] || 'M5V 0A0' // Default downtown location
  }

  /**
   * Calculate level match score
   */
  private calculateLevelMatchScore(referee: RefereeProfile, game: GameAssignment): number {
    const levelHierarchy = { 'Rookie': 1, 'Junior': 2, 'Senior': 3 }
    const refLevel = levelHierarchy[referee.level]
    const reqLevel = game.requiredLevel ? levelHierarchy[game.requiredLevel] : 1
    
    // Perfect match
    if (refLevel === reqLevel) return 1.0
    
    // Overqualified but acceptable
    if (refLevel > reqLevel) return 0.8
    
    // Underqualified
    if (refLevel < reqLevel) return 0.2
    
    return 0.5
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(referee: RefereeProfile, game: GameAssignment): number {
    if (!referee.isAvailable) return 0
    
    // Check if referee has availability preferences
    if (referee.preferences?.unavailableDates?.includes(game.date)) return 0
    
    // Check workload for the day
    const gamesOnSameDay = referee.pastGames.filter(pg => pg.date === game.date).length
    const maxGamesPerDay = referee.preferences?.maxGamesPerDay || 3
    
    if (gamesOnSameDay >= maxGamesPerDay) return 0.2
    
    return Math.max(0.3, 1 - (gamesOnSameDay / maxGamesPerDay))
  }

  /**
   * Calculate historic pattern score
   */
  private calculateHistoricPatternScore(referee: RefereeProfile, game: GameAssignment): number {
    let score = 0.5 // baseline
    
    // Preferred locations
    if (referee.preferences?.preferredLocations?.includes(game.location)) {
      score += 0.3
    }
    
    // Past experience with teams
    const hasWorkedWithTeams = referee.pastGames.some(pg => 
      pg.teams.includes(game.homeTeam) || pg.teams.includes(game.awayTeam)
    )
    if (hasWorkedWithTeams) score += 0.2
    
    // Regular time slot patterns
    const gameHour = parseInt(game.time.split(':')[0])
    const regularHours = referee.pastGames.map(pg => parseInt(pg.date.split('T')[1]?.split(':')[0] || '18'))
    const isRegularTime = regularHours.some(hour => Math.abs(hour - gameHour) <= 1)
    if (isRegularTime) score += 0.1
    
    return Math.min(1, score)
  }

  /**
   * Calculate workload balance score
   */
  private calculateWorkloadBalanceScore(referee: RefereeProfile, allReferees: RefereeProfile[]): number {
    const recentGames = referee.pastGames.filter(pg => {
      const gameDate = new Date(pg.date)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return gameDate >= weekAgo
    }).length
    
    const avgRecentGames = allReferees.reduce((sum, ref) => {
      const refRecentGames = ref.pastGames.filter(pg => {
        const gameDate = new Date(pg.date)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return gameDate >= weekAgo
      }).length
      return sum + refRecentGames
    }, 0) / allReferees.length
    
    // Prefer referees with fewer recent games
    if (recentGames < avgRecentGames) return 1.0
    if (recentGames === avgRecentGames) return 0.7
    return Math.max(0.2, 1 - ((recentGames - avgRecentGames) / avgRecentGames))
  }

  /**
   * Generate assignment suggestions for a single game
   */
  public generateAssignmentSuggestions(
    game: GameAssignment,
    availableReferees: RefereeProfile[]
  ): AssignmentSuggestion[] {
    const suggestions: AssignmentSuggestion[] = []
    
    for (const referee of availableReferees) {
      const proximityScore = this.calculateProximityScore(referee, game)
      const levelScore = this.calculateLevelMatchScore(referee, game)
      const availabilityScore = this.calculateAvailabilityScore(referee, game)
      const historicScore = this.calculateHistoricPatternScore(referee, game)
      const workloadScore = this.calculateWorkloadBalanceScore(referee, availableReferees)
      
      const confidence = (
        proximityScore * this.PROXIMITY_WEIGHT +
        levelScore * this.LEVEL_MATCH_WEIGHT +
        availabilityScore * this.AVAILABILITY_WEIGHT +
        historicScore * this.HISTORIC_PATTERN_WEIGHT +
        workloadScore * this.WORKLOAD_BALANCE_WEIGHT
      )
      
      if (confidence > 0.1) { // Only suggest if minimally viable
        const reasons: string[] = []
        const warnings: string[] = []
        
        if (proximityScore > 0.8) reasons.push('Excellent proximity to venue')
        else if (proximityScore > 0.5) reasons.push('Good proximity to venue')
        else if (proximityScore < 0.3) warnings.push('Long distance to venue')
        
        if (levelScore === 1.0) reasons.push('Perfect level match')
        else if (levelScore === 0.8) reasons.push('Experienced for this level')
        else if (levelScore < 0.5) warnings.push('May be underqualified')
        
        if (historicScore > 0.7) reasons.push('Strong historic pattern match')
        if (workloadScore > 0.8) reasons.push('Good workload balance')
        else if (workloadScore < 0.4) warnings.push('High recent workload')
        
        if (referee.isWhiteWhistle) reasons.push('White whistle referee')
        
        suggestions.push({
          referee,
          confidence,
          reasons,
          warnings: warnings.length > 0 ? warnings : undefined
        })
      }
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Generate optimized game chunks
   */
  public generateOptimizedChunks(
    games: GameAssignment[],
    availableReferees: RefereeProfile[]
  ): ChunkSuggestion[] {
    const chunks: ChunkSuggestion[] = []
    
    // Group games by location and date
    const gameGroups = games.reduce((acc, game) => {
      const key = `${game.location}-${game.date}`
      if (!acc[key]) acc[key] = []
      acc[key].push(game)
      return acc
    }, {} as Record<string, GameAssignment[]>)
    
    for (const [key, locationGames] of Object.entries(gameGroups)) {
      if (locationGames.length > 1) {
        const sortedGames = locationGames.sort((a, b) => a.time.localeCompare(b.time))
        
        // Check for optimal lunch break placement
        const hasLunchBreak = this.hasOptimalLunchBreak(sortedGames)
        
        // Calculate efficiency based on game spacing and referee optimization
        const efficiency = this.calculateChunkEfficiency(sortedGames, availableReferees)
        
        // Generate referee suggestions for the entire chunk
        const totalReferees = sortedGames.reduce((sum, game) => sum + game.requiredReferees, 0)
        const chunkSuggestions = this.generateChunkRefereeAssignments(sortedGames, availableReferees)
        
        chunks.push({
          games: sortedGames,
          location: sortedGames[0].location,
          date: sortedGames[0].date,
          startTime: sortedGames[0].time,
          endTime: sortedGames[sortedGames.length - 1].endTime,
          suggestedReferees: chunkSuggestions,
          efficiency,
          hasLunchBreak
        })
      }
    }
    
    return chunks.sort((a, b) => b.efficiency - a.efficiency)
  }

  /**
   * Check if chunk has optimal lunch break spacing
   */
  private hasOptimalLunchBreak(games: GameAssignment[]): boolean {
    for (let i = 0; i < games.length - 1; i++) {
      const currentEnd = games[i].endTime
      const nextStart = games[i + 1].time
      const gap = this.calculateTimeGap(currentEnd, nextStart)
      
      // 45-90 minute gap is considered optimal lunch break
      if (gap >= 45 && gap <= 90) return true
    }
    return false
  }

  /**
   * Calculate time gap between games in minutes
   */
  private calculateTimeGap(endTime: string, startTime: string): number {
    const end = new Date(`2000-01-01T${endTime}`)
    const start = new Date(`2000-01-01T${startTime}`)
    return (start.getTime() - end.getTime()) / (1000 * 60)
  }

  /**
   * Calculate chunk efficiency score
   */
  private calculateChunkEfficiency(games: GameAssignment[], referees: RefereeProfile[]): number {
    let efficiency = 0.5 // baseline
    
    // Time spacing efficiency
    const avgGap = this.calculateAverageGameGap(games)
    if (avgGap >= 15 && avgGap <= 30) efficiency += 0.2 // optimal spacing
    else if (avgGap < 15) efficiency -= 0.1 // too tight
    else if (avgGap > 60) efficiency -= 0.2 // too loose
    
    // Referee availability for entire chunk
    const chunkDuration = this.calculateTimeGap(games[0].time, games[games.length - 1].endTime)
    const availableForChunk = referees.filter(ref => {
      const maxGames = ref.preferences?.maxGamesPerDay || 3
      return maxGames >= games.length && ref.isAvailable
    }).length
    
    const totalRequired = games.reduce((sum, game) => sum + game.requiredReferees, 0)
    if (availableForChunk >= totalRequired) efficiency += 0.3
    
    return Math.min(1, efficiency)
  }

  /**
   * Calculate average gap between games
   */
  private calculateAverageGameGap(games: GameAssignment[]): number {
    if (games.length < 2) return 0
    
    let totalGap = 0
    for (let i = 0; i < games.length - 1; i++) {
      totalGap += this.calculateTimeGap(games[i].endTime, games[i + 1].time)
    }
    
    return totalGap / (games.length - 1)
  }

  /**
   * Generate referee assignments for an entire chunk
   */
  private generateChunkRefereeAssignments(
    games: GameAssignment[],
    availableReferees: RefereeProfile[]
  ): AssignmentSuggestion[] {
    // For chunk assignments, prioritize referees who can work multiple games
    const chunkCapableReferees = availableReferees.filter(ref => {
      const maxGames = ref.preferences?.maxGamesPerDay || 3
      return maxGames >= games.length && ref.isAvailable
    })
    
    // Use the first game as representative for scoring
    const representativeGame = games[0]
    return this.generateAssignmentSuggestions(representativeGame, chunkCapableReferees)
      .slice(0, 5) // Top 5 suggestions for chunks
  }
}