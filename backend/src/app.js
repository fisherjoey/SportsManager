const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import monitoring (must be initialized early)
const { Sentry, ProductionMonitor } = require('./utils/monitor');

// Import security middleware
const { getCorsConfig, requestSizeLimit, validateEnvironment } = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandling');

// Import audit middleware
const { 
  createResourceAuditMiddleware, 
  createGlobalAuditMiddleware, 
  createSensitiveOperationsAuditMiddleware 
} = require('./middleware/auditLogger');

// Import audit cleanup job
const { auditCleanupJob } = require('./jobs/auditLogCleanup');

// Import performance monitoring middleware
const { performanceMonitor } = require('./middleware/performanceMonitor');
const { advancedPerformanceMonitor, setupAlertHandlers } = require('./middleware/advanced-performance');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const refereeRoutes = require('./routes/referees');
const refereeRoleRoutes = require('./routes/referee-roles');
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
const financialDashboardRoutes = require('./routes/financial-dashboard');
const receiptsRoutes = require('./routes/receipts');
const budgetTrackerRoutes = require('./routes/budget-tracker');
const gameFeesRoutes = require('./routes/game-fees');
const performanceRoutes = require('./routes/performance');

// Import organizational management routes
const employeeRoutes = require('./routes/employees');
const assetRoutes = require('./routes/assets');
const documentRoutes = require('./routes/documents');
const complianceRoutes = require('./routes/compliance');
const communicationRoutes = require('./routes/communications');
const organizationalAnalyticsRoutes = require('./routes/organizational-analytics');
const workflowRoutes = require('./routes/workflows');
const contentRoutes = require('./routes/content');
const resourcesRoutes = require('./routes/resources');

// Import admin routes
const adminRoleRoutes = require('./routes/admin/roles');
const adminPermissionRoutes = require('./routes/admin/permissions');
const adminMaintenanceRoutes = require('./routes/admin/maintenance');
const testRoleRoutes = require('./routes/admin/test-roles');

const app = express();

// Validate environment variables before starting
validateEnvironment();

// Setup performance alert handlers
setupAlertHandlers();

// Initialize audit log cleanup job
try {
  auditCleanupJob.init();
  console.log('✅ Audit log cleanup job initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize audit log cleanup job:', error.message);
}

// Add Sentry request handler (must be first middleware)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

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

// Advanced performance monitoring
app.use(advancedPerformanceMonitor({
  slowThreshold: 1000,
  verySlowThreshold: 5000,
  trackMemory: true,
  trackCpu: true,
  enableAlerting: true,
  samplingRate: 1.0,
  excludeEndpoints: ['/health', '/api/health'],
  trackUserAgents: true,
  trackIpAddresses: true
}));

// Resource audit logging middleware (logs successful resource operations)
app.use(createResourceAuditMiddleware({
  resourceRoutes: ['/api/resources', '/api/users', '/api/games', '/api/assignments', '/api/teams', '/api/leagues'],
  excludeRoutes: ['/api/auth/login', '/api/auth/refresh', '/api/health', '/api/performance'],
  logViewOperations: false,
  captureRequestBody: true,
  maxDataSize: 10240
}));

// Sensitive operations audit logging (logs all operations including views)
app.use(createSensitiveOperationsAuditMiddleware({
  resourceRoutes: ['/api/admin', '/api/financial', '/api/compliance', '/api/reports', '/api/analytics/organizational'],
  logViewOperations: true,
  captureRequestBody: true,
  maxDataSize: 5120
}));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve JSDoc API documentation
app.use('/api-docs', express.static('docs'));
console.log('📚 API Documentation available at: http://localhost:3001/api-docs');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/referees', refereeRoutes);
app.use('/api/referee-roles', refereeRoleRoutes);
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
app.use('/api/financial-dashboard', financialDashboardRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/budget-tracker', budgetTrackerRoutes);
app.use('/api/game-fees', gameFeesRoutes);

// Organizational management routes
app.use('/api/employees', employeeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/analytics/organizational', organizationalAnalyticsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/resources', resourcesRoutes);

// Admin routes
app.use('/api/admin/roles', adminRoleRoutes);
app.use('/api/admin/permissions', adminPermissionRoutes);
app.use('/api/admin/maintenance', adminMaintenanceRoutes);
app.use('/api/admin/access', require('./routes/admin/access'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/test-roles', testRoleRoutes);

// Performance monitoring routes (admin only)
app.use('/api/performance', performanceRoutes);

// Health check endpoints (no authentication required)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);

// Add Sentry error handler before custom error handler
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

module.exports = app;