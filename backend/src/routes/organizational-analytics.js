const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const Joi = require('joi');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation schemas
const analyticsRequestSchema = Joi.object({
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  departments: Joi.array().items(Joi.string().uuid()).allow(null),
  positions: Joi.array().items(Joi.string().uuid()).allow(null),
  metrics: Joi.array().items(Joi.string()).allow(null)
});

// Helper function to build department filter
function buildDepartmentFilter(departments, alias = '') {
  if (!departments || departments.length === 0) {
    return { condition: '', params: [] };
  }
  
  const prefix = alias ? `${alias}.` : '';
  return {
    condition: ` AND ${prefix}department_id = ANY($PARAM)`,
    params: [departments]
  };
}

// Helper function to calculate date ranges
function getDateRanges(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  let interval, format;
  if (daysDiff <= 7) {
    interval = '1 day';
    format = 'YYYY-MM-DD';
  } else if (daysDiff <= 31) {
    interval = '1 day';
    format = 'YYYY-MM-DD';
  } else if (daysDiff <= 365) {
    interval = '1 week';
    format = 'YYYY-"W"WW';
  } else {
    interval = '1 month';
    format = 'YYYY-MM';
  }
  
  return { interval, format };
}

// EMPLOYEE ANALYTICS ENDPOINTS

// Get comprehensive employee performance dashboard
router.get('/employees/performance', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { start_date, end_date, departments, positions } = req.query;
    
    // Performance ratings distribution
    const ratingsQuery = `
      SELECT 
        overall_rating,
        COUNT(*) as count,
        AVG(overall_rating) as avg_rating
      FROM employee_evaluations ev
      JOIN employees e ON ev.employee_id = e.id
      WHERE ev.evaluation_date BETWEEN $1 AND $2
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
        ${positions ? `AND e.position_id = ANY($${departments ? '4' : '3'})` : ''}
      GROUP BY overall_rating
      ORDER BY overall_rating
    `;
    
    const params = [start_date, end_date];
    if (departments) {
      params.push(departments);
    }
    if (positions) {
      params.push(positions);
    }
    
    const ratingsResult = await pool.query(ratingsQuery, params);
    
    // Department performance comparison
    const deptPerfQuery = `
      SELECT 
        d.name as department_name,
        COUNT(ev.id) as evaluation_count,
        AVG(ev.overall_rating) as avg_rating,
        COUNT(DISTINCT e.id) as employee_count
      FROM employee_evaluations ev
      JOIN employees e ON ev.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE ev.evaluation_date BETWEEN $1 AND $2
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY d.id, d.name
      ORDER BY avg_rating DESC
    `;
    
    const deptPerfResult = await pool.query(deptPerfQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    // Performance trend over time
    const { interval, format } = getDateRanges(start_date, end_date);
    const trendQuery = `
      SELECT 
        TO_CHAR(ev.evaluation_date, '${format}') as period,
        AVG(ev.overall_rating) as avg_rating,
        COUNT(*) as evaluation_count
      FROM employee_evaluations ev
      JOIN employees e ON ev.employee_id = e.id
      WHERE ev.evaluation_date BETWEEN $1 AND $2
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY TO_CHAR(ev.evaluation_date, '${format}')
      ORDER BY period
    `;
    
    const trendResult = await pool.query(trendQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    res.json({
      ratingsDistribution: ratingsResult.rows,
      departmentPerformance: deptPerfResult.rows,
      performanceTrend: trendResult.rows
    });
  } catch (error) {
    console.error('Error fetching employee performance analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee retention and turnover analytics
router.get('/employees/retention', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { start_date, end_date, departments } = req.query;
    
    // Turnover statistics
    const turnoverQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE termination_date BETWEEN $1 AND $2) as terminated_count,
        COUNT(*) FILTER (WHERE hire_date BETWEEN $1 AND $2) as hired_count,
        COUNT(*) FILTER (WHERE employment_status = 'active') as active_count,
        COUNT(*) as total_employees,
        ROUND(
          (COUNT(*) FILTER (WHERE termination_date BETWEEN $1 AND $2) * 100.0) / 
          NULLIF(COUNT(*) FILTER (WHERE employment_status = 'active'), 0), 2
        ) as turnover_rate
      FROM employees e
      WHERE (hire_date <= $2 OR termination_date BETWEEN $1 AND $2)
        ${departments ? 'AND department_id = ANY($3)' : ''}
    `;
    
    const turnoverParams = [start_date, end_date];
    if (departments) {
      turnoverParams.push(departments);
    }
    
    const turnoverResult = await pool.query(turnoverQuery, turnoverParams);
    
    // Retention by department
    const deptRetentionQuery = `
      SELECT 
        d.name as department_name,
        COUNT(*) FILTER (WHERE e.employment_status = 'active') as active_employees,
        COUNT(*) FILTER (WHERE e.termination_date BETWEEN $1 AND $2) as terminated_employees,
        ROUND(
          AVG(CASE 
            WHEN e.employment_status = 'active' THEN EXTRACT(DAYS FROM CURRENT_DATE - e.hire_date)
            ELSE EXTRACT(DAYS FROM e.termination_date - e.hire_date)
          END) / 365.25, 1
        ) as avg_tenure_years
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.hire_date <= $2
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY d.id, d.name
      ORDER BY avg_tenure_years DESC
    `;
    
    const deptRetentionResult = await pool.query(deptRetentionQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    // Tenure distribution
    const tenureQuery = `
      SELECT 
        CASE 
          WHEN tenure_months < 6 THEN '0-6 months'
          WHEN tenure_months < 12 THEN '6-12 months'
          WHEN tenure_months < 24 THEN '1-2 years'
          WHEN tenure_months < 60 THEN '2-5 years'
          ELSE '5+ years'
        END as tenure_range,
        COUNT(*) as employee_count
      FROM (
        SELECT 
          EXTRACT(MONTHS FROM 
            CASE 
              WHEN employment_status = 'active' THEN AGE(CURRENT_DATE, hire_date)
              ELSE AGE(termination_date, hire_date)
            END
          ) as tenure_months
        FROM employees e
        WHERE hire_date <= $2
          ${departments ? 'AND department_id = ANY($3)' : ''}
      ) tenure_data
      GROUP BY tenure_range
      ORDER BY 
        CASE tenure_range
          WHEN '0-6 months' THEN 1
          WHEN '6-12 months' THEN 2
          WHEN '1-2 years' THEN 3
          WHEN '2-5 years' THEN 4
          WHEN '5+ years' THEN 5
        END
    `;
    
    const tenureResult = await pool.query(tenureQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    res.json({
      turnoverStats: turnoverResult.rows[0],
      departmentRetention: deptRetentionResult.rows,
      tenureDistribution: tenureResult.rows
    });
  } catch (error) {
    console.error('Error fetching retention analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get training and development analytics
router.get('/employees/training', authenticateToken, requireAnyRole('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { start_date, end_date, departments } = req.query;
    
    // Training completion statistics
    const trainingStatsQuery = `
      SELECT 
        training_type,
        COUNT(*) as total_trainings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trainings,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_trainings,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_trainings,
        AVG(cost) FILTER (WHERE cost > 0) as avg_cost,
        SUM(cost) FILTER (WHERE status = 'completed') as total_investment
      FROM training_records tr
      JOIN employees e ON tr.employee_id = e.id
      WHERE tr.created_at BETWEEN $1 AND $2
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY training_type
      ORDER BY total_trainings DESC
    `;
    
    const trainingStatsParams = [start_date, end_date];
    if (departments) {
      trainingStatsParams.push(departments);
    }
    
    const trainingStatsResult = await pool.query(trainingStatsQuery, trainingStatsParams);
    
    // Employee training participation
    const participationQuery = `
      SELECT 
        d.name as department_name,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT tr.employee_id) as employees_with_training,
        ROUND(
          (COUNT(DISTINCT tr.employee_id) * 100.0) / 
          NULLIF(COUNT(DISTINCT e.id), 0), 2
        ) as participation_rate,
        AVG(training_count.count) as avg_trainings_per_employee
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN training_records tr ON e.id = tr.employee_id 
        AND tr.created_at BETWEEN $1 AND $2
      LEFT JOIN (
        SELECT employee_id, COUNT(*) as count
        FROM training_records
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY employee_id
      ) training_count ON e.id = training_count.employee_id
      WHERE e.employment_status = 'active'
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY d.id, d.name
      ORDER BY participation_rate DESC
    `;
    
    const participationResult = await pool.query(participationQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    // Training completion trend
    const completionTrendQuery = `
      SELECT 
        TO_CHAR(completion_date, 'YYYY-MM') as month,
        COUNT(*) as completions,
        SUM(cost) as monthly_investment
      FROM training_records tr
      JOIN employees e ON tr.employee_id = e.id
      WHERE completion_date BETWEEN $1 AND $2
        AND status = 'completed'
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY TO_CHAR(completion_date, 'YYYY-MM')
      ORDER BY month
    `;
    
    const completionTrendResult = await pool.query(completionTrendQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    res.json({
      trainingStats: trainingStatsResult.rows,
      departmentParticipation: participationResult.rows,
      completionTrend: completionTrendResult.rows
    });
  } catch (error) {
    console.error('Error fetching training analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ORGANIZATIONAL HEALTH METRICS

// Get overall organizational health dashboard
router.get('/health/overview', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    // Employee satisfaction proxy (based on performance ratings)
    const satisfactionQuery = `
      SELECT 
        AVG(overall_rating) as avg_performance_rating,
        COUNT(*) FILTER (WHERE overall_rating >= 4) as high_performers,
        COUNT(*) FILTER (WHERE overall_rating <= 2) as low_performers,
        COUNT(*) as total_evaluations
      FROM employee_evaluations
      WHERE evaluation_date >= CURRENT_DATE - INTERVAL '1 year'
    `;
    
    const satisfactionResult = await pool.query(satisfactionQuery);
    
    // Diversity metrics
    const diversityQuery = `
      SELECT 
        COUNT(*) as total_active_employees,
        COUNT(DISTINCT d.id) as departments_represented,
        COUNT(DISTINCT jp.level) as position_levels
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      JOIN job_positions jp ON e.position_id = jp.id
      WHERE e.employment_status = 'active'
    `;
    
    const diversityResult = await pool.query(diversityQuery);
    
    // Communication engagement
    const engagementQuery = `
      SELECT 
        COUNT(DISTINCT cr.recipient_id) as active_communicators,
        COUNT(*) FILTER (WHERE cr.read_at IS NOT NULL) as messages_read,
        COUNT(*) FILTER (WHERE cr.acknowledged_at IS NOT NULL) as messages_acknowledged,
        COUNT(*) as total_messages_sent,
        ROUND(
          (COUNT(*) FILTER (WHERE cr.read_at IS NOT NULL) * 100.0) / 
          NULLIF(COUNT(*), 0), 2
        ) as read_rate
      FROM communication_recipients cr
      JOIN internal_communications ic ON cr.communication_id = ic.id
      WHERE ic.created_at >= CURRENT_DATE - INTERVAL '3 months'
    `;
    
    const engagementResult = await pool.query(engagementQuery);
    
    // Compliance health
    const complianceQuery = `
      SELECT 
        COUNT(*) as total_compliance_items,
        COUNT(*) FILTER (WHERE status = 'compliant') as compliant_items,
        COUNT(*) FILTER (WHERE next_audit_date < CURRENT_DATE) as overdue_audits,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'compliant') * 100.0) / 
          NULLIF(COUNT(*), 0), 2
        ) as compliance_rate
      FROM compliance_tracking
    `;
    
    const complianceResult = await pool.query(complianceQuery);
    
    // Risk profile
    const riskQuery = `
      SELECT 
        COUNT(*) as total_risks,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risks,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risks,
        AVG(risk_score) as avg_risk_score
      FROM risk_assessments
      WHERE status != 'closed'
    `;
    
    const riskResult = await pool.query(riskQuery);
    
    res.json({
      satisfaction: satisfactionResult.rows[0],
      diversity: diversityResult.rows[0],
      engagement: engagementResult.rows[0],
      compliance: complianceResult.rows[0],
      riskProfile: riskResult.rows[0],
      healthScore: calculateHealthScore({
        satisfaction: satisfactionResult.rows[0],
        engagement: engagementResult.rows[0],
        compliance: complianceResult.rows[0],
        risk: riskResult.rows[0]
      })
    });
  } catch (error) {
    console.error('Error fetching organizational health metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate overall health score
function calculateHealthScore(metrics) {
  let score = 0;
  let factors = 0;
  
  // Performance factor (0-25 points)
  if (metrics.satisfaction.avg_performance_rating) {
    score += (metrics.satisfaction.avg_performance_rating / 5) * 25;
    factors++;
  }
  
  // Engagement factor (0-25 points)
  if (metrics.engagement.read_rate) {
    score += (metrics.engagement.read_rate / 100) * 25;
    factors++;
  }
  
  // Compliance factor (0-25 points)
  if (metrics.compliance.compliance_rate) {
    score += (metrics.compliance.compliance_rate / 100) * 25;
    factors++;
  }
  
  // Risk factor (0-25 points) - inverted score
  if (metrics.risk.avg_risk_score) {
    const riskFactor = Math.max(0, (25 - metrics.risk.avg_risk_score)) / 25;
    score += riskFactor * 25;
    factors++;
  }
  
  return factors > 0 ? Math.round(score / factors) : 0;
}

// PREDICTIVE ANALYTICS

// Get staffing predictions
router.get('/predictions/staffing', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    // Turnover prediction based on historical data
    const turnoverPredictionQuery = `
      WITH monthly_turnover AS (
        SELECT 
          TO_CHAR(termination_date, 'YYYY-MM') as month,
          COUNT(*) as turnover_count
        FROM employees
        WHERE termination_date >= CURRENT_DATE - INTERVAL '2 years'
        GROUP BY TO_CHAR(termination_date, 'YYYY-MM')
        ORDER BY month
      ),
      avg_turnover AS (
        SELECT AVG(turnover_count) as avg_monthly_turnover
        FROM monthly_turnover
      )
      SELECT 
        ROUND(avg_monthly_turnover, 1) as predicted_monthly_turnover,
        ROUND(avg_monthly_turnover * 12, 1) as predicted_annual_turnover
      FROM avg_turnover
    `;
    
    const turnoverPredictionResult = await pool.query(turnoverPredictionQuery);
    
    // Hiring needs prediction
    const hiringNeedsQuery = `
      SELECT 
        d.name as department_name,
        COUNT(e.id) as current_employees,
        COUNT(jp.id) as total_positions,
        (COUNT(jp.id) - COUNT(e.id)) as open_positions,
        ROUND(
          COUNT(e.id) * 0.15  -- Assuming 15% annual turnover
        ) as predicted_turnover_replacements
      FROM departments d
      LEFT JOIN job_positions jp ON d.id = jp.department_id AND jp.active = true
      LEFT JOIN employees e ON jp.id = e.position_id AND e.employment_status = 'active'
      GROUP BY d.id, d.name
      HAVING COUNT(jp.id) > 0
      ORDER BY (COUNT(jp.id) - COUNT(e.id)) DESC
    `;
    
    const hiringNeedsResult = await pool.query(hiringNeedsQuery);
    
    // Training needs prediction
    const trainingNeedsQuery = `
      SELECT 
        d.name as department_name,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT tr.employee_id) as employees_with_recent_training,
        ROUND(
          (COUNT(DISTINCT e.id) - COUNT(DISTINCT tr.employee_id)) * 100.0 / 
          NULLIF(COUNT(DISTINCT e.id), 0), 1
        ) as training_gap_percentage
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN training_records tr ON e.id = tr.employee_id 
        AND tr.completion_date >= CURRENT_DATE - INTERVAL '1 year'
        AND tr.status = 'completed'
      WHERE e.employment_status = 'active'
      GROUP BY d.id, d.name
      ORDER BY training_gap_percentage DESC
    `;
    
    const trainingNeedsResult = await pool.query(trainingNeedsQuery);
    
    res.json({
      turnoverPrediction: turnoverPredictionResult.rows[0],
      hiringNeeds: hiringNeedsResult.rows,
      trainingNeeds: trainingNeedsResult.rows
    });
  } catch (error) {
    console.error('Error fetching staffing predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get performance trends and predictions
router.get('/predictions/performance', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    // Performance trend analysis
    const performanceTrendQuery = `
      WITH quarterly_performance AS (
        SELECT 
          EXTRACT(YEAR FROM evaluation_date) as year,
          EXTRACT(QUARTER FROM evaluation_date) as quarter,
          AVG(overall_rating) as avg_rating,
          COUNT(*) as evaluation_count
        FROM employee_evaluations
        WHERE evaluation_date >= CURRENT_DATE - INTERVAL '2 years'
        GROUP BY EXTRACT(YEAR FROM evaluation_date), EXTRACT(QUARTER FROM evaluation_date)
        ORDER BY year, quarter
      )
      SELECT 
        year || '-Q' || quarter as period,
        ROUND(avg_rating, 2) as avg_rating,
        evaluation_count,
        LAG(avg_rating) OVER (ORDER BY year, quarter) as previous_rating,
        ROUND(avg_rating - LAG(avg_rating) OVER (ORDER BY year, quarter), 2) as rating_change
      FROM quarterly_performance
    `;
    
    const performanceTrendResult = await pool.query(performanceTrendQuery);
    
    // Department performance predictions
    const deptPerformanceQuery = `
      SELECT 
        d.name as department_name,
        AVG(ev.overall_rating) as current_avg_rating,
        COUNT(ev.id) as recent_evaluations,
        CASE 
          WHEN AVG(ev.overall_rating) >= 4.0 THEN 'Excellent'
          WHEN AVG(ev.overall_rating) >= 3.5 THEN 'Good'
          WHEN AVG(ev.overall_rating) >= 3.0 THEN 'Average'
          ELSE 'Needs Improvement'
        END as performance_category
      FROM employee_evaluations ev
      JOIN employees e ON ev.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE ev.evaluation_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY d.id, d.name
      HAVING COUNT(ev.id) >= 3  -- Only departments with sufficient data
      ORDER BY current_avg_rating DESC
    `;
    
    const deptPerformanceResult = await pool.query(deptPerformanceQuery);
    
    res.json({
      performanceTrend: performanceTrendResult.rows,
      departmentPerformance: deptPerformanceResult.rows
    });
  } catch (error) {
    console.error('Error fetching performance predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// COST ANALYTICS

// Get cost per employee analysis
router.get('/costs/per-employee', authenticateToken, requireAnyRole('admin', 'hr'), async (req, res) => {
  try {
    const { start_date, end_date, departments } = req.query;
    
    // Cost per employee by department
    const costPerEmployeeQuery = `
      SELECT 
        d.name as department_name,
        COUNT(DISTINCT e.id) as employee_count,
        COALESCE(SUM(e.base_salary), 0) as total_salaries,
        COALESCE(SUM(tr.cost), 0) as training_costs,
        COALESCE(asset_costs.total_cost, 0) as asset_costs,
        (COALESCE(SUM(e.base_salary), 0) + COALESCE(SUM(tr.cost), 0) + COALESCE(asset_costs.total_cost, 0)) as total_cost,
        ROUND(
          (COALESCE(SUM(e.base_salary), 0) + COALESCE(SUM(tr.cost), 0) + COALESCE(asset_costs.total_cost, 0)) / 
          NULLIF(COUNT(DISTINCT e.id), 0), 2
        ) as cost_per_employee
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN training_records tr ON e.id = tr.employee_id 
        AND tr.completion_date BETWEEN $1 AND $2
        AND tr.cost > 0
      LEFT JOIN (
        SELECT 
          a.assigned_to as employee_id,
          SUM(a.purchase_cost) as total_cost
        FROM assets a
        WHERE a.assigned_to IS NOT NULL
          AND a.purchase_date BETWEEN $1 AND $2
        GROUP BY a.assigned_to
      ) asset_costs ON e.id = asset_costs.employee_id
      WHERE e.employment_status = 'active'
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY d.id, d.name, asset_costs.total_cost
      ORDER BY cost_per_employee DESC
    `;
    
    const costParams = [start_date, end_date];
    if (departments) {
      costParams.push(departments);
    }
    
    const costPerEmployeeResult = await pool.query(costPerEmployeeQuery, costParams);
    
    // ROI analysis (simplified - based on performance vs cost)
    const roiAnalysisQuery = `
      SELECT 
        d.name as department_name,
        AVG(ev.overall_rating) as avg_performance,
        AVG(e.base_salary) as avg_salary,
        ROUND(
          AVG(ev.overall_rating) / (AVG(e.base_salary) / 50000) * 100, 2
        ) as performance_to_cost_ratio
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_evaluations ev ON e.id = ev.employee_id
        AND ev.evaluation_date >= CURRENT_DATE - INTERVAL '1 year'
      WHERE e.employment_status = 'active'
        AND e.base_salary > 0
        ${departments ? 'AND e.department_id = ANY($3)' : ''}
      GROUP BY d.id, d.name
      HAVING AVG(ev.overall_rating) IS NOT NULL
      ORDER BY performance_to_cost_ratio DESC
    `;
    
    const roiAnalysisResult = await pool.query(roiAnalysisQuery, departments ? [start_date, end_date, departments] : [start_date, end_date]);
    
    res.json({
      costPerEmployee: costPerEmployeeResult.rows,
      roiAnalysis: roiAnalysisResult.rows
    });
  } catch (error) {
    console.error('Error fetching cost analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive organizational dashboard
router.get('/dashboard/executive', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Key metrics summary
    const keyMetricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM employees WHERE employment_status = 'active') as active_employees,
        (SELECT COUNT(*) FROM departments WHERE active = true) as active_departments,
        (SELECT COUNT(*) FROM assets WHERE status != 'retired') as active_assets,
        (SELECT COUNT(*) FROM compliance_tracking WHERE status = 'compliant') as compliant_items,
        (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('resolved', 'closed')) as open_incidents,
        (SELECT AVG(overall_rating) FROM employee_evaluations WHERE evaluation_date >= CURRENT_DATE - INTERVAL '1 year') as avg_performance
    `;
    
    const keyMetricsResult = await pool.query(keyMetricsQuery);
    
    // Recent trends (last 30 days vs previous 30 days)
    const trendsQuery = `
      SELECT 
        'employees' as metric,
        (SELECT COUNT(*) FROM employees WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days') as current_period,
        (SELECT COUNT(*) FROM employees WHERE hire_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days') as previous_period
      UNION ALL
      SELECT 
        'incidents' as metric,
        (SELECT COUNT(*) FROM incidents WHERE incident_date >= CURRENT_DATE - INTERVAL '30 days') as current_period,
        (SELECT COUNT(*) FROM incidents WHERE incident_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days') as previous_period
      UNION ALL
      SELECT 
        'communications' as metric,
        (SELECT COUNT(*) FROM internal_communications WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as current_period,
        (SELECT COUNT(*) FROM internal_communications WHERE created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days') as previous_period
    `;
    
    const trendsResult = await pool.query(trendsQuery);
    
    // Department health overview
    const deptHealthQuery = `
      SELECT 
        d.name as department_name,
        COUNT(e.id) as employee_count,
        AVG(ev.overall_rating) as avg_performance,
        COUNT(i.id) as incident_count,
        COUNT(ct.id) FILTER (WHERE ct.status != 'compliant') as compliance_issues
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.employment_status = 'active'
      LEFT JOIN employee_evaluations ev ON e.id = ev.employee_id 
        AND ev.evaluation_date >= CURRENT_DATE - INTERVAL '1 year'
      LEFT JOIN incidents i ON d.id IN (
        SELECT DISTINCT emp.department_id 
        FROM employees emp 
        WHERE emp.id = i.reported_by
      ) AND i.incident_date >= CURRENT_DATE - INTERVAL '6 months'
      LEFT JOIN compliance_tracking ct ON d.id = ct.responsible_department
      WHERE d.active = true
      GROUP BY d.id, d.name
      ORDER BY employee_count DESC
    `;
    
    const deptHealthResult = await pool.query(deptHealthQuery);
    
    res.json({
      keyMetrics: keyMetricsResult.rows[0],
      trends: trendsResult.rows,
      departmentHealth: deptHealthResult.rows
    });
  } catch (error) {
    console.error('Error fetching executive dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;