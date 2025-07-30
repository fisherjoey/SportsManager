/**
 * Create comprehensive organizational management system
 * This migration creates all the necessary tables for enterprise-level
 * employee, asset, document, compliance, and communication management
 */

exports.up = function(knex) {
  return knex.schema
    // Departments - Organizational structure
    .createTable('departments', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable();
      table.text('description');
      table.uuid('parent_department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
      table.uuid('manager_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('cost_center', 50);
      table.decimal('budget_allocated', 15, 2).defaultTo(0);
      table.decimal('budget_spent', 15, 2).defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['parent_department_id']);
      table.index(['manager_id']);
      table.index(['active']);
    })

    // Job Positions - Define roles and responsibilities
    .createTable('job_positions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 100).notNullable();
      table.text('description');
      table.uuid('department_id').notNullable().references('id').inTable('departments').onDelete('CASCADE');
      table.string('level', 50); // Entry, Mid, Senior, Executive
      table.decimal('min_salary', 12, 2);
      table.decimal('max_salary', 12, 2);
      table.json('required_skills');
      table.json('preferred_skills');
      table.text('responsibilities');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['department_id']);
      table.index(['level']);
      table.index(['active']);
    })

    // Extended Employee Management (beyond referees)
    .createTable('employees', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('employee_id', 20).unique().notNullable();
      table.uuid('department_id').notNullable().references('id').inTable('departments').onDelete('RESTRICT');
      table.uuid('position_id').notNullable().references('id').inTable('job_positions').onDelete('RESTRICT');
      table.uuid('manager_id').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.date('hire_date').notNullable();
      table.date('termination_date').nullable();
      table.string('employment_type', 30).defaultTo('full_time'); // full_time, part_time, contract, intern
      table.string('employment_status', 30).defaultTo('active'); // active, inactive, terminated, on_leave
      table.decimal('base_salary', 12, 2);
      table.string('pay_frequency', 20).defaultTo('monthly'); // weekly, bi_weekly, monthly, annual
      table.json('emergency_contacts');
      table.json('benefits_enrolled');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['employee_id']);
      table.index(['department_id']);
      table.index(['position_id']);
      table.index(['manager_id']);
      table.index(['employment_status']);
      table.index(['hire_date']);
    })

    // Employee Performance Evaluations
    .createTable('employee_evaluations', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.uuid('evaluator_id').notNullable().references('id').inTable('employees').onDelete('RESTRICT');
      table.string('evaluation_period', 50); // Q1_2025, Annual_2025, etc.
      table.date('evaluation_date').notNullable();
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      table.integer('overall_rating').checkIn([1, 2, 3, 4, 5]); // 1=Poor, 5=Excellent
      table.json('category_ratings'); // Technical, Communication, Leadership, etc.
      table.text('achievements');
      table.text('areas_for_improvement');
      table.text('goals_next_period');
      table.text('evaluator_comments');
      table.text('employee_comments');
      table.string('status', 30).defaultTo('draft'); // draft, completed, acknowledged
      table.timestamps(true, true);
      
      table.index(['employee_id']);
      table.index(['evaluator_id']);
      table.index(['evaluation_date']);
      table.index(['status']);
    })

    // Training and Certification Tracking
    .createTable('training_records', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.string('training_name', 200).notNullable();
      table.string('training_type', 50); // certification, workshop, online_course, conference
      table.string('provider', 100);
      table.date('completion_date');
      table.date('expiration_date');
      table.string('status', 30).defaultTo('in_progress'); // scheduled, in_progress, completed, expired
      table.decimal('cost', 10, 2);
      table.integer('hours_completed');
      table.string('certificate_number', 100);
      table.text('certificate_url');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['employee_id']);
      table.index(['status']);
      table.index(['completion_date']);
      table.index(['expiration_date']);
      table.index(['training_type']);
    })

    // Asset and Equipment Management
    .createTable('assets', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('asset_tag', 50).unique().notNullable();
      table.string('name', 200).notNullable();
      table.text('description');
      table.string('category', 50); // uniforms, equipment, vehicles, technology
      table.string('subcategory', 50); // referee_uniform, whistle, laptop, etc.
      table.string('brand', 100);
      table.string('model', 100);
      table.string('serial_number', 100);
      table.date('purchase_date');
      table.decimal('purchase_cost', 12, 2);
      table.decimal('current_value', 12, 2);
      table.uuid('location_id').nullable().references('id').inTable('locations').onDelete('SET NULL');
      table.uuid('assigned_to').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.string('condition', 30).defaultTo('good'); // excellent, good, fair, poor, damaged
      table.string('status', 30).defaultTo('available'); // available, assigned, maintenance, retired
      table.json('specifications'); // Size, color, technical specs, etc.
      table.date('warranty_expiration');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['asset_tag']);
      table.index(['category']);
      table.index(['subcategory']);
      table.index(['location_id']);
      table.index(['assigned_to']);
      table.index(['status']);
      table.index(['condition']);
    })

    // Asset Maintenance History
    .createTable('asset_maintenance', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
      table.string('maintenance_type', 50); // routine, repair, upgrade, inspection
      table.date('scheduled_date');
      table.date('completed_date');
      table.uuid('performed_by').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.string('vendor', 100);
      table.decimal('cost', 10, 2);
      table.text('description');
      table.text('parts_replaced');
      table.string('status', 30).defaultTo('scheduled'); // scheduled, in_progress, completed, cancelled
      table.date('next_maintenance_due');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['asset_id']);
      table.index(['maintenance_type']);
      table.index(['status']);
      table.index(['scheduled_date']);
      table.index(['completed_date']);
    })

    // Asset Check-out/Check-in System
    .createTable('asset_checkouts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
      table.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.uuid('checked_out_by').notNullable().references('id').inTable('employees').onDelete('RESTRICT');
      table.uuid('checked_in_by').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.timestamp('checkout_date').defaultTo(knex.fn.now());
      table.timestamp('expected_return_date');
      table.timestamp('actual_return_date');
      table.string('checkout_condition', 30).defaultTo('good');
      table.string('return_condition', 30);
      table.text('checkout_notes');
      table.text('return_notes');
      table.string('status', 30).defaultTo('checked_out'); // checked_out, returned, overdue, lost
      table.timestamps(true, true);
      
      table.index(['asset_id']);
      table.index(['employee_id']);
      table.index(['status']);
      table.index(['checkout_date']);
      table.index(['expected_return_date']);
    })

    // Document Management System
    .createTable('documents', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 200).notNullable();
      table.text('description');
      table.string('category', 50); // policy, procedure, manual, form, contract
      table.string('subcategory', 50);
      table.string('file_path', 500).notNullable();
      table.string('file_name', 200).notNullable();
      table.string('file_type', 20); // pdf, doc, docx, etc.
      table.bigint('file_size'); // bytes
      table.string('version', 20).defaultTo('1.0');
      table.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
      table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.date('effective_date');
      table.date('expiration_date');
      table.string('status', 30).defaultTo('draft'); // draft, review, approved, archived
      table.json('tags');
      table.json('access_permissions'); // roles/departments that can access
      table.boolean('requires_acknowledgment').defaultTo(false);
      table.text('checksum'); // for integrity verification
      table.timestamps(true, true);
      
      table.index(['category']);
      table.index(['subcategory']);
      table.index(['status']);
      table.index(['uploaded_by']);
      table.index(['effective_date']);
      table.index(['expiration_date']);
    })

    // Document Version Control
    .createTable('document_versions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
      table.string('version', 20).notNullable();
      table.string('file_path', 500).notNullable();
      table.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
      table.text('change_notes');
      table.boolean('is_current').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['document_id']);
      table.index(['version']);
      table.index(['is_current']);
    })

    // Document Access Tracking
    .createTable('document_access', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('accessed_at').defaultTo(knex.fn.now());
      table.string('access_type', 30); // view, download, print
      table.string('ip_address', 45);
      table.text('user_agent');
      
      table.index(['document_id']);
      table.index(['user_id']);
      table.index(['accessed_at']);
    })

    // Document Acknowledgments
    .createTable('document_acknowledgments', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('acknowledged_at').defaultTo(knex.fn.now());
      table.string('document_version', 20);
      table.text('acknowledgment_text');
      table.string('ip_address', 45);
      
      table.unique(['document_id', 'user_id', 'document_version']);
      table.index(['document_id']);
      table.index(['user_id']);
      table.index(['acknowledged_at']);
    })

    // Compliance and Quality Management
    .createTable('compliance_tracking', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('compliance_type', 100).notNullable(); // safety, regulatory, certification
      table.string('regulation_name', 200).notNullable();
      table.text('description');
      table.uuid('responsible_employee').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.uuid('responsible_department').nullable().references('id').inTable('departments').onDelete('SET NULL');
      table.string('frequency', 30); // daily, weekly, monthly, quarterly, annually
      table.date('last_audit_date');
      table.date('next_audit_date').notNullable();
      table.string('status', 30).defaultTo('compliant'); // compliant, non_compliant, pending_review
      table.text('current_findings');
      table.text('action_items');
      table.json('required_documents');
      table.json('evidence_files');
      table.timestamps(true, true);
      
      table.index(['compliance_type']);
      table.index(['responsible_employee']);
      table.index(['responsible_department']);
      table.index(['status']);
      table.index(['next_audit_date']);
    })

    // Incident Reporting and Investigation
    .createTable('incidents', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('incident_number', 50).unique().notNullable();
      table.string('incident_type', 50); // safety, security, quality, hr, equipment
      table.string('severity', 20); // low, medium, high, critical
      table.timestamp('incident_date').notNullable();
      table.uuid('location_id').nullable().references('id').inTable('locations').onDelete('SET NULL');
      table.uuid('reported_by').notNullable().references('id').inTable('employees').onDelete('RESTRICT');
      table.uuid('assigned_investigator').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.text('description').notNullable();
      table.text('immediate_actions_taken');
      table.json('people_involved'); // Array of employee IDs or names
      table.json('witnesses');
      table.json('assets_involved'); // Array of asset IDs
      table.text('root_cause_analysis');
      table.text('corrective_actions');
      table.text('preventive_actions');
      table.string('status', 30).defaultTo('reported'); // reported, investigating, resolved, closed
      table.date('target_resolution_date');
      table.date('actual_resolution_date');
      table.json('attachments'); // Photos, documents, etc.
      table.timestamps(true, true);
      
      table.index(['incident_number']);
      table.index(['incident_type']);
      table.index(['severity']);
      table.index(['status']);
      table.index(['incident_date']);
      table.index(['reported_by']);
    })

    // Risk Assessment and Mitigation
    .createTable('risk_assessments', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('risk_title', 200).notNullable();
      table.text('risk_description');
      table.string('risk_category', 50); // operational, financial, safety, regulatory, reputational
      table.uuid('owner_employee').nullable().references('id').inTable('employees').onDelete('SET NULL');
      table.uuid('owner_department').nullable().references('id').inTable('departments').onDelete('SET NULL');
      table.integer('probability_score').checkIn([1, 2, 3, 4, 5]); // 1=Very Low, 5=Very High
      table.integer('impact_score').checkIn([1, 2, 3, 4, 5]); // 1=Very Low, 5=Very High
      table.integer('risk_score').notNullable(); // probability * impact
      table.string('risk_level', 20); // low, medium, high, critical (calculated from score)
      table.text('current_controls');
      table.text('mitigation_actions');
      table.string('status', 30).defaultTo('identified'); // identified, analyzing, mitigating, monitoring, closed
      table.date('review_date');
      table.date('next_review_date');
      table.timestamps(true, true);
      
      table.index(['risk_category']);
      table.index(['owner_employee']);
      table.index(['owner_department']);
      table.index(['risk_level']);
      table.index(['status']);
      table.index(['next_review_date']);
    })

    // Internal Communications System
    .createTable('internal_communications', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 200).notNullable();
      table.text('content').notNullable();
      table.string('type', 30); // announcement, memo, policy_update, emergency, newsletter
      table.string('priority', 20).defaultTo('normal'); // low, normal, high, urgent
      table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
      table.json('target_audience'); // departments, roles, specific users
      table.timestamp('publish_date').defaultTo(knex.fn.now());
      table.timestamp('expiration_date');
      table.boolean('requires_acknowledgment').defaultTo(false);
      table.string('status', 30).defaultTo('draft'); // draft, published, archived
      table.json('attachments');
      table.json('tags');
      table.timestamps(true, true);
      
      table.index(['type']);
      table.index(['priority']);
      table.index(['author_id']);
      table.index(['status']);
      table.index(['publish_date']);
    })

    // Communication Recipients and Acknowledgments
    .createTable('communication_recipients', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('communication_id').notNullable().references('id').inTable('internal_communications').onDelete('CASCADE');
      table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('sent_at').defaultTo(knex.fn.now());
      table.timestamp('read_at');
      table.timestamp('acknowledged_at');
      table.string('delivery_method', 30); // email, app, sms
      table.string('delivery_status', 30).defaultTo('pending'); // pending, delivered, failed
      table.text('delivery_error');
      
      table.unique(['communication_id', 'recipient_id']);
      table.index(['communication_id']);
      table.index(['recipient_id']);
      table.index(['sent_at']);
      table.index(['read_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('communication_recipients')
    .dropTableIfExists('internal_communications')
    .dropTableIfExists('risk_assessments')
    .dropTableIfExists('incidents')
    .dropTableIfExists('compliance_tracking')
    .dropTableIfExists('document_acknowledgments')
    .dropTableIfExists('document_access')
    .dropTableIfExists('document_versions')
    .dropTableIfExists('documents')
    .dropTableIfExists('asset_checkouts')
    .dropTableIfExists('asset_maintenance')
    .dropTableIfExists('assets')
    .dropTableIfExists('training_records')
    .dropTableIfExists('employee_evaluations')
    .dropTableIfExists('employees')
    .dropTableIfExists('job_positions')
    .dropTableIfExists('departments');
};