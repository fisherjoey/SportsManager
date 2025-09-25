import { User, Role } from '../types/user'

/**
 * Check if a user is any type of referee
 * @param user - The user to check
 * @returns True if user has Referee role
 */
export function isReferee(user: User): boolean {
  if (!user) return false

  if (!user.roles || !Array.isArray(user.roles)) {
    // Fallback to legacy role field
    return user.role === 'referee' || user.role === 'Referee'
  }

  return user.roles.some(role =>
    typeof role === 'string' ? role === 'Referee' : role?.name === 'Referee'
  )
}

/**
 * Get the referee specialization level
 * @param user - The user to check
 * @returns The referee level or empty string
 */
export function getRefereeLevel(user: User): string {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return ''
  }

  const levelPriority = [
    'Head Referee',
    'Senior Referee',
    'Junior Referee',
    'Rookie Referee',
    'Referee Coach'
  ]

  for (const level of levelPriority) {
    const hasLevel = user.roles.some(role =>
      typeof role === 'string' ? role === level : role?.name === level
    )
    if (hasLevel) {
      return level
    }
  }

  // If they only have base Referee role
  if (isReferee(user)) {
    return 'Referee'
  }

  return ''
}

/**
 * Get display badge color for referee level
 * @param level - The referee level
 * @returns CSS class name for the badge
 */
export function getRefereeLevelBadgeClass(level: string): string {
  switch (level) {
    case 'Head Referee':
      return 'badge-referee-head'
    case 'Senior Referee':
      return 'badge-referee-senior'
    case 'Junior Referee':
      return 'badge-referee-junior'
    case 'Rookie Referee':
      return 'badge-referee-rookie'
    case 'Referee Coach':
      return 'badge-referee-coach'
    case 'Referee':
      return 'badge-referee-base'
    default:
      return 'badge-default'
  }
}

/**
 * Check if user can perform mentor actions
 * @param user - The user to check
 * @returns True if user can mentor
 */
export function canMentor(user: User): boolean {
  if (!user || !user.roles) return false

  const mentorRoles = ['Senior Referee', 'Head Referee', 'Referee Coach']
  return user.roles.some(role => {
    const roleName = typeof role === 'string' ? role : role?.name
    return roleName && mentorRoles.includes(roleName)
  })
}

/**
 * Check if user can evaluate other referees
 * @param user - The user to check
 * @returns True if user can evaluate
 */
export function canEvaluate(user: User): boolean {
  if (!user || !user.roles) return false

  const evaluatorRoles = ['Senior Referee', 'Head Referee', 'Referee Coach']
  return user.roles.some(role => {
    const roleName = typeof role === 'string' ? role : role?.name
    return roleName && evaluatorRoles.includes(roleName)
  })
}

/**
 * Format referee display name with level
 * @param user - The user
 * @returns Formatted display name
 */
export function getRefereeDisplayName(user: User): string {
  if (!user) return 'Unknown User'

  const level = getRefereeLevel(user)
  const name = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown User'

  if (!level || level === 'Referee') {
    return name
  }

  // Shorten the level for display
  const shortLevel = level
    .replace('Referee', 'Ref')
    .replace('Senior', 'Sr.')
    .replace('Junior', 'Jr.')
    .replace('Rookie', 'Rk.')

  return `${name} (${shortLevel})`
}

/**
 * Get referee experience level based on roles and profile
 * @param user - The user to check
 * @returns Experience level category
 */
export function getRefereeExperienceLevel(user: User): 'new' | 'junior' | 'senior' | 'coach' {
  if (!user || !isReferee(user)) return 'new'

  const level = getRefereeLevel(user)

  switch (level) {
    case 'Head Referee':
    case 'Referee Coach':
      return 'coach'
    case 'Senior Referee':
      return 'senior'
    case 'Junior Referee':
      return 'junior'
    case 'Rookie Referee':
    default:
      return 'new'
  }
}

/**
 * Check if referee has white whistle certification
 * @param user - The user to check
 * @returns True if has white whistle
 */
export function hasWhiteWhistle(user: User): boolean {
  return Boolean(
    user?.referee_profile?.is_white_whistle &&
    user?.referee_profile?.show_white_whistle
  )
}

/**
 * Get referee wage amount safely
 * @param user - The user to check
 * @returns Wage amount or 0
 */
export function getRefereeWage(user: User): number {
  return user?.referee_profile?.wage_amount || 0
}

/**
 * Get referee years of experience
 * @param user - The user to check
 * @returns Years of experience
 */
export function getRefereeYearsExperience(user: User): number {
  return user?.referee_profile?.years_experience || 0
}

/**
 * Check if referee is available for assignments
 * @param user - The user to check
 * @returns True if available
 */
export function isRefereeAvailable(user: User): boolean {
  return user?.is_available === true && user?.availability_status === 'active'
}

/**
 * Get referee evaluation score
 * @param user - The user to check
 * @returns Evaluation score or null
 */
export function getRefereeEvaluationScore(user: User): number | null {
  return user?.referee_profile?.evaluation_score || null
}

/**
 * Format referee level for display in badges/chips
 * @param level - The referee level
 * @returns Shortened level for display
 */
export function formatRefereeLevelForDisplay(level: string): string {
  const shortForms: Record<string, string> = {
    'Head Referee': 'Head Ref',
    'Senior Referee': 'Sr. Ref',
    'Junior Referee': 'Jr. Ref',
    'Rookie Referee': 'Rookie',
    'Referee Coach': 'Coach',
    'Referee': 'Ref'
  }

  return shortForms[level] || level
}

/**
 * Get all referee capabilities/specializations
 * @param user - The user to check
 * @returns Array of capability names
 */
export function getRefereeCapabilities(user: User): string[] {
  if (!user?.referee_profile?.capabilities) return []

  return user.referee_profile.capabilities.map(cap =>
    typeof cap === 'string' ? cap : cap?.name || ''
  ).filter(Boolean)
}

/**
 * Check if referee can officiate specific game types
 * @param user - The user to check
 * @param gameType - The type of game to check
 * @returns True if qualified
 */
export function canOfficiate(user: User, gameType: string): boolean {
  if (!isReferee(user)) return false

  const capabilities = getRefereeCapabilities(user)
  const level = getRefereeLevel(user)

  // Head referees and coaches can officiate anything
  if (level === 'Head Referee' || level === 'Referee Coach') {
    return true
  }

  // Check if they have specific capability for the game type
  return capabilities.some(cap =>
    cap.toLowerCase().includes(gameType.toLowerCase())
  )
}