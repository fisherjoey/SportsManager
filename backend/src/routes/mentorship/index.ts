import { Router } from 'express';
import menteeProfileRoutes from './mentee-profile.routes';
import menteeGamesRoutes from './mentee-games.routes';
import menteeAnalyticsRoutes from './mentee-analytics.routes';
import mentorMenteesRoutes from './mentor-mentees.routes';

const router = Router();

// Mentee routes - /api/mentees
router.use('/', menteeProfileRoutes);
router.use('/', menteeGamesRoutes);
router.use('/', menteeAnalyticsRoutes);

// Mentor routes - exported separately for /api/mentors
export const mentorRoutes = mentorMenteesRoutes;

export default router;
