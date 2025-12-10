// Re-export services with consistent naming
export { MenteeProfileService, menteeProfileService } from './MenteeProfileService';
export { MenteeGamesService } from './MenteeGamesService';
export { MenteeAnalyticsService } from './MenteeAnalyticsService';
export { default as MentorMenteesService } from './MentorMenteesService';

// Import default exports for singleton instances
import menteeGamesService from './MenteeGamesService';
import menteeAnalyticsService from './MenteeAnalyticsService';
import MentorMenteesServiceClass from './MentorMenteesService';
import { menteeProfileService } from './MenteeProfileService';
import db from '../../config/database';

// Create singleton for MentorMenteesService (requires db instance)
const mentorMenteesService = new MentorMenteesServiceClass(db);

// Re-export singleton instances
export { menteeGamesService, menteeAnalyticsService, mentorMenteesService };

// Unified service object for convenience
export const mentorshipServices = {
  menteeProfile: menteeProfileService,
  menteeGames: menteeGamesService,
  menteeAnalytics: menteeAnalyticsService,
  mentorMentees: mentorMenteesService
};
