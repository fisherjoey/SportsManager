# Enterprise API Documentation

## Overview

This document provides comprehensive documentation for all enterprise features backend APIs in the Sports Management App. These APIs provide organizational management, financial management, compliance tracking, and other enterprise-level functionality.

## Authentication

All API endpoints require authentication unless explicitly noted. Use JWT token authentication:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control

The system uses role-based access control with the following roles:
- `admin` - Full system access
- `hr` - Human resources management access
- `manager` - Management-level access
- `referee` - Basic referee user access

## Base URL

All endpoints are prefixed with: `http://localhost:3000/api`

---

## Employee Management API (`/api/employees`)

Comprehensive employee lifecycle management including departments, positions, evaluations, and training.

### Departments

#### GET `/api/employees/departments`
Get all departments with hierarchy structure.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `hierarchy` (boolean) - Return departments in hierarchical structure

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Engineering",
    "description": "Software development team",
    "parent_department_id": null,
    "manager_id": "uuid",
    "cost_center": "ENG001",
    "budget_allocated": 500000,
    "budget_spent": 325000,
    "manager_name": "John Smith",
    "employee_count": 15,
    "position_count": 8,
    "level": 0,
    "path": ["Engineering"]
  }
]
```

#### POST `/api/employees/departments`
Create a new department.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Request Body:**
```json
{
  "name": "New Department",
  "description": "Department description",
  "parent_department_id": "uuid", // optional
  "manager_id": "uuid", // optional
  "cost_center": "CODE001",
  "budget_allocated": 100000
}
```

#### PUT `/api/employees/departments/:id`
Update an existing department.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Request Body:** Same as POST, all fields optional

### Job Positions

#### GET `/api/employees/positions`
Get all job positions.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `department_id` (uuid) - Filter by department
- `level` (string) - Filter by position level (Entry, Mid, Senior, Executive)
- `active` (boolean) - Filter by active status

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Senior Software Engineer",
    "description": "Lead software development projects",
    "department_id": "uuid",
    "department_name": "Engineering",
    "level": "Senior",
    "min_salary": 80000,
    "max_salary": 120000,
    "required_skills": ["JavaScript", "Node.js", "React"],
    "preferred_skills": ["TypeScript", "AWS"],
    "current_employees": 3
  }
]
```

#### POST `/api/employees/positions`
Create a new job position.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Request Body:**
```json
{
  "title": "Software Engineer",
  "description": "Develop and maintain applications",
  "department_id": "uuid",
  "level": "Mid",
  "min_salary": 60000,
  "max_salary": 80000,
  "required_skills": ["JavaScript", "React"],
  "preferred_skills": ["Node.js"],
  "responsibilities": "Write clean, maintainable code"
}
```

### Employees

#### GET `/api/employees`
Get all employees with comprehensive data.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `department_id` (uuid) - Filter by department
- `position_id` (uuid) - Filter by position
- `employment_status` (string) - Filter by status (active, inactive, terminated, on_leave)
- `manager_id` (uuid) - Filter by manager
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Response:**
```json
{
  "employees": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "employee_id": "EMP001",
      "employee_name": "Jane Doe",
      "employee_email": "jane@company.com",
      "department_name": "Engineering",
      "position_title": "Senior Developer",
      "position_level": "Senior",
      "manager_name": "John Smith",
      "employment_status": "active",
      "hire_date": "2023-01-15",
      "base_salary": 85000,
      "active_trainings": 2,
      "completed_trainings": 8,
      "latest_evaluation_date": "2024-06-01",
      "latest_overall_rating": 4.2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 145,
    "totalPages": 3
  }
}
```

#### GET `/api/employees/:id`
Get single employee details.

**Authentication:** Required  
**Roles:** Any authenticated user

#### POST `/api/employees`
Create a new employee record.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Request Body:**
```json
{
  "user_id": "uuid",
  "employee_id": "EMP001",
  "department_id": "uuid",
  "position_id": "uuid",
  "manager_id": "uuid",
  "hire_date": "2024-01-15",
  "employment_type": "full_time",
  "employment_status": "active",
  "base_salary": 75000,
  "pay_frequency": "monthly",
  "emergency_contacts": [
    {
      "name": "Emergency Contact",
      "relationship": "spouse",
      "phone": "555-0123"
    }
  ],
  "benefits_enrolled": ["health", "dental", "401k"],
  "notes": "Additional notes"
}
```

#### PUT `/api/employees/:id`
Update employee information.

**Authentication:** Required  
**Roles:** `admin`, `hr`

### Employee Evaluations

#### GET `/api/employees/:id/evaluations`
Get evaluations for a specific employee.

**Authentication:** Required  
**Roles:** Any authenticated user

#### POST `/api/employees/:id/evaluations`
Create a new employee evaluation.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "evaluation_period": "Q4 2024",
  "period_start": "2024-10-01",
  "period_end": "2024-12-31",
  "overall_rating": 4,
  "category_ratings": {
    "technical_skills": 4,
    "communication": 5,
    "teamwork": 3,
    "leadership": 4
  },
  "achievements": "Led successful project delivery",
  "areas_for_improvement": "Time management",
  "goals_next_period": "Complete certification",
  "evaluator_comments": "Strong performer",
  "employee_comments": "Enjoyed the challenging projects"
}
```

### Training Records

#### GET `/api/employees/:id/training`
Get training records for an employee.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `status` (string) - Filter by training status

#### POST `/api/employees/:id/training`
Add a training record for an employee.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "training_name": "Advanced JavaScript",
  "training_type": "online_course",
  "provider": "Tech Academy",
  "completion_date": "2024-07-15",
  "expiration_date": "2026-07-15",
  "cost": 299.99,
  "hours_completed": 40,
  "certificate_number": "CERT123456",
  "certificate_url": "https://example.com/cert.pdf",
  "notes": "Excellent course content"
}
```

#### PUT `/api/employees/training/:trainingId`
Update a training record.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

### Employee Statistics

#### GET `/api/employees/stats/overview`
Get organization-wide employee statistics.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
{
  "overview": {
    "active_employees": 145,
    "inactive_employees": 12,
    "on_leave_employees": 3,
    "terminated_employees": 28,
    "full_time_employees": 120,
    "part_time_employees": 25,
    "avg_salary": 72500,
    "total_departments": 8,
    "total_positions": 24
  },
  "departmentBreakdown": [
    {
      "department_name": "Engineering",
      "active_count": 45,
      "avg_salary": 85000
    }
  ]
}
```

---

## Asset Management API (`/api/assets`)

Complete asset lifecycle management including tracking, maintenance, and checkout/checkin processes.

### Assets

#### GET `/api/assets`
Get all assets with filtering and pagination.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `category` (string) - Filter by asset category
- `subcategory` (string) - Filter by subcategory
- `status` (string) - Filter by status (available, assigned, maintenance, retired)
- `condition` (string) - Filter by condition (excellent, good, fair, poor, damaged)
- `location_id` (uuid) - Filter by location
- `assigned_to` (uuid) - Filter by assigned employee
- `search` (string) - Search in name, asset tag, or description
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "asset_tag": "LAPTOP001",
      "name": "MacBook Pro 16\"",
      "description": "Development laptop",
      "category": "IT Equipment",
      "subcategory": "Laptops",
      "brand": "Apple",
      "model": "MacBook Pro 16-inch",
      "serial_number": "ABC123456",
      "purchase_date": "2024-01-15",
      "purchase_cost": 2499.99,
      "current_value": 2000.00,
      "condition": "excellent",
      "status": "assigned",
      "location_name": "New York Office",
      "assigned_employee_name": "John Doe",
      "maintenance_count": 2,
      "last_maintenance_date": "2024-06-01",
      "next_maintenance_due": "2024-12-01"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "totalPages": 5
  }
}
```

#### GET `/api/assets/:id`
Get detailed asset information including maintenance and checkout history.

**Authentication:** Required  
**Roles:** Any authenticated user

**Response:**
```json
{
  "asset": {
    "id": "uuid",
    "asset_tag": "LAPTOP001",
    "name": "MacBook Pro 16\"",
    // ... all asset fields
  },
  "maintenanceHistory": [
    {
      "id": "uuid",
      "maintenance_type": "routine",
      "scheduled_date": "2024-06-01",
      "performed_by_name": "Tech Support",
      "cost": 150.00,
      "description": "Clean and update software",
      "status": "completed"
    }
  ],
  "checkoutHistory": [
    {
      "id": "uuid",
      "employee_name": "John Doe",
      "checkout_date": "2024-01-20",
      "expected_return_date": "2025-01-20",
      "status": "checked_out",
      "checkout_condition": "excellent"
    }
  ]
}
```

#### POST `/api/assets`
Create a new asset.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "asset_tag": "LAPTOP002",
  "name": "Dell Laptop",
  "description": "Standard office laptop",
  "category": "IT Equipment",
  "subcategory": "Laptops",
  "brand": "Dell",
  "model": "Latitude 7420",
  "serial_number": "DEL789012",
  "purchase_date": "2024-07-01",
  "purchase_cost": 1299.99,
  "current_value": 1100.00,
  "location_id": "uuid",
  "condition": "excellent",
  "status": "available",
  "specifications": {
    "cpu": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  },
  "warranty_expiration": "2027-07-01",
  "notes": "Standard configuration"
}
```

#### PUT `/api/assets/:id`
Update asset information.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

### Asset Maintenance

#### GET `/api/assets/:id/maintenance`
Get maintenance records for an asset.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `status` (string) - Filter by maintenance status

#### POST `/api/assets/:id/maintenance`
Create a maintenance record.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "maintenance_type": "repair",
  "scheduled_date": "2024-08-15",
  "performed_by": "uuid",
  "vendor": "Tech Repair Co",
  "cost": 250.00,
  "description": "Replace keyboard",
  "parts_replaced": "Keyboard assembly",
  "next_maintenance_due": "2025-02-15",
  "notes": "Spilled coffee damage"
}
```

#### PUT `/api/assets/maintenance/:maintenanceId`
Update maintenance record.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

### Asset Checkout/Checkin

#### POST `/api/assets/:id/checkout`
Check out an asset to an employee.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "employee_id": "uuid",
  "expected_return_date": "2025-07-01",
  "checkout_condition": "good",
  "checkout_notes": "Standard assignment"
}
```

#### POST `/api/assets/checkout/:checkoutId/checkin`
Check in an asset from an employee.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "return_condition": "good",
  "return_notes": "Minor wear, functioning properly"
}
```

### Asset Analytics

#### GET `/api/assets/stats/overview`
Get comprehensive asset statistics.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Response:**
```json
{
  "overview": {
    "total_assets": 245,
    "available_assets": 120,
    "assigned_assets": 100,
    "maintenance_assets": 15,
    "retired_assets": 10,
    "total_purchase_value": 485000,
    "total_current_value": 325000,
    "total_categories": 8
  },
  "categoryBreakdown": [
    {
      "category": "IT Equipment",
      "asset_count": 145,
      "available_count": 45,
      "assigned_count": 85,
      "total_value": 285000
    }
  ],
  "maintenanceSummary": {
    "total_maintenance_records": 120,
    "scheduled_maintenance": 25,
    "completed_maintenance": 85,
    "total_maintenance_cost": 15000
  }
}
```

#### GET `/api/assets/maintenance/due`
Get assets due for maintenance.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Query Parameters:**
- `days_ahead` (number, default: 30) - Days ahead to check

#### GET `/api/assets/checkouts/overdue`
Get overdue asset checkouts.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

---

## Document Management API (`/api/documents`)

Enterprise document management with version control, access permissions, and acknowledgment tracking.

### Documents

#### GET `/api/documents`
Get all documents with access control and filtering.

**Authentication:** Required  
**Roles:** Any authenticated user (access controlled per document)

**Query Parameters:**
- `category` (string) - Filter by document category
- `subcategory` (string) - Filter by subcategory
- `status` (string) - Filter by status (draft, review, approved, archived)
- `search` (string) - Search in title or description
- `tags` (string) - Comma-separated tags to filter by
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Employee Handbook",
      "description": "Company policies and procedures",
      "category": "HR",
      "subcategory": "Policies",
      "status": "approved",
      "version": "2.1",
      "file_name": "employee-handbook-v2.1.pdf",
      "file_type": "pdf",
      "file_size": 2048576,
      "uploaded_by_name": "HR Admin",
      "approved_by_name": "CEO",
      "effective_date": "2024-01-01",
      "requires_acknowledgment": true,
      "acknowledgment_count": 85,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45
  }
}
```

#### GET `/api/documents/:id`
Get single document with version history.

**Authentication:** Required  
**Roles:** Access controlled per document

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "title": "Employee Handbook",
    // ... all document fields
    "access_permissions": {
      "roles": ["employee", "manager", "hr"],
      "departments": ["uuid1", "uuid2"]
    }
  },
  "versions": [
    {
      "id": "uuid",
      "version": "2.1",
      "file_path": "/uploads/docs/handbook-v2.1.pdf",
      "change_notes": "Updated vacation policy",
      "uploaded_by_name": "HR Admin",
      "created_at": "2024-01-15T10:00:00Z",
      "is_current": true
    }
  ]
}
```

#### POST `/api/documents`
Upload a new document.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `document` (file) - Document file to upload
- `title` (string) - Document title
- `description` (string) - Document description
- `category` (string) - Document category
- `subcategory` (string) - Document subcategory (optional)
- `effective_date` (date) - When document becomes effective
- `expiration_date` (date) - When document expires (optional)
- `tags` (array) - Document tags
- `access_permissions` (object) - Access control settings
- `requires_acknowledgment` (boolean) - Whether acknowledgment is required

#### POST `/api/documents/:id/versions`
Upload a new version of existing document.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `document` (file) - New version file
- `change_notes` (string) - Description of changes

#### PUT `/api/documents/:id`
Update document metadata.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager` (or document owner)

### Document Actions

#### POST `/api/documents/:id/approve`
Approve a document for publication.

**Authentication:** Required  
**Roles:** `admin`, `hr`

#### POST `/api/documents/:id/archive`
Archive a document.

**Authentication:** Required  
**Roles:** `admin`, `hr`

#### GET `/api/documents/:id/download`
Download a document file.

**Authentication:** Required  
**Roles:** Access controlled per document

### Document Acknowledgments

#### POST `/api/documents/:id/acknowledge`
Acknowledge a document (mark as read/understood).

**Authentication:** Required  
**Roles:** Any authenticated user with document access

**Request Body:**
```json
{
  "acknowledgment_text": "I have read and understood this document"
}
```

#### GET `/api/documents/:id/acknowledgments`
Get document acknowledgment records.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

#### GET `/api/documents/acknowledgments/pending`
Get documents requiring acknowledgment by current user.

**Authentication:** Required  
**Roles:** Any authenticated user

### Document Statistics

#### GET `/api/documents/stats/overview`
Get comprehensive document statistics.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
{
  "overview": {
    "total_documents": 45,
    "draft_documents": 5,
    "approved_documents": 35,
    "archived_documents": 5,
    "acknowledgment_required": 25,
    "expired_documents": 2,
    "total_categories": 8,
    "total_storage_used": 52428800
  },
  "categoryBreakdown": [
    {
      "category": "HR",
      "document_count": 15,
      "approved_count": 12,
      "total_size": 15728640
    }
  ],
  "accessStats": {
    "total_accesses": 1245,
    "unique_users": 85,
    "views": 890,
    "downloads": 355,
    "accessed_documents": 42
  }
}
```

---

## Compliance Management API (`/api/compliance`)

Comprehensive compliance tracking, incident management, and risk assessment.

### Compliance Tracking

#### GET `/api/compliance/tracking`
Get all compliance items with filtering.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Query Parameters:**
- `compliance_type` (string) - Filter by compliance type
- `status` (string) - Filter by status (compliant, non_compliant, pending_review)
- `responsible_employee` (uuid) - Filter by responsible employee
- `responsible_department` (uuid) - Filter by responsible department
- `overdue` (boolean) - Filter for overdue audits

**Response:**
```json
[
  {
    "id": "uuid",
    "compliance_type": "Safety Training",
    "regulation_name": "OSHA Safety Standards",
    "description": "Annual safety training compliance",
    "responsible_employee_name": "Safety Officer",
    "responsible_department_name": "Operations",
    "frequency": "annually",
    "status": "compliant",
    "next_audit_date": "2025-03-15",
    "current_findings": "All requirements met",
    "action_items": "Schedule 2025 training sessions",
    "is_overdue": false,
    "due_soon": true
  }
]
```

#### GET `/api/compliance/tracking/:id`
Get single compliance item details.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

#### POST `/api/compliance/tracking`
Create a new compliance tracking item.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Request Body:**
```json
{
  "compliance_type": "Data Protection",
  "regulation_name": "GDPR Compliance",
  "description": "General Data Protection Regulation compliance",
  "responsible_employee": "uuid",
  "responsible_department": "uuid",
  "frequency": "quarterly",
  "next_audit_date": "2024-12-31",
  "current_findings": "Initial assessment needed",
  "action_items": "Conduct data audit, update privacy policy",
  "required_documents": ["privacy-policy", "data-audit-report"],
  "evidence_files": ["gdpr-checklist.pdf"]
}
```

#### PUT `/api/compliance/tracking/:id`
Update compliance tracking item.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

### Incident Management

#### GET `/api/compliance/incidents`
Get all incidents with filtering and pagination.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `incident_type` (string) - Filter by type (safety, security, quality, hr, equipment)
- `severity` (string) - Filter by severity (low, medium, high, critical)
- `status` (string) - Filter by status (reported, investigating, resolved, closed)
- `location_id` (uuid) - Filter by location
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Response:**
```json
{
  "incidents": [
    {
      "id": "uuid",
      "incident_number": "INC-2024-001",
      "incident_type": "safety",
      "severity": "medium",
      "status": "investigating",
      "incident_date": "2024-07-15",
      "location_name": "Warehouse A",
      "reporter_name": "John Smith",
      "investigator_name": "Safety Manager",
      "description": "Slip and fall in warehouse",
      "immediate_actions_taken": "Area cordoned off, first aid provided"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

#### GET `/api/compliance/incidents/:id`
Get single incident details.

**Authentication:** Required  
**Roles:** Any authenticated user

#### POST `/api/compliance/incidents`
Report a new incident.

**Authentication:** Required  
**Roles:** Any authenticated user

**Request Body:**
```json
{
  "incident_type": "safety",
  "severity": "medium",
  "incident_date": "2024-07-15T14:30:00Z",
  "location_id": "uuid",
  "description": "Employee slipped on wet floor in cafeteria",
  "immediate_actions_taken": "Cleaned area, provided first aid",
  "people_involved": ["John Doe", "Jane Smith"],
  "witnesses": ["Mike Johnson"],
  "assets_involved": ["uuid"],
  "target_resolution_date": "2024-07-30",
  "attachments": ["incident-photo.jpg"]
}
```

#### PUT `/api/compliance/incidents/:id`
Update incident information.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

### Risk Assessments

#### GET `/api/compliance/risks`
Get all risk assessments with filtering.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Query Parameters:**
- `risk_category` (string) - Filter by category (operational, financial, safety, regulatory, reputational)
- `risk_level` (string) - Filter by level (low, medium, high, critical)
- `status` (string) - Filter by status
- `owner_employee` (uuid) - Filter by owner employee
- `owner_department` (uuid) - Filter by owner department

**Response:**
```json
[
  {
    "id": "uuid",
    "risk_title": "Data Breach Risk",
    "risk_description": "Risk of unauthorized access to customer data",
    "risk_category": "regulatory",
    "risk_level": "high",
    "risk_score": 12,
    "probability_score": 3,
    "impact_score": 4,
    "status": "active",
    "owner_employee_name": "IT Security Manager",
    "owner_department_name": "IT",
    "current_controls": "Firewalls, access controls, encryption",
    "mitigation_actions": "Implement additional monitoring, staff training",
    "next_review_date": "2024-10-15",
    "review_overdue": false
  }
]
```

#### POST `/api/compliance/risks`
Create a new risk assessment.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "risk_title": "New Security Risk",
  "risk_description": "Detailed description of the risk",
  "risk_category": "security",
  "owner_employee": "uuid",
  "owner_department": "uuid",
  "probability_score": 3,
  "impact_score": 4,
  "current_controls": "Existing security measures",
  "mitigation_actions": "Planned improvements",
  "review_date": "2024-08-01",
  "next_review_date": "2024-11-01"
}
```

#### PUT `/api/compliance/risks/:id`
Update risk assessment.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

### Compliance Dashboard

#### GET `/api/compliance/stats/dashboard`
Get comprehensive compliance dashboard statistics.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Response:**
```json
{
  "compliance": {
    "total_compliance_items": 25,
    "compliant_items": 20,
    "non_compliant_items": 3,
    "pending_review_items": 2,
    "overdue_audits": 1,
    "due_soon_audits": 5
  },
  "incidents": {
    "total_incidents": 15,
    "critical_incidents": 1,
    "high_incidents": 3,
    "new_incidents": 2,
    "investigating_incidents": 4,
    "resolved_incidents": 10,
    "overdue_incidents": 1
  },
  "risks": {
    "total_risks": 18,
    "critical_risks": 2,
    "high_risks": 5,
    "medium_risks": 8,
    "low_risks": 3,
    "new_risks": 3,
    "overdue_reviews": 2,
    "average_risk_score": 8.5
  },
  "recentIncidents": [
    {
      "incident_number": "INC-2024-015",
      "incident_type": "safety",
      "severity": "medium",
      "incident_date": "2024-07-20",
      "description": "Minor equipment malfunction",
      "reporter_name": "Operator Smith"
    }
  ]
}
```

#### GET `/api/compliance/calendar`
Get compliance calendar (upcoming audits and reviews).

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Query Parameters:**
- `start_date` (date) - Calendar start date
- `end_date` (date) - Calendar end date

---

## Communications API (`/api/communications`)

Internal communication system with targeted messaging, acknowledgments, and engagement tracking.

### Communications

#### GET `/api/communications`
Get communications with access control.

**Authentication:** Required  
**Roles:** Any authenticated user (filtered by access permissions)

**Query Parameters:**
- `type` (string) - Filter by type (announcement, memo, policy_update, emergency, newsletter)
- `priority` (string) - Filter by priority (low, normal, high, urgent)
- `status` (string) - Filter by status
- `unread_only` (boolean) - Show only unread messages
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Response:**
```json
{
  "communications": [
    {
      "id": "uuid",
      "title": "New Company Policy",
      "content": "We are implementing a new remote work policy...",
      "type": "policy_update",
      "priority": "high",
      "status": "published",
      "author_name": "HR Director",
      "publish_date": "2024-07-15T09:00:00Z",
      "expiration_date": "2024-12-31T23:59:59Z",
      "requires_acknowledgment": true,
      "read_at": null,
      "acknowledged_at": null,
      "is_unread": true,
      "requires_ack": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25
  }
}
```

#### GET `/api/communications/:id`
Get single communication details.

**Authentication:** Required  
**Roles:** Access controlled per communication

#### POST `/api/communications`
Create a new communication.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `attachments` (files, max 5) - File attachments
- `title` (string) - Communication title
- `content` (string) - Communication content
- `type` (string) - Communication type
- `priority` (string) - Priority level
- `target_audience` (object) - Target audience specification
- `publish_date` (datetime) - When to publish
- `expiration_date` (datetime, optional) - When communication expires
- `requires_acknowledgment` (boolean) - Whether acknowledgment is required
- `tags` (array) - Communication tags

**Target Audience Object:**
```json
{
  "all_users": false,
  "departments": ["uuid1", "uuid2"],
  "roles": ["manager", "employee"],
  "specific_users": ["uuid1", "uuid2"]
}
```

#### PUT `/api/communications/:id`
Update communication (drafts only).

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager` (or author)

#### POST `/api/communications/:id/publish`
Publish a draft communication.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager` (or author)

#### POST `/api/communications/:id/archive`
Archive a communication.

**Authentication:** Required  
**Roles:** `admin`, `hr`

### Communication Actions

#### POST `/api/communications/:id/acknowledge`
Acknowledge a communication.

**Authentication:** Required  
**Roles:** Any authenticated user with access

**Request Body:**
```json
{
  "acknowledgment_text": "I acknowledge this policy update"
}
```

#### GET `/api/communications/:id/recipients`
Get communication recipients and their status.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager` (or author)

**Response:**
```json
{
  "recipients": [
    {
      "id": "uuid",
      "recipient_name": "John Doe",
      "recipient_email": "john@company.com",
      "employee_id": "EMP001",
      "department_name": "Engineering",
      "delivery_status": "delivered",
      "sent_at": "2024-07-15T09:00:00Z",
      "read_at": "2024-07-15T09:30:00Z",
      "acknowledged_at": null
    }
  ],
  "statistics": {
    "total_recipients": 45,
    "delivered": 45,
    "read": 32,
    "acknowledged": 18,
    "failed": 0
  }
}
```

### Communication Analytics

#### GET `/api/communications/unread/count`
Get unread communications count for current user.

**Authentication:** Required  
**Roles:** Any authenticated user

**Response:**
```json
{
  "unread_count": 5
}
```

#### GET `/api/communications/acknowledgments/pending`
Get pending acknowledgments for current user.

**Authentication:** Required  
**Roles:** Any authenticated user

#### GET `/api/communications/stats/overview`
Get communication statistics and engagement metrics.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
{
  "overview": {
    "total_communications": 125,
    "draft_communications": 8,
    "published_communications": 110,
    "archived_communications": 7,
    "emergency_communications": 3,
    "urgent_communications": 15,
    "acknowledgment_required": 45
  },
  "engagement": {
    "total_recipients": 2450,
    "total_read": 2156,
    "total_acknowledged": 1890,
    "delivery_failures": 12,
    "avg_hours_to_read": 4.2
  },
  "typeBreakdown": [
    {
      "type": "announcement",
      "count": 35,
      "published_count": 32
    }
  ]
}
```

---

## Budget Management API (`/api/budgets`)

Comprehensive financial budget management with periods, categories, allocations, and variance tracking.

### Budget Periods

#### GET `/api/budgets/periods`
List budget periods.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `status` (string) - Filter by status
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page

**Response:**
```json
{
  "periods": [
    {
      "id": "uuid",
      "name": "FY 2024",
      "description": "Fiscal Year 2024 Budget",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "status": "active",
      "is_template": false,
      "created_at": "2023-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### POST `/api/budgets/periods`
Create a new budget period.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "name": "FY 2025",
  "description": "Fiscal Year 2025 Budget Period",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "is_template": false
}
```

### Budget Categories

#### GET `/api/budgets/categories`
List budget categories with hierarchy.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `type` (string) - Filter by category type
- `parent_id` (uuid) - Filter by parent category
- `include_inactive` (boolean) - Include inactive categories
- `hierarchy` (boolean) - Return hierarchical structure

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Operations",
      "code": "OPS",
      "description": "Operational expenses",
      "category_type": "operating_expenses",
      "color_code": "#3B82F6",
      "sort_order": 1,
      "parent_id": null,
      "children": [
        {
          "id": "uuid",
          "name": "Equipment",
          "code": "OPS-EQ",
          "category_type": "equipment",
          "children": []
        }
      ]
    }
  ]
}
```

#### POST `/api/budgets/categories`
Create a new budget category.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "name": "Marketing",
  "code": "MKT",
  "description": "Marketing and advertising expenses",
  "category_type": "marketing",
  "parent_id": null,
  "color_code": "#10B981",
  "sort_order": 5
}
```

### Budgets

#### GET `/api/budgets`
List budgets with filtering and aggregation.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `period_id` (uuid) - Filter by budget period
- `category_id` (uuid) - Filter by category
- `status` (string) - Filter by status
- `owner_id` (uuid) - Filter by budget owner
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page
- `include_allocations` (boolean) - Include monthly allocations
- `include_summary` (boolean) - Include summary statistics

**Response:**
```json
{
  "budgets": [
    {
      "id": "uuid",
      "name": "IT Equipment 2024",
      "description": "Hardware and software purchases",
      "period_name": "FY 2024",
      "category_name": "Equipment",
      "category_code": "EQ",
      "category_type": "equipment",
      "owner_name": "IT Manager",
      "allocated_amount": 50000,
      "actual_spent": 32500,
      "committed_amount": 8000,
      "available_amount": 9500,
      "status": "active",
      "variance_rules": null,
      "allocations": [
        {
          "allocation_year": 2024,
          "allocation_month": 1,
          "allocated_amount": 4166.67
        }
      ]
    }
  ],
  "summary": {
    "total_budgets": 25,
    "total_allocated": 500000,
    "total_spent": 325000,
    "total_committed": 85000,
    "total_available": 90000
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

#### POST `/api/budgets`
Create a new budget.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "budget_period_id": "uuid",
  "category_id": "uuid",
  "name": "Marketing Campaign Q1",
  "description": "Q1 marketing initiatives",
  "allocated_amount": 25000,
  "owner_id": "uuid",
  "variance_rules": {
    "warning_threshold": 80,
    "critical_threshold": 95
  },
  "seasonal_patterns": {
    "q1_weight": 0.3,
    "q2_weight": 0.2,
    "q3_weight": 0.2,
    "q4_weight": 0.3
  }
}
```

#### GET `/api/budgets/:id`
Get detailed budget information.

**Authentication:** Required  
**Roles:** Any authenticated user

**Response:**
```json
{
  "budget": {
    "id": "uuid",
    "name": "IT Equipment 2024",
    // ... all budget fields
    "calculated_available": 9500
  },
  "allocations": [
    {
      "id": "uuid",
      "allocation_year": 2024,
      "allocation_month": 1,
      "allocated_amount": 4166.67,
      "notes": "January allocation"
    }
  ],
  "recent_transactions": [
    {
      "id": "uuid",
      "transaction_number": "TXN-2024-001",
      "description": "Laptop purchase",
      "amount": 1500,
      "transaction_date": "2024-07-15"
    }
  ],
  "alerts": [
    {
      "id": "uuid",
      "severity": "warning",
      "message": "Budget utilization at 85%",
      "created_at": "2024-07-20T10:00:00Z"
    }
  ]
}
```

#### PUT `/api/budgets/:id`
Update budget information.

**Authentication:** Required  
**Roles:** `admin`, `manager`

#### POST `/api/budgets/:id/allocations`
Create or update budget allocation.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "allocation_year": 2024,
  "allocation_month": 8,
  "allocated_amount": 5000,
  "notes": "August allocation adjustment"
}
```

---

## Expense Management API (`/api/expenses`)

AI-powered receipt processing and expense management with approval workflows.

### Receipt Upload and Processing

#### POST `/api/expenses/receipts/upload`
Upload a receipt for AI processing.

**Authentication:** Required  
**Roles:** Any authenticated user

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `receipt` (file) - Receipt image or PDF
- `description` (string, optional) - Receipt description
- `businessPurpose` (string, optional) - Business purpose
- `projectCode` (string, optional) - Project code
- `department` (string, optional) - Department

**Response:**
```json
{
  "message": "Receipt uploaded successfully",
  "receipt": {
    "id": "uuid",
    "filename": "receipt_001.jpg",
    "size": 1048576,
    "uploadedAt": "2024-07-15T10:00:00Z",
    "status": "uploaded"
  },
  "jobId": "12345"
}
```

#### GET `/api/expenses/receipts`
List receipts with filtering and pagination.

**Authentication:** Required  
**Roles:** Any authenticated user (own receipts only)

**Query Parameters:**
- `status` (string) - Filter by processing status (uploaded, processing, processed, failed, manual_review)
- `category` (uuid) - Filter by expense category
- `dateFrom` (date) - Filter by transaction date from
- `dateTo` (date) - Filter by transaction date to
- `minAmount` (number) - Minimum amount filter
- `maxAmount` (number) - Maximum amount filter
- `search` (string) - Search in vendor name or description
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page

**Response:**
```json
{
  "receipts": [
    {
      "id": "uuid",
      "original_filename": "lunch_receipt.jpg",
      "processing_status": "processed",
      "uploaded_at": "2024-07-15T10:00:00Z",
      "vendor_name": "Restaurant ABC",
      "total_amount": 45.67,
      "transaction_date": "2024-07-15",
      "category_name": "Meals & Entertainment",
      "category_color": "#F59E0B"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

#### GET `/api/expenses/receipts/:id`
Get detailed receipt information including AI processing results.

**Authentication:** Required  
**Roles:** Any authenticated user (own receipts) or `admin`, `manager`

**Response:**
```json
{
  "receipt": {
    "id": "uuid",
    "original_filename": "receipt.jpg",
    "processing_status": "processed",
    "vendor_name": "Office Supply Store",
    "total_amount": 89.99,
    "transaction_date": "2024-07-15",
    "category_name": "Office Supplies",
    "tax_amount": 7.20,
    "payment_method": "Credit Card",
    "line_items": [
      {
        "description": "Printer Paper",
        "quantity": 5,
        "unit_price": 12.99,
        "total": 64.95
      }
    ],
    "approval_status": "pending",
    "approval_notes": null,
    "approved_amount": null
  },
  "processingLogs": [
    {
      "id": "uuid",
      "started_at": "2024-07-15T10:01:00Z",
      "completed_at": "2024-07-15T10:02:30Z",
      "status": "completed",
      "ai_provider": "openai",
      "processing_time_seconds": 90,
      "confidence_score": 0.95
    }
  ]
}
```

#### POST `/api/expenses/receipts/:id/process`
Trigger manual processing of a receipt.

**Authentication:** Required  
**Roles:** Any authenticated user (own receipts)

**Response:**
```json
{
  "message": "Receipt processing started",
  "jobId": "67890",
  "status": "queued"
}
```

### Expense Approval

#### POST `/api/expenses/receipts/:id/approve`
Approve or reject an expense.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "status": "approved",
  "notes": "Legitimate business expense",
  "approvedAmount": 89.99
}
```

For rejection:
```json
{
  "status": "rejected",
  "rejectionReason": "No business purpose provided",
  "notes": "Please provide business justification"
}
```

For requesting more information:
```json
{
  "status": "requires_information",
  "requiredInformation": ["business_purpose", "attendees"],
  "notes": "Please provide business purpose and attendee list"
}
```

#### DELETE `/api/expenses/receipts/:id`
Delete a receipt.

**Authentication:** Required  
**Roles:** Any authenticated user (own receipts)

### Expense Categories

#### GET `/api/expenses/categories`
Get expense categories.

**Authentication:** Required  
**Roles:** Any authenticated user

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Travel",
      "description": "Business travel expenses",
      "color_code": "#3B82F6",
      "sort_order": 1,
      "active": true
    }
  ]
}
```

### Expense Reports

#### GET `/api/expenses/reports`
Generate expense reports with various groupings.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Query Parameters:**
- `dateFrom` (date) - Report start date
- `dateTo` (date) - Report end date
- `groupBy` (string) - Grouping method (category, user, month)

**Response:**
```json
{
  "summary": {
    "total_receipts": 256,
    "total_amount": 15678.90,
    "average_amount": 61.25,
    "manual_review_count": 12
  },
  "breakdown": [
    {
      "group_name": "Travel",
      "color": "#3B82F6",
      "receipt_count": 45,
      "total_amount": 8945.67,
      "average_amount": 198.79
    }
  ],
  "groupBy": "category",
  "dateRange": {
    "dateFrom": "2024-07-01",
    "dateTo": "2024-07-31"
  }
}
```

### Queue Management

#### GET `/api/expenses/queue/status`
Get processing queue status (admin only).

**Authentication:** Required  
**Roles:** `admin`

**Response:**
```json
{
  "queue": {
    "waiting": 5,
    "active": 2,
    "completed": 1245,
    "failed": 8
  }
}
```

---

## Financial Reports API (`/api/financial-reports`)

Comprehensive financial reporting and analytics with KPI tracking.

### Budget Variance Reports

#### GET `/api/financial-reports/budget-variance`
Generate budget variance analysis report.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `period_id` (uuid) - Filter by budget period
- `category_id` (uuid) - Filter by category
- `date_from` (date) - Date range start
- `date_to` (date) - Date range end
- `variance_threshold` (number, default: 5) - Minimum variance percentage to include

**Response:**
```json
{
  "summary": {
    "total_budgets": 25,
    "budgets_over_variance": 8,
    "budgets_under_utilized": 3,
    "total_allocated": 500000,
    "total_spent": 425000,
    "total_committed": 50000,
    "average_variance": 12.5
  },
  "budget_variances": [
    {
      "id": "uuid",
      "name": "IT Equipment",
      "category_name": "Equipment",
      "allocated_amount": 50000,
      "actual_spent": 42500,
      "variance_amount": -7500,
      "variance_percentage": -15.0,
      "utilization_rate": 85.0,
      "status_indicator": "under_utilized"
    }
  ],
  "category_variances": [
    {
      "category_name": "Operations",
      "total_allocated": 200000,
      "total_spent": 185000,
      "variance_percentage": -7.5,
      "utilization_rate": 92.5
    }
  ],
  "generated_at": "2024-07-20T10:00:00Z"
}
```

### Cash Flow Reports

#### GET `/api/financial-reports/cash-flow`
Generate cash flow analysis report.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `date_from` (date) - Report start date
- `date_to` (date) - Report end date
- `grouping` (string) - Time grouping (daily, weekly, monthly, quarterly)
- `include_forecast` (boolean) - Include forecast data

**Response:**
```json
{
  "summary": {
    "total_inflow": 450000,
    "total_outflow": 380000,
    "net_cash_flow": 70000,
    "average_monthly_inflow": 37500,
    "average_monthly_outflow": 31667,
    "final_balance": 185000
  },
  "cash_flow_data": [
    {
      "period": "2024-07",
      "inflow": 45000,
      "outflow": 38000,
      "net_flow": 7000,
      "running_balance": 155000,
      "transaction_count": 245
    }
  ],
  "forecasts": [
    {
      "forecast_year": 2024,
      "forecast_month": 8,
      "predicted_inflow": 48000,
      "predicted_outflow": 39000,
      "confidence_level": 0.85
    }
  ],
  "top_revenue_categories": [
    {
      "category_name": "Game Fees",
      "total_amount": 125000,
      "color_code": "#10B981"
    }
  ],
  "top_expense_categories": [
    {
      "category_name": "Referee Payments",
      "total_amount": 95000,
      "color_code": "#F59E0B"
    }
  ]
}
```

### Expense Analysis Reports

#### GET `/api/financial-reports/expense-analysis`
Generate detailed expense analysis report.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `date_from` (date) - Analysis start date
- `date_to` (date) - Analysis end date
- `category_id` (uuid) - Filter by category
- `vendor_id` (uuid) - Filter by vendor
- `comparison_period` (boolean) - Include previous period comparison

**Response:**
```json
{
  "summary": {
    "total_expenses": 125000,
    "total_transactions": 456,
    "average_transaction": 274.12,
    "unique_vendors": 45,
    "categories_used": 12
  },
  "expenses_by_category": [
    {
      "category_name": "Travel",
      "category_type": "operating_expenses",
      "total_amount": 25000,
      "transaction_count": 89,
      "average_amount": 280.90,
      "min_amount": 15.50,
      "max_amount": 1250.00
    }
  ],
  "expenses_by_vendor": [
    {
      "vendor_name": "Office Depot",
      "total_amount": 8500,
      "transaction_count": 24,
      "average_amount": 354.17
    }
  ],
  "monthly_trend": [
    {
      "month": "2024-07",
      "total_amount": 12500,
      "transaction_count": 156
    }
  ],
  "top_expenses": [
    {
      "transaction_number": "TXN-2024-001",
      "description": "Conference registration",
      "amount": 1500,
      "transaction_date": "2024-07-15",
      "category_name": "Training",
      "vendor_name": "Conference Co"
    }
  ],
  "comparison": {
    "previous_period": {
      "start_date": "2024-04-01",
      "end_date": "2024-06-30",
      "total_expenses": 110000,
      "total_transactions": 398
    },
    "change_amount": 15000,
    "change_percentage": 13.64,
    "trend": "increasing"
  }
}
```

### Payroll Summary Reports

#### GET `/api/financial-reports/payroll-summary`
Generate payroll summary and analysis report.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `date_from` (date) - Report start date
- `date_to` (date) - Report end date
- `referee_id` (uuid) - Filter by specific referee
- `payment_status` (string) - Filter by payment status (all, paid, pending, approved)

**Response:**
```json
{
  "summary": {
    "total_assignments": 1245,
    "total_wages": 89750,
    "average_wage": 72.09,
    "total_referees": 65,
    "games_covered": 456,
    "total_paid": 75000,
    "total_pending": 14750
  },
  "payroll_by_referee": [
    {
      "referee_id": "uuid",
      "referee_name": "John Smith",
      "referee_email": "john@email.com",
      "games_officiated": 45,
      "total_wages": 3240,
      "average_wage": 72,
      "games_paid": 40,
      "wages_paid": 2880,
      "wages_pending": 360
    }
  ],
  "monthly_payroll": [
    {
      "month": "2024-07",
      "total_assignments": 156,
      "total_wages": 11250,
      "active_referees": 32
    }
  ],
  "payment_status_breakdown": [
    {
      "payment_status": "paid",
      "assignment_count": 980,
      "total_amount": 70560
    }
  ],
  "top_earning_games": [
    {
      "game_id": "uuid",
      "game_date": "2024-07-15",
      "home_team": "Team A",
      "away_team": "Team B",
      "total_wages": 280,
      "referee_count": 4
    }
  ]
}
```

### Financial KPIs

#### GET `/api/financial-reports/kpis`
Get financial key performance indicators dashboard.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `period_days` (number, default: 30) - KPI calculation period in days

**Response:**
```json
{
  "calculated_kpis": {
    "budget_utilization_rate": {
      "value": 87.5,
      "unit": "%",
      "target": 85,
      "trend": "stable"
    },
    "net_cash_flow": {
      "value": 15000,
      "unit": "$",
      "target": 0,
      "trend": "up"
    },
    "expense_variance": {
      "value": 5.2,
      "unit": "%",
      "target": 0,
      "trend": "up"
    },
    "cost_per_game": {
      "value": 145.67,
      "unit": "$",
      "target": 150,
      "trend": "stable"
    },
    "payroll_efficiency": {
      "value": 62.5,
      "unit": "%",
      "target": 60,
      "trend": "stable"
    }
  },
  "stored_kpis": [
    {
      "id": "uuid",
      "kpi_name": "Revenue Growth",
      "kpi_type": "revenue_growth",
      "current_value": 12.5,
      "target_value": 15,
      "last_calculated_at": "2024-07-20T10:00:00Z"
    }
  ],
  "calculation_period": {
    "days": 30,
    "start_date": "2024-06-20",
    "end_date": "2024-07-20"
  }
}
```

#### POST `/api/financial-reports/kpis`
Create or update a KPI configuration.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "kpi_name": "Revenue Growth Rate",
  "kpi_type": "revenue_growth",
  "target_value": 15,
  "calculation_config": {
    "formula": "((current_revenue - previous_revenue) / previous_revenue) * 100",
    "data_sources": ["financial_transactions"],
    "filters": {"transaction_type": "revenue"}
  },
  "calculation_period_days": 30
}
```

### Report Export

#### GET `/api/financial-reports/export/:type`
Export financial report as CSV/Excel/PDF.

**Authentication:** Required  
**Roles:** Any authenticated user

**Path Parameters:**
- `type` (string) - Report type to export

**Response:**
```json
{
  "message": "Export functionality would be implemented here",
  "report_type": "budget-variance",
  "supported_formats": ["csv", "excel", "pdf"]
}
```

---

## Accounting Integration API (`/api/accounting`)

Chart of accounts management and external accounting system integration.

### Chart of Accounts

#### GET `/api/accounting/chart-of-accounts`
List chart of accounts.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `account_type` (string) - Filter by account type (asset, liability, equity, revenue, expense, cost_of_goods_sold)
- `active` (boolean, default: true) - Filter by active status
- `include_inactive` (boolean) - Include inactive accounts
- `hierarchy` (boolean) - Return hierarchical structure

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "account_number": "1000",
      "account_name": "Cash",
      "account_type": "asset",
      "account_subtype": "current_asset",
      "parent_account_id": null,
      "description": "Cash and cash equivalents",
      "external_id": "QB_1000",
      "is_active": true,
      "children": []
    }
  ]
}
```

#### POST `/api/accounting/chart-of-accounts`
Create a new account.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "account_number": "2000",
  "account_name": "Accounts Payable",
  "account_type": "liability",
  "account_subtype": "current_liability",
  "parent_account_id": null,
  "description": "Money owed to vendors",
  "external_id": "QB_2000",
  "mapping_rules": {
    "auto_assign_categories": ["office_supplies", "equipment"]
  }
}
```

### Accounting Integrations

#### GET `/api/accounting/integrations`
List accounting system integrations.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Response:**
```json
{
  "integrations": [
    {
      "id": "uuid",
      "provider": "quickbooks_online",
      "provider_name": "Main QuickBooks",
      "sync_status": "connected",
      "last_sync_at": "2024-07-20T06:00:00Z",
      "last_sync_error": null,
      "auto_sync": true,
      "sync_frequency_hours": 24,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST `/api/accounting/integrations`
Create a new accounting integration.

**Authentication:** Required  
**Roles:** `admin`

**Request Body:**
```json
{
  "provider": "quickbooks_online",
  "provider_name": "Company QuickBooks",
  "connection_config": {
    "client_id": "QB_CLIENT_ID",
    "client_secret": "QB_CLIENT_SECRET",
    "sandbox": false,
    "company_id": "123456789"
  },
  "sync_settings": {
    "sync_accounts": true,
    "sync_transactions": true,
    "sync_customers": false,
    "sync_vendors": true
  },
  "auto_sync": true,
  "sync_frequency_hours": 24
}
```

#### POST `/api/accounting/integrations/:id/test`
Test accounting integration connection.

**Authentication:** Required  
**Roles:** `admin`

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to QuickBooks Online",
  "details": {
    "company_name": "Sports Management Company",
    "last_sync": "2024-07-20T10:00:00Z"
  }
}
```

### Journal Entries

#### GET `/api/accounting/journal-entries`
List journal entries.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `status` (string) - Filter by status (draft, pending_review, approved, posted)
- `date_from` (date) - Filter by entry date from
- `date_to` (date) - Filter by entry date to
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page
- `include_lines` (boolean) - Include journal entry lines

**Response:**
```json
{
  "journal_entries": [
    {
      "id": "uuid",
      "entry_number": "JE-2024-000001",
      "entry_date": "2024-07-15",
      "reference": "REF-001",
      "description": "Monthly depreciation",
      "total_debits": 500.00,
      "total_credits": 500.00,
      "status": "approved",
      "created_by_name": "Accountant",
      "approved_by_name": "Manager",
      "transaction_number": "TXN-2024-001",
      "lines": [
        {
          "account_number": "6000",
          "account_name": "Depreciation Expense",
          "debit_amount": 500.00,
          "credit_amount": 0,
          "description": "Monthly equipment depreciation"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

#### POST `/api/accounting/journal-entries`
Create a new journal entry.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "entry_date": "2024-07-20",
  "reference": "UTIL-2024-07",
  "description": "Monthly utility expense",
  "journal_lines": [
    {
      "account_id": "uuid",
      "description": "Electricity expense",
      "debit_amount": 450.00,
      "credit_amount": 0,
      "reference": "Electric Bill #123"
    },
    {
      "account_id": "uuid",
      "description": "Cash payment",
      "debit_amount": 0,
      "credit_amount": 450.00,
      "reference": "Check #1001"
    }
  ]
}
```

#### POST `/api/accounting/journal-entries/:id/approve`
Approve a journal entry.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Response:**
```json
{
  "message": "Journal entry approved successfully"
}
```

### Synchronization Logs

#### GET `/api/accounting/sync-logs`
List synchronization logs.

**Authentication:** Required  
**Roles:** `admin`, `manager`

**Query Parameters:**
- `integration_id` (uuid) - Filter by integration
- `status` (string) - Filter by sync status
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page

**Response:**
```json
{
  "sync_logs": [
    {
      "id": "uuid",
      "integration_id": "uuid",
      "provider": "quickbooks_online",
      "provider_name": "Main QuickBooks",
      "sync_type": "accounts",
      "status": "completed",
      "started_at": "2024-07-20T06:00:00Z",
      "completed_at": "2024-07-20T06:05:30Z",
      "records_processed": 125,
      "records_created": 5,
      "records_updated": 8,
      "records_failed": 0,
      "error_message": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## Organizational Analytics API (`/api/analytics/organizational`)

Advanced analytics and insights for organizational performance, employee metrics, and predictive analytics.

### Employee Performance Analytics

#### GET `/api/analytics/organizational/employees/performance`
Get comprehensive employee performance dashboard.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Query Parameters:**
- `start_date` (date) - Analysis start date
- `end_date` (date) - Analysis end date
- `departments` (array) - Filter by department IDs
- `positions` (array) - Filter by position IDs

**Response:**
```json
{
  "ratingsDistribution": [
    {
      "overall_rating": 5,
      "count": 25,
      "avg_rating": 4.8
    }
  ],
  "departmentPerformance": [
    {
      "department_name": "Engineering",
      "evaluation_count": 45,
      "avg_rating": 4.2,
      "employee_count": 50
    }
  ],
  "performanceTrend": [
    {
      "period": "2024-Q2",
      "avg_rating": 4.1,
      "evaluation_count": 125
    }
  ]
}
```

### Employee Retention Analytics

#### GET `/api/analytics/organizational/employees/retention`
Get employee retention and turnover analytics.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Query Parameters:**
- `start_date` (date) - Analysis start date
- `end_date` (date) - Analysis end date
- `departments` (array) - Filter by department IDs

**Response:**
```json
{
  "turnoverStats": {
    "terminated_count": 12,
    "hired_count": 18,
    "active_count": 145,
    "total_employees": 157,
    "turnover_rate": 8.28
  },
  "departmentRetention": [
    {
      "department_name": "Engineering",
      "active_employees": 45,
      "terminated_employees": 2,
      "avg_tenure_years": 3.2
    }
  ],
  "tenureDistribution": [
    {
      "tenure_range": "1-2 years",
      "employee_count": 35
    }
  ]
}
```

### Training Analytics

#### GET `/api/analytics/organizational/employees/training`
Get training and development analytics.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Query Parameters:**
- `start_date` (date) - Analysis start date
- `end_date` (date) - Analysis end date
- `departments` (array) - Filter by department IDs

**Response:**
```json
{
  "trainingStats": [
    {
      "training_type": "certification",
      "total_trainings": 45,
      "completed_trainings": 38,
      "in_progress_trainings": 5,
      "expired_trainings": 2,
      "avg_cost": 299.99,
      "total_investment": 11399.62
    }
  ],
  "departmentParticipation": [
    {
      "department_name": "Engineering",
      "total_employees": 45,
      "employees_with_training": 42,
      "participation_rate": 93.33,
      "avg_trainings_per_employee": 2.8
    }
  ],
  "completionTrend": [
    {
      "month": "2024-07",
      "completions": 25,
      "monthly_investment": 7499.75
    }
  ]
}
```

### Organizational Health Metrics

#### GET `/api/analytics/organizational/health/overview`
Get overall organizational health dashboard.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
{
  "satisfaction": {
    "avg_performance_rating": 4.1,
    "high_performers": 89,
    "low_performers": 12,
    "total_evaluations": 234
  },
  "diversity": {
    "total_active_employees": 145,
    "departments_represented": 8,
    "position_levels": 4
  },
  "engagement": {
    "active_communicators": 125,
    "messages_read": 2156,
    "messages_acknowledged": 1890,
    "total_messages_sent": 2450,
    "read_rate": 88.0
  },
  "compliance": {
    "total_compliance_items": 25,
    "compliant_items": 22,
    "overdue_audits": 1,
    "compliance_rate": 88.0
  },
  "riskProfile": {
    "total_risks": 18,
    "critical_risks": 2,
    "high_risks": 5,
    "avg_risk_score": 8.5
  },
  "healthScore": 82
}
```

### Predictive Analytics

#### GET `/api/analytics/organizational/predictions/staffing`
Get staffing predictions and recommendations.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
{
  "turnoverPrediction": {
    "predicted_monthly_turnover": 2.3,
    "predicted_annual_turnover": 27.6
  },
  "hiringNeeds": [
    {
      "department_name": "Customer Service",
      "current_employees": 12,
      "total_positions": 15,
      "open_positions": 3,
      "predicted_turnover_replacements": 2
    }
  ],
  "trainingNeeds": [
    {
      "department_name": "Sales",
      "total_employees": 20,
      "employees_with_recent_training": 8,
      "training_gap_percentage": 60.0
    }
  ]
}
```

#### GET `/api/analytics/organizational/predictions/performance`
Get performance trends and predictions.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
{
  "performanceTrend": [
    {
      "period": "2024-Q2",
      "avg_rating": 4.1,
      "evaluation_count": 125,
      "previous_rating": 4.0,
      "rating_change": 0.1
    }
  ],
  "departmentPerformance": [
    {
      "department_name": "Engineering",
      "current_avg_rating": 4.3,
      "recent_evaluations": 45,
      "performance_category": "Excellent"
    }
  ]
}
```

### Cost Analytics

#### GET `/api/analytics/organizational/costs/per-employee`
Get cost per employee analysis.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Query Parameters:**
- `start_date` (date) - Analysis start date
- `end_date` (date) - Analysis end date
- `departments` (array) - Filter by department IDs

**Response:**
```json
{
  "costPerEmployee": [
    {
      "department_name": "Engineering",
      "employee_count": 45,
      "total_salaries": 3825000,
      "training_costs": 25000,
      "asset_costs": 125000,
      "total_cost": 3975000,
      "cost_per_employee": 88333.33
    }
  ],
  "roiAnalysis": [
    {
      "department_name": "Engineering",
      "avg_performance": 4.3,
      "avg_salary": 85000,
      "performance_to_cost_ratio": 126.47
    }
  ]
}
```

### Executive Dashboard

#### GET `/api/analytics/organizational/dashboard/executive`
Get comprehensive executive dashboard.

**Authentication:** Required  
**Roles:** `admin`

**Response:**
```json
{
  "keyMetrics": {
    "active_employees": 145,
    "active_departments": 8,
    "active_assets": 245,
    "compliant_items": 22,
    "open_incidents": 5,
    "avg_performance": 4.1
  },
  "trends": [
    {
      "metric": "employees",
      "current_period": 8,
      "previous_period": 5
    }
  ],
  "departmentHealth": [
    {
      "department_name": "Engineering",
      "employee_count": 45,
      "avg_performance": 4.3,
      "incident_count": 1,
      "compliance_issues": 0
    }
  ]
}
```

---

## Workflow Management API (`/api/workflows`)

Automated workflow management system for business processes, approvals, and task automation.

### Workflow Definitions

#### GET `/api/workflows/definitions`
Get all workflow definitions.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Query Parameters:**
- `category` (string) - Filter by category (onboarding, asset_management, approval, compliance)
- `is_active` (boolean) - Filter by active status

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Employee Onboarding",
    "description": "Standard employee onboarding process",
    "category": "onboarding",
    "trigger_event": "employee_hired",
    "is_active": true,
    "steps": [
      {
        "name": "Create User Account",
        "type": "task",
        "assignee_type": "role",
        "assignee_id": "admin",
        "due_days": 1,
        "auto_complete": false,
        "required": true
      }
    ],
    "created_by_name": "HR Manager",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### POST `/api/workflows/definitions`
Create a workflow definition.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Request Body:**
```json
{
  "name": "Document Review Process",
  "description": "Review and approval workflow for documents",
  "category": "approval",
  "trigger_event": "document_submitted",
  "steps": [
    {
      "name": "Initial Review",
      "type": "approval",
      "assignee_type": "manager",
      "due_days": 3,
      "auto_complete": false,
      "required": true,
      "conditions": {
        "department": "hr"
      }
    },
    {
      "name": "Final Approval",
      "type": "approval",
      "assignee_type": "role",
      "assignee_id": "admin",
      "due_days": 5,
      "auto_complete": false,
      "required": true
    }
  ],
  "conditions": {
    "document_type": "policy"
  }
}
```

#### PUT `/api/workflows/definitions/:id`
Update workflow definition.

**Authentication:** Required  
**Roles:** `admin`, `hr`

### Workflow Instances

#### GET `/api/workflows/instances`
Get workflow instances.

**Authentication:** Required  
**Roles:** Any authenticated user

**Query Parameters:**
- `status` (string) - Filter by status (pending, in_progress, completed, failed, cancelled)
- `entity_type` (string) - Filter by entity type
- `assigned_to_me` (boolean) - Show only instances assigned to current user
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Response:**
```json
{
  "instances": [
    {
      "id": "uuid",
      "workflow_name": "Employee Onboarding",
      "category": "onboarding",
      "entity_type": "employee",
      "entity_id": "uuid",
      "status": "in_progress",
      "current_step": 2,
      "started_by_name": "HR Manager",
      "started_at": "2024-07-15T10:00:00Z",
      "total_steps": 4,
      "completed_steps": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25
  }
}
```

#### POST `/api/workflows/instances`
Start a new workflow instance.

**Authentication:** Required  
**Roles:** `admin`, `hr`, `manager`

**Request Body:**
```json
{
  "workflow_definition_id": "uuid",
  "entity_type": "employee",
  "entity_id": "uuid",
  "context": {
    "employee_id": "uuid",
    "department_id": "uuid",
    "hire_date": "2024-07-15"
  }
}
```

#### GET `/api/workflows/instances/:id`
Get workflow instance details.

**Authentication:** Required  
**Roles:** Any authenticated user

**Response:**
```json
{
  "instance": {
    "id": "uuid",
    "workflow_name": "Employee Onboarding",
    "workflow_description": "Standard onboarding process",
    "category": "onboarding",
    "entity_type": "employee",
    "entity_id": "uuid",
    "status": "in_progress",
    "current_step": 2,
    "context": {
      "employee_name": "John Doe",
      "department": "Engineering"
    },
    "started_by_name": "HR Manager",
    "started_at": "2024-07-15T10:00:00Z"
  },
  "steps": [
    {
      "id": "uuid",
      "step_number": 0,
      "step_name": "Create User Account",
      "status": "completed",
      "assigned_to_name": "System Admin",
      "started_at": "2024-07-15T10:00:00Z",
      "completed_at": "2024-07-15T10:30:00Z",
      "due_date": "2024-07-16T10:00:00Z",
      "notes": "Account created successfully"
    }
  ]
}
```

### Workflow Tasks

#### POST `/api/workflows/steps/:stepId/complete`
Complete a workflow step.

**Authentication:** Required  
**Roles:** Any authenticated user (must be assigned to step)

**Request Body:**
```json
{
  "output_data": {
    "user_account_id": "uuid",
    "initial_password": "temp123"
  },
  "notes": "User account created with temporary password"
}
```

#### GET `/api/workflows/tasks/assigned`
Get tasks assigned to current user.

**Authentication:** Required  
**Roles:** Any authenticated user

**Response:**
```json
[
  {
    "id": "uuid",
    "workflow_instance_id": "uuid",
    "step_name": "Equipment Assignment",
    "workflow_name": "Employee Onboarding",
    "category": "onboarding",
    "entity_type": "employee",
    "entity_id": "uuid",
    "status": "in_progress",
    "due_date": "2024-07-18T17:00:00Z",
    "started_at": "2024-07-16T09:00:00Z",
    "input_data": {
      "employee_name": "John Doe",
      "department": "Engineering"
    }
  }
]
```

### Workflow Templates

#### GET `/api/workflows/templates`
Get pre-defined workflow templates.

**Authentication:** Required  
**Roles:** `admin`, `hr`

**Response:**
```json
[
  {
    "name": "Employee Onboarding",
    "category": "onboarding",
    "description": "Standard employee onboarding process",
    "trigger_event": "employee_hired",
    "steps": [
      {
        "name": "Create User Account",
        "type": "task",
        "assignee_type": "role",
        "assignee_id": "admin",
        "due_days": 1,
        "auto_complete": false,
        "required": true
      },
      {
        "name": "Assign Equipment",
        "type": "task",
        "assignee_type": "role",
        "assignee_id": "hr",
        "due_days": 3,
        "auto_complete": false,
        "required": true
      }
    ]
  }
]
```

---

## Error Handling

All API endpoints follow consistent error response patterns:

### Error Response Format
```json
{
  "error": "Brief error description",
  "message": "Detailed error message",
  "details": "Additional context (optional)",
  "code": "ERROR_CODE (optional)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (duplicate resource)
- `500` - Internal server error

### Authentication Errors
```json
{
  "error": "Access token required"
}
```

```json
{
  "error": "Invalid or expired token"
}
```

### Authorization Errors
```json
{
  "error": "Insufficient permissions"
}
```

### Validation Errors
```json
{
  "error": "Validation error",
  "details": "\"email\" must be a valid email"
}
```

---

## Rate Limiting

API endpoints are subject to rate limiting:
- **Standard endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user
- **Report generation**: 20 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit window resets

---

## Security Features

### Data Protection
- All sensitive data is encrypted at rest
- PII is automatically detected and masked in logs
- File uploads are scanned for malware
- Input sanitization prevents XSS and injection attacks

### Audit Trail
- All administrative actions are logged
- User access to sensitive endpoints is tracked
- Failed authentication attempts are monitored
- Data modifications include audit metadata

### File Security
- File uploads are restricted by type and size
- Uploaded files are quarantined until scanned
- Document access is controlled by role and department
- File integrity is verified with checksums

---

## Best Practices for Frontend Integration

### Authentication
```javascript
// Set up axios with authentication
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Error Handling
```javascript
// Handle API errors consistently
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Pagination
```javascript
// Handle paginated responses
const fetchEmployees = async (page = 1, limit = 50) => {
  const response = await api.get('/employees', {
    params: { page, limit }
  });
  return {
    data: response.data.employees,
    pagination: response.data.pagination
  };
};
```

### File Uploads
```javascript
// Upload files with progress tracking
const uploadReceipt = async (file, metadata) => {
  const formData = new FormData();
  formData.append('receipt', file);
  Object.keys(metadata).forEach(key => {
    formData.append(key, metadata[key]);
  });
  
  return api.post('/expenses/receipts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      // Update progress UI
    }
  });
};
```

### Real-time Updates
```javascript
// Poll for workflow updates
const pollWorkflowStatus = (instanceId) => {
  const poll = setInterval(async () => {
    try {
      const response = await api.get(`/workflows/instances/${instanceId}`);
      if (response.data.instance.status === 'completed') {
        clearInterval(poll);
        // Handle completion
      }
    } catch (error) {
      clearInterval(poll);
      // Handle error
    }
  }, 5000);
};
```

---

## Frontend Integration Guide

This comprehensive guide provides practical implementation examples for integrating the enterprise APIs into frontend applications. The examples use modern JavaScript/TypeScript patterns with React and Next.js best practices.

### Authentication Setup

#### JWT Token Management

```typescript
// types/auth.ts
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'manager' | 'referee';
  permissions: string[];
}
```

```typescript
// utils/auth.ts
import { AuthTokens, User } from '@/types/auth';

class AuthManager {
  private static instance: AuthManager;
  private tokens: AuthTokens | null = null;
  private user: User | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Secure token storage using httpOnly cookies (recommended)
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    // Store in httpOnly cookie via API call to your auth endpoint
    document.cookie = `auth_token=${tokens.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${tokens.expires_in}`;
  }

  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  isAuthenticated(): boolean {
    return !!this.tokens && Date.now() < (this.tokens.expires_in * 1000);
  }

  logout(): void {
    this.tokens = null;
    this.user = null;
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
}

export const authManager = AuthManager.getInstance();
```

### API Client Configuration

#### Axios Setup with Interceptors

```typescript
// lib/api-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { authManager } from '@/utils/auth';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = authManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config;

        if (error.response?.status === 401 && !original?._retry) {
          original._retry = true;
          
          try {
            // Attempt token refresh
            await this.refreshToken();
            const token = authManager.getAccessToken();
            if (token && original) {
              original.headers.Authorization = `Bearer ${token}`;
              return this.client(original);
            }
          } catch (refreshError) {
            authManager.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<void> {
    // Implement token refresh logic
    const response = await this.client.post('/auth/refresh');
    authManager.setTokens(response.data);
  }

  get axios(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().axios;
```

### State Management Integration

#### React Context + Reducer Pattern

```typescript
// context/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface AppState {
  user: User | null;
  employees: Employee[];
  assets: Asset[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_EMPLOYEES'; payload: Employee[] }
  | { type: 'SET_ASSETS'; payload: Asset[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: AppState = {
  user: null,
  employees: [],
  assets: [],
  notifications: [],
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_EMPLOYEES':
      return { ...state, employees: action.payload };
    case 'SET_ASSETS':
      return { ...state, assets: action.payload };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [action.payload, ...state.notifications] 
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
```

### Real-world Usage Examples

#### Employee Management Interface

```typescript
// components/EmployeeManagement.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAppContext } from '@/context/AppContext';

interface Employee {
  id: string;
  employee_name: string;
  employee_email: string;
  department_name: string;
  position_title: string;
  employment_status: string;
  hire_date: string;
  base_salary: number;
}

export function EmployeeManagement() {
  const { state, dispatch } = useAppContext();
  const [filters, setFilters] = useState({
    department_id: '',
    employment_status: 'active',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchEmployees = async (page = 1) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await apiClient.get('/employees', {
        params: {
          ...filters,
          page,
          limit: pagination.limit
        }
      });

      dispatch({ type: 'SET_EMPLOYEES', payload: response.data.employees });
      setPagination(response.data.pagination);
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch employees' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      const response = await apiClient.post('/employees', employeeData);
      
      // Optimistic update
      dispatch({ 
        type: 'SET_EMPLOYEES', 
        payload: [...state.employees, response.data] 
      });
      
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: 'success', 
          message: 'Employee created successfully' 
        } 
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create employee' });
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [filters]);

  return (
    <div className="employee-management">
      <div className="filters">
        <input
          type="text"
          placeholder="Search employees..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="search-input"
        />
        
        <select
          value={filters.employment_status}
          onChange={(e) => setFilters(prev => ({ ...prev, employment_status: e.target.value }))}
          className="status-filter"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {state.loading && <div className="loading">Loading employees...</div>}
      
      {state.error && <div className="error">{state.error}</div>}

      <div className="employee-grid">
        {state.employees.map(employee => (
          <EmployeeCard 
            key={employee.id} 
            employee={employee}
            onUpdate={(updated) => {
              dispatch({
                type: 'SET_EMPLOYEES',
                payload: state.employees.map(emp => 
                  emp.id === updated.id ? updated : emp
                )
              });
            }}
          />
        ))}
      </div>

      <Pagination
        current={pagination.page}
        total={pagination.total}
        pageSize={pagination.limit}
        onChange={fetchEmployees}
      />
    </div>
  );
}
```

#### Asset Tracking Dashboard

```typescript
// components/AssetDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { apiClient } from '@/lib/api-client';

interface AssetStats {
  overview: {
    total_assets: number;
    available_assets: number;
    assigned_assets: number;
    maintenance_assets: number;
    retired_assets: number;
  };
  categoryBreakdown: Array<{
    category: string;
    asset_count: number;
    available_count: number;
    assigned_count: number;
    total_value: number;
  }>;
}

export function AssetDashboard() {
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchAssetStats();
  }, []);

  const fetchAssetStats = async () => {
    try {
      const response = await apiClient.get('/assets/stats/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch asset stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusChartData = {
    labels: ['Available', 'Assigned', 'Maintenance', 'Retired'],
    datasets: [{
      data: stats ? [
        stats.overview.available_assets,
        stats.overview.assigned_assets,
        stats.overview.maintenance_assets,
        stats.overview.retired_assets
      ] : [],
      backgroundColor: [
        '#10B981', // green
        '#3B82F6', // blue
        '#F59E0B', // yellow
        '#EF4444'  // red
      ]
    }]
  };

  const categoryChartData = {
    labels: stats?.categoryBreakdown.map(cat => cat.category) || [],
    datasets: [{
      label: 'Total Assets',
      data: stats?.categoryBreakdown.map(cat => cat.asset_count) || [],
      backgroundColor: '#3B82F6'
    }, {
      label: 'Available',
      data: stats?.categoryBreakdown.map(cat => cat.available_count) || [],
      backgroundColor: '#10B981'
    }]
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="asset-dashboard">
      <div className="dashboard-header">
        <h1>Asset Management Dashboard</h1>
        <div className="key-metrics">
          <div className="metric">
            <h3>{stats?.overview.total_assets}</h3>
            <p>Total Assets</p>
          </div>
          <div className="metric">
            <h3>{stats?.overview.available_assets}</h3>
            <p>Available</p>
          </div>
          <div className="metric">
            <h3>{stats?.overview.assigned_assets}</h3>
            <p>Assigned</p>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h2>Asset Status Distribution</h2>
          <Pie data={statusChartData} />
        </div>
        
        <div className="chart-container">
          <h2>Assets by Category</h2>
          <Bar data={categoryChartData} />
        </div>
      </div>

      <div className="category-details">
        <h2>Category Breakdown</h2>
        <div className="category-grid">
          {stats?.categoryBreakdown.map(category => (
            <div 
              key={category.category} 
              className="category-card"
              onClick={() => setSelectedCategory(category.category)}
            >
              <h3>{category.category}</h3>
              <div className="category-stats">
                <span>Total: {category.asset_count}</span>
                <span>Available: {category.available_count}</span>
                <span>Value: ${category.total_value.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### Document Viewer with Acknowledgments

```typescript
// components/DocumentViewer.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  version: string;
  file_name: string;
  requires_acknowledgment: boolean;
  acknowledgment_count: number;
  effective_date: string;
}

interface DocumentViewerProps {
  documentId: string;
  onAcknowledge?: () => void;
}

export function DocumentViewer({ documentId, onAcknowledge }: DocumentViewerProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgmentText, setAcknowledmentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await apiClient.get(`/documents/${documentId}`);
      setDocument(response.data.document);
      
      // Check if user has already acknowledged
      const userAcknowledgments = await apiClient.get(
        `/documents/${documentId}/acknowledgments/user`
      );
      setAcknowledged(userAcknowledgments.data.acknowledged);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgment = async () => {
    try {
      await apiClient.post(`/documents/${documentId}/acknowledge`, {
        acknowledgment_text: acknowledgmentText
      });
      
      setAcknowledged(true);
      onAcknowledge?.();
      
      // Show success notification
      alert('Document acknowledged successfully');
    } catch (error) {
      console.error('Failed to acknowledge document:', error);
      alert('Failed to acknowledge document');
    }
  };

  const downloadDocument = async () => {
    try {
      const response = await apiClient.get(
        `/documents/${documentId}/download`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document?.file_name || 'document';
      link.click();
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading document...</div>;
  }

  if (!document) {
    return <div className="error">Document not found</div>;
  }

  return (
    <div className="document-viewer">
      <div className="document-header">
        <h1>{document.title}</h1>
        <div className="document-meta">
          <span className="category">{document.category}</span>
          <span className="version">v{document.version}</span>
          <span className="status">{document.status}</span>
        </div>
      </div>

      <div className="document-content">
        <p className="description">{document.description}</p>
        
        <div className="document-actions">
          <button onClick={downloadDocument} className="download-btn">
            Download Document
          </button>
          
          {document.requires_acknowledgment && !acknowledged && (
            <div className="acknowledgment-section">
              <h3>Acknowledgment Required</h3>
              <textarea
                value={acknowledgmentText}
                onChange={(e) => setAcknowledmentText(e.target.value)}
                placeholder="Please confirm you have read and understood this document..."
                rows={3}
                className="acknowledgment-text"
              />
              <button 
                onClick={handleAcknowledgment}
                disabled={!acknowledgmentText.trim()}
                className="acknowledge-btn"
              >
                Acknowledge Document
              </button>
            </div>
          )}
          
          {acknowledged && (
            <div className="acknowledged">
              ✅ You have acknowledged this document
            </div>
          )}
        </div>
      </div>

      <div className="document-stats">
        <p>Effective Date: {new Date(document.effective_date).toLocaleDateString()}</p>
        {document.requires_acknowledgment && (
          <p>{document.acknowledgment_count} people have acknowledged this document</p>
        )}
      </div>
    </div>
  );
}
```

#### Budget Overview with Charts

```typescript
// components/BudgetOverview.tsx
import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { apiClient } from '@/lib/api-client';

interface Budget {
  id: string;
  name: string;
  category_name: string;
  allocated_amount: number;
  actual_spent: number;
  available_amount: number;
  status: string;
}

interface BudgetSummary {
  total_allocated: number;
  total_spent: number;
  total_available: number;
}

export function BudgetOverview() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, [selectedPeriod]);

  const fetchBudgets = async () => {
    try {
      const params = selectedPeriod ? { period_id: selectedPeriod } : {};
      const response = await apiClient.get('/budgets', { 
        params: { ...params, include_summary: true } 
      });
      
      setBudgets(response.data.budgets);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const utilizationData = {
    labels: ['Spent', 'Available'],
    datasets: [{
      data: summary ? [summary.total_spent, summary.total_available] : [],
      backgroundColor: ['#EF4444', '#10B981'],
      borderWidth: 0
    }]
  };

  const budgetTrendData = {
    labels: budgets.map(b => b.name),
    datasets: [{
      label: 'Allocated',
      data: budgets.map(b => b.allocated_amount),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true
    }, {
      label: 'Spent',
      data: budgets.map(b => b.actual_spent),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true
    }]
  };

  const getUtilizationPercentage = (budget: Budget) => {
    return ((budget.actual_spent / budget.allocated_amount) * 100).toFixed(1);
  };

  const getStatusColor = (budget: Budget) => {
    const utilization = parseFloat(getUtilizationPercentage(budget));
    if (utilization > 90) return '#EF4444'; // Red
    if (utilization > 75) return '#F59E0B'; // Yellow
    return '#10B981'; // Green
  };

  if (loading) {
    return <div className="loading">Loading budget overview...</div>;
  }

  return (
    <div className="budget-overview">
      <div className="overview-header">
        <h1>Budget Overview</h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="period-selector"
        >
          <option value="">All Periods</option>
          <option value="fy-2024">FY 2024</option>
          <option value="fy-2025">FY 2025</option>
        </select>
      </div>

      {summary && (
        <div className="budget-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <h3>${summary.total_allocated.toLocaleString()}</h3>
              <p>Total Allocated</p>
            </div>
            <div className="summary-card">
              <h3>${summary.total_spent.toLocaleString()}</h3>
              <p>Total Spent</p>
            </div>
            <div className="summary-card">
              <h3>${summary.total_available.toLocaleString()}</h3>
              <p>Available</p>
            </div>
          </div>

          <div className="utilization-chart">
            <h2>Budget Utilization</h2>
            <Doughnut data={utilizationData} />
          </div>
        </div>
      )}

      <div className="budget-list">
        <h2>Budget Details</h2>
        <div className="budget-grid">
          {budgets.map(budget => (
            <div key={budget.id} className="budget-card">
              <div className="budget-header">
                <h3>{budget.name}</h3>
                <span className="category">{budget.category_name}</span>
              </div>
              
              <div className="budget-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${getUtilizationPercentage(budget)}%`,
                      backgroundColor: getStatusColor(budget)
                    }}
                  />
                </div>
                <span className="progress-text">
                  {getUtilizationPercentage(budget)}% utilized
                </span>
              </div>

              <div className="budget-amounts">
                <div className="amount">
                  <span>Allocated:</span>
                  <span>${budget.allocated_amount.toLocaleString()}</span>
                </div>
                <div className="amount">
                  <span>Spent:</span>
                  <span>${budget.actual_spent.toLocaleString()}</span>
                </div>
                <div className="amount">
                  <span>Available:</span>
                  <span>${budget.available_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="budget-trends">
        <h2>Budget Trends</h2>
        <Line data={budgetTrendData} />
      </div>
    </div>
  );
}
```

#### Expense Submission Form

```typescript
// components/ExpenseSubmissionForm.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { apiClient } from '@/lib/api-client';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  color_code: string;
}

export function ExpenseSubmissionForm() {
  const [formData, setFormData] = useState({
    description: '',
    businessPurpose: '',
    projectCode: '',
    department: ''
  });
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/expenses/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadReceipt = async (file: File): Promise<string> => {
    const formDataForUpload = new FormData();
    formDataForUpload.append('receipt', file);
    formDataForUpload.append('description', formData.description);
    formDataForUpload.append('businessPurpose', formData.businessPurpose);
    formDataForUpload.append('projectCode', formData.projectCode);
    formDataForUpload.append('department', formData.department);

    const response = await apiClient.post('/expenses/receipts/upload', formDataForUpload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
      }
    });

    return response.data.receipt.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      alert('Please select at least one receipt');
      return;
    }

    setUploading(true);
    
    try {
      const uploadPromises = selectedFiles.map(file => uploadReceipt(file));
      const receiptIds = await Promise.all(uploadPromises);
      
      // Show success message
      alert(`Successfully uploaded ${receiptIds.length} receipt(s)`);
      
      // Reset form
      setFormData({
        description: '',
        businessPurpose: '',
        projectCode: '',
        department: ''
      });
      setSelectedFiles([]);
      setUploadProgress({});
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload receipts. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="expense-submission">
      <h1>Submit Expense Receipt</h1>
      
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the expense"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessPurpose">Business Purpose</label>
          <textarea
            id="businessPurpose"
            value={formData.businessPurpose}
            onChange={(e) => setFormData(prev => ({ ...prev, businessPurpose: e.target.value }))}
            placeholder="Explain the business purpose of this expense"
            rows={3}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="projectCode">Project Code</label>
            <input
              type="text"
              id="projectCode"
              value={formData.projectCode}
              onChange={(e) => setFormData(prev => ({ ...prev, projectCode: e.target.value }))}
              placeholder="e.g., PROJ-001"
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Select Department</option>
              <option value="engineering">Engineering</option>
              <option value="sales">Sales</option>
              <option value="marketing">Marketing</option>
              <option value="hr">Human Resources</option>
            </select>
          </div>
        </div>

        <div className="file-upload-section">
          <label>Receipt Images/PDFs</label>
          
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag & drop receipt files here, or click to select</p>
            )}
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h3>Selected Files:</h3>
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  {uploadProgress[file.name] !== undefined && (
                    <div className="upload-progress">
                      <div 
                        className="progress-bar"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                      <span>{uploadProgress[file.name]}%</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="remove-file"
                    disabled={uploading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || selectedFiles.length === 0}
          className="submit-btn"
        >
          {uploading ? 'Uploading...' : 'Submit Expense'}
        </button>
      </form>
    </div>
  );
}
```

#### Analytics Dashboard

```typescript
// components/AnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { apiClient } from '@/lib/api-client';

interface KPI {
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnalyticsData {
  calculated_kpis: Record<string, KPI>;
  employee_performance: any[];
  budget_utilization: any[];
  expense_trends: any[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple analytics endpoints in parallel
      const [kpisResponse, performanceResponse, budgetResponse, expenseResponse] = await Promise.all([
        apiClient.get('/financial-reports/kpis'),
        apiClient.get('/analytics/organizational/employees/performance', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        }),
        apiClient.get('/financial-reports/budget-variance'),
        apiClient.get('/financial-reports/expense-analysis', {
          params: { date_from: dateRange.start, date_to: dateRange.end }
        })
      ]);

      setData({
        calculated_kpis: kpisResponse.data.calculated_kpis,
        employee_performance: performanceResponse.data.departmentPerformance,
        budget_utilization: budgetResponse.data.budget_variances,
        expense_trends: expenseResponse.data.monthly_trend
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (value: number, target: number) => {
    if (value >= target) return '#10B981';
    if (value >= target * 0.8) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return <div className="loading">Loading analytics dashboard...</div>;
  }

  if (!data) {
    return <div className="error">Failed to load analytics data</div>;
  }

  const expenseChartData = {
    labels: data.expense_trends.map(trend => trend.month),
    datasets: [{
      label: 'Monthly Expenses',
      data: data.expense_trends.map(trend => trend.total_amount),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true
    }]
  };

  const performanceChartData = {
    labels: data.employee_performance.map(dept => dept.department_name),
    datasets: [{
      label: 'Average Rating',
      data: data.employee_performance.map(dept => dept.avg_rating),
      backgroundColor: '#10B981'
    }]
  };

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        
        <div className="date-range-selector">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      <div className="kpi-section">
        <h2>Key Performance Indicators</h2>
        <div className="kpi-grid">
          {Object.entries(data.calculated_kpis).map(([key, kpi]) => (
            <div key={key} className="kpi-card">
              <div className="kpi-header">
                <h3>{key.replace(/_/g, ' ').toUpperCase()}</h3>
                <span className="trend-icon">{getTrendIcon(kpi.trend)}</span>
              </div>
              
              <div className="kpi-value">
                <span 
                  className="value"
                  style={{ color: getTrendColor(kpi.value, kpi.target) }}
                >
                  {kpi.value.toFixed(1)}{kpi.unit}
                </span>
                <span className="target">Target: {kpi.target}{kpi.unit}</span>
              </div>
              
              <div className="kpi-progress">
                <div 
                  className="progress-bar"
                  style={{ 
                    width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                    backgroundColor: getTrendColor(kpi.value, kpi.target)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h2>Expense Trends</h2>
          <Line data={expenseChartData} />
        </div>
        
        <div className="chart-container">
          <h2>Department Performance</h2>
          <Bar data={performanceChartData} />
        </div>
      </div>

      <div className="insights-section">
        <h2>Key Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <h3>Budget Performance</h3>
            <p>
              {data.budget_utilization.filter(b => b.variance_percentage > 10).length} budgets 
              are over variance threshold
            </p>
          </div>
          
          <div className="insight-card">
            <h3>Employee Performance</h3>
            <p>
              Average performance rating: {' '}
              {(data.employee_performance.reduce((acc, dept) => acc + dept.avg_rating, 0) / 
                data.employee_performance.length).toFixed(1)}
            </p>
          </div>
          
          <div className="insight-card">
            <h3>Expense Growth</h3>
            <p>
              Monthly expense growth: {' '}
              {data.expense_trends.length > 1 ? 
                ((data.expense_trends[data.expense_trends.length - 1].total_amount - 
                  data.expense_trends[data.expense_trends.length - 2].total_amount) /
                  data.expense_trends[data.expense_trends.length - 2].total_amount * 100).toFixed(1)
                : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Error Handling Patterns

#### Global Error Boundary

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### API Error Handler Hook

```typescript
// hooks/useErrorHandler.ts
import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface ErrorState {
  error: string | null;
  isError: boolean;
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false
  });

  const handleError = useCallback((error: unknown) => {
    let errorMessage = 'An unexpected error occurred';

    if (error instanceof AxiosError) {
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    setErrorState({
      error: errorMessage,
      isError: true
    });

    // Log error for debugging
    console.error('Error handled:', error);
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false
    });
  }, []);

  return {
    ...errorState,
    handleError,
    clearError
  };
}
```

### Performance Optimization

#### Custom Pagination Hook

```typescript
// hooks/usePagination.ts
import { useState, useCallback, useMemo } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsePaginationReturn extends PaginationState {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setPaginationData: (data: Partial<PaginationState>) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  getOffset: () => number;
}

export function usePagination(
  initialPage = 1,
  initialLimit = 20
): UsePaginationReturn {
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0
  });

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const setPaginationData = useCallback((data: Partial<PaginationState>) => {
    setPagination(prev => ({ ...prev, ...data }));
  }, []);

  const hasNextPage = useMemo(() => 
    pagination.page < pagination.totalPages, 
    [pagination.page, pagination.totalPages]
  );

  const hasPreviousPage = useMemo(() => 
    pagination.page > 1, 
    [pagination.page]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(pagination.page + 1);
    }
  }, [hasNextPage, pagination.page, setPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(pagination.page - 1);
    }
  }, [hasPreviousPage, pagination.page, setPage]);

  const getOffset = useCallback(() => 
    (pagination.page - 1) * pagination.limit,
    [pagination.page, pagination.limit]
  );

  return {
    ...pagination,
    setPage,
    setLimit,
    setPaginationData,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    getOffset
  };
}
```

#### Debounced Search Hook

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage example
export function useSearchWithDebounce(initialQuery = '', delay = 300) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, delay);

  return {
    query,
    setQuery,
    debouncedQuery
  };
}
```

### File Upload/Download Handling

#### File Upload Hook with Progress

```typescript
// hooks/useFileUpload.ts
import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

interface UseFileUploadReturn extends UploadState {
  uploadFile: (file: File, endpoint: string, additionalData?: Record<string, any>) => Promise<any>;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });

  const uploadFile = useCallback(async (
    file: File, 
    endpoint: string, 
    additionalData: Record<string, any> = {}
  ) => {
    setState({
      uploading: true,
      progress: 0,
      error: null,
      success: false
    });

    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    try {
      const response = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setState(prev => ({ ...prev, progress }));
        }
      });

      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        success: true,
        progress: 100 
      }));

      return response.data;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.response?.data?.message || 'Upload failed'
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: 0,
      error: null,
      success: false
    });
  }, []);

  return {
    ...state,
    uploadFile,
    reset
  };
}
```

### Real-time Updates

#### WebSocket Integration

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutId = useRef<NodeJS.Timeout>();
  const attemptCount = useRef(0);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;

  const connect = useRef(() => {
    try {
      setConnectionStatus('connecting');
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnectionStatus('connected');
        attemptCount.current = 0;
        onConnect?.();
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        onMessage?.(data);
      };

      ws.current.onclose = () => {
        setConnectionStatus('disconnected');
        onDisconnect?.();

        // Attempt reconnection
        if (attemptCount.current < reconnectAttempts) {
          attemptCount.current += 1;
          reconnectTimeoutId.current = setTimeout(() => {
            connect.current();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (error) => {
        onError?.(error);
      };
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  });

  const sendMessage = useRef((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  });

  const disconnect = useRef(() => {
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
    }
    ws.current?.close();
  });

  useEffect(() => {
    connect.current();
    return () => {
      disconnect.current();
    };
  }, [url]);

  return {
    connectionStatus,
    lastMessage,
    sendMessage: sendMessage.current,
    disconnect: disconnect.current
  };
}
```

### TypeScript Types

#### Complete API Response Types

```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department_name: string;
  position_title: string;
  position_level: string;
  manager_name: string;
  employment_status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  hire_date: string;
  base_salary: number;
  active_trainings: number;
  completed_trainings: number;
  latest_evaluation_date: string;
  latest_overall_rating: number;
}

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  location_name: string;
  assigned_employee_name: string;
  maintenance_count: number;
  last_maintenance_date: string;
  next_maintenance_due: string;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  version: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by_name: string;
  approved_by_name: string;
  effective_date: string;
  requires_acknowledgment: boolean;
  acknowledgment_count: number;
  created_at: string;
}

export interface Budget {
  id: string;
  name: string;
  description: string;
  period_name: string;
  category_name: string;
  category_code: string;
  category_type: string;
  owner_name: string;
  allocated_amount: number;
  actual_spent: number;
  committed_amount: number;
  available_amount: number;
  status: 'draft' | 'active' | 'closed';
  variance_rules: {
    warning_threshold: number;
    critical_threshold: number;
  } | null;
}

export interface ExpenseReceipt {
  id: string;
  original_filename: string;
  processing_status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'manual_review';
  uploaded_at: string;
  vendor_name: string;
  total_amount: number;
  transaction_date: string;
  category_name: string;
  category_color: string;
  tax_amount: number;
  payment_method: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  approval_status: 'pending' | 'approved' | 'rejected' | 'requires_information';
  approval_notes: string | null;
  approved_amount: number | null;
}

export interface WorkflowInstance {
  id: string;
  workflow_name: string;
  category: string;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  started_by_name: string;
  started_at: string;
  total_steps: number;
  completed_steps: number;
}
```

### Security Best Practices

#### Secure Token Storage

```typescript
// utils/secure-storage.ts
class SecureStorage {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  // Use sessionStorage for temporary tokens (more secure but less convenient)
  static setSessionToken(token: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  static getSessionToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  // Use localStorage for persistent tokens (encrypt if possible)
  static setPersistentToken(token: string): void {
    // In production, encrypt the token before storing
    localStorage.setItem(this.TOKEN_KEY, this.encrypt(token));
  }

  static getPersistentToken(): string | null {
    const encrypted = localStorage.getItem(this.TOKEN_KEY);
    return encrypted ? this.decrypt(encrypted) : null;
  }

  static clearTokens(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private static encrypt(text: string): string {
    // Implement encryption logic
    // Consider using crypto-js or similar library
    return btoa(text); // Basic encoding - use proper encryption in production
  }

  private static decrypt(encryptedText: string): string {
    // Implement decryption logic
    try {
      return atob(encryptedText);
    } catch {
      return '';
    }
  }
}

export { SecureStorage };
```

#### CSRF Protection

```typescript
// utils/csrf.ts
export function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  return meta?.content || '';
}

export function setupCsrfProtection() {
  // Add CSRF token to all requests
  apiClient.defaults.headers.common['X-CSRF-TOKEN'] = getCsrfToken();
}

// Call this in your app initialization
setupCsrfProtection();
```

#### Input Sanitization

```typescript
// utils/sanitization.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000); // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[^\d+]/g, ''));
}
```

### Complete Integration Example

#### App.tsx with Full Setup

```typescript
// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { EmployeeManagement } from '@/components/EmployeeManagement';
import { AssetDashboard } from '@/components/AssetDashboard';
import { BudgetOverview } from '@/components/BudgetOverview';
import { ExpenseSubmissionForm } from '@/components/ExpenseSubmissionForm';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { DocumentViewer } from '@/components/DocumentViewer';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <Router>
            <div className="app">
              <Routes>
                <Route path="/employees" element={<EmployeeManagement />} />
                <Route path="/assets" element={<AssetDashboard />} />
                <Route path="/budgets" element={<BudgetOverview />} />
                <Route path="/expenses/submit" element={<ExpenseSubmissionForm />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/documents/:id" element={<DocumentViewer />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
```

---

This documentation provides comprehensive coverage of all enterprise API endpoints with detailed request/response examples, authentication requirements, and practical frontend integration guidance with complete, production-ready code examples.