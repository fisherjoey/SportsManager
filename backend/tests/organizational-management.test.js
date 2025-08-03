const request = require('supertest');
const app = require('../src/app');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

describe('Organizational Management Integration Tests', () => {
  let adminToken, hrToken, managerToken, employeeToken;
  let testDepartmentId, testPositionId, testEmployeeId, testAssetId, testDocumentId;

  beforeAll(async () => {
    // Setup test users and get tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await pool.end();
  });

  describe('Employee Management', () => {
    describe('Departments', () => {
      test('Admin can create department', async () => {
        const departmentData = {
          name: 'Test Department',
          description: 'A test department for integration testing',
          cost_center: 'TEST001',
          budget_allocated: 100000
        };

        const response = await request(app)
          .post('/api/employees/departments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(departmentData)
          .expect(201);

        expect(response.body.name).toBe(departmentData.name);
        expect(response.body.cost_center).toBe(departmentData.cost_center);
        testDepartmentId = response.body.id;
      });

      test('HR can view departments', async () => {
        const response = await request(app)
          .get('/api/employees/departments')
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        const testDept = response.body.find(d => d.id === testDepartmentId);
        expect(testDept).toBeDefined();
        expect(testDept.name).toBe('Test Department');
      });

      test('Regular employee cannot create department', async () => {
        const departmentData = {
          name: 'Unauthorized Department',
          description: 'Should not be created'
        };

        await request(app)
          .post('/api/employees/departments')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send(departmentData)
          .expect(403);
      });
    });

    describe('Job Positions', () => {
      test('HR can create job position', async () => {
        const positionData = {
          title: 'Test Position',
          description: 'A test position for integration testing',
          department_id: testDepartmentId,
          level: 'Mid',
          min_salary: 50000,
          max_salary: 75000,
          required_skills: ['JavaScript', 'Node.js'],
          responsibilities: 'Test and develop software applications'
        };

        const response = await request(app)
          .post('/api/employees/positions')
          .set('Authorization', `Bearer ${hrToken}`)
          .send(positionData)
          .expect(201);

        expect(response.body.title).toBe(positionData.title);
        expect(response.body.department_id).toBe(testDepartmentId);
        testPositionId = response.body.id;
      });

      test('Can filter positions by department', async () => {
        const response = await request(app)
          .get(`/api/employees/positions?department_id=${testDepartmentId}`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.every(p => p.department_id === testDepartmentId)).toBe(true);
      });
    });

    describe('Employee Records', () => {
      test('HR can create employee record', async () => {
        // First create a test user
        const userData = {
          name: 'Test Employee',
          email: 'test.employee@example.com',
          password: 'testpass123',
          role: 'employee',
          phone: '555-0123'
        };

        const userResponse = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        const employeeData = {
          user_id: userResponse.body.user.id,
          employee_id: 'EMP001',
          department_id: testDepartmentId,
          position_id: testPositionId,
          hire_date: '2024-01-15',
          employment_type: 'full_time',
          base_salary: 60000,
          emergency_contacts: [
            {
              name: 'Emergency Contact',
              relationship: 'Spouse',
              phone: '555-0456'
            }
          ]
        };

        const response = await request(app)
          .post('/api/employees')
          .set('Authorization', `Bearer ${hrToken}`)
          .send(employeeData)
          .expect(201);

        expect(response.body.employee_id).toBe(employeeData.employee_id);
        expect(response.body.department_id).toBe(testDepartmentId);
        testEmployeeId = response.body.id;
      });

      test('Can retrieve employee with comprehensive data', async () => {
        const response = await request(app)
          .get(`/api/employees/${testEmployeeId}`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(response.body.employee_id).toBe('EMP001');
        expect(response.body.department_name).toBe('Test Department');
        expect(response.body.position_title).toBe('Test Position');
      });

      test('Can filter employees by department', async () => {
        const response = await request(app)
          .get(`/api/employees?department_id=${testDepartmentId}`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(response.body.employees).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(response.body.employees.every(e => e.department_id === testDepartmentId)).toBe(true);
      });
    });

    describe('Performance Evaluations', () => {
      test('Manager can create employee evaluation', async () => {
        const evaluationData = {
          evaluation_period: 'Q1_2024',
          period_start: '2024-01-01',
          period_end: '2024-03-31',
          overall_rating: 4,
          category_ratings: {
            technical: 4,
            communication: 4,
            teamwork: 5
          },
          achievements: 'Successfully completed major project',
          areas_for_improvement: 'Could improve time management',
          goals_next_period: 'Lead a small team project'
        };

        const response = await request(app)
          .post(`/api/employees/${testEmployeeId}/evaluations`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send(evaluationData)
          .expect(201);

        expect(response.body.overall_rating).toBe(4);
        expect(response.body.evaluation_period).toBe('Q1_2024');
      });

      test('Can retrieve employee evaluations', async () => {
        const response = await request(app)
          .get(`/api/employees/${testEmployeeId}/evaluations`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].overall_rating).toBe(4);
      });
    });

    describe('Training Records', () => {
      test('HR can add training record', async () => {
        const trainingData = {
          training_name: 'JavaScript Advanced Concepts',
          training_type: 'online_course',
          provider: 'Tech Learning Platform',
          completion_date: '2024-02-15',
          cost: 299.99,
          hours_completed: 20,
          certificate_number: 'CERT123456'
        };

        const response = await request(app)
          .post(`/api/employees/${testEmployeeId}/training`)
          .set('Authorization', `Bearer ${hrToken}`)
          .send(trainingData)
          .expect(201);

        expect(response.body.training_name).toBe(trainingData.training_name);
        expect(response.body.status).toBe('completed');
      });

      test('Can filter training by status', async () => {
        const response = await request(app)
          .get(`/api/employees/${testEmployeeId}/training?status=completed`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.every(t => t.status === 'completed')).toBe(true);
      });
    });
  });

  describe('Asset Management', () => {
    describe('Asset Creation and Management', () => {
      test('Manager can create asset', async () => {
        const assetData = {
          asset_tag: 'TEST001',
          name: 'Test Laptop',
          description: 'MacBook Pro for testing',
          category: 'technology',
          subcategory: 'laptop',
          brand: 'Apple',
          model: 'MacBook Pro 14"',
          serial_number: 'TEST123456',
          purchase_date: '2024-01-10',
          purchase_cost: 2499.99,
          current_value: 2000.00,
          condition: 'excellent',
          specifications: {
            processor: 'M2 Pro',
            memory: '16GB',
            storage: '512GB SSD'
          }
        };

        const response = await request(app)
          .post('/api/assets')
          .set('Authorization', `Bearer ${managerToken}`)
          .send(assetData)
          .expect(201);

        expect(response.body.asset_tag).toBe(assetData.asset_tag);
        expect(response.body.name).toBe(assetData.name);
        testAssetId = response.body.id;
      });

      test('Can retrieve asset with detailed information', async () => {
        const response = await request(app)
          .get(`/api/assets/${testAssetId}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body.asset.asset_tag).toBe('TEST001');
        expect(response.body.maintenanceHistory).toBeDefined();
        expect(response.body.checkoutHistory).toBeDefined();
      });

      test('Can filter assets by category', async () => {
        const response = await request(app)
          .get('/api/assets?category=technology')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body.assets).toBeDefined();
        expect(response.body.assets.every(a => a.category === 'technology')).toBe(true);
      });
    });

    describe('Asset Checkout System', () => {
      test('Manager can checkout asset to employee', async () => {
        const checkoutData = {
          employee_id: testEmployeeId,
          expected_return_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          checkout_condition: 'excellent',
          checkout_notes: 'For development work'
        };

        const response = await request(app)
          .post(`/api/assets/${testAssetId}/checkout`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send(checkoutData)
          .expect(201);

        expect(response.body.employee_id).toBe(testEmployeeId);
        expect(response.body.status).toBe('checked_out');
      });

      test('Asset status updates after checkout', async () => {
        const response = await request(app)
          .get(`/api/assets/${testAssetId}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body.asset.status).toBe('assigned');
        expect(response.body.asset.assigned_to).toBe(testEmployeeId);
      });
    });

    describe('Asset Maintenance', () => {
      test('Manager can create maintenance record', async () => {
        const maintenanceData = {
          maintenance_type: 'routine',
          scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Routine software updates and cleaning',
          cost: 50.00
        };

        const response = await request(app)
          .post(`/api/assets/${testAssetId}/maintenance`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send(maintenanceData)
          .expect(201);

        expect(response.body.maintenance_type).toBe('routine');
        expect(response.body.status).toBe('scheduled');
      });
    });
  });

  describe('Document Management', () => {
    describe('Document Upload and Management', () => {
      test('HR can upload document', async () => {
        // Create a test file buffer
        const testContent = Buffer.from('This is a test document content');
        
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${hrToken}`)
          .field('title', 'Test Policy Document')
          .field('description', 'A test policy for integration testing')
          .field('category', 'policy')
          .field('requires_acknowledgment', 'true')
          .attach('document', testContent, 'test-policy.txt')
          .expect(201);

        expect(response.body.title).toBe('Test Policy Document');
        expect(response.body.category).toBe('policy');
        testDocumentId = response.body.id;
      });

      test('Can retrieve document information', async () => {
        const response = await request(app)
          .get(`/api/documents/${testDocumentId}`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(response.body.document.title).toBe('Test Policy Document');
        expect(response.body.versions).toBeDefined();
      });

      test('Admin can approve document', async () => {
        const response = await request(app)
          .post(`/api/documents/${testDocumentId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.status).toBe('approved');
      });
    });

    describe('Document Access Control', () => {
      test('Employee can view approved document', async () => {
        const response = await request(app)
          .get(`/api/documents/${testDocumentId}`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);

        expect(response.body.document.status).toBe('approved');
      });

      test('Employee can acknowledge document', async () => {
        const acknowledgmentData = {
          acknowledgment_text: 'I have read and understood this policy'
        };

        const response = await request(app)
          .post(`/api/documents/${testDocumentId}/acknowledge`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .send(acknowledgmentData)
          .expect(200);

        expect(response.body.message).toContain('acknowledged');
      });
    });
  });

  describe('Compliance Management', () => {
    describe('Compliance Tracking', () => {
      test('HR can create compliance item', async () => {
        const complianceData = {
          compliance_type: 'safety',
          regulation_name: 'OSHA Workplace Safety Standards',
          description: 'Regular safety compliance audit',
          responsible_department: testDepartmentId,
          frequency: 'quarterly',
          next_audit_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          required_documents: ['safety_procedures.pdf', 'training_records.xlsx']
        };

        const response = await request(app)
          .post('/api/compliance/tracking')
          .set('Authorization', `Bearer ${hrToken}`)
          .send(complianceData)
          .expect(201);

        expect(response.body.compliance_type).toBe('safety');
        expect(response.body.regulation_name).toBe('OSHA Workplace Safety Standards');
      });
    });

    describe('Incident Reporting', () => {
      test('Employee can report incident', async () => {
        const incidentData = {
          incident_type: 'safety',
          severity: 'medium',
          incident_date: new Date().toISOString(),
          description: 'Minor slip on wet floor in break room',
          immediate_actions_taken: 'Cleaned up spill and posted warning sign',
          people_involved: ['Test Employee']
        };

        const response = await request(app)
          .post('/api/compliance/incidents')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send(incidentData)
          .expect(201);

        expect(response.body.incident_type).toBe('safety');
        expect(response.body.status).toBe('reported');
        expect(response.body.incident_number).toMatch(/^INC-\d{4}-\d{3}$/);
      });
    });

    describe('Risk Assessment', () => {
      test('Manager can create risk assessment', async () => {
        const riskData = {
          risk_title: 'Data Security Risk',
          risk_description: 'Potential unauthorized access to sensitive data',
          risk_category: 'security',
          owner_department: testDepartmentId,
          probability_score: 3,
          impact_score: 4,
          current_controls: 'Access controls and regular audits',
          mitigation_actions: 'Implement two-factor authentication',
          next_review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
        };

        const response = await request(app)
          .post('/api/compliance/risks')
          .set('Authorization', `Bearer ${managerToken}`)
          .send(riskData)
          .expect(201);

        expect(response.body.risk_title).toBe('Data Security Risk');
        expect(response.body.risk_score).toBe(12); // 3 * 4
        expect(response.body.risk_level).toBe('medium');
      });
    });
  });

  describe('Internal Communications', () => {
    describe('Communication Management', () => {
      test('HR can create announcement', async () => {
        const communicationData = {
          title: 'Company Policy Update',
          content: 'We are updating our remote work policy effective next month.',
          type: 'announcement',
          priority: 'high',
          target_audience: {
            all_users: true
          },
          requires_acknowledgment: true
        };

        const response = await request(app)
          .post('/api/communications')
          .set('Authorization', `Bearer ${hrToken}`)
          .send(communicationData)
          .expect(201);

        expect(response.body.title).toBe('Company Policy Update');
        expect(response.body.status).toBe('draft');
      });

      test('HR can publish communication', async () => {
        // First create a communication
        const communicationData = {
          title: 'Test Announcement',
          content: 'This is a test announcement',
          type: 'announcement',
          priority: 'normal',
          target_audience: {
            departments: [testDepartmentId]
          }
        };

        const createResponse = await request(app)
          .post('/api/communications')
          .set('Authorization', `Bearer ${hrToken}`)
          .send(communicationData)
          .expect(201);

        const commId = createResponse.body.id;

        const publishResponse = await request(app)
          .post(`/api/communications/${commId}/publish`)
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(publishResponse.body.status).toBe('published');
        expect(publishResponse.body.recipient_count).toBeGreaterThan(0);
      });
    });

    describe('Communication Reception', () => {
      test('Employee can view communications', async () => {
        const response = await request(app)
          .get('/api/communications')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);

        expect(response.body.communications).toBeDefined();
        expect(Array.isArray(response.body.communications)).toBe(true);
      });

      test('Employee can get unread count', async () => {
        const response = await request(app)
          .get('/api/communications/unread/count')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);

        expect(response.body.unread_count).toBeDefined();
        expect(typeof response.body.unread_count).toBe('number');
      });
    });
  });

  describe('Organizational Analytics', () => {
    describe('Employee Analytics', () => {
      test('HR can view employee performance analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/organizational/employees/performance?start_date=2024-01-01&end_date=2024-12-31')
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(response.body.ratingsDistribution).toBeDefined();
        expect(response.body.departmentPerformance).toBeDefined();
        expect(response.body.performanceTrend).toBeDefined();
      });

      test('Admin can view retention analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/organizational/employees/retention?start_date=2024-01-01&end_date=2024-12-31')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.turnoverStats).toBeDefined();
        expect(response.body.departmentRetention).toBeDefined();
        expect(response.body.tenureDistribution).toBeDefined();
      });
    });

    describe('Organizational Health', () => {
      test('Admin can view organizational health overview', async () => {
        const response = await request(app)
          .get('/api/analytics/organizational/health/overview')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.satisfaction).toBeDefined();
        expect(response.body.engagement).toBeDefined();
        expect(response.body.compliance).toBeDefined();
        expect(response.body.riskProfile).toBeDefined();
        expect(response.body.healthScore).toBeDefined();
        expect(typeof response.body.healthScore).toBe('number');
      });
    });

    describe('Predictive Analytics', () => {
      test('HR can view staffing predictions', async () => {
        const response = await request(app)
          .get('/api/analytics/organizational/predictions/staffing')
          .set('Authorization', `Bearer ${hrToken}`)
          .expect(200);

        expect(response.body.turnoverPrediction).toBeDefined();
        expect(response.body.hiringNeeds).toBeDefined();
        expect(response.body.trainingNeeds).toBeDefined();
      });
    });
  });

  // Helper functions
  async function setupTestUsers() {
    // Create admin user
    const adminData = {
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'admin'
    };

    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);
    
    adminToken = adminResponse.body.token;

    // Create HR user
    const hrData = {
      name: 'Test HR',
      email: 'hr@test.com',
      password: 'hr123',
      role: 'hr'
    };

    const hrResponse = await request(app)
      .post('/api/auth/register')
      .send(hrData);
    
    hrToken = hrResponse.body.token;

    // Create manager user
    const managerData = {
      name: 'Test Manager',
      email: 'manager@test.com',
      password: 'manager123',
      role: 'manager'
    };

    const managerResponse = await request(app)
      .post('/api/auth/register')
      .send(managerData);
    
    managerToken = managerResponse.body.token;

    // Create employee user
    const employeeData = {
      name: 'Test Employee User',
      email: 'employee@test.com',
      password: 'employee123',
      role: 'employee'
    };

    const employeeResponse = await request(app)
      .post('/api/auth/register')
      .send(employeeData);
    
    employeeToken = employeeResponse.body.token;
  }

  async function cleanupTestData() {
    try {
      // Clean up in reverse order of dependencies
      if (testEmployeeId) {
        await pool.query('DELETE FROM training_records WHERE employee_id = $1', [testEmployeeId]);
        await pool.query('DELETE FROM employee_evaluations WHERE employee_id = $1', [testEmployeeId]);
        await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
      }

      if (testAssetId) {
        await pool.query('DELETE FROM asset_checkouts WHERE asset_id = $1', [testAssetId]);
        await pool.query('DELETE FROM asset_maintenance WHERE asset_id = $1', [testAssetId]);
        await pool.query('DELETE FROM assets WHERE id = $1', [testAssetId]);
      }

      if (testDocumentId) {
        await pool.query('DELETE FROM document_acknowledgments WHERE document_id = $1', [testDocumentId]);
        await pool.query('DELETE FROM document_access WHERE document_id = $1', [testDocumentId]);
        await pool.query('DELETE FROM document_versions WHERE document_id = $1', [testDocumentId]);
        await pool.query('DELETE FROM documents WHERE id = $1', [testDocumentId]);
      }

      if (testPositionId) {
        await pool.query('DELETE FROM job_positions WHERE id = $1', [testPositionId]);
      }

      if (testDepartmentId) {
        await pool.query('DELETE FROM departments WHERE id = $1', [testDepartmentId]);
      }

      // Clean up test users
      await pool.query(`DELETE FROM users WHERE email IN ('admin@test.com', 'hr@test.com', 'manager@test.com', 'employee@test.com', 'test.employee@example.com')`);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
});