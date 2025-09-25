// @ts-nocheck

/**
 * Bridge pattern implementation for financial-reports route compatibility
 * This file ensures backward compatibility while transitioning from JS to TS
 *
 * Usage: This bridge allows the existing JS application to use the new TypeScript
 * implementation without breaking existing functionality.
 */

import financialReportsRouter from '../routes/financial-reports';

// Re-export the TypeScript router for CommonJS compatibility
export default financialReportsRouter.default || financialReportsRouter;

// Additional compatibility helpers if needed
module.exports.validateBudgetVarianceQuery = (query) => {
  const {
    period_id,
    category_id,
    date_from,
    date_to,
    variance_threshold = '5'
  } = query;

  return {
    period_id: period_id ? String(period_id) : undefined,
    category_id: category_id ? String(category_id) : undefined,
    date_from: date_from ? String(date_from) : undefined,
    date_to: date_to ? String(date_to) : undefined,
    variance_threshold: String(variance_threshold)
  };
};

module.exports.validateCashFlowQuery = (query) => {
  const {
    date_from,
    date_to,
    grouping = 'monthly',
    include_forecast = 'false'
  } = query;

  const validGroupings = ['daily', 'weekly', 'monthly', 'quarterly'];

  return {
    date_from: date_from ? String(date_from) : undefined,
    date_to: date_to ? String(date_to) : undefined,
    grouping: validGroupings.includes(grouping) ? grouping : 'monthly',
    include_forecast: String(include_forecast)
  };
};

module.exports.validateExpenseAnalysisQuery = (query) => {
  const {
    date_from,
    date_to,
    category_id,
    vendor_id,
    comparison_period = 'false'
  } = query;

  return {
    date_from: date_from ? String(date_from) : undefined,
    date_to: date_to ? String(date_to) : undefined,
    category_id: category_id ? String(category_id) : undefined,
    vendor_id: vendor_id ? String(vendor_id) : undefined,
    comparison_period: String(comparison_period)
  };
};

module.exports.validatePayrollSummaryQuery = (query) => {
  const {
    date_from,
    date_to,
    referee_id,
    payment_status = 'all'
  } = query;

  const validStatuses = ['all', 'paid', 'pending', 'approved'];

  return {
    date_from: date_from ? String(date_from) : undefined,
    date_to: date_to ? String(date_to) : undefined,
    referee_id: referee_id ? String(referee_id) : undefined,
    payment_status: validStatuses.includes(payment_status) ? payment_status : 'all'
  };
};

module.exports.validateKPIQuery = (query) => {
  const { period_days = '30' } = query;

  return {
    period_days: String(period_days)
  };
};

// Error handling compatibility
module.exports.handleReportError = (error, reportType) => {
  console.error(`${reportType} report error:`, error);

  // Standard error response format
  return {
    error: `Failed to generate ${reportType} report`,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  };
};

// Monetary calculation helpers for backward compatibility
module.exports.parseAmount = (value) => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : value;
};

module.exports.formatAmount = (value) => {
  return Number(value).toFixed(2);
};

module.exports.calculateVariance = (actual, budgeted) => {
  if (!budgeted || budgeted === 0) return 0;
  return ((actual - budgeted) / budgeted) * 100;
};

module.exports.roundPercentage = (value) => {
  return Math.round(value * 100) / 100;
};

// Date handling helpers
module.exports.parseDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

module.exports.formatDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  return {
    start_date: start?.toISOString() || null,
    end_date: end?.toISOString() || null
  };
};

// Response transformation helpers
module.exports.transformBudgetVarianceResponse = (response) => {
  // Ensure backward compatibility with existing response format
  return {
    ...response,
    // Add any legacy fields if needed
    legacy_format: true,
    api_version: '2.0'
  };
};

module.exports.transformCashFlowResponse = (response) => {
  return {
    ...response,
    legacy_format: true,
    api_version: '2.0'
  };
};

module.exports.transformExpenseAnalysisResponse = (response) => {
  return {
    ...response,
    legacy_format: true,
    api_version: '2.0'
  };
};

module.exports.transformPayrollSummaryResponse = (response) => {
  return {
    ...response,
    legacy_format: true,
    api_version: '2.0'
  };
};

module.exports.transformKPIResponse = (response) => {
  return {
    ...response,
    legacy_format: true,
    api_version: '2.0'
  };
};