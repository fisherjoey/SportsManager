const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import security middleware
const { createSecurityMiddleware, getCorsConfig, enforceHTTPS, securityMonitoring, requestSizeLimit, validateEnvironment } = require('./middleware/security');
const { sanitizeAll } = require('./middleware/sanitization');
const { auditMiddleware } = require('./middleware/auditTrail');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandling');
const { apiLimiter } = require('./middleware/rateLimiting');

// Import performance monitoring middleware
const { performanceMonitor } = require('./middleware/performanceMonitor');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
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
const budgetRoutes = require('./routes/budgets');
const paymentMethodRoutes = require('./routes/payment-methods');
const purchaseOrderRoutes = require('./routes/purchase-orders');
const companyCreditCardRoutes = require('./routes/company-credit-cards');
const financialTransactionRoutes = require('./routes/financial-transactions');
const financialApprovalRoutes = require('./routes/financial-approvals');
const accountingIntegrationRoutes = require('./routes/accounting-integration');
const financialReportRoutes = require('./routes/financial-reports');
const performanceRoutes = require('./routes/performance');

// Import organizational management routes
const employeeRoutes = require('./routes/employees');
const assetRoutes = require('./routes/assets');
const documentRoutes = require('./routes/documents');
const complianceRoutes = require('./routes/compliance');
const communicationRoutes = require('./routes/communications');
const organizationalAnalyticsRoutes = require('./routes/organizational-analytics');
const workflowRoutes = require('./routes/workflows');

const app = express();

// Validate environment variables before starting
validateEnvironment();

// Security middleware stack
// app.use(enforceHTTPS); // TEMPORARILY DISABLED
// app.use(createSecurityMiddleware()); // TEMPORARILY DISABLED
app.use(cors(getCorsConfig()));
// app.use(apiLimiter); // TEMPORARILY DISABLED
app.use(requestSizeLimit('50mb')); // Increased limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security monitoring and sanitization
// app.use(securityMonitoring); // TEMPORARILY DISABLED
// app.use(sanitizeAll); // TEMPORARILY DISABLED

// Request processing middleware
app.use(performanceMonitor({
  slowThreshold: 1000,    // Log requests slower than 1 second
  logSlowRequests: true,
  trackQueryCount: false, // Disable query tracking for now
  maxSlowQueries: 100
}));

// Audit trail for API requests (exclude health checks and static files)
// app.use(auditMiddleware({ // TEMPORARILY DISABLED
//   logAllRequests: false,
//   logAuthRequests: true,
//   logAdminRequests: true,
//   logFailedRequests: true,
//   excludePaths: ['/api/health', '/uploads'],
//   sensitiveEndpoints: ['/api/auth', '/api/admin', '/api/reports', '/api/employees', '/api/compliance', '/api/analytics/organizational']
// }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
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
// Expenses API routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/company-credit-cards', companyCreditCardRoutes);
app.use('/api/financial', financialTransactionRoutes);
app.use('/api/approvals', financialApprovalRoutes);
app.use('/api/accounting', accountingIntegrationRoutes);
app.use('/api/financial-reports', financialReportRoutes);

// Organizational management routes
app.use('/api/employees', employeeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/analytics/organizational', organizationalAnalyticsRoutes);
app.use('/api/workflows', workflowRoutes);

// Performance monitoring routes (admin only)
app.use('/api/performance', performanceRoutes);

// Health check endpoints (no authentication required)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;