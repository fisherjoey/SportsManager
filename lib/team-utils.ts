/**
 * Team utilities for consistent team name formatting across the application
 */

export interface Team {
  organization: string
  ageGroup: string
  gender: "Boys" | "Girls"
  rank: number
}

/**
 * Format team name consistently across the application
 * Handles both string and object team formats
 */
export const formatTeamName = (team: Team | string | null | undefined): string => {
  if (!team) {
    return 'Unknown Team'
  }
  
  if (typeof team === 'string') {
    return team
  }
  
  // Handle object format
  const parts = [team.organization, team.ageGroup, team.gender].filter(Boolean)
  return parts.join(' ') || 'Unknown Team'
}

/**
 * Format a complete game matchup string
 */
export const formatGameMatchup = (homeTeam: Team | string | null | undefined, awayTeam: Team | string | null | undefined): string => {
  return `${formatTeamName(homeTeam)} vs ${formatTeamName(awayTeam)}`
}

/**
 * Get team display name with optional rank
 */
export const formatTeamNameWithRank = (team: Team | string | null | undefined): string => {
  if (!team) {
    return 'Unknown Team'
  }
  
  if (typeof team === 'string') {
    return team
  }
  
  const parts = [team.organization, team.ageGroup, team.gender]
  if (team.rank && team.rank > 0) {
    parts.push(`#${team.rank}`)
  }
  
  return parts.filter(Boolean).join(' ') || 'Unknown Team'
}

/**
 * Extract team search terms for filtering
 */
export const getTeamSearchTerms = (team: Team | string | null | undefined): string[] => {
  if (!team) {
    return []
  }
  
  if (typeof team === 'string') {
    return [team.toLowerCase()]
  }
  
  return [
    team.organization?.toLowerCase() || '',
    team.ageGroup?.toLowerCase() || '',
    team.gender?.toLowerCase() || '',
    `${team.organization} ${team.ageGroup} ${team.gender}`.toLowerCase()
  ].filter(Boolean)
}