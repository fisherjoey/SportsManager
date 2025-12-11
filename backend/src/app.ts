import express from 'express';
import cors from 'cors';
require('dotenv').config();

// Import monitoring (must be initialized early)
import { Sentry, ProductionMonitor  } from './utils/monitor';

// Import security middleware
import { getCorsConfig, requestSizeLimit, validateEnvironment  } from './middleware/security';
import { errorHandler, notFoundHandler  } from './middleware/errorHandling';
import { validationFix, validationErrorHandler } from './middleware/validation-fix';

// Import audit middleware
import { createResourceAuditMiddleware, 
  createGlobalAuditMiddleware, 
  createSensitiveOperationsAuditMiddleware 
 } from './middleware/auditLogger';

// Import audit cleanup job
import { auditCleanupJob  } from './jobs/auditLogCleanup';

// Import performance monitoring middleware
import { performanceMonitor  } from './middleware/performanceMonitor';
import { advancedPerformanceMonitor, setupAlertHandlers  } from './middleware/advanced-performance';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import gameRoutes from './routes/games';
import refereeRoutes from './routes/referees';
import refereeRoleRoutes from './routes/referee-roles';
import assignmentRoutes from './routes/assignments';
import invitationRoutes from './routes/invitations';
// import refereeLevelRoutes from './routes/referee-levels'; // DISABLED: uses referees table
import selfAssignmentRoutes from './routes/self-assignment';
import roleRoutes from './routes/roles';
import availabilityRoutes from './routes/availability';
import leagueRoutes from './routes/leagues';
import teamRoutes from './routes/teams';
import tournamentRoutes from './routes/tournaments';
import organizationRoutes from './routes/organization';
import postRoutes from './routes/posts';
import aiSuggestionsRoutes from './routes/ai-suggestions';
import historicPatternsRoutes from './routes/historic-patterns';
import chunksRoutes from './routes/chunks';
import aiAssignmentRulesRoutes from './routes/ai-assignment-rules';
import locationRoutes from './routes/locations';
import reportsRoutes from './routes/reports';
import calendarRoutes from './routes/calendar';
import healthRoutes from './routes/health';
import expenseRoutes from './routes/expenses';
import expenseModuleRoutes from './routes/expenses/index';
import budgetRoutes from './routes/budgets';
import paymentMethodRoutes from './routes/payment-methods';
import purchaseOrderRoutes from './routes/purchase-orders';
import companyCreditCardRoutes from './routes/company-credit-cards';
import financialTransactionRoutes from './routes/financial-transactions';
import financialApprovalRoutes from './routes/financial-approvals';
import accountingIntegrationRoutes from './routes/accounting-integration';
import financialReportRoutes from './routes/financial-reports';
import financialDashboardRoutes from './routes/financial-dashboard';
import receiptsRoutes from './routes/receipts';
import budgetTrackerRoutes from './routes/budget-tracker';
import gameFeesRoutes from './routes/game-fees';
import performanceRoutes from './routes/performance';

// Import organizational management routes
import employeeRoutes from './routes/employees';
import assetRoutes from './routes/assets';
import documentRoutes from './routes/documents';
import complianceRoutes from './routes/compliance';
import communicationRoutes from './routes/communications';
import organizationalAnalyticsRoutes from './routes/organizational-analytics';
import workflowRoutes from './routes/workflows';
import contentRoutes from './routes/content';
import resourcesRoutes from './routes/resources';

// Import mentorship routes
import mentorshipRoutes from './routes/mentorships';
import menteeGamesRoutes from './routes/mentee-games';
import newMenteeRoutes, { mentorRoutes } from './routes/mentorship';

// Import admin routes
import adminRoleRoutes from './routes/admin/roles';
import adminMaintenanceRoutes from './routes/admin/maintenance';
import testRoleRoutes from './routes/admin/test-roles';
// REMOVED: import adminRBACRegistryRoutes from './routes/admin/rbac-registry';
import adminAccessRoutes from './routes/admin/access';
import adminUsersRoutes from './routes/admin/users';
import adminCerbosPoliciesRoutes from './routes/admin/cerbos-policies';
import adminPermissionsRoutes from './routes/admin/permissions';
import unifiedRoleRoutes from './routes/admin/unified-roles';
import cerbosRoutes from './routes/cerbos';
import notificationRoutes from './routes/notifications';
import pagesRoutes from './routes/pages';

// Import webhook routes
import clerkWebhookRoutes from './routes/webhooks/clerk';

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
// Temporarily disabled due to TypeScript compilation issues
// if (process.env.SENTRY_DSN) {
//   app.use(Sentry.Handlers.requestHandler());
// }

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

// Validation fix middleware - Apply before any routes
app.use(validationFix);

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

// Webhook routes (registered early, no auth required)
app.use('/api/webhooks/clerk', clerkWebhookRoutes);

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
app.use('/api/notifications', notificationRoutes);
// Expenses API routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/expenses', expenseModuleRoutes); // Session 3/4: Approval & reference routes
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

// Mentorship routes
app.use('/api/mentorships', mentorshipRoutes);
app.use('/api/mentees', newMenteeRoutes);  // New mentee profile, games, analytics (takes priority)
app.use('/api/mentees', menteeGamesRoutes); // Legacy mentee games routes
app.use('/api/mentors', mentorRoutes);     // New mentor's mentees endpoint

// Admin routes
app.use('/api/admin/roles', adminRoleRoutes);
app.use('/api/admin/permissions', adminPermissionsRoutes);
app.use('/api/admin/maintenance', adminMaintenanceRoutes);
app.use('/api/admin/access', adminAccessRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/cerbos-policies', adminCerbosPoliciesRoutes);
app.use('/api/admin/unified-roles', unifiedRoleRoutes);
// REMOVED: app.use('/api/admin/rbac-registry', adminRBACRegistryRoutes);
app.use('/api/test-roles', testRoleRoutes);

// Cerbos policy management routes
app.use('/api/cerbos', cerbosRoutes);

// Page permission routes
app.use('/api/pages', pagesRoutes);

// Performance monitoring routes (admin only)
app.use('/api/performance', performanceRoutes);

// Health check endpoints (no authentication required)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);

// Add Sentry error handler before custom error handler
if (process.env.SENTRY_DSN) {
  // Temporarily disabled due to TypeScript compilation issues
  // app.use(Sentry.Handlers.errorHandler());
}

// Add validation error handler before general error handler
app.use(validationErrorHandler);
app.use(errorHandler);

export default app;