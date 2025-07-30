const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import security middleware
const { createSecurityMiddleware, getCorsConfig, enforceHTTPS, securityMonitoring, requestSizeLimit, validateEnvironment } = require('./middleware/security');
const { sanitizeAll } = require('./middleware/sanitization');
const { auditMiddleware } = require('./middleware/auditTrail');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandling');
const { apiLimiter } = require('./middleware/rateLimiting');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const refereeRoutes = require('./routes/referees');
const assignmentRoutes = require('./routes/assignments');
const invitationRoutes = require('./routes/invitations');
// const refereeLevelRoutes = require('./routes/referee-levels'); // DISABLED: uses referees table
const selfAssignmentRoutes = require('./routes/self-assignment');
const roleRoutes = require('./routes/roles');
const availabilityRoutes = require('./routes/availability');
const leagueRoutes = require('./routes/leagues');
const teamRoutes = require('./routes/teams');
const tournamentRoutes = require('./routes/tournaments');
const organizationRoutes = require('./routes/organization');
const postRoutes = require('./routes/posts');
const aiSuggestionsRoutes = require('./routes/ai-suggestions');
const historicPatternsRoutes = require('./routes/historic-patterns');
const chunksRoutes = require('./routes/chunks');
const aiAssignmentRulesRoutes = require('./routes/ai-assignment-rules');
const locationRoutes = require('./routes/locations');
const reportsRoutes = require('./routes/reports');
const calendarRoutes = require('./routes/calendar');
const healthRoutes = require('./routes/health');
const expenseRoutes = require('./routes/expenses');

const app = express();

// Validate environment variables before starting
validateEnvironment();

// Security middleware stack
app.use(enforceHTTPS);
app.use(createSecurityMiddleware());
app.use(cors(getCorsConfig()));
app.use(apiLimiter);
app.use(requestSizeLimit('10mb'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security monitoring and sanitization
app.use(securityMonitoring);
app.use(sanitizeAll);

// Audit trail for API requests (exclude health checks and static files)
app.use(auditMiddleware({
  logAllRequests: false,
  logAuthRequests: true,
  logAdminRequests: true,
  logFailedRequests: true,
  excludePaths: ['/api/health', '/uploads'],
  sensitiveEndpoints: ['/api/auth', '/api/admin', '/api/reports']
}));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/referees', refereeRoutes);
app.use('/api/assignments/ai-suggestions', aiSuggestionsRoutes);
app.use('/api/assignments/patterns', historicPatternsRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/invitations', invitationRoutes);
// app.use('/api/referee-levels', refereeLevelRoutes); // DISABLED: uses referees table
app.use('/api/self-assignment', selfAssignmentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chunks', chunksRoutes);
app.use('/api/ai-assignment-rules', aiAssignmentRulesRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check endpoints (no authentication required)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;