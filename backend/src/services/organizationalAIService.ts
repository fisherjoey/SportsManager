// @ts-nocheck

import { OpenAI  } from 'openai';
import { Pool  } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize DeepSeek AI if API key is available
let openai = null;
if (process.env.DEEPSEEK_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1'
  });
}

class OrganizationalAIService {
  /**
   * Analyze employee performance patterns and provide insights
   */
  static async analyzeEmployeePerformance(employeeId, options = {}) {
    try {
      // Get comprehensive employee data
      const employeeData = await this.getEmployeeAnalysisData(employeeId);
      
      if (!employeeData) {
        throw new Error('Employee not found');
      }

      const analysis = {
        employeeId,
        analysisDate: new Date(),
        insights: [],
        recommendations: [],
        riskFactors: [],
        strengths: []
      };

      // Analyze performance trends
      if (employeeData.evaluations.length >= 2) {
        const performanceTrend = this.analyzePerformanceTrend(employeeData.evaluations);
        analysis.insights.push({
          type: 'performance_trend',
          title: 'Performance Trend Analysis',
          content: performanceTrend.summary,
          trend: performanceTrend.trend,
          confidence: performanceTrend.confidence
        });

        if (performanceTrend.trend === 'declining') {
          analysis.riskFactors.push('Declining performance trend over recent evaluations');
          analysis.recommendations.push('Schedule performance improvement plan discussion');
        } else if (performanceTrend.trend === 'improving') {
          analysis.strengths.push('Consistent performance improvement');
        }
      }

      // Analyze training completion patterns
      const trainingAnalysis = this.analyzeTrainingPatterns(employeeData.training);
      analysis.insights.push({
        type: 'training_analysis',
        title: 'Learning & Development Analysis',
        content: trainingAnalysis.summary,
        completionRate: trainingAnalysis.completionRate,
        avgTimeToComplete: trainingAnalysis.avgTimeToComplete
      });

      if (trainingAnalysis.completionRate < 0.7) {
        analysis.riskFactors.push('Low training completion rate');
        analysis.recommendations.push('Review training assignments and provide additional support');
      }

      // Analyze tenure and engagement
      const tenureAnalysis = this.analyzeTenureAndEngagement(employeeData);
      analysis.insights.push(tenureAnalysis);

      // Use AI for advanced insights if available
      if (openai && options.useAI) {
        const aiInsights = await this.generateAIInsights(employeeData);
        analysis.aiInsights = aiInsights;
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing employee performance:', error);
      throw error;
    }
  }

  /**
   * Predict employee turnover risk
   */
  static async predictTurnoverRisk(employeeId) {
    try {
      const employeeData = await this.getEmployeeAnalysisData(employeeId);
      
      if (!employeeData) {
        throw new Error('Employee not found');
      }

      let riskScore = 0;
      const riskFactors = [];
      const protectiveFactors = [];

      // Tenure factor
      const tenureMonths = this.calculateTenureMonths(employeeData.hire_date);
      if (tenureMonths < 6) {
        riskScore += 30;
        riskFactors.push('New employee (< 6 months tenure)');
      } else if (tenureMonths > 24) {
        riskScore -= 10;
        protectiveFactors.push('Established employee (> 2 years tenure)');
      }

      // Performance factor
      const recentPerformance = employeeData.evaluations
        .filter(evaluation => new Date(evaluation.evaluation_date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
        .sort((a, b) => new Date(b.evaluation_date) - new Date(a.evaluation_date))[0];

      if (recentPerformance) {
        if (recentPerformance.overall_rating <= 2) {
          riskScore += 25;
          riskFactors.push('Low performance rating');
        } else if (recentPerformance.overall_rating >= 4) {
          riskScore -= 15;
          protectiveFactors.push('High performance rating');
        }
      }

      // Training engagement factor
      const recentTraining = employeeData.training.filter(
        t => new Date(t.created_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      );
      
      if (recentTraining.length === 0) {
        riskScore += 15;
        riskFactors.push('No recent training participation');
      } else {
        const completedTraining = recentTraining.filter(t => t.status === 'completed');
        const completionRate = completedTraining.length / recentTraining.length;
        
        if (completionRate < 0.5) {
          riskScore += 20;
          riskFactors.push('Low training completion rate');
        } else if (completionRate > 0.8) {
          riskScore -= 10;
          protectiveFactors.push('High training engagement');
        }
      }

      // Manager relationship (if available)
      if (employeeData.manager_id) {
        protectiveFactors.push('Has assigned manager/mentor');
        riskScore -= 5;
      }

      // Salary competitiveness (simplified check)
      if (employeeData.base_salary && employeeData.position_min_salary && employeeData.position_max_salary) {
        const salaryRatio = (employeeData.base_salary - employeeData.position_min_salary) / 
                           (employeeData.position_max_salary - employeeData.position_min_salary);
        
        if (salaryRatio < 0.3) {
          riskScore += 20;
          riskFactors.push('Below-market compensation');
        } else if (salaryRatio > 0.7) {
          riskScore -= 5;
          protectiveFactors.push('Competitive compensation');
        }
      }

      // Normalize risk score to 0-100 scale
      riskScore = Math.max(0, Math.min(100, riskScore + 50));

      let riskLevel;
      if (riskScore >= 80) {
        riskLevel = 'Very High';
      } else if (riskScore >= 65) {
        riskLevel = 'High';
      } else if (riskScore >= 45) {
        riskLevel = 'Medium';
      } else if (riskScore >= 25) {
        riskLevel = 'Low';
      } else {
        riskLevel = 'Very Low';
      }

      return {
        employeeId,
        riskScore,
        riskLevel,
        riskFactors,
        protectiveFactors,
        recommendations: this.generateRetentionRecommendations(riskLevel, riskFactors),
        analysisDate: new Date()
      };
    } catch (error) {
      console.error('Error predicting turnover risk:', error);
      throw error;
    }
  }

  /**
   * Analyze document usage patterns and provide insights
   */
  static async analyzeDocumentIntelligence(documentId) {
    try {
      const query = `
        SELECT 
          d.*,
          COUNT(da.id) as access_count,
          COUNT(DISTINCT da.user_id) as unique_users,
          COUNT(dack.id) as acknowledgment_count,
          AVG(EXTRACT(EPOCH FROM (da.accessed_at - d.created_at))/86400) as avg_days_to_access
        FROM documents d
        LEFT JOIN document_access da ON d.id = da.document_id
        LEFT JOIN document_acknowledgments dack ON d.id = dack.document_id
        WHERE d.id = $1
        GROUP BY d.id
      `;

      const result = await pool.query(query, [documentId]);
      
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      const docData = result.rows[0];
      const analysis = {
        documentId,
        analysisDate: new Date(),
        insights: []
      };

      // Usage analysis
      if (docData.access_count > 0) {
        analysis.insights.push({
          type: 'usage_statistics',
          title: 'Document Usage Analysis',
          accessCount: parseInt(docData.access_count),
          uniqueUsers: parseInt(docData.unique_users),
          acknowledgmentRate: docData.requires_acknowledgment ? 
            (parseInt(docData.acknowledgment_count) / parseInt(docData.unique_users) * 100) : null
        });

        // Engagement analysis
        const avgDaysToAccess = parseFloat(docData.avg_days_to_access);
        if (avgDaysToAccess > 30) {
          analysis.insights.push({
            type: 'engagement_concern',
            title: 'Low Engagement Alert',
            content: `Document takes an average of ${  Math.round(avgDaysToAccess)  } days to be accessed after creation`
          });
        }
      }

      // Category-based recommendations
      const categoryInsights = this.generateDocumentCategoryInsights(docData.category, docData);
      analysis.insights.push(...categoryInsights);

      return analysis;
    } catch (error) {
      console.error('Error analyzing document intelligence:', error);
      throw error;
    }
  }

  /**
   * Generate organizational health recommendations
   */
  static async generateHealthRecommendations(departmentId = null) {
    try {
      const recommendations = {
        immediate: [],
        shortTerm: [],
        longTerm: [],
        analysisDate: new Date()
      };

      // Get organizational metrics
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT e.id) as employee_count,
          AVG(ev.overall_rating) as avg_performance,
          COUNT(i.id) as incident_count,
          COUNT(ct.id) FILTER (WHERE ct.status != 'compliant') as compliance_issues,
          COUNT(ra.id) FILTER (WHERE ra.risk_level IN ('high', 'critical')) as high_risks
        FROM employees e
        LEFT JOIN employee_evaluations ev ON e.id = ev.employee_id 
          AND ev.evaluation_date >= CURRENT_DATE - INTERVAL '1 year'
        LEFT JOIN incidents i ON e.id = i.reported_by 
          AND i.incident_date >= CURRENT_DATE - INTERVAL '6 months'
        LEFT JOIN compliance_tracking ct ON e.department_id = ct.responsible_department
        LEFT JOIN risk_assessments ra ON e.department_id = ra.owner_department
        WHERE e.employment_status = 'active'
          ${departmentId ? 'AND e.department_id = $1' : ''}
      `;

      const metricsResult = await pool.query(
        metricsQuery, 
        departmentId ? [departmentId] : []
      );
      
      const metrics = metricsResult.rows[0];

      // Analyze and generate recommendations
      if (parseInt(metrics.compliance_issues) > 0) {
        recommendations.immediate.push({
          priority: 'high',
          title: 'Address Compliance Issues',
          description: `${metrics.compliance_issues} compliance items require immediate attention`,
          action: 'Review and resolve non-compliant items'
        });
      }

      if (parseInt(metrics.high_risks) > 0) {
        recommendations.immediate.push({
          priority: 'high',
          title: 'Mitigate High-Risk Items',
          description: `${metrics.high_risks} high or critical risk items identified`,
          action: 'Implement risk mitigation strategies'
        });
      }

      if (parseFloat(metrics.avg_performance) < 3.0) {
        recommendations.shortTerm.push({
          priority: 'medium',
          title: 'Improve Performance Management',
          description: 'Average performance rating is below expectations',
          action: 'Implement performance improvement programs'
        });
      }

      if (parseInt(metrics.incident_count) > parseInt(metrics.employee_count) * 0.1) {
        recommendations.shortTerm.push({
          priority: 'medium',
          title: 'Reduce Incident Rate',
          description: 'High incident rate compared to employee count',
          action: 'Review safety procedures and training programs'
        });
      }

      // Long-term strategic recommendations
      recommendations.longTerm.push({
        priority: 'low',
        title: 'Implement Predictive Analytics',
        description: 'Use data-driven insights for proactive management',
        action: 'Establish regular analytics review cycles'
      });

      return recommendations;
    } catch (error) {
      console.error('Error generating health recommendations:', error);
      throw error;
    }
  }

  // Helper methods

  static async getEmployeeAnalysisData(employeeId) {
    const query = `
      SELECT 
        e.*,
        u.name as employee_name,
        u.email,
        d.name as department_name,
        jp.title as position_title,
        jp.min_salary as position_min_salary,
        jp.max_salary as position_max_salary,
        m.employee_id as manager_employee_id
      FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN departments d ON e.department_id = d.id
      JOIN job_positions jp ON e.position_id = jp.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = $1
    `;

    const employeeResult = await pool.query(query, [employeeId]);
    
    if (employeeResult.rows.length === 0) {
      return null;
    }

    const employee = employeeResult.rows[0];

    // Get evaluations
    const evaluationsQuery = `
      SELECT * FROM employee_evaluations
      WHERE employee_id = $1
      ORDER BY evaluation_date DESC
    `;
    const evaluationsResult = await pool.query(evaluationsQuery, [employeeId]);

    // Get training records
    const trainingQuery = `
      SELECT * FROM training_records
      WHERE employee_id = $1
      ORDER BY created_at DESC
    `;
    const trainingResult = await pool.query(trainingQuery, [employeeId]);

    return {
      ...employee,
      evaluations: evaluationsResult.rows,
      training: trainingResult.rows
    };
  }

  static analyzePerformanceTrend(evaluations) {
    if (evaluations.length < 2) {
      return {
        trend: 'insufficient_data',
        summary: 'Not enough evaluation data to determine trend',
        confidence: 0
      };
    }

    const sortedEvals = evaluations.sort((a, b) => new Date(a.evaluation_date) - new Date(b.evaluation_date));
    const ratings = sortedEvals.map(e => e.overall_rating).filter(r => r !== null);
    
    if (ratings.length < 2) {
      return {
        trend: 'insufficient_data',
        summary: 'No rating data available',
        confidence: 0
      };
    }

    // Simple linear trend analysis
    const firstHalf = ratings.slice(0, Math.ceil(ratings.length / 2));
    const secondHalf = ratings.slice(Math.floor(ratings.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    const confidence = Math.min(1, ratings.length / 5); // Higher confidence with more data points

    let trend;
    if (difference > 0.5) {
      trend = 'improving';
    } else if (difference < -0.5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      summary: `Performance trend is ${trend} with a ${Math.abs(difference).toFixed(1)} point change`,
      confidence: Math.round(confidence * 100)
    };
  }

  static analyzeTrainingPatterns(trainingRecords) {
    const completedTraining = trainingRecords.filter(t => t.status === 'completed');
    const completionRate = trainingRecords.length > 0 ? completedTraining.length / trainingRecords.length : 0;
    
    // Calculate average time to complete
    const completionTimes = completedTraining
      .filter(t => t.completion_date && t.created_at)
      .map(t => {
        const created = new Date(t.created_at);
        const completed = new Date(t.completion_date);
        return (completed - created) / (1000 * 60 * 60 * 24); // days
      });
    
    const avgTimeToComplete = completionTimes.length > 0 
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
      : null;

    return {
      completionRate,
      avgTimeToComplete,
      summary: `Training completion rate: ${Math.round(completionRate * 100)}%${
        avgTimeToComplete ? `, average ${Math.round(avgTimeToComplete)} days to complete` : ''
      }`
    };
  }

  static analyzeTenureAndEngagement(employeeData) {
    const tenureMonths = this.calculateTenureMonths(employeeData.hire_date);
    const tenureYears = (tenureMonths / 12).toFixed(1);
    
    let engagementLevel;
    if (tenureMonths < 6) {
      engagementLevel = 'new_employee';
    } else if (tenureMonths < 24) {
      engagementLevel = 'developing';
    } else if (tenureMonths < 60) {
      engagementLevel = 'established';
    } else {
      engagementLevel = 'senior';
    }

    return {
      type: 'tenure_analysis',
      title: 'Tenure & Engagement Analysis',
      tenureMonths,
      tenureYears: parseFloat(tenureYears),
      engagementLevel,
      content: `Employee has ${tenureYears} years of tenure and is classified as ${engagementLevel}`
    };
  }

  static calculateTenureMonths(hireDate) {
    const hire = new Date(hireDate);
    const now = new Date();
    return Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 30.44)); // Approximate months
  }

  static generateRetentionRecommendations(riskLevel, riskFactors) {
    const recommendations = [];

    if (riskLevel === 'Very High' || riskLevel === 'High') {
      recommendations.push('Schedule immediate one-on-one meeting to discuss career goals and concerns');
      recommendations.push('Review compensation and benefits package');
      recommendations.push('Consider providing additional development opportunities');
    }

    if (riskFactors.includes('Low performance rating')) {
      recommendations.push('Develop performance improvement plan with clear milestones');
      recommendations.push('Provide additional training and mentoring support');
    }

    if (riskFactors.includes('No recent training participation')) {
      recommendations.push('Enroll in relevant training programs');
      recommendations.push('Discuss career development goals and create learning plan');
    }

    if (riskFactors.includes('Below-market compensation')) {
      recommendations.push('Review salary against market rates');
      recommendations.push('Consider non-monetary benefits and recognition programs');
    }

    return recommendations;
  }

  static generateDocumentCategoryInsights(category, docData) {
    const insights = [];

    switch (category) {
    case 'policy':
      if (docData.requires_acknowledgment && parseInt(docData.acknowledgment_count) < parseInt(docData.unique_users) * 0.8) {
        insights.push({
          type: 'policy_compliance',
          title: 'Policy Acknowledgment Concern',
          content: 'Low acknowledgment rate may indicate compliance risk'
        });
      }
      break;
      
    case 'manual':
      if (parseInt(docData.access_count) < 10) {
        insights.push({
          type: 'utilization',
          title: 'Low Utilization',
          content: 'Manual may need better promotion or may be outdated'
        });
      }
      break;
      
    case 'form':
      insights.push({
        type: 'process_efficiency',
        title: 'Form Usage Analysis',
        content: 'Consider digitizing frequently accessed forms for better efficiency'
      });
      break;
    }

    return insights;
  }

  static async generateAIInsights(employeeData) {
    if (!openai) {
      return null;
    }

    try {
      const prompt = `
        Analyze the following employee data and provide strategic HR insights:
        
        Employee: ${employeeData.employee_name}
        Department: ${employeeData.department_name}
        Position: ${employeeData.position_title}
        Tenure: ${this.calculateTenureMonths(employeeData.hire_date)} months
        
        Recent Performance Evaluations: ${JSON.stringify(employeeData.evaluations.slice(0, 3))}
        Training Records: ${JSON.stringify(employeeData.training.slice(0, 5))}
        
        Please provide:
        1. Key strengths and development areas
        2. Career progression recommendations
        3. Risk factors for retention
        4. Suggested development opportunities
        
        Respond in JSON format with categories: strengths, development_areas, career_recommendations, retention_risks, development_opportunities
      `;

      const response = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      });

      const aiResponse = response.choices[0].message.content;
      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return null;
    }
  }
}

export default OrganizationalAIService;