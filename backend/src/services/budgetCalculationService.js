const db = require('../config/database');

/**
 * Budget calculation and management service
 */
class BudgetCalculationService {
  /**
   * Update budget amounts based on financial transactions
   */
  async updateBudgetAmounts(budgetId) {
    try {
      const budget = await db('budgets').where('id', budgetId).first();
      if (!budget) {
        throw new Error('Budget not found');
      }

      // Calculate actual spent from posted transactions
      const [{ actual_spent }] = await db('financial_transactions')
        .where('budget_id', budgetId)
        .where('status', 'posted')
        .sum('amount as actual_spent');

      // Calculate committed amount from approved/pending transactions
      const [{ committed_amount }] = await db('financial_transactions')
        .where('budget_id', budgetId)
        .whereIn('status', ['approved', 'pending_approval'])
        .sum('amount as committed_amount');

      // Update budget with calculated amounts
      const [updatedBudget] = await db('budgets')
        .where('id', budgetId)
        .update({
          actual_spent: parseFloat(actual_spent) || 0,
          committed_amount: parseFloat(committed_amount) || 0,
          updated_at: db.fn.now()
        })
        .returning('*');

      // Check for budget alerts
      await this.checkBudgetAlerts(budgetId);

      return updatedBudget;
    } catch (error) {
      console.error('Budget amount update error:', error);
      throw error;
    }
  }

  /**
   * Check for budget alerts and create them if needed
   */
  async checkBudgetAlerts(budgetId) {
    try {
      const budget = await db('budgets as b')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('b.id', budgetId)
        .select('b.*', 'bc.name as category_name')
        .first();

      if (!budget) return;

      const allocated = parseFloat(budget.allocated_amount) || 0;
      const spent = parseFloat(budget.actual_spent) || 0;
      const committed = parseFloat(budget.committed_amount) || 0;
      const totalUsed = spent + committed;
      const available = allocated - totalUsed;
      const utilizationRate = allocated > 0 ? (totalUsed / allocated) * 100 : 0;

      const alerts = [];

      // Overspend alerts
      if (spent > allocated) {
        const overspendAmount = spent - allocated;
        const overspendPercentage = allocated > 0 ? (overspendAmount / allocated) * 100 : 0;
        
        alerts.push({
          alert_type: overspendPercentage > 25 ? 'overspend_critical' : 'overspend_warning',
          title: `${budget.category_name} Budget Overspend`,
          message: `Budget exceeded by $${overspendAmount.toFixed(2)} (${overspendPercentage.toFixed(1)}%)`,
          threshold_value: allocated,
          current_value: spent,
          variance_percentage: overspendPercentage,
          severity: overspendPercentage > 25 ? 'critical' : 'high'
        });
      }

      // High utilization warning
      if (utilizationRate > 90 && spent <= allocated) {
        alerts.push({
          alert_type: 'overspend_warning',
          title: `${budget.category_name} Budget Nearly Exhausted`,
          message: `Budget is ${utilizationRate.toFixed(1)}% utilized with $${available.toFixed(2)} remaining`,
          threshold_value: allocated * 0.9,
          current_value: totalUsed,
          variance_percentage: utilizationRate,
          severity: utilizationRate > 95 ? 'high' : 'medium'
        });
      }

      // Underutilization alert (if period is >75% complete)
      const budgetPeriod = await db('budget_periods').where('id', budget.budget_period_id).first();
      if (budgetPeriod) {
        const periodStart = new Date(budgetPeriod.start_date);
        const periodEnd = new Date(budgetPeriod.end_date);
        const now = new Date();
        const periodProgress = (now - periodStart) / (periodEnd - periodStart);

        if (periodProgress > 0.75 && utilizationRate < 25) {
          alerts.push({
            alert_type: 'underspend_warning',
            title: `${budget.category_name} Budget Underutilized`,
            message: `Only ${utilizationRate.toFixed(1)}% of budget used with ${((1 - periodProgress) * 100).toFixed(0)}% of period remaining`,
            threshold_value: allocated * 0.5,
            current_value: totalUsed,
            variance_percentage: utilizationRate,
            severity: 'low'
          });
        }
      }

      // Parse variance rules if they exist
      if (budget.variance_rules) {
        const rules = typeof budget.variance_rules === 'string' 
          ? JSON.parse(budget.variance_rules) 
          : budget.variance_rules;
        
        // Custom alert thresholds
        if (rules.warning_threshold && utilizationRate > rules.warning_threshold) {
          alerts.push({
            alert_type: 'forecast_variance',
            title: `${budget.category_name} Custom Threshold Exceeded`,
            message: `Budget utilization (${utilizationRate.toFixed(1)}%) exceeded custom warning threshold (${rules.warning_threshold}%)`,
            threshold_value: allocated * (rules.warning_threshold / 100),
            current_value: totalUsed,
            variance_percentage: utilizationRate,
            severity: rules.severity || 'medium'
          });
        }
      }

      // Insert new alerts
      for (const alert of alerts) {
        await db('budget_alerts')
          .insert({
            organization_id: budget.organization_id,
            budget_id: budgetId,
            ...alert
          })
          .onConflict(['budget_id', 'alert_type'])
          .merge(['message', 'current_value', 'variance_percentage', 'created_at']);
      }

    } catch (error) {
      console.error('Budget alert check error:', error);
      // Don't throw - alerts are not critical
    }
  }

  /**
   * Calculate budget performance metrics
   */
  async calculateBudgetPerformance(organizationId, budgetPeriodId = null) {
    try {
      let query = db('budgets as b')
        .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('b.organization_id', organizationId);

      if (budgetPeriodId) {
        query = query.where('b.budget_period_id', budgetPeriodId);
      }

      const budgets = await query.select(
        'b.*',
        'bp.name as period_name',
        'bc.name as category_name',
        'bc.category_type'
      );

      const performance = {
        summary: {
          total_budgets: budgets.length,
          total_allocated: 0,
          total_spent: 0,
          total_committed: 0,
          total_available: 0,
          average_utilization: 0,
          budgets_over: 0,
          budgets_under_utilized: 0
        },
        by_category: {},
        by_budget: []
      };

      const utilizationRates = [];

      for (const budget of budgets) {
        const allocated = parseFloat(budget.allocated_amount) || 0;
        const spent = parseFloat(budget.actual_spent) || 0;
        const committed = parseFloat(budget.committed_amount) || 0;
        const available = allocated - spent - committed;
        const utilizationRate = allocated > 0 ? ((spent + committed) / allocated) * 100 : 0;

        // Update summary
        performance.summary.total_allocated += allocated;
        performance.summary.total_spent += spent;
        performance.summary.total_committed += committed;
        performance.summary.total_available += available;

        if (spent > allocated) performance.summary.budgets_over++;
        if (utilizationRate < 25) performance.summary.budgets_under_utilized++;

        utilizationRates.push(utilizationRate);

        // Category performance
        if (!performance.by_category[budget.category_type]) {
          performance.by_category[budget.category_type] = {
            category_type: budget.category_type,
            total_allocated: 0,
            total_spent: 0,
            total_committed: 0,
            budget_count: 0,
            average_utilization: 0
          };
        }

        const categoryPerf = performance.by_category[budget.category_type];
        categoryPerf.total_allocated += allocated;
        categoryPerf.total_spent += spent;
        categoryPerf.total_committed += committed;
        categoryPerf.budget_count++;

        // Budget performance
        performance.by_budget.push({
          budget_id: budget.id,
          budget_name: budget.name,
          category_name: budget.category_name,
          category_type: budget.category_type,
          allocated_amount: allocated,
          actual_spent: spent,
          committed_amount: committed,
          available_amount: available,
          utilization_rate: Math.round(utilizationRate * 100) / 100,
          variance_amount: spent - allocated,
          variance_percentage: allocated > 0 ? Math.round(((spent - allocated) / allocated) * 100 * 100) / 100 : 0,
          status: spent > allocated ? 'over_budget' : utilizationRate > 90 ? 'nearly_exhausted' : utilizationRate < 25 ? 'under_utilized' : 'on_track'
        });
      }

      // Calculate averages
      if (budgets.length > 0) {
        performance.summary.average_utilization = 
          Math.round((utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length) * 100) / 100;
      }

      // Calculate category averages
      Object.values(performance.by_category).forEach(category => {
        if (category.total_allocated > 0) {
          category.average_utilization = 
            Math.round(((category.total_spent + category.total_committed) / category.total_allocated) * 100 * 100) / 100;
        }
      });

      return performance;
    } catch (error) {
      console.error('Budget performance calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate cash flow forecast based on budgets and historical data
   */
  async calculateCashFlowForecast(organizationId, budgetPeriodId, monthsAhead = 6) {
    try {
      const budgetPeriod = await db('budget_periods')
        .where('id', budgetPeriodId)
        .where('organization_id', organizationId)
        .first();

      if (!budgetPeriod) {
        throw new Error('Budget period not found');
      }

      const budgets = await db('budgets as b')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('b.budget_period_id', budgetPeriodId)
        .where('b.organization_id', organizationId)
        .select('b.*', 'bc.category_type', 'bc.name as category_name');

      const forecast = [];
      const startDate = new Date();
      
      for (let i = 0; i < monthsAhead; i++) {
        const forecastDate = new Date(startDate);
        forecastDate.setMonth(forecastDate.getMonth() + i);
        
        const year = forecastDate.getFullYear();
        const month = forecastDate.getMonth() + 1;

        let projectedIncome = 0;
        let projectedExpenses = 0;
        let projectedPayroll = 0;

        // Get existing allocation for this month if it exists
        const existingForecast = await db('cash_flow_forecasts')
          .where('organization_id', organizationId)
          .where('budget_period_id', budgetPeriodId)
          .where('forecast_year', year)
          .where('forecast_month', month)
          .first();

        if (existingForecast) {
          projectedIncome = parseFloat(existingForecast.projected_income) || 0;
          projectedExpenses = parseFloat(existingForecast.projected_expenses) || 0;
          projectedPayroll = parseFloat(existingForecast.projected_payroll) || 0;
        } else {
          // Calculate projected amounts based on budgets and historical patterns
          for (const budget of budgets) {
            const monthlyAllocation = await db('budget_allocations')
              .where('budget_id', budget.id)
              .where('allocation_year', year)
              .where('allocation_month', month)
              .first();

            let monthlyAmount = 0;
            if (monthlyAllocation) {
              monthlyAmount = parseFloat(monthlyAllocation.allocated_amount) || 0;
            } else {
              // Distribute evenly across remaining months if no specific allocation
              const remainingBudget = parseFloat(budget.allocated_amount) - parseFloat(budget.actual_spent) - parseFloat(budget.committed_amount);
              monthlyAmount = Math.max(0, remainingBudget / monthsAhead);
            }

            // Categorize by type
            if (budget.category_type === 'revenue') {
              projectedIncome += monthlyAmount;
            } else if (budget.category_type === 'payroll') {
              projectedPayroll += monthlyAmount;
            } else {
              projectedExpenses += monthlyAmount;
            }
          }

          // Apply seasonal adjustments based on historical data
          const seasonalAdjustment = await this.getSeasonalAdjustment(organizationId, month);
          projectedExpenses *= seasonalAdjustment.expenses;
          projectedPayroll *= seasonalAdjustment.payroll;
          projectedIncome *= seasonalAdjustment.income;
        }

        const netCashFlow = projectedIncome - projectedExpenses - projectedPayroll;
        
        forecast.push({
          year,
          month,
          month_name: forecastDate.toLocaleString('default', { month: 'long' }),
          projected_income: Math.round(projectedIncome * 100) / 100,
          projected_expenses: Math.round(projectedExpenses * 100) / 100,
          projected_payroll: Math.round(projectedPayroll * 100) / 100,
          net_cash_flow: Math.round(netCashFlow * 100) / 100,
          confidence_score: existingForecast ? 0.9 : 0.6
        });
      }

      // Calculate running balance
      let runningBalance = 0;
      forecast.forEach(month => {
        runningBalance += month.net_cash_flow;
        month.running_balance = Math.round(runningBalance * 100) / 100;
      });

      // Store forecast in database
      for (const month of forecast) {
        await db('cash_flow_forecasts')
          .insert({
            organization_id: organizationId,
            budget_period_id: budgetPeriodId,
            forecast_year: month.year,
            forecast_month: month.month,
            projected_income: month.projected_income,
            projected_expenses: month.projected_expenses,
            projected_payroll: month.projected_payroll,
            running_balance: month.running_balance,
            confidence_score: month.confidence_score,
            assumptions: JSON.stringify({
              based_on: 'budget_allocations',
              seasonal_adjustment: true,
              generated_at: new Date()
            })
          })
          .onConflict(['budget_period_id', 'forecast_year', 'forecast_month'])
          .merge();
      }

      return {
        forecast,
        summary: {
          total_projected_income: forecast.reduce((sum, m) => sum + m.projected_income, 0),
          total_projected_expenses: forecast.reduce((sum, m) => sum + m.projected_expenses, 0),
          total_projected_payroll: forecast.reduce((sum, m) => sum + m.projected_payroll, 0),
          net_projected_flow: forecast.reduce((sum, m) => sum + m.net_cash_flow, 0),
          final_balance: runningBalance,
          months_forecasted: monthsAhead
        }
      };
    } catch (error) {
      console.error('Cash flow forecast calculation error:', error);
      throw error;
    }
  }

  /**
   * Get seasonal adjustment factors based on historical data
   */
  async getSeasonalAdjustment(organizationId, targetMonth) {
    try {
      // Get historical data for the same month across multiple years
      const historicalData = await db('financial_transactions')
        .where('organization_id', organizationId)
        .where('status', 'posted')
        .whereRaw('EXTRACT(MONTH FROM transaction_date) = ?', [targetMonth])
        .where('transaction_date', '>=', db.raw("CURRENT_DATE - INTERVAL '3 years'"))
        .select(
          db.raw('EXTRACT(YEAR FROM transaction_date) as year'),
          db.raw('SUM(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as income'),
          db.raw('SUM(CASE WHEN transaction_type = \'expense\' THEN amount ELSE 0 END) as expenses'),
          db.raw('SUM(CASE WHEN transaction_type = \'payroll\' THEN amount ELSE 0 END) as payroll')
        )
        .groupBy('year')
        .having(db.raw('COUNT(*) > 0'));

      if (historicalData.length < 2) {
        // Not enough data, return neutral adjustments
        return { income: 1.0, expenses: 1.0, payroll: 1.0 };
      }

      // Calculate averages for this month vs. overall averages
      const monthAverages = {
        income: historicalData.reduce((sum, row) => sum + parseFloat(row.income), 0) / historicalData.length,
        expenses: historicalData.reduce((sum, row) => sum + parseFloat(row.expenses), 0) / historicalData.length,
        payroll: historicalData.reduce((sum, row) => sum + parseFloat(row.payroll), 0) / historicalData.length
      };

      // Get overall monthly averages
      const overallAverages = await db('financial_transactions')
        .where('organization_id', organizationId)
        .where('status', 'posted')
        .where('transaction_date', '>=', db.raw("CURRENT_DATE - INTERVAL '3 years'"))
        .select(
          db.raw('AVG(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as avg_income'),
          db.raw('AVG(CASE WHEN transaction_type = \'expense\' THEN amount ELSE 0 END) as avg_expenses'),
          db.raw('AVG(CASE WHEN transaction_type = \'payroll\' THEN amount ELSE 0 END) as avg_payroll')
        )
        .first();

      // Calculate adjustment factors (capped between 0.5 and 2.0)
      const adjustments = {
        income: Math.max(0.5, Math.min(2.0, 
          overallAverages.avg_income > 0 ? monthAverages.income / parseFloat(overallAverages.avg_income) : 1.0)),
        expenses: Math.max(0.5, Math.min(2.0, 
          overallAverages.avg_expenses > 0 ? monthAverages.expenses / parseFloat(overallAverages.avg_expenses) : 1.0)),
        payroll: Math.max(0.5, Math.min(2.0, 
          overallAverages.avg_payroll > 0 ? monthAverages.payroll / parseFloat(overallAverages.avg_payroll) : 1.0))
      };

      return adjustments;
    } catch (error) {
      console.error('Seasonal adjustment calculation error:', error);
      // Return neutral adjustments on error
      return { income: 1.0, expenses: 1.0, payroll: 1.0 };
    }
  }

  /**
   * Update all budget amounts for an organization
   */
  async updateAllBudgetAmounts(organizationId) {
    try {
      const budgets = await db('budgets')
        .where('organization_id', organizationId)
        .select('id');

      const updatePromises = budgets.map(budget => 
        this.updateBudgetAmounts(budget.id)
      );

      await Promise.all(updatePromises);

      return { updated_budgets: budgets.length };
    } catch (error) {
      console.error('Bulk budget update error:', error);
      throw error;
    }
  }

  /**
   * Calculate budget efficiency score
   */
  async calculateBudgetEfficiency(budgetId) {
    try {
      const budget = await db('budgets').where('id', budgetId).first();
      if (!budget) {
        throw new Error('Budget not found');
      }

      const allocated = parseFloat(budget.allocated_amount) || 0;
      const spent = parseFloat(budget.actual_spent) || 0;
      const committed = parseFloat(budget.committed_amount) || 0;

      if (allocated === 0) {
        return { efficiency_score: 0, analysis: 'No budget allocated' };
      }

      const utilizationRate = (spent + committed) / allocated;
      const overspendPenalty = Math.max(0, spent - allocated) / allocated;
      const underutilizationPenalty = Math.max(0, 0.25 - utilizationRate);

      // Score from 0-100, optimal range is 75-95% utilization
      let score = 100;
      
      // Penalize overspending heavily
      score -= overspendPenalty * 200;
      
      // Penalize underutilization moderately
      score -= underutilizationPenalty * 100;
      
      // Bonus for optimal utilization (75-95%)
      if (utilizationRate >= 0.75 && utilizationRate <= 0.95) {
        score += 10;
      }

      score = Math.max(0, Math.min(100, score));

      let analysis = 'Good budget management';
      if (overspendPenalty > 0) {
        analysis = 'Budget overspent - requires attention';
      } else if (utilizationRate < 0.25) {
        analysis = 'Significant underutilization - consider reallocation';
      } else if (utilizationRate < 0.5) {
        analysis = 'Moderate underutilization';
      } else if (utilizationRate > 0.95) {
        analysis = 'Nearly fully utilized - monitor closely';
      }

      return {
        efficiency_score: Math.round(score * 100) / 100,
        utilization_rate: Math.round(utilizationRate * 100 * 100) / 100,
        analysis,
        recommendations: this.getBudgetRecommendations(utilizationRate, overspendPenalty > 0)
      };
    } catch (error) {
      console.error('Budget efficiency calculation error:', error);
      throw error;
    }
  }

  /**
   * Get budget recommendations based on utilization
   */
  getBudgetRecommendations(utilizationRate, isOverspent) {
    const recommendations = [];

    if (isOverspent) {
      recommendations.push('Implement spending controls');
      recommendations.push('Review and approve large expenditures');
      recommendations.push('Consider budget reallocation from other categories');
    } else if (utilizationRate < 0.25) {
      recommendations.push('Consider reallocating budget to higher-need categories');
      recommendations.push('Review if budget amount is appropriate');
      recommendations.push('Identify opportunities to utilize remaining budget');
    } else if (utilizationRate < 0.5) {
      recommendations.push('Monitor spending pace');
      recommendations.push('Plan for remaining budget utilization');
    } else if (utilizationRate > 0.95) {
      recommendations.push('Monitor closely for potential overspend');
      recommendations.push('Implement approval controls for remaining spending');
      recommendations.push('Consider requesting budget increase if needed');
    } else {
      recommendations.push('Continue current budget management practices');
      recommendations.push('Monitor utilization rate regularly');
    }

    return recommendations;
  }
}

module.exports = new BudgetCalculationService();