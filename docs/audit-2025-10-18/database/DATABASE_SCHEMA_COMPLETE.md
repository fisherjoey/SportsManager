# Database Schema - Complete Documentation

**Database**: `sports_management`
**Generated**: 2025-10-18, 3:33:30 p.m.
**PostgreSQL Version**: 17

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tables | 116 |
| Total Columns | 1643 |
| Total Indexes | 618 |
| Total Constraints | 1122 |
| Total Relationships | 236 |

**Total Records**: 435 rows across all tables

### Tables by Category

| Category | Count | Tables |
|----------|-------|--------|
| Financial | 28 | accounting_integrations, accounting_sync_logs, budget_alerts, budget_approvals, budget_categories, budget_forecasts, budget_periods, budgets, cash_flow_forecasts, chart_of_accounts, company_credit_cards, expense_approvals, expense_categories, expense_data, expense_receipts, expense_reimbursements, financial_audit_trail, financial_dashboards, financial_insights, financial_kpis, financial_reports_config, financial_transactions, journal_entries, journal_entry_lines, payment_methods, purchase_orders, spending_limits, vendors |
| Documents & Content | 22 | content_analytics, content_analytics_monthly, content_attachments, content_categories, content_item_tags, content_items, content_permissions, content_search_index, content_tags, content_versions, document_access, document_acknowledgments, document_versions, documents, post_categories, post_media, post_reads, posts, resource_categories, resource_category_managers, resource_versions, resources |
| RBAC & Permissions | 13 | rbac_configuration_templates, rbac_endpoints, rbac_functions, rbac_pages, rbac_scan_history, referee_roles, resource_category_permissions, resource_permissions, role_api_access, role_data_scopes, role_features, role_page_access, roles |
| Games & Assignments | 9 | ai_assignment_partner_preferences, ai_assignment_rule_runs, ai_assignment_rules, assignment_patterns, chunk_games, game_assignments, game_chunks, game_fees, games |
| User Management | 6 | user_earnings, user_location_distances, user_locations, user_referee_roles, user_roles, users |
| Communications | 5 | communication_recipients, internal_communications, invitations, notification_preferences, notifications |
| Authentication & Security | 4 | access_control_audit, audit_logs, resource_access_logs, resource_audit_log |
| Teams & Leagues | 4 | job_positions, leagues, positions, teams |
| Assets & Resources | 3 | asset_checkouts, asset_maintenance, assets |
| Organizations | 3 | departments, organization_settings, organizations |
| Employee Management | 3 | employee_evaluations, employees, training_records |
| Referees & Officials | 3 | incidents, referee_levels, referee_profiles |
| Mentorship | 3 | mentorship_documents, mentorship_notes, mentorships |
| AI & Machine Learning | 2 | ai_processing_logs, ai_suggestions |
| Approval Workflows | 2 | approval_requests, approval_workflows |
| Locations & Facilities | 2 | budget_allocations, locations |
| Compliance & Tracking | 2 | compliance_tracking, risk_assessments |
| System & Configuration | 2 | knex_migrations, knex_migrations_lock |

---

## Schema by Category

### Financial

**Tables**: 28

#### `accounting_integrations`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
- **Has many**:
  - `accounting_sync_logs` (via `integration_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `provider` | `text` | No | - | - |
| `provider_name` | `varchar(255)` | No | - | - |
| `connection_config` | `json` | Yes | - | - |
| `sync_settings` | `json` | Yes | - | - |
| `sync_status` | `text` | Yes | `'disconnected'::text` | - |
| `last_sync_at` | `timestamptz` | Yes | - | - |
| `last_sync_error` | `text` | Yes | - | - |
| `auto_sync` | `boolean` | Yes | `false` | - |
| `sync_frequency_hours` | `integer` | Yes | `24` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `accounting_integrations_organization_id_is_active_index` on (`organization_id, is_active`)
- **PRIMARY KEY**: `accounting_integrations_pkey` on (`id`)
- **INDEX**: `accounting_integrations_sync_status_index` on (`sync_status`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `accounting_integrations_provider_check`: (provider = ANY (ARRAY['quickbooks_online'::text, 'quickbooks_desktop'::text, 'xero'::text, 'sage'::text, 'freshbooks'::text, 'wave'::text, 'manual'::text]))
- `accounting_integrations_sync_status_check`: (sync_status = ANY (ARRAY['disconnected'::text, 'connected'::text, 'syncing'::text, 'error'::text, 'paused'::text]))
- `2200_481090_1_not_null`: id IS NOT NULL
- `2200_481090_2_not_null`: organization_id IS NOT NULL
- `2200_481090_3_not_null`: provider IS NOT NULL
- `2200_481090_4_not_null`: provider_name IS NOT NULL

---

#### `accounting_sync_logs`

**Purpose**: Logging and audit trail

**Relationships**:
- **Belongs to**:
  - `accounting_integrations` (via `integration_id`)
  - `users` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `integration_id` | `uuid` | No | - | FK → `accounting_integrations(id)` |
| `sync_type` | `text` | No | - | - |
| `status` | `text` | No | - | - |
| `started_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `completed_at` | `timestamptz` | Yes | - | - |
| `records_processed` | `integer` | Yes | `0` | - |
| `records_success` | `integer` | Yes | `0` | - |
| `records_failed` | `integer` | Yes | `0` | - |
| `error_message` | `text` | Yes | - | - |
| `sync_details` | `json` | Yes | - | - |
| `error_details` | `json` | Yes | - | - |

**Indexes**:

- **INDEX**: `accounting_sync_logs_integration_id_status_index` on (`integration_id, status`)
- **INDEX**: `accounting_sync_logs_organization_id_started_at_index` on (`organization_id, started_at`)
- **PRIMARY KEY**: `accounting_sync_logs_pkey` on (`id`)

**Foreign Keys**:

- `integration_id` → `accounting_integrations(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `accounting_sync_logs_status_check`: (status = ANY (ARRAY['started'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'partial'::text]))
- `accounting_sync_logs_sync_type_check`: (sync_type = ANY (ARRAY['full_sync'::text, 'incremental_sync'::text, 'manual_sync'::text, 'transaction_sync'::text, 'account_sync'::text, 'vendor_sync'::text]))
- `2200_481174_1_not_null`: id IS NOT NULL
- `2200_481174_2_not_null`: organization_id IS NOT NULL
- `2200_481174_3_not_null`: integration_id IS NOT NULL
- `2200_481174_4_not_null`: sync_type IS NOT NULL
- `2200_481174_5_not_null`: status IS NOT NULL

---

#### `budget_alerts`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `acknowledged_by`)
  - `budgets` (via `budget_id`)
  - `users` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `budget_id` | `uuid` | No | - | FK → `budgets(id)` |
| `alert_type` | `text` | No | - | - |
| `title` | `varchar(255)` | No | - | - |
| `message` | `text` | No | - | - |
| `threshold_value` | `numeric(12,2)` | Yes | - | - |
| `current_value` | `numeric(12,2)` | Yes | - | - |
| `variance_percentage` | `numeric(5,2)` | Yes | - | - |
| `severity` | `text` | No | - | - |
| `is_acknowledged` | `boolean` | Yes | `false` | - |
| `acknowledged_by` | `uuid` | Yes | - | FK → `users(id)` |
| `acknowledged_at` | `timestamptz` | Yes | - | - |
| `is_resolved` | `boolean` | Yes | `false` | - |
| `resolved_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `budget_alerts_budget_id_alert_type_index` on (`budget_id, alert_type`)
- **INDEX**: `budget_alerts_created_at_index` on (`created_at`)
- **INDEX**: `budget_alerts_organization_id_is_acknowledged_severity_index` on (`organization_id, severity, is_acknowledged`)
- **PRIMARY KEY**: `budget_alerts_pkey` on (`id`)

**Foreign Keys**:

- `acknowledged_by` → `users(id)`
  - ON DELETE: SET NULL
- `budget_id` → `budgets(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `budget_alerts_alert_type_check`: (alert_type = ANY (ARRAY['overspend_warning'::text, 'overspend_critical'::text, 'underspend_warning'::text, 'forecast_variance'::text, 'approval_required'::text, 'budget_expired'::text]))
- `budget_alerts_severity_check`: (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))
- `2200_481007_1_not_null`: id IS NOT NULL
- `2200_481007_2_not_null`: organization_id IS NOT NULL
- `2200_481007_3_not_null`: budget_id IS NOT NULL
- `2200_481007_4_not_null`: alert_type IS NOT NULL
- `2200_481007_5_not_null`: title IS NOT NULL
- `2200_481007_6_not_null`: message IS NOT NULL
- `2200_481007_10_not_null`: severity IS NOT NULL

---

#### `budget_approvals`

**Purpose**: Approval workflow tracking

**Relationships**:
- **Belongs to**:
  - `users` (via `approver_id`)
  - `budgets` (via `budget_id`)
  - `users` (via `requested_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `budget_id` | `uuid` | No | - | FK → `budgets(id)` |
| `requested_by` | `uuid` | No | - | FK → `users(id)` |
| `approver_id` | `uuid` | Yes | - | FK → `users(id)` |
| `approval_type` | `text` | No | - | - |
| `status` | `text` | Yes | `'pending'::text` | - |
| `requested_amount` | `numeric(12,2)` | Yes | - | - |
| `approved_amount` | `numeric(12,2)` | Yes | - | - |
| `request_notes` | `text` | Yes | - | - |
| `approval_notes` | `text` | Yes | - | - |
| `requested_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `approved_at` | `timestamptz` | Yes | - | - |
| `rejected_at` | `timestamptz` | Yes | - | - |

**Indexes**:

- **INDEX**: `budget_approvals_approver_id_status_index` on (`approver_id, status`)
- **INDEX**: `budget_approvals_budget_id_status_index` on (`budget_id, status`)
- **PRIMARY KEY**: `budget_approvals_pkey` on (`id`)
- **INDEX**: `budget_approvals_requested_at_index` on (`requested_at`)

**Foreign Keys**:

- `approver_id` → `users(id)`
  - ON DELETE: SET NULL
- `budget_id` → `budgets(id)`
  - ON DELETE: CASCADE
- `requested_by` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `budget_approvals_approval_type_check`: (approval_type = ANY (ARRAY['initial'::text, 'revision'::text, 'increase'::text, 'transfer'::text]))
- `budget_approvals_status_check`: (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'requires_info'::text]))
- `2200_480886_1_not_null`: id IS NOT NULL
- `2200_480886_2_not_null`: budget_id IS NOT NULL
- `2200_480886_3_not_null`: requested_by IS NOT NULL
- `2200_480886_5_not_null`: approval_type IS NOT NULL

---

#### `budget_categories`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `chart_of_accounts` (via `default_account_id`)
  - `users` (via `organization_id`)
  - `budget_categories` (via `parent_id`)
- **Has many**:
  - `budget_categories` (via `parent_id`)
  - `budgets` (via `category_id`)
  - `spending_limits` (via `budget_category_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `name` | `varchar(255)` | No | - | - |
| `code` | `varchar(255)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `parent_id` | `uuid` | Yes | - | FK → `budget_categories(id)` |
| `sort_order` | `integer` | Yes | `0` | - |
| `active` | `boolean` | Yes | `true` | - |
| `category_type` | `text` | No | - | - |
| `color_code` | `varchar(7)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `default_account_id` | `uuid` | Yes | - | FK → `chart_of_accounts(id)` |

**Indexes**:

- **INDEX**: `budget_categories_organization_id_active_index` on (`organization_id, active`)
- **UNIQUE INDEX**: `budget_categories_organization_id_code_unique` on (`organization_id, code`)
- **INDEX**: `budget_categories_parent_id_index` on (`parent_id`)
- **PRIMARY KEY**: `budget_categories_pkey` on (`id`)

**Foreign Keys**:

- `default_account_id` → `chart_of_accounts(id)`
  - ON DELETE: SET NULL
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `parent_id` → `budget_categories(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `budget_categories_category_type_check`: (category_type = ANY (ARRAY['revenue'::text, 'operating_expenses'::text, 'payroll'::text, 'equipment'::text, 'facilities'::text, 'travel'::text, 'marketing'::text, 'admin'::text, 'other'::text]))
- `2200_480799_1_not_null`: id IS NOT NULL
- `2200_480799_2_not_null`: organization_id IS NOT NULL
- `2200_480799_3_not_null`: name IS NOT NULL
- `2200_480799_4_not_null`: code IS NOT NULL
- `2200_480799_9_not_null`: category_type IS NOT NULL

---

#### `budget_forecasts`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `budgets` (via `budget_id`)
  - `users` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `budget_id` | `uuid` | No | - | FK → `budgets(id)` |
| `forecast_type` | `text` | No | - | - |
| `forecast_data` | `json` | Yes | - | - |
| `confidence_score` | `numeric(3,2)` | Yes | - | - |
| `influencing_factors` | `json` | Yes | - | - |
| `model_metadata` | `json` | Yes | - | - |
| `forecast_date` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `forecast_period_start` | `date` | Yes | - | - |
| `forecast_period_end` | `date` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |

**Indexes**:

- **INDEX**: `budget_forecasts_budget_id_is_active_index` on (`budget_id, is_active`)
- **INDEX**: `budget_forecasts_organization_id_forecast_type_index` on (`organization_id, forecast_type`)
- **PRIMARY KEY**: `budget_forecasts_pkey` on (`id`)

**Foreign Keys**:

- `budget_id` → `budgets(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `budget_forecasts_forecast_type_check`: (forecast_type = ANY (ARRAY['monthly_spend'::text, 'seasonal_pattern'::text, 'year_end_projection'::text, 'variance_prediction'::text, 'cash_flow_forecast'::text]))
- `2200_481342_1_not_null`: id IS NOT NULL
- `2200_481342_2_not_null`: organization_id IS NOT NULL
- `2200_481342_3_not_null`: budget_id IS NOT NULL
- `2200_481342_4_not_null`: forecast_type IS NOT NULL

---

#### `budget_periods`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `users` (via `organization_id`)
- **Has many**:
  - `budgets` (via `budget_period_id`)
  - `cash_flow_forecasts` (via `budget_period_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `name` | `varchar(255)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `start_date` | `date` | No | - | - |
| `end_date` | `date` | No | - | - |
| `status` | `text` | Yes | `'draft'::text` | - |
| `is_template` | `boolean` | Yes | `false` | - |
| `created_by` | `uuid` | No | - | FK → `users(id)` |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `budget_periods_organization_id_status_index` on (`organization_id, status`)
- **PRIMARY KEY**: `budget_periods_pkey` on (`id`)
- **INDEX**: `budget_periods_start_date_end_date_index` on (`start_date, end_date`)
- **INDEX**: `idx_budget_periods_org_status_dates` on (`organization_id, start_date, end_date, status`)

**Foreign Keys**:

- `created_by` → `users(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `budget_periods_status_check`: (status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'archived'::text]))
- `check_budget_period_dates_valid`: (start_date <= end_date)
- `check_budget_period_status_valid`: (status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'archived'::text]))
- `2200_480774_1_not_null`: id IS NOT NULL
- `2200_480774_2_not_null`: organization_id IS NOT NULL
- `2200_480774_3_not_null`: name IS NOT NULL
- `2200_480774_5_not_null`: start_date IS NOT NULL
- `2200_480774_6_not_null`: end_date IS NOT NULL
- `2200_480774_9_not_null`: created_by IS NOT NULL

---

#### `budgets`

**Purpose**: Financial budget planning and tracking

**Relationships**:
- **Belongs to**:
  - `budget_periods` (via `budget_period_id`)
  - `budget_categories` (via `category_id`)
  - `users` (via `organization_id`)
  - `users` (via `owner_id`)
- **Has many**:
  - `budget_alerts` (via `budget_id`)
  - `budget_allocations` (via `budget_id`)
  - `budget_approvals` (via `budget_id`)
  - `budget_forecasts` (via `budget_id`)
  - `expense_data` (via `budget_id`)
  - `financial_transactions` (via `budget_id`)
  - `purchase_orders` (via `budget_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `budget_period_id` | `uuid` | No | - | FK → `budget_periods(id)` |
| `category_id` | `uuid` | No | - | FK → `budget_categories(id)` |
| `name` | `varchar(255)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `allocated_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `committed_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `actual_spent` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `reserved_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `status` | `text` | Yes | `'draft'::text` | - |
| `variance_rules` | `json` | Yes | - | - |
| `seasonal_patterns` | `json` | Yes | - | - |
| `owner_id` | `uuid` | Yes | - | FK → `users(id)` |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `budgets_budget_period_id_category_id_index` on (`budget_period_id, category_id`)
- **INDEX**: `budgets_organization_id_status_index` on (`organization_id, status`)
- **INDEX**: `budgets_owner_id_index` on (`owner_id`)
- **PRIMARY KEY**: `budgets_pkey` on (`id`)
- **INDEX**: `idx_budget_financial_amounts` on (`allocated_amount, committed_amount, actual_spent, reserved_amount`)
- **INDEX**: `idx_budgets_org_period` on (`organization_id, budget_period_id`)
- **INDEX**: `idx_budgets_org_status_owner` on (`organization_id, status, owner_id`)
- **INDEX**: `idx_budgets_period_category_status` on (`budget_period_id, category_id, status`)

**Foreign Keys**:

- `budget_period_id` → `budget_periods(id)`
  - ON DELETE: CASCADE
- `category_id` → `budget_categories(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `owner_id` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `budgets_status_check`: (status = ANY (ARRAY['draft'::text, 'approved'::text, 'active'::text, 'locked'::text, 'closed'::text]))
- `check_budget_actual_spent_positive`: (actual_spent >= (0)::numeric)
- `check_budget_allocated_amount_positive`: (allocated_amount >= (0)::numeric)
- `check_budget_amounts`: ((allocated_amount >= (0)::numeric) AND (committed_amount >= (0)::numeric) AND (actual_spent >= (0)::numeric) AND (reserved_amount >= (0)::numeric) AND (((committed_amount + actual_spent) + reserved_amount) <= allocated_amount))
- `check_budget_committed_amount_valid`: ((committed_amount >= (0)::numeric) AND (committed_amount <= (allocated_amount * 1.1)))
- `2200_480826_1_not_null`: id IS NOT NULL
- `2200_480826_2_not_null`: organization_id IS NOT NULL
- `2200_480826_3_not_null`: budget_period_id IS NOT NULL
- `2200_480826_4_not_null`: category_id IS NOT NULL
- `2200_480826_5_not_null`: name IS NOT NULL

---

#### `cash_flow_forecasts`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `budget_periods` (via `budget_period_id`)
  - `users` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `budget_period_id` | `uuid` | No | - | FK → `budget_periods(id)`, UNIQUE |
| `forecast_year` | `integer` | No | - | UNIQUE |
| `forecast_month` | `integer` | No | - | UNIQUE |
| `projected_income` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `projected_expenses` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `projected_payroll` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `net_cash_flow` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `running_balance` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `assumptions` | `json` | Yes | - | - |
| `confidence_score` | `numeric(3,2)` | Yes | - | - |
| `is_actual` | `boolean` | Yes | `false` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **UNIQUE INDEX**: `cash_flow_forecasts_budget_period_id_forecast_year_forecast_mon` on (`budget_period_id, forecast_year, forecast_month`)
- **INDEX**: `cash_flow_forecasts_organization_id_forecast_year_forecast_mont` on (`organization_id, forecast_year, forecast_month`)
- **PRIMARY KEY**: `cash_flow_forecasts_pkey` on (`id`)

**Foreign Keys**:

- `budget_period_id` → `budget_periods(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480978_1_not_null`: id IS NOT NULL
- `2200_480978_2_not_null`: organization_id IS NOT NULL
- `2200_480978_3_not_null`: budget_period_id IS NOT NULL
- `2200_480978_4_not_null`: forecast_year IS NOT NULL
- `2200_480978_5_not_null`: forecast_month IS NOT NULL

---

#### `chart_of_accounts`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `chart_of_accounts` (via `parent_account_id`)
- **Has many**:
  - `budget_categories` (via `default_account_id`)
  - `chart_of_accounts` (via `parent_account_id`)
  - `financial_transactions` (via `credit_account_id, debit_account_id`)
  - `journal_entry_lines` (via `account_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `account_number` | `varchar(255)` | No | - | UNIQUE |
| `account_name` | `varchar(255)` | No | - | - |
| `account_type` | `text` | No | - | - |
| `account_subtype` | `text` | No | - | - |
| `parent_account_id` | `uuid` | Yes | - | FK → `chart_of_accounts(id)` |
| `description` | `text` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `system_account` | `boolean` | Yes | `false` | - |
| `external_id` | `varchar(255)` | Yes | - | - |
| `mapping_rules` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `chart_of_accounts_account_type_account_subtype_index` on (`account_type, account_subtype`)
- **UNIQUE INDEX**: `chart_of_accounts_organization_id_account_number_unique` on (`organization_id, account_number`)
- **INDEX**: `chart_of_accounts_organization_id_is_active_index` on (`organization_id, is_active`)
- **PRIMARY KEY**: `chart_of_accounts_pkey` on (`id`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `parent_account_id` → `chart_of_accounts(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `chart_of_accounts_account_subtype_check`: (account_subtype = ANY (ARRAY['current_asset'::text, 'fixed_asset'::text, 'current_liability'::text, 'long_term_liability'::text, 'equity'::text, 'operating_revenue'::text, 'other_revenue'::text, 'operating_expense'::text, 'other_expense'::text, 'cost_of_goods_sold'::text]))
- `chart_of_accounts_account_type_check`: (account_type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text, 'cost_of_goods_sold'::text]))
- `2200_481062_1_not_null`: id IS NOT NULL
- `2200_481062_2_not_null`: organization_id IS NOT NULL
- `2200_481062_3_not_null`: account_number IS NOT NULL
- `2200_481062_4_not_null`: account_name IS NOT NULL
- `2200_481062_5_not_null`: account_type IS NOT NULL
- `2200_481062_6_not_null`: account_subtype IS NOT NULL

---

#### `company_credit_cards`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `blocked_by`)
  - `users` (via `created_by`)
  - `users` (via `organization_id`)
  - `users` (via `primary_holder_id`)
  - `users` (via `updated_by`)
- **Has many**:
  - `expense_data` (via `credit_card_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `card_name` | `varchar(255)` | No | - | - |
| `card_type` | `varchar(255)` | No | - | - |
| `last_four_digits` | `varchar(4)` | No | - | - |
| `card_network` | `varchar(255)` | Yes | - | - |
| `issuing_bank` | `varchar(255)` | Yes | - | - |
| `primary_holder_id` | `uuid` | Yes | - | FK → `users(id)` |
| `cardholder_name` | `varchar(255)` | Yes | - | - |
| `authorized_users` | `json` | Yes | - | - |
| `is_shared_card` | `boolean` | Yes | `false` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `expiration_date` | `date` | Yes | - | - |
| `credit_limit` | `numeric(10,2)` | Yes | - | - |
| `available_credit` | `numeric(10,2)` | Yes | - | - |
| `current_balance` | `numeric(10,2)` | Yes | - | - |
| `monthly_limit` | `numeric(10,2)` | Yes | - | - |
| `transaction_limit` | `numeric(10,2)` | Yes | - | - |
| `category_limits` | `json` | Yes | - | - |
| `merchant_restrictions` | `json` | Yes | - | - |
| `requires_receipt` | `boolean` | Yes | `true` | - |
| `requires_pre_approval` | `boolean` | Yes | `false` | - |
| `statement_closing_date` | `date` | Yes | - | - |
| `payment_due_date` | `date` | Yes | - | - |
| `statement_frequency` | `varchar(255)` | Yes | `'monthly'::character varying` | - |
| `auto_reconciliation_rules` | `json` | Yes | - | - |
| `external_card_id` | `varchar(255)` | Yes | - | - |
| `integration_config` | `json` | Yes | - | - |
| `accounting_code` | `varchar(255)` | Yes | - | - |
| `cost_center` | `varchar(255)` | Yes | - | - |
| `notification_settings` | `json` | Yes | - | - |
| `alert_threshold` | `numeric(10,2)` | Yes | - | - |
| `fraud_monitoring` | `boolean` | Yes | `true` | - |
| `spending_alerts` | `json` | Yes | - | - |
| `is_emergency_card` | `boolean` | Yes | `false` | - |
| `is_blocked` | `boolean` | Yes | `false` | - |
| `block_reason` | `text` | Yes | - | - |
| `blocked_at` | `timestamptz` | Yes | - | - |
| `blocked_by` | `uuid` | Yes | - | FK → `users(id)` |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `activated_at` | `timestamptz` | Yes | - | - |
| `deactivated_at` | `timestamptz` | Yes | - | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `updated_by` | `uuid` | Yes | - | FK → `users(id)` |

**Indexes**:

- **INDEX**: `company_credit_cards_card_name_index` on (`card_name`)
- **INDEX**: `company_credit_cards_expiration_date_index` on (`expiration_date`)
- **INDEX**: `company_credit_cards_is_blocked_index` on (`is_blocked`)
- **INDEX**: `company_credit_cards_is_emergency_card_index` on (`is_emergency_card`)
- **INDEX**: `company_credit_cards_is_shared_card_index` on (`is_shared_card`)
- **INDEX**: `company_credit_cards_last_four_digits_card_type_index` on (`card_type, last_four_digits`)
- **INDEX**: `company_credit_cards_organization_id_is_active_index` on (`organization_id, is_active`)
- **PRIMARY KEY**: `company_credit_cards_pkey` on (`id`)
- **INDEX**: `company_credit_cards_primary_holder_id_is_active_index` on (`primary_holder_id, is_active`)
- **INDEX**: `company_credit_cards_statement_closing_date_index` on (`statement_closing_date`)

**Foreign Keys**:

- `blocked_by` → `users(id)`
  - ON DELETE: SET NULL
- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `primary_holder_id` → `users(id)`
  - ON DELETE: SET NULL
- `updated_by` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_482072_1_not_null`: id IS NOT NULL
- `2200_482072_2_not_null`: organization_id IS NOT NULL
- `2200_482072_3_not_null`: card_name IS NOT NULL
- `2200_482072_4_not_null`: card_type IS NOT NULL
- `2200_482072_5_not_null`: last_four_digits IS NOT NULL

---

#### `expense_approvals`

**Purpose**: Approval workflow tracking

**Relationships**:
- **Belongs to**:
  - `users` (via `approver_id`)
  - `expense_data` (via `expense_data_id`)
  - `users` (via `organization_id`)
  - `expense_receipts` (via `receipt_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `expense_data_id` | `uuid` | No | - | FK → `expense_data(id)` |
| `receipt_id` | `uuid` | No | - | FK → `expense_receipts(id)` |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `status` | `text` | Yes | `'pending'::text` | - |
| `approver_id` | `uuid` | Yes | - | FK → `users(id)` |
| `approval_notes` | `text` | Yes | - | - |
| `rejection_reason` | `text` | Yes | - | - |
| `required_information` | `json` | Yes | - | - |
| `approved_amount` | `numeric(10,2)` | Yes | - | - |
| `requested_amount` | `numeric(10,2)` | Yes | - | - |
| `approval_level` | `varchar(255)` | Yes | - | - |
| `approval_sequence` | `integer` | Yes | `1` | - |
| `expense_policy_version` | `varchar(255)` | Yes | - | - |
| `policy_violations` | `json` | Yes | - | - |
| `auto_approved` | `boolean` | Yes | `false` | - |
| `auto_approval_reason` | `text` | Yes | - | - |
| `submitted_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `approved_at` | `timestamptz` | Yes | - | - |
| `rejected_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `expense_approvals_approver_id_status_index` on (`status, approver_id`)
- **INDEX**: `expense_approvals_auto_approved_index` on (`auto_approved`)
- **INDEX**: `expense_approvals_organization_id_status_index` on (`organization_id, status`)
- **PRIMARY KEY**: `expense_approvals_pkey` on (`id`)
- **INDEX**: `expense_approvals_submitted_at_index` on (`submitted_at`)
- **INDEX**: `expense_approvals_user_id_status_index` on (`user_id, status`)

**Foreign Keys**:

- `approver_id` → `users(id)`
  - ON DELETE: SET NULL
- `expense_data_id` → `expense_data(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `receipt_id` → `expense_receipts(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `expense_approvals_status_check`: (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'requires_information'::text, 'cancelled'::text]))
- `2200_480696_1_not_null`: id IS NOT NULL
- `2200_480696_2_not_null`: expense_data_id IS NOT NULL
- `2200_480696_3_not_null`: receipt_id IS NOT NULL
- `2200_480696_4_not_null`: user_id IS NOT NULL
- `2200_480696_5_not_null`: organization_id IS NOT NULL

---

#### `expense_categories`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `expense_categories` (via `parent_category_id`)
- **Has many**:
  - `expense_categories` (via `parent_category_id`)
  - `expense_data` (via `category_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `name` | `varchar(255)` | No | - | UNIQUE |
| `code` | `varchar(255)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `color_code` | `varchar(255)` | Yes | `'#6B7280'::character varying` | - |
| `icon` | `varchar(255)` | Yes | `'receipt'::character varying` | - |
| `parent_category_id` | `uuid` | Yes | - | FK → `expense_categories(id)` |
| `sort_order` | `integer` | Yes | `0` | - |
| `keywords` | `json` | Yes | - | - |
| `vendor_patterns` | `json` | Yes | - | - |
| `amount_ranges` | `json` | Yes | - | - |
| `ai_enabled` | `boolean` | Yes | `true` | - |
| `requires_approval` | `boolean` | Yes | `false` | - |
| `approval_threshold` | `numeric(10,2)` | Yes | - | - |
| `reimbursable` | `boolean` | Yes | `true` | - |
| `taxable` | `boolean` | Yes | `true` | - |
| `active` | `boolean` | Yes | `true` | - |
| `metadata` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `expense_categories_ai_enabled_index` on (`ai_enabled`)
- **INDEX**: `expense_categories_organization_id_active_index` on (`organization_id, active`)
- **UNIQUE INDEX**: `expense_categories_organization_id_code_unique` on (`organization_id, code`)
- **UNIQUE INDEX**: `expense_categories_organization_id_name_unique` on (`organization_id, name`)
- **INDEX**: `expense_categories_parent_category_id_index` on (`parent_category_id`)
- **PRIMARY KEY**: `expense_categories_pkey` on (`id`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `parent_category_id` → `expense_categories(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_480617_1_not_null`: id IS NOT NULL
- `2200_480617_2_not_null`: organization_id IS NOT NULL
- `2200_480617_3_not_null`: name IS NOT NULL
- `2200_480617_4_not_null`: code IS NOT NULL

---

#### `expense_data`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `budgets` (via `budget_id`)
  - `expense_categories` (via `category_id`)
  - `users` (via `compliance_reviewed_by`)
  - `users` (via `corrected_by`)
  - `company_credit_cards` (via `credit_card_id`)
  - `users` (via `organization_id`)
  - `users` (via `payment_approved_by`)
  - `payment_methods` (via `payment_method_id`)
  - `purchase_orders` (via `purchase_order_id`)
  - `expense_receipts` (via `receipt_id`)
  - `users` (via `reconciled_by`)
  - `users` (via `reimbursement_user_id`)
  - `financial_transactions` (via `transaction_id`)
  - `users` (via `user_id`)
- **Has many**:
  - `expense_approvals` (via `expense_data_id`)
  - `expense_reimbursements` (via `expense_data_id`)
  - `financial_transactions` (via `expense_data_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `receipt_id` | `uuid` | No | - | FK → `expense_receipts(id)` |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `vendor_name` | `varchar(255)` | Yes | - | - |
| `vendor_address` | `text` | Yes | - | - |
| `vendor_phone` | `varchar(255)` | Yes | - | - |
| `total_amount` | `numeric(10,2)` | Yes | - | - |
| `tax_amount` | `numeric(10,2)` | Yes | - | - |
| `subtotal_amount` | `numeric(10,2)` | Yes | - | - |
| `transaction_date` | `date` | Yes | - | - |
| `transaction_time` | `varchar(255)` | Yes | - | - |
| `receipt_number` | `varchar(255)` | Yes | - | - |
| `payment_method` | `varchar(255)` | Yes | - | - |
| `category_id` | `uuid` | Yes | - | FK → `expense_categories(id)` |
| `category_name` | `varchar(255)` | Yes | - | - |
| `description` | `text` | Yes | - | - |
| `line_items` | `json` | Yes | - | - |
| `business_purpose` | `varchar(255)` | Yes | - | - |
| `project_code` | `varchar(255)` | Yes | - | - |
| `department` | `varchar(255)` | Yes | - | - |
| `reimbursable` | `boolean` | Yes | `true` | - |
| `ai_extracted_fields` | `json` | Yes | - | - |
| `extraction_confidence` | `numeric(3,2)` | Yes | - | - |
| `field_confidence_scores` | `json` | Yes | - | - |
| `requires_manual_review` | `boolean` | Yes | `false` | - |
| `manually_corrected` | `boolean` | Yes | `false` | - |
| `corrections_made` | `json` | Yes | - | - |
| `corrected_by` | `uuid` | Yes | - | FK → `users(id)` |
| `corrected_at` | `timestamptz` | Yes | - | - |
| `extracted_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `budget_id` | `uuid` | Yes | - | FK → `budgets(id)` |
| `transaction_id` | `uuid` | Yes | - | FK → `financial_transactions(id)` |
| `reimbursement_user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `reimbursement_notes` | `text` | Yes | - | - |
| `is_reimbursable` | `boolean` | Yes | `true` | - |
| `payment_method_id` | `uuid` | Yes | - | FK → `payment_methods(id)` |
| `purchase_order_id` | `uuid` | Yes | - | FK → `purchase_orders(id)` |
| `credit_card_id` | `uuid` | Yes | - | FK → `company_credit_cards(id)` |
| `payment_method_type` | `text` | Yes | - | - |
| `payment_reference` | `varchar(255)` | Yes | - | - |
| `payment_status` | `varchar(255)` | Yes | `'pending'::character varying` | - |
| `payment_due_date` | `date` | Yes | - | - |
| `payment_date` | `date` | Yes | - | - |
| `payment_approved_by` | `uuid` | Yes | - | FK → `users(id)` |
| `payment_approved_at` | `timestamptz` | Yes | - | - |
| `po_line_item_id` | `varchar(255)` | Yes | - | - |
| `po_pre_approved` | `boolean` | Yes | `false` | - |
| `credit_card_transaction_id` | `varchar(255)` | Yes | - | - |
| `credit_card_statement_date` | `date` | Yes | - | - |
| `credit_card_reconciled` | `boolean` | Yes | `false` | - |
| `reconciled_by` | `uuid` | Yes | - | FK → `users(id)` |
| `reconciled_at` | `timestamptz` | Yes | - | - |
| `vendor_invoice_number` | `varchar(255)` | Yes | - | - |
| `vendor_invoice_date` | `date` | Yes | - | - |
| `vendor_payment_method` | `varchar(255)` | Yes | - | - |
| `vendor_payment_terms` | `varchar(255)` | Yes | - | - |
| `vendor_payment_details` | `json` | Yes | - | - |
| `requires_additional_approval` | `boolean` | Yes | `false` | - |
| `approval_requirements` | `json` | Yes | - | - |
| `expense_urgency` | `varchar(255)` | Yes | `'normal'::character varying` | - |
| `urgency_justification` | `text` | Yes | - | - |
| `requires_compliance_review` | `boolean` | Yes | `false` | - |
| `compliance_flags` | `json` | Yes | - | - |
| `compliance_reviewed_by` | `uuid` | Yes | - | FK → `users(id)` |
| `compliance_reviewed_at` | `timestamptz` | Yes | - | - |
| `compliance_notes` | `text` | Yes | - | - |
| `is_tax_deductible` | `boolean` | Yes | `true` | - |
| `tax_deductible_amount` | `numeric(10,2)` | Yes | - | - |
| `tax_classification` | `varchar(255)` | Yes | - | - |
| `tax_implications` | `json` | Yes | - | - |

**Indexes**:

- **INDEX**: `expense_data_budget_id_index` on (`budget_id`)
- **INDEX**: `expense_data_credit_card_id_credit_card_reconciled_index` on (`credit_card_id, credit_card_reconciled`)
- **INDEX**: `expense_data_expense_urgency_payment_status_index` on (`payment_status, expense_urgency`)
- **INDEX**: `expense_data_manually_corrected_index` on (`manually_corrected`)
- **INDEX**: `expense_data_organization_id_category_id_index` on (`organization_id, category_id`)
- **INDEX**: `expense_data_payment_due_date_payment_status_index` on (`payment_status, payment_due_date`)
- **INDEX**: `expense_data_payment_method_id_payment_status_index` on (`payment_method_id, payment_status`)
- **INDEX**: `expense_data_payment_method_type_payment_status_index` on (`payment_method_type, payment_status`)
- **PRIMARY KEY**: `expense_data_pkey` on (`id`)
- **INDEX**: `expense_data_purchase_order_id_po_pre_approved_index` on (`purchase_order_id, po_pre_approved`)
- **INDEX**: `expense_data_reimbursement_user_id_index` on (`reimbursement_user_id`)
- **INDEX**: `expense_data_requires_additional_approval_index` on (`requires_additional_approval`)
- **INDEX**: `expense_data_requires_compliance_review_index` on (`requires_compliance_review`)
- **INDEX**: `expense_data_requires_manual_review_index` on (`requires_manual_review`)
- **INDEX**: `expense_data_transaction_date_total_amount_index` on (`total_amount, transaction_date`)
- **INDEX**: `expense_data_user_id_transaction_date_index` on (`user_id, transaction_date`)
- **INDEX**: `expense_data_vendor_invoice_date_payment_status_index` on (`payment_status, vendor_invoice_date`)
- **INDEX**: `idx_expense_data_org_date_category` on (`organization_id, transaction_date, category_id`)
- **INDEX**: `idx_expense_data_user_reimbursable_date` on (`user_id, transaction_date, reimbursable`)
- **INDEX**: `idx_expenses_date_amount` on (`total_amount, transaction_date`)

**Foreign Keys**:

- `budget_id` → `budgets(id)`
  - ON DELETE: SET NULL
- `category_id` → `expense_categories(id)`
  - ON DELETE: SET NULL
- `compliance_reviewed_by` → `users(id)`
  - ON DELETE: SET NULL
- `corrected_by` → `users(id)`
  - ON DELETE: SET NULL
- `credit_card_id` → `company_credit_cards(id)`
  - ON DELETE: SET NULL
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `payment_approved_by` → `users(id)`
  - ON DELETE: SET NULL
- `payment_method_id` → `payment_methods(id)`
  - ON DELETE: SET NULL
- `purchase_order_id` → `purchase_orders(id)`
  - ON DELETE: SET NULL
- `receipt_id` → `expense_receipts(id)`
  - ON DELETE: CASCADE
- `reconciled_by` → `users(id)`
  - ON DELETE: SET NULL
- `reimbursement_user_id` → `users(id)`
  - ON DELETE: SET NULL
- `transaction_id` → `financial_transactions(id)`
  - ON DELETE: SET NULL
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `check_expense_tax_amount_valid`: ((tax_amount >= (0)::numeric) AND ((total_amount IS NULL) OR (tax_amount <= total_amount)))
- `check_expense_total_amount_positive`: (total_amount >= (0)::numeric)
- `check_extraction_confidence_valid`: ((extraction_confidence >= (0)::numeric) AND (extraction_confidence <= (1)::numeric))
- `expense_data_payment_method_type_check`: (payment_method_type = ANY (ARRAY['person_reimbursement'::text, 'purchase_order'::text, 'credit_card'::text, 'direct_vendor'::text]))
- `2200_480652_1_not_null`: id IS NOT NULL
- `2200_480652_2_not_null`: receipt_id IS NOT NULL
- `2200_480652_3_not_null`: user_id IS NOT NULL
- `2200_480652_4_not_null`: organization_id IS NOT NULL

---

#### `expense_receipts`

**Purpose**: Receipt storage and validation

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `users` (via `user_id`)
- **Has many**:
  - `ai_processing_logs` (via `receipt_id`)
  - `expense_approvals` (via `receipt_id`)
  - `expense_data` (via `receipt_id`)
  - `expense_reimbursements` (via `receipt_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `original_filename` | `varchar(255)` | No | - | - |
| `file_path` | `varchar(255)` | No | - | - |
| `file_type` | `varchar(255)` | No | - | - |
| `mime_type` | `varchar(255)` | No | - | - |
| `file_size` | `integer` | No | - | - |
| `file_hash` | `varchar(255)` | No | - | - |
| `processing_status` | `text` | Yes | `'uploaded'::text` | - |
| `processing_notes` | `text` | Yes | - | - |
| `raw_ocr_text` | `text` | Yes | - | - |
| `ai_confidence_scores` | `json` | Yes | - | - |
| `processing_metadata` | `json` | Yes | - | - |
| `uploaded_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `processed_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `expense_receipts_file_hash_index` on (`file_hash`)
- **INDEX**: `expense_receipts_organization_id_uploaded_at_index` on (`organization_id, uploaded_at`)
- **PRIMARY KEY**: `expense_receipts_pkey` on (`id`)
- **INDEX**: `expense_receipts_processing_status_index` on (`processing_status`)
- **INDEX**: `expense_receipts_user_id_processing_status_index` on (`user_id, processing_status`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `expense_receipts_processing_status_check`: (processing_status = ANY (ARRAY['uploaded'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'manual_review'::text]))
- `2200_480590_1_not_null`: id IS NOT NULL
- `2200_480590_2_not_null`: user_id IS NOT NULL
- `2200_480590_3_not_null`: organization_id IS NOT NULL
- `2200_480590_4_not_null`: original_filename IS NOT NULL
- `2200_480590_5_not_null`: file_path IS NOT NULL
- `2200_480590_6_not_null`: file_type IS NOT NULL
- `2200_480590_7_not_null`: mime_type IS NOT NULL
- `2200_480590_8_not_null`: file_size IS NOT NULL
- `2200_480590_9_not_null`: file_hash IS NOT NULL

---

#### `expense_reimbursements`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `expense_data` (via `expense_data_id`)
  - `users` (via `organization_id`)
  - `users` (via `processed_by`)
  - `expense_receipts` (via `receipt_id`)
  - `users` (via `reimbursement_user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `expense_data_id` | `uuid` | No | - | FK → `expense_data(id)` |
| `receipt_id` | `uuid` | No | - | FK → `expense_receipts(id)` |
| `reimbursement_user_id` | `uuid` | No | - | FK → `users(id)` |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `approved_amount` | `numeric(10,2)` | No | - | - |
| `reimbursed_amount` | `numeric(10,2)` | Yes | - | - |
| `status` | `text` | Yes | `'pending'::text` | - |
| `payment_method` | `varchar(255)` | Yes | - | - |
| `payment_reference` | `varchar(255)` | Yes | - | - |
| `scheduled_pay_date` | `date` | Yes | - | - |
| `paid_date` | `date` | Yes | - | - |
| `processed_by` | `uuid` | Yes | - | FK → `users(id)` |
| `processing_notes` | `text` | Yes | - | - |
| `payment_details` | `json` | Yes | - | - |
| `pay_period` | `varchar(255)` | Yes | - | - |
| `included_in_payroll` | `boolean` | Yes | `false` | - |
| `payroll_batch_id` | `uuid` | Yes | - | - |
| `scheduled_at` | `timestamptz` | Yes | - | - |
| `paid_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `expense_reimbursements_included_in_payroll_index` on (`included_in_payroll`)
- **INDEX**: `expense_reimbursements_organization_id_status_index` on (`organization_id, status`)
- **INDEX**: `expense_reimbursements_paid_date_index` on (`paid_date`)
- **INDEX**: `expense_reimbursements_pay_period_status_index` on (`status, pay_period`)
- **PRIMARY KEY**: `expense_reimbursements_pkey` on (`id`)
- **INDEX**: `expense_reimbursements_reimbursement_user_id_status_index` on (`reimbursement_user_id, status`)
- **INDEX**: `expense_reimbursements_scheduled_pay_date_status_index` on (`status, scheduled_pay_date`)

**Foreign Keys**:

- `expense_data_id` → `expense_data(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `processed_by` → `users(id)`
  - ON DELETE: SET NULL
- `receipt_id` → `expense_receipts(id)`
  - ON DELETE: CASCADE
- `reimbursement_user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `expense_reimbursements_status_check`: (status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'paid'::text, 'cancelled'::text, 'disputed'::text]))
- `2200_481916_1_not_null`: id IS NOT NULL
- `2200_481916_2_not_null`: expense_data_id IS NOT NULL
- `2200_481916_3_not_null`: receipt_id IS NOT NULL
- `2200_481916_4_not_null`: reimbursement_user_id IS NOT NULL
- `2200_481916_5_not_null`: organization_id IS NOT NULL
- `2200_481916_6_not_null`: approved_amount IS NOT NULL

---

#### `financial_audit_trail`

**Purpose**: Audit tracking for compliance

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `table_name` | `varchar(255)` | No | - | - |
| `record_id` | `uuid` | No | - | - |
| `action` | `text` | No | - | - |
| `old_values` | `json` | Yes | - | - |
| `new_values` | `json` | Yes | - | - |
| `reason` | `text` | Yes | - | - |
| `ip_address` | `varchar(255)` | Yes | - | - |
| `user_agent` | `varchar(255)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `financial_audit_trail_action_created_at_index` on (`action, created_at`)
- **INDEX**: `financial_audit_trail_organization_id_table_name_record_id_inde` on (`organization_id, table_name, record_id`)
- **PRIMARY KEY**: `financial_audit_trail_pkey` on (`id`)
- **INDEX**: `financial_audit_trail_user_id_created_at_index` on (`user_id, created_at`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `financial_audit_trail_action_check`: (action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'approve'::text, 'reject'::text]))
- `2200_481417_1_not_null`: id IS NOT NULL
- `2200_481417_2_not_null`: organization_id IS NOT NULL
- `2200_481417_3_not_null`: user_id IS NOT NULL
- `2200_481417_4_not_null`: table_name IS NOT NULL
- `2200_481417_5_not_null`: record_id IS NOT NULL
- `2200_481417_6_not_null`: action IS NOT NULL

---

#### `financial_dashboards`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `dashboard_name` | `varchar(255)` | No | - | - |
| `dashboard_type` | `text` | No | - | - |
| `widget_config` | `json` | Yes | - | - |
| `filters` | `json` | Yes | - | - |
| `is_default` | `boolean` | Yes | `false` | - |
| `is_shared` | `boolean` | Yes | `false` | - |
| `sharing_permissions` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `financial_dashboards_organization_id_dashboard_type_index` on (`organization_id, dashboard_type`)
- **PRIMARY KEY**: `financial_dashboards_pkey` on (`id`)
- **INDEX**: `financial_dashboards_user_id_is_default_index` on (`user_id, is_default`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `financial_dashboards_dashboard_type_check`: (dashboard_type = ANY (ARRAY['executive_summary'::text, 'budget_manager'::text, 'expense_tracker'::text, 'payroll_overview'::text, 'cash_flow_monitor'::text, 'custom'::text]))
- `2200_481392_1_not_null`: id IS NOT NULL
- `2200_481392_2_not_null`: organization_id IS NOT NULL
- `2200_481392_4_not_null`: dashboard_name IS NOT NULL
- `2200_481392_5_not_null`: dashboard_type IS NOT NULL

---

#### `financial_insights`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `users` (via `reviewed_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `insight_type` | `text` | No | - | - |
| `title` | `varchar(255)` | No | - | - |
| `description` | `text` | No | - | - |
| `recommendation` | `text` | Yes | - | - |
| `potential_impact` | `numeric(12,2)` | Yes | - | - |
| `priority` | `text` | No | - | - |
| `status` | `text` | Yes | `'new'::text` | - |
| `supporting_data` | `json` | Yes | - | - |
| `action_items` | `json` | Yes | - | - |
| `created_by_ai` | `boolean` | Yes | `true` | - |
| `reviewed_by` | `uuid` | Yes | - | FK → `users(id)` |
| `reviewed_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `expires_at` | `timestamptz` | Yes | - | - |

**Indexes**:

- **INDEX**: `financial_insights_created_at_index` on (`created_at`)
- **INDEX**: `financial_insights_insight_type_index` on (`insight_type`)
- **INDEX**: `financial_insights_organization_id_status_priority_index` on (`organization_id, priority, status`)
- **PRIMARY KEY**: `financial_insights_pkey` on (`id`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `reviewed_by` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `financial_insights_insight_type_check`: (insight_type = ANY (ARRAY['cost_savings_opportunity'::text, 'budget_optimization'::text, 'expense_pattern_anomaly'::text, 'cash_flow_warning'::text, 'seasonal_trend'::text, 'efficiency_recommendation'::text, 'fraud_alert'::text]))
- `financial_insights_priority_check`: (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))
- `financial_insights_status_check`: (status = ANY (ARRAY['new'::text, 'reviewed'::text, 'implemented'::text, 'dismissed'::text, 'archived'::text]))
- `2200_481365_1_not_null`: id IS NOT NULL
- `2200_481365_2_not_null`: organization_id IS NOT NULL
- `2200_481365_3_not_null`: insight_type IS NOT NULL
- `2200_481365_4_not_null`: title IS NOT NULL
- `2200_481365_5_not_null`: description IS NOT NULL
- `2200_481365_8_not_null`: priority IS NOT NULL

---

#### `financial_kpis`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `kpi_name` | `varchar(255)` | No | - | - |
| `kpi_type` | `text` | No | - | - |
| `current_value` | `numeric(12,4)` | Yes | - | - |
| `target_value` | `numeric(12,4)` | Yes | - | - |
| `previous_value` | `numeric(12,4)` | Yes | - | - |
| `unit` | `varchar(255)` | Yes | - | - |
| `trend` | `text` | Yes | `'stable'::text` | - |
| `trend_percentage` | `numeric(5,2)` | Yes | - | - |
| `calculation_period_days` | `integer` | Yes | `30` | - |
| `calculation_config` | `json` | Yes | - | - |
| `last_calculated_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `financial_kpis_last_calculated_at_index` on (`last_calculated_at`)
- **INDEX**: `financial_kpis_organization_id_kpi_type_index` on (`organization_id, kpi_type`)
- **PRIMARY KEY**: `financial_kpis_pkey` on (`id`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `financial_kpis_kpi_type_check`: (kpi_type = ANY (ARRAY['budget_variance'::text, 'cash_flow_trend'::text, 'expense_trend'::text, 'payroll_efficiency'::text, 'cost_per_game'::text, 'revenue_growth'::text, 'profit_margin'::text, 'custom'::text]))
- `financial_kpis_trend_check`: (trend = ANY (ARRAY['up'::text, 'down'::text, 'stable'::text]))
- `2200_481321_1_not_null`: id IS NOT NULL
- `2200_481321_2_not_null`: organization_id IS NOT NULL
- `2200_481321_3_not_null`: kpi_name IS NOT NULL
- `2200_481321_4_not_null`: kpi_type IS NOT NULL

---

#### `financial_reports_config`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `users` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `report_name` | `varchar(255)` | No | - | - |
| `report_type` | `text` | No | - | - |
| `report_config` | `json` | Yes | - | - |
| `filters` | `json` | Yes | - | - |
| `is_template` | `boolean` | Yes | `false` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_by` | `uuid` | No | - | FK → `users(id)` |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `financial_reports_config_is_active_index` on (`is_active`)
- **INDEX**: `financial_reports_config_organization_id_report_type_index` on (`organization_id, report_type`)
- **PRIMARY KEY**: `financial_reports_config_pkey` on (`id`)

**Foreign Keys**:

- `created_by` → `users(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `financial_reports_config_report_type_check`: (report_type = ANY (ARRAY['profit_loss'::text, 'balance_sheet'::text, 'cash_flow'::text, 'budget_variance'::text, 'expense_summary'::text, 'payroll_summary'::text, 'custom'::text]))
- `2200_481200_1_not_null`: id IS NOT NULL
- `2200_481200_2_not_null`: organization_id IS NOT NULL
- `2200_481200_3_not_null`: report_name IS NOT NULL
- `2200_481200_4_not_null`: report_type IS NOT NULL
- `2200_481200_9_not_null`: created_by IS NOT NULL

---

#### `financial_transactions`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `budgets` (via `budget_id`)
  - `users` (via `created_by`)
  - `chart_of_accounts` (via `credit_account_id`)
  - `chart_of_accounts` (via `debit_account_id`)
  - `expense_data` (via `expense_data_id`)
  - `users` (via `organization_id`)
  - `game_assignments` (via `payroll_assignment_id`)
  - `vendors` (via `vendor_id`)
- **Has many**:
  - `expense_data` (via `transaction_id`)
  - `game_assignments` (via `payroll_transaction_id`)
  - `journal_entries` (via `transaction_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `budget_id` | `uuid` | Yes | - | FK → `budgets(id)` |
| `expense_data_id` | `uuid` | Yes | - | FK → `expense_data(id)` |
| `payroll_assignment_id` | `uuid` | Yes | - | FK → `game_assignments(id)` |
| `transaction_number` | `varchar(255)` | No | - | UNIQUE |
| `transaction_type` | `text` | No | - | - |
| `amount` | `numeric(12,2)` | No | - | - |
| `description` | `varchar(255)` | No | - | - |
| `transaction_date` | `date` | No | - | - |
| `reference_number` | `varchar(255)` | Yes | - | - |
| `vendor_id` | `uuid` | Yes | - | FK → `vendors(id)` |
| `created_by` | `uuid` | No | - | FK → `users(id)` |
| `status` | `text` | Yes | `'draft'::text` | - |
| `metadata` | `json` | Yes | - | - |
| `posted_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `debit_account_id` | `uuid` | Yes | - | FK → `chart_of_accounts(id)` |
| `credit_account_id` | `uuid` | Yes | - | FK → `chart_of_accounts(id)` |

**Indexes**:

- **INDEX**: `financial_transactions_budget_id_index` on (`budget_id`)
- **INDEX**: `financial_transactions_organization_id_transaction_date_index` on (`organization_id, transaction_date`)
- **UNIQUE INDEX**: `financial_transactions_organization_id_transaction_number_uniqu` on (`organization_id, transaction_number`)
- **PRIMARY KEY**: `financial_transactions_pkey` on (`id`)
- **INDEX**: `financial_transactions_status_index` on (`status`)
- **INDEX**: `financial_transactions_transaction_type_index` on (`transaction_type`)

**Foreign Keys**:

- `budget_id` → `budgets(id)`
  - ON DELETE: SET NULL
- `created_by` → `users(id)`
  - ON DELETE: CASCADE
- `credit_account_id` → `chart_of_accounts(id)`
  - ON DELETE: SET NULL
- `debit_account_id` → `chart_of_accounts(id)`
  - ON DELETE: SET NULL
- `expense_data_id` → `expense_data(id)`
  - ON DELETE: SET NULL
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `payroll_assignment_id` → `game_assignments(id)`
  - ON DELETE: SET NULL
- `vendor_id` → `vendors(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `financial_transactions_status_check`: (status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'posted'::text, 'cancelled'::text, 'voided'::text]))
- `financial_transactions_transaction_type_check`: (transaction_type = ANY (ARRAY['expense'::text, 'revenue'::text, 'payroll'::text, 'transfer'::text, 'adjustment'::text, 'refund'::text]))
- `2200_480916_1_not_null`: id IS NOT NULL
- `2200_480916_2_not_null`: organization_id IS NOT NULL
- `2200_480916_6_not_null`: transaction_number IS NOT NULL
- `2200_480916_7_not_null`: transaction_type IS NOT NULL
- `2200_480916_8_not_null`: amount IS NOT NULL
- `2200_480916_9_not_null`: description IS NOT NULL
- `2200_480916_10_not_null`: transaction_date IS NOT NULL
- `2200_480916_13_not_null`: created_by IS NOT NULL

---

#### `journal_entries`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `approved_by`)
  - `users` (via `created_by`)
  - `users` (via `organization_id`)
  - `financial_transactions` (via `transaction_id`)
- **Has many**:
  - `journal_entry_lines` (via `journal_entry_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `transaction_id` | `uuid` | Yes | - | FK → `financial_transactions(id)` |
| `entry_number` | `varchar(255)` | No | - | UNIQUE |
| `entry_date` | `date` | No | - | - |
| `reference` | `varchar(255)` | No | - | - |
| `description` | `text` | No | - | - |
| `total_debits` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `total_credits` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `status` | `text` | Yes | `'draft'::text` | - |
| `created_by` | `uuid` | No | - | FK → `users(id)` |
| `approved_by` | `uuid` | Yes | - | FK → `users(id)` |
| `approved_at` | `timestamptz` | Yes | - | - |
| `posted_at` | `timestamptz` | Yes | - | - |
| `external_id` | `varchar(255)` | Yes | - | - |
| `synced_at` | `timestamptz` | Yes | - | - |
| `sync_metadata` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `journal_entries_entry_date_index` on (`entry_date`)
- **UNIQUE INDEX**: `journal_entries_organization_id_entry_number_unique` on (`organization_id, entry_number`)
- **INDEX**: `journal_entries_organization_id_status_index` on (`organization_id, status`)
- **PRIMARY KEY**: `journal_entries_pkey` on (`id`)

**Foreign Keys**:

- `approved_by` → `users(id)`
  - ON DELETE: SET NULL
- `created_by` → `users(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `transaction_id` → `financial_transactions(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `journal_entries_status_check`: (status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'posted'::text, 'reversed'::text]))
- `2200_481113_1_not_null`: id IS NOT NULL
- `2200_481113_2_not_null`: organization_id IS NOT NULL
- `2200_481113_4_not_null`: entry_number IS NOT NULL
- `2200_481113_5_not_null`: entry_date IS NOT NULL
- `2200_481113_6_not_null`: reference IS NOT NULL
- `2200_481113_7_not_null`: description IS NOT NULL
- `2200_481113_11_not_null`: created_by IS NOT NULL

---

#### `journal_entry_lines`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `chart_of_accounts` (via `account_id`)
  - `journal_entries` (via `journal_entry_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `journal_entry_id` | `uuid` | No | - | FK → `journal_entries(id)` |
| `account_id` | `uuid` | No | - | FK → `chart_of_accounts(id)` |
| `description` | `text` | Yes | - | - |
| `debit_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `credit_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `reference` | `varchar(255)` | Yes | - | - |
| `dimensions` | `json` | Yes | - | - |
| `line_number` | `integer` | No | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `journal_entry_lines_account_id_index` on (`account_id`)
- **INDEX**: `journal_entry_lines_journal_entry_id_line_number_index` on (`journal_entry_id, line_number`)
- **PRIMARY KEY**: `journal_entry_lines_pkey` on (`id`)

**Foreign Keys**:

- `account_id` → `chart_of_accounts(id)`
  - ON DELETE: CASCADE
- `journal_entry_id` → `journal_entries(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481151_1_not_null`: id IS NOT NULL
- `2200_481151_2_not_null`: journal_entry_id IS NOT NULL
- `2200_481151_3_not_null`: account_id IS NOT NULL
- `2200_481151_9_not_null`: line_number IS NOT NULL

---

#### `payment_methods`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `users` (via `organization_id`)
  - `users` (via `updated_by`)
- **Has many**:
  - `expense_data` (via `payment_method_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `name` | `varchar(255)` | No | - | - |
| `type` | `text` | No | - | - |
| `description` | `text` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `requires_approval` | `boolean` | Yes | `true` | - |
| `requires_purchase_order` | `boolean` | Yes | `false` | - |
| `auto_approval_limit` | `numeric(10,2)` | Yes | - | - |
| `approval_workflow` | `json` | Yes | - | - |
| `required_fields` | `json` | Yes | - | - |
| `integration_config` | `json` | Yes | - | - |
| `accounting_code` | `varchar(255)` | Yes | - | - |
| `cost_center` | `varchar(255)` | Yes | - | - |
| `allowed_categories` | `json` | Yes | - | - |
| `user_restrictions` | `json` | Yes | - | - |
| `spending_limit` | `numeric(10,2)` | Yes | - | - |
| `spending_period` | `varchar(255)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `updated_by` | `uuid` | Yes | - | FK → `users(id)` |

**Indexes**:

- **INDEX**: `payment_methods_name_index` on (`name`)
- **INDEX**: `payment_methods_organization_id_is_active_index` on (`organization_id, is_active`)
- **PRIMARY KEY**: `payment_methods_pkey` on (`id`)
- **INDEX**: `payment_methods_type_is_active_index` on (`type, is_active`)

**Foreign Keys**:

- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `updated_by` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `payment_methods_type_check`: (type = ANY (ARRAY['person_reimbursement'::text, 'purchase_order'::text, 'credit_card'::text, 'direct_vendor'::text]))
- `2200_481993_1_not_null`: id IS NOT NULL
- `2200_481993_2_not_null`: organization_id IS NOT NULL
- `2200_481993_3_not_null`: name IS NOT NULL
- `2200_481993_4_not_null`: type IS NOT NULL

---

#### `purchase_orders`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `approved_by`)
  - `budgets` (via `budget_id`)
  - `users` (via `organization_id`)
  - `users` (via `requested_by`)
- **Has many**:
  - `expense_data` (via `purchase_order_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `po_number` | `varchar(255)` | No | - | UNIQUE |
| `requested_by` | `uuid` | No | - | FK → `users(id)` |
| `department_id` | `uuid` | Yes | - | - |
| `cost_center` | `varchar(255)` | Yes | - | - |
| `project_code` | `varchar(255)` | Yes | - | - |
| `vendor_name` | `varchar(255)` | No | - | - |
| `vendor_address` | `text` | Yes | - | - |
| `vendor_phone` | `varchar(255)` | Yes | - | - |
| `vendor_email` | `varchar(255)` | Yes | - | - |
| `vendor_contact_person` | `varchar(255)` | Yes | - | - |
| `vendor_tax_id` | `varchar(255)` | Yes | - | - |
| `description` | `text` | No | - | - |
| `estimated_amount` | `numeric(10,2)` | No | - | - |
| `actual_amount` | `numeric(10,2)` | Yes | - | - |
| `requested_delivery_date` | `date` | Yes | - | - |
| `actual_delivery_date` | `date` | Yes | - | - |
| `delivery_address` | `text` | Yes | - | - |
| `line_items` | `json` | Yes | - | - |
| `status` | `text` | Yes | `'draft'::text` | - |
| `approved_by` | `uuid` | Yes | - | FK → `users(id)` |
| `approved_at` | `timestamptz` | Yes | - | - |
| `approval_notes` | `text` | Yes | - | - |
| `approval_history` | `json` | Yes | - | - |
| `budget_id` | `uuid` | Yes | - | FK → `budgets(id)` |
| `account_code` | `varchar(255)` | Yes | - | - |
| `budget_approved` | `boolean` | Yes | `false` | - |
| `budget_impact` | `numeric(10,2)` | Yes | - | - |
| `payment_terms` | `varchar(255)` | Yes | - | - |
| `special_instructions` | `text` | Yes | - | - |
| `terms_and_conditions` | `json` | Yes | - | - |
| `requires_receipt` | `boolean` | Yes | `true` | - |
| `requires_invoice` | `boolean` | Yes | `true` | - |
| `external_po_id` | `varchar(255)` | Yes | - | - |
| `vendor_response` | `json` | Yes | - | - |
| `delivery_tracking` | `json` | Yes | - | - |
| `invoice_details` | `json` | Yes | - | - |
| `is_emergency` | `boolean` | Yes | `false` | - |
| `priority_level` | `varchar(255)` | Yes | `'normal'::character varying` | - |
| `emergency_justification` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `sent_to_vendor_at` | `timestamptz` | Yes | - | - |
| `acknowledged_at` | `timestamptz` | Yes | - | - |
| `delivered_at` | `timestamptz` | Yes | - | - |
| `invoiced_at` | `timestamptz` | Yes | - | - |
| `paid_at` | `timestamptz` | Yes | - | - |

**Indexes**:

- **INDEX**: `purchase_orders_created_at_status_index` on (`status, created_at`)
- **INDEX**: `purchase_orders_is_emergency_index` on (`is_emergency`)
- **UNIQUE INDEX**: `purchase_orders_organization_id_po_number_unique` on (`organization_id, po_number`)
- **INDEX**: `purchase_orders_organization_id_status_index` on (`organization_id, status`)
- **PRIMARY KEY**: `purchase_orders_pkey` on (`id`)
- **INDEX**: `purchase_orders_po_number_index` on (`po_number`)
- **INDEX**: `purchase_orders_priority_level_index` on (`priority_level`)
- **INDEX**: `purchase_orders_requested_by_status_index` on (`requested_by, status`)
- **INDEX**: `purchase_orders_requested_delivery_date_status_index` on (`requested_delivery_date, status`)
- **INDEX**: `purchase_orders_vendor_name_status_index` on (`vendor_name, status`)

**Foreign Keys**:

- `approved_by` → `users(id)`
  - ON DELETE: SET NULL
- `budget_id` → `budgets(id)`
  - ON DELETE: SET NULL
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `requested_by` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `purchase_orders_status_check`: (status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'sent_to_vendor'::text, 'acknowledged'::text, 'in_progress'::text, 'partially_received'::text, 'received'::text, 'invoiced'::text, 'paid'::text, 'cancelled'::text, 'closed'::text]))
- `2200_482025_1_not_null`: id IS NOT NULL
- `2200_482025_2_not_null`: organization_id IS NOT NULL
- `2200_482025_3_not_null`: po_number IS NOT NULL
- `2200_482025_4_not_null`: requested_by IS NOT NULL
- `2200_482025_8_not_null`: vendor_name IS NOT NULL
- `2200_482025_14_not_null`: description IS NOT NULL
- `2200_482025_15_not_null`: estimated_amount IS NOT NULL

---

#### `spending_limits`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `budget_categories` (via `budget_category_id`)
  - `users` (via `organization_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `role_id` | `uuid` | Yes | - | - |
| `budget_category_id` | `uuid` | Yes | - | FK → `budget_categories(id)` |
| `limit_name` | `varchar(255)` | No | - | - |
| `limit_type` | `text` | No | - | - |
| `limit_amount` | `numeric(12,2)` | No | - | - |
| `warning_threshold` | `numeric(12,2)` | Yes | - | - |
| `requires_approval` | `boolean` | Yes | `false` | - |
| `approval_rules` | `json` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `effective_from` | `date` | Yes | - | - |
| `effective_until` | `date` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `spending_limits_budget_category_id_index` on (`budget_category_id`)
- **INDEX**: `spending_limits_organization_id_is_active_index` on (`organization_id, is_active`)
- **PRIMARY KEY**: `spending_limits_pkey` on (`id`)
- **INDEX**: `spending_limits_user_id_index` on (`user_id`)

**Foreign Keys**:

- `budget_category_id` → `budget_categories(id)`
  - ON DELETE: CASCADE
- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `spending_limits_limit_type_check`: (limit_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text, 'per_transaction'::text, 'total_budget'::text]))
- `2200_481240_1_not_null`: id IS NOT NULL
- `2200_481240_2_not_null`: organization_id IS NOT NULL
- `2200_481240_6_not_null`: limit_name IS NOT NULL
- `2200_481240_7_not_null`: limit_type IS NOT NULL
- `2200_481240_8_not_null`: limit_amount IS NOT NULL

---

#### `vendors`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
- **Has many**:
  - `financial_transactions` (via `vendor_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `name` | `varchar(255)` | No | - | - |
| `contact_name` | `varchar(255)` | Yes | - | - |
| `email` | `varchar(255)` | Yes | - | - |
| `phone` | `varchar(255)` | Yes | - | - |
| `address` | `text` | Yes | - | - |
| `tax_id` | `varchar(255)` | Yes | - | - |
| `payment_terms` | `varchar(255)` | Yes | - | - |
| `payment_methods` | `json` | Yes | - | - |
| `active` | `boolean` | Yes | `true` | - |
| `metadata` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `vendors_name_index` on (`name`)
- **INDEX**: `vendors_organization_id_active_index` on (`organization_id, active`)
- **PRIMARY KEY**: `vendors_pkey` on (`id`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480960_1_not_null`: id IS NOT NULL
- `2200_480960_2_not_null`: organization_id IS NOT NULL
- `2200_480960_3_not_null`: name IS NOT NULL

---

### Documents & Content

**Tables**: 22

#### `content_analytics`

**Purpose**: Analytics and metrics tracking

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_analytics_id_seq'::regclass)` | PRIMARY KEY |
| `content_item_id` | `integer` | No | - | FK → `content_items(id)` |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `ip_address` | `varchar(45)` | Yes | - | - |
| `user_agent` | `varchar(500)` | Yes | - | - |
| `action` | `text` | No | - | - |
| `time_spent` | `integer` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `content_analytics_content_item_id_action_index` on (`content_item_id, action`)
- **INDEX**: `content_analytics_created_at_index` on (`created_at`)
- **PRIMARY KEY**: `content_analytics_pkey` on (`id`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`
- `user_id` → `users(id)`

**Check Constraints**:

- `content_analytics_action_check`: (action = ANY (ARRAY['view'::text, 'download'::text, 'share'::text]))
- `2200_482566_1_not_null`: id IS NOT NULL
- `2200_482566_2_not_null`: content_item_id IS NOT NULL
- `2200_482566_6_not_null`: action IS NOT NULL

---

#### `content_analytics_monthly`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_analytics_monthly_id_seq'::regclass)` | PRIMARY KEY |
| `content_item_id` | `integer` | No | - | FK → `content_items(id)`, UNIQUE |
| `year` | `integer` | No | - | UNIQUE |
| `month` | `integer` | No | - | UNIQUE |
| `view_count` | `integer` | Yes | `0` | - |
| `download_count` | `integer` | Yes | `0` | - |
| `unique_viewers` | `integer` | Yes | `0` | - |
| `total_time_spent` | `integer` | Yes | `0` | - |
| `bounce_rate` | `numeric(5,2)` | Yes | `'0'::numeric` | - |
| `last_updated` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **UNIQUE INDEX**: `content_analytics_monthly_content_item_id_year_month_unique` on (`content_item_id, year, month`)
- **PRIMARY KEY**: `content_analytics_monthly_pkey` on (`id`)
- **INDEX**: `content_analytics_monthly_year_month_index` on (`year, month`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`

**Check Constraints**:

- `2200_482589_1_not_null`: id IS NOT NULL
- `2200_482589_2_not_null`: content_item_id IS NOT NULL
- `2200_482589_3_not_null`: year IS NOT NULL
- `2200_482589_4_not_null`: month IS NOT NULL

---

#### `content_attachments`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)
  - `users` (via `uploaded_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_attachments_id_seq'::regclass)` | PRIMARY KEY |
| `content_item_id` | `integer` | Yes | - | FK → `content_items(id)` |
| `file_name` | `varchar(255)` | No | - | - |
| `file_path` | `varchar(500)` | No | - | - |
| `file_url` | `varchar(500)` | No | - | - |
| `file_hash` | `varchar(64)` | No | - | - |
| `file_size` | `integer` | No | - | - |
| `mime_type` | `varchar(100)` | No | - | - |
| `attachment_type` | `text` | No | - | - |
| `is_embedded` | `boolean` | Yes | `false` | - |
| `alt_text` | `varchar(500)` | Yes | - | - |
| `uploaded_by` | `uuid` | Yes | - | FK → `users(id)` |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `content_attachments_attachment_type_index` on (`attachment_type`)
- **INDEX**: `content_attachments_content_item_id_index` on (`content_item_id`)
- **INDEX**: `content_attachments_file_hash_index` on (`file_hash`)
- **INDEX**: `content_attachments_is_embedded_index` on (`is_embedded`)
- **PRIMARY KEY**: `content_attachments_pkey` on (`id`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`
- `uploaded_by` → `users(id)`

**Check Constraints**:

- `content_attachments_attachment_type_check`: (attachment_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'document'::text, 'archive'::text, 'other'::text]))
- `2200_482456_1_not_null`: id IS NOT NULL
- `2200_482456_3_not_null`: file_name IS NOT NULL
- `2200_482456_4_not_null`: file_path IS NOT NULL
- `2200_482456_5_not_null`: file_url IS NOT NULL
- `2200_482456_6_not_null`: file_hash IS NOT NULL
- `2200_482456_7_not_null`: file_size IS NOT NULL
- `2200_482456_8_not_null`: mime_type IS NOT NULL
- `2200_482456_9_not_null`: attachment_type IS NOT NULL
- `2200_482456_13_not_null`: created_at IS NOT NULL
- `2200_482456_14_not_null`: updated_at IS NOT NULL

---

#### `content_categories`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_categories` (via `parent_id`)
- **Has many**:
  - `content_categories` (via `parent_id`)
  - `content_items` (via `category_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_categories_id_seq'::regclass)` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | - |
| `slug` | `varchar(255)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `color` | `varchar(7)` | Yes | - | - |
| `icon` | `varchar(50)` | Yes | - | - |
| `parent_id` | `integer` | Yes | - | FK → `content_categories(id)` |
| `is_active` | `boolean` | Yes | `true` | - |
| `sort_order` | `integer` | Yes | `0` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `content_categories_is_active_index` on (`is_active`)
- **INDEX**: `content_categories_parent_id_index` on (`parent_id`)
- **PRIMARY KEY**: `content_categories_pkey` on (`id`)
- **INDEX**: `content_categories_slug_index` on (`slug`)
- **UNIQUE INDEX**: `content_categories_slug_unique` on (`slug`)

**Foreign Keys**:

- `parent_id` → `content_categories(id)`

**Check Constraints**:

- `2200_482373_1_not_null`: id IS NOT NULL
- `2200_482373_2_not_null`: name IS NOT NULL
- `2200_482373_3_not_null`: slug IS NOT NULL
- `2200_482373_10_not_null`: created_at IS NOT NULL
- `2200_482373_11_not_null`: updated_at IS NOT NULL

---

#### `content_item_tags`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)
  - `content_tags` (via `tag_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_item_tags_id_seq'::regclass)` | PRIMARY KEY |
| `content_item_id` | `integer` | No | - | FK → `content_items(id)`, UNIQUE |
| `tag_id` | `integer` | No | - | FK → `content_tags(id)`, UNIQUE |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `content_item_tags_content_item_id_index` on (`content_item_id`)
- **UNIQUE INDEX**: `content_item_tags_content_item_id_tag_id_unique` on (`content_item_id, tag_id`)
- **PRIMARY KEY**: `content_item_tags_pkey` on (`id`)
- **INDEX**: `content_item_tags_tag_id_index` on (`tag_id`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`
- `tag_id` → `content_tags(id)`

**Check Constraints**:

- `2200_482499_1_not_null`: id IS NOT NULL
- `2200_482499_2_not_null`: content_item_id IS NOT NULL
- `2200_482499_3_not_null`: tag_id IS NOT NULL
- `2200_482499_4_not_null`: created_at IS NOT NULL
- `2200_482499_5_not_null`: updated_at IS NOT NULL

---

#### `content_items`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `users` (via `author_id`)
  - `content_categories` (via `category_id`)
- **Has many**:
  - `content_analytics` (via `content_item_id`)
  - `content_analytics_monthly` (via `content_item_id`)
  - `content_attachments` (via `content_item_id`)
  - `content_item_tags` (via `content_item_id`)
  - `content_permissions` (via `content_item_id`)
  - `content_search_index` (via `content_item_id`)
  - `content_versions` (via `content_item_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_items_id_seq'::regclass)` | PRIMARY KEY |
| `title` | `varchar(500)` | No | - | - |
| `slug` | `varchar(500)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `content` | `text` | No | - | - |
| `content_plain` | `text` | Yes | - | - |
| `type` | `text` | Yes | `'document'::text` | - |
| `status` | `text` | Yes | `'draft'::text` | UNIQUE |
| `visibility` | `text` | Yes | `'public'::text` | - |
| `category_id` | `integer` | Yes | - | FK → `content_categories(id)` |
| `author_id` | `uuid` | Yes | - | FK → `users(id)` |
| `search_keywords` | `json` | Yes | - | - |
| `is_featured` | `boolean` | Yes | `false` | - |
| `published_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `content_items_author_id_index` on (`author_id`)
- **INDEX**: `content_items_category_id_index` on (`category_id`)
- **PRIMARY KEY**: `content_items_pkey` on (`id`)
- **INDEX**: `content_items_published_at_index` on (`published_at`)
- **INDEX**: `content_items_slug_index` on (`slug`)
- **UNIQUE INDEX**: `content_items_slug_status_unique` on (`slug, status`)
- **INDEX**: `content_items_status_index` on (`status`)
- **INDEX**: `content_items_status_visibility_published_at_index` on (`status, visibility, published_at`)
- **INDEX**: `content_items_visibility_index` on (`visibility`)

**Foreign Keys**:

- `author_id` → `users(id)`
- `category_id` → `content_categories(id)`

**Check Constraints**:

- `content_items_status_check`: (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text]))
- `content_items_type_check`: (type = ANY (ARRAY['document'::text, 'video'::text, 'link'::text, 'mixed'::text]))
- `content_items_visibility_check`: (visibility = ANY (ARRAY['public'::text, 'private'::text, 'restricted'::text]))
- `2200_482396_1_not_null`: id IS NOT NULL
- `2200_482396_2_not_null`: title IS NOT NULL
- `2200_482396_3_not_null`: slug IS NOT NULL
- `2200_482396_5_not_null`: content IS NOT NULL
- `2200_482396_15_not_null`: created_at IS NOT NULL
- `2200_482396_16_not_null`: updated_at IS NOT NULL

---

#### `content_permissions`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)
  - `users` (via `granted_by`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_permissions_id_seq'::regclass)` | PRIMARY KEY |
| `content_item_id` | `integer` | No | - | FK → `content_items(id)` |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `role_name` | `varchar(50)` | Yes | - | - |
| `permission_level` | `text` | No | - | - |
| `granted_by` | `uuid` | Yes | - | FK → `users(id)` |
| `granted_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `expires_at` | `timestamptz` | Yes | - | - |

**Indexes**:

- **INDEX**: `content_permissions_content_item_id_index` on (`content_item_id`)
- **PRIMARY KEY**: `content_permissions_pkey` on (`id`)
- **INDEX**: `content_permissions_role_name_index` on (`role_name`)
- **INDEX**: `content_permissions_user_id_index` on (`user_id`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`
- `granted_by` → `users(id)`
- `user_id` → `users(id)`

**Check Constraints**:

- `content_permissions_check`: (((user_id IS NOT NULL) AND (role_name IS NULL)) OR ((user_id IS NULL) AND (role_name IS NOT NULL)))
- `content_permissions_permission_level_check`: (permission_level = ANY (ARRAY['read'::text, 'write'::text, 'delete'::text, 'publish'::text]))
- `2200_482536_1_not_null`: id IS NOT NULL
- `2200_482536_2_not_null`: content_item_id IS NOT NULL
- `2200_482536_5_not_null`: permission_level IS NOT NULL

---

#### `content_search_index`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `content_item_id` | `integer` | No | - | PRIMARY KEY, FK → `content_items(id)` |
| `search_vector` | `tsvector` | Yes | - | - |
| `last_indexed_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **PRIMARY KEY**: `content_search_index_pkey` on (`content_item_id`)
- **INDEX**: `content_search_index_search_vector_index` on (`search_vector`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`

**Check Constraints**:

- `2200_482521_1_not_null`: content_item_id IS NOT NULL

---

#### `content_tags`

**Purpose**: Content management system

**Relationships**:
- **Has many**:
  - `content_item_tags` (via `tag_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_tags_id_seq'::regclass)` | PRIMARY KEY |
| `name` | `varchar(100)` | No | - | UNIQUE |
| `slug` | `varchar(100)` | No | - | UNIQUE |
| `color` | `varchar(7)` | Yes | - | - |
| `usage_count` | `integer` | Yes | `0` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **UNIQUE INDEX**: `content_tags_name_unique` on (`name`)
- **PRIMARY KEY**: `content_tags_pkey` on (`id`)
- **INDEX**: `content_tags_slug_index` on (`slug`)
- **UNIQUE INDEX**: `content_tags_slug_unique` on (`slug`)
- **INDEX**: `content_tags_usage_count_index` on (`usage_count`)

**Check Constraints**:

- `2200_482483_1_not_null`: id IS NOT NULL
- `2200_482483_2_not_null`: name IS NOT NULL
- `2200_482483_3_not_null`: slug IS NOT NULL
- `2200_482483_6_not_null`: created_at IS NOT NULL
- `2200_482483_7_not_null`: updated_at IS NOT NULL

---

#### `content_versions`

**Purpose**: Content management system

**Relationships**:
- **Belongs to**:
  - `content_items` (via `content_item_id`)
  - `users` (via `created_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('content_versions_id_seq'::regclass)` | PRIMARY KEY |
| `content_item_id` | `integer` | No | - | FK → `content_items(id)`, UNIQUE |
| `version_number` | `integer` | No | - | UNIQUE |
| `title` | `varchar(500)` | No | - | - |
| `content` | `text` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `search_keywords` | `json` | Yes | - | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `change_summary` | `varchar(500)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `content_versions_content_item_id_version_number_index` on (`content_item_id, version_number`)
- **UNIQUE INDEX**: `content_versions_content_item_id_version_number_unique` on (`content_item_id, version_number`)
- **PRIMARY KEY**: `content_versions_pkey` on (`id`)

**Foreign Keys**:

- `content_item_id` → `content_items(id)`
- `created_by` → `users(id)`

**Check Constraints**:

- `2200_482433_1_not_null`: id IS NOT NULL
- `2200_482433_2_not_null`: content_item_id IS NOT NULL
- `2200_482433_3_not_null`: version_number IS NOT NULL
- `2200_482433_4_not_null`: title IS NOT NULL
- `2200_482433_5_not_null`: content IS NOT NULL

---

#### `document_access`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `documents` (via `document_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `document_id` | `uuid` | No | - | FK → `documents(id)` |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `accessed_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `access_type` | `varchar(30)` | Yes | - | - |
| `ip_address` | `varchar(45)` | Yes | - | - |
| `user_agent` | `text` | Yes | - | - |

**Indexes**:

- **INDEX**: `document_access_accessed_at_index` on (`accessed_at`)
- **INDEX**: `document_access_document_id_index` on (`document_id`)
- **PRIMARY KEY**: `document_access_pkey` on (`id`)
- **INDEX**: `document_access_user_id_index` on (`user_id`)

**Foreign Keys**:

- `document_id` → `documents(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481722_1_not_null`: id IS NOT NULL
- `2200_481722_2_not_null`: document_id IS NOT NULL
- `2200_481722_3_not_null`: user_id IS NOT NULL

---

#### `document_acknowledgments`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `documents` (via `document_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `document_id` | `uuid` | No | - | FK → `documents(id)`, UNIQUE |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `acknowledged_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `document_version` | `varchar(20)` | Yes | - | UNIQUE |
| `acknowledgment_text` | `text` | Yes | - | - |
| `ip_address` | `varchar(45)` | Yes | - | - |

**Indexes**:

- **INDEX**: `document_acknowledgments_acknowledged_at_index` on (`acknowledged_at`)
- **INDEX**: `document_acknowledgments_document_id_index` on (`document_id`)
- **UNIQUE INDEX**: `document_acknowledgments_document_id_user_id_document_version_u` on (`document_id, user_id, document_version`)
- **PRIMARY KEY**: `document_acknowledgments_pkey` on (`id`)
- **INDEX**: `document_acknowledgments_user_id_index` on (`user_id`)

**Foreign Keys**:

- `document_id` → `documents(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481744_1_not_null`: id IS NOT NULL
- `2200_481744_2_not_null`: document_id IS NOT NULL
- `2200_481744_3_not_null`: user_id IS NOT NULL

---

#### `document_versions`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `documents` (via `document_id`)
  - `users` (via `uploaded_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `document_id` | `uuid` | No | - | FK → `documents(id)` |
| `version` | `varchar(20)` | No | - | - |
| `file_path` | `varchar(500)` | No | - | - |
| `uploaded_by` | `uuid` | No | - | FK → `users(id)` |
| `change_notes` | `text` | Yes | - | - |
| `is_current` | `boolean` | Yes | `false` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `document_versions_document_id_index` on (`document_id`)
- **INDEX**: `document_versions_is_current_index` on (`is_current`)
- **PRIMARY KEY**: `document_versions_pkey` on (`id`)
- **INDEX**: `document_versions_version_index` on (`version`)

**Foreign Keys**:

- `document_id` → `documents(id)`
  - ON DELETE: CASCADE
- `uploaded_by` → `users(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `2200_481698_1_not_null`: id IS NOT NULL
- `2200_481698_2_not_null`: document_id IS NOT NULL
- `2200_481698_3_not_null`: version IS NOT NULL
- `2200_481698_4_not_null`: file_path IS NOT NULL
- `2200_481698_5_not_null`: uploaded_by IS NOT NULL
- `2200_481698_8_not_null`: created_at IS NOT NULL
- `2200_481698_9_not_null`: updated_at IS NOT NULL

---

#### `documents`

**Purpose**: Document management and storage

**Relationships**:
- **Belongs to**:
  - `users` (via `approved_by`)
  - `users` (via `uploaded_by`)
- **Has many**:
  - `document_access` (via `document_id`)
  - `document_acknowledgments` (via `document_id`)
  - `document_versions` (via `document_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `title` | `varchar(200)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `category` | `varchar(50)` | Yes | - | - |
| `subcategory` | `varchar(50)` | Yes | - | - |
| `file_path` | `varchar(500)` | No | - | - |
| `file_name` | `varchar(200)` | No | - | - |
| `file_type` | `varchar(20)` | Yes | - | - |
| `file_size` | `bigint` | Yes | - | - |
| `version` | `varchar(20)` | Yes | `'1.0'::character varying` | - |
| `uploaded_by` | `uuid` | No | - | FK → `users(id)` |
| `approved_by` | `uuid` | Yes | - | FK → `users(id)` |
| `effective_date` | `date` | Yes | - | - |
| `expiration_date` | `date` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'draft'::character varying` | - |
| `tags` | `json` | Yes | - | - |
| `access_permissions` | `json` | Yes | - | - |
| `requires_acknowledgment` | `boolean` | Yes | `false` | - |
| `checksum` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `documents_category_index` on (`category`)
- **INDEX**: `documents_effective_date_index` on (`effective_date`)
- **INDEX**: `documents_expiration_date_index` on (`expiration_date`)
- **PRIMARY KEY**: `documents_pkey` on (`id`)
- **INDEX**: `documents_status_index` on (`status`)
- **INDEX**: `documents_subcategory_index` on (`subcategory`)
- **INDEX**: `documents_uploaded_by_index` on (`uploaded_by`)

**Foreign Keys**:

- `approved_by` → `users(id)`
  - ON DELETE: SET NULL
- `uploaded_by` → `users(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `2200_481669_1_not_null`: id IS NOT NULL
- `2200_481669_2_not_null`: title IS NOT NULL
- `2200_481669_6_not_null`: file_path IS NOT NULL
- `2200_481669_7_not_null`: file_name IS NOT NULL
- `2200_481669_11_not_null`: uploaded_by IS NOT NULL
- `2200_481669_20_not_null`: created_at IS NOT NULL
- `2200_481669_21_not_null`: updated_at IS NOT NULL

---

#### `post_categories`

**Purpose**: Social/content posting features

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(100)` | No | - | UNIQUE |
| `slug` | `varchar(100)` | No | - | UNIQUE |
| `description` | `varchar(255)` | Yes | - | - |
| `icon` | `varchar(50)` | Yes | - | - |
| `color` | `varchar(7)` | Yes | - | - |
| `sort_order` | `integer` | Yes | `0` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `post_categories_is_active_index` on (`is_active`)
- **UNIQUE INDEX**: `post_categories_name_unique` on (`name`)
- **PRIMARY KEY**: `post_categories_pkey` on (`id`)
- **INDEX**: `post_categories_slug_index` on (`slug`)
- **UNIQUE INDEX**: `post_categories_slug_unique` on (`slug`)
- **INDEX**: `post_categories_sort_order_index` on (`sort_order`)

**Check Constraints**:

- `2200_480351_1_not_null`: id IS NOT NULL
- `2200_480351_2_not_null`: name IS NOT NULL
- `2200_480351_3_not_null`: slug IS NOT NULL
- `2200_480351_9_not_null`: created_at IS NOT NULL
- `2200_480351_10_not_null`: updated_at IS NOT NULL

---

#### `post_media`

**Purpose**: Social/content posting features

**Relationships**:
- **Belongs to**:
  - `posts` (via `post_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `post_id` | `uuid` | Yes | - | FK → `posts(id)` |
| `file_name` | `varchar(255)` | No | - | - |
| `file_url` | `varchar(500)` | No | - | - |
| `file_type` | `varchar(50)` | No | - | - |
| `file_size` | `integer` | Yes | - | - |
| `alt_text` | `varchar(255)` | Yes | - | - |
| `sort_order` | `integer` | Yes | `0` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `post_media_file_type_index` on (`file_type`)
- **PRIMARY KEY**: `post_media_pkey` on (`id`)
- **INDEX**: `post_media_post_id_index` on (`post_id`)

**Foreign Keys**:

- `post_id` → `posts(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480311_1_not_null`: id IS NOT NULL
- `2200_480311_3_not_null`: file_name IS NOT NULL
- `2200_480311_4_not_null`: file_url IS NOT NULL
- `2200_480311_5_not_null`: file_type IS NOT NULL
- `2200_480311_9_not_null`: created_at IS NOT NULL
- `2200_480311_10_not_null`: updated_at IS NOT NULL

---

#### `post_reads`

**Purpose**: Social/content posting features

**Relationships**:
- **Belongs to**:
  - `posts` (via `post_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `post_id` | `uuid` | Yes | - | FK → `posts(id)`, UNIQUE |
| `user_id` | `uuid` | Yes | - | FK → `users(id)`, UNIQUE |
| `read_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **PRIMARY KEY**: `post_reads_pkey` on (`id`)
- **INDEX**: `post_reads_post_id_index` on (`post_id`)
- **UNIQUE INDEX**: `post_reads_post_id_user_id_unique` on (`post_id, user_id`)
- **INDEX**: `post_reads_read_at_index` on (`read_at`)
- **INDEX**: `post_reads_user_id_index` on (`user_id`)

**Foreign Keys**:

- `post_id` → `posts(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480329_1_not_null`: id IS NOT NULL

---

#### `posts`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `author_id`)
- **Has many**:
  - `post_media` (via `post_id`)
  - `post_reads` (via `post_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `title` | `varchar(255)` | No | - | - |
| `content` | `text` | No | - | - |
| `excerpt` | `text` | Yes | - | - |
| `status` | `varchar(20)` | Yes | `'draft'::character varying` | - |
| `category` | `varchar(50)` | Yes | - | - |
| `tags` | `json` | Yes | - | - |
| `author_id` | `uuid` | Yes | - | FK → `users(id)` |
| `published_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `posts_author_id_index` on (`author_id`)
- **INDEX**: `posts_category_index` on (`category`)
- **INDEX**: `posts_created_at_index` on (`created_at`)
- **PRIMARY KEY**: `posts_pkey` on (`id`)
- **INDEX**: `posts_published_at_index` on (`published_at`)
- **INDEX**: `posts_status_index` on (`status`)

**Foreign Keys**:

- `author_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480290_1_not_null`: id IS NOT NULL
- `2200_480290_2_not_null`: title IS NOT NULL
- `2200_480290_3_not_null`: content IS NOT NULL
- `2200_480290_10_not_null`: created_at IS NOT NULL
- `2200_480290_11_not_null`: updated_at IS NOT NULL

---

#### `resource_categories`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `users` (via `managed_by`)
- **Has many**:
  - `resource_audit_log` (via `category_id`)
  - `resource_category_managers` (via `category_id`)
  - `resource_category_permissions` (via `category_id`)
  - `resources` (via `category_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(100)` | No | - | - |
| `slug` | `varchar(100)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `icon` | `varchar(50)` | Yes | - | - |
| `order_index` | `integer` | Yes | `0` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `managed_by` | `uuid` | Yes | - | FK → `users(id)` |
| `visibility` | `varchar(20)` | Yes | `'public'::character varying` | - |

**Indexes**:

- **INDEX**: `resource_categories_created_by_idx` on (`created_by`)
- **INDEX**: `resource_categories_is_active_index` on (`is_active`)
- **INDEX**: `resource_categories_managed_by_idx` on (`managed_by`)
- **PRIMARY KEY**: `resource_categories_pkey` on (`id`)
- **INDEX**: `resource_categories_slug_index` on (`slug`)
- **UNIQUE INDEX**: `resource_categories_slug_unique` on (`slug`)
- **INDEX**: `resource_categories_visibility_idx` on (`visibility`)

**Foreign Keys**:

- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `managed_by` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_482715_1_not_null`: id IS NOT NULL
- `2200_482715_2_not_null`: name IS NOT NULL
- `2200_482715_3_not_null`: slug IS NOT NULL
- `2200_482715_8_not_null`: created_at IS NOT NULL
- `2200_482715_9_not_null`: updated_at IS NOT NULL

---

#### `resource_category_managers`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `assigned_by`)
  - `resource_categories` (via `category_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `category_id` | `uuid` | No | - | FK → `resource_categories(id)`, UNIQUE |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `role` | `varchar(50)` | Yes | `'manager'::character varying` | - |
| `assigned_by` | `uuid` | Yes | - | FK → `users(id)` |
| `assigned_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `expires_at` | `timestamptz` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |

**Indexes**:

- **INDEX**: `resource_category_managers_active_idx` on (`is_active`)
- **INDEX**: `resource_category_managers_assigned_by_idx` on (`assigned_by`)
- **INDEX**: `resource_category_managers_category_idx` on (`category_id`)
- **INDEX**: `resource_category_managers_expires_idx` on (`expires_at`)
- **PRIMARY KEY**: `resource_category_managers_pkey` on (`id`)
- **INDEX**: `resource_category_managers_role_idx` on (`role`)
- **UNIQUE INDEX**: `resource_category_managers_unique` on (`category_id, user_id`)
- **INDEX**: `resource_category_managers_user_idx` on (`user_id`)

**Foreign Keys**:

- `assigned_by` → `users(id)`
  - ON DELETE: SET NULL
- `category_id` → `resource_categories(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_482910_1_not_null`: id IS NOT NULL
- `2200_482910_2_not_null`: category_id IS NOT NULL
- `2200_482910_3_not_null`: user_id IS NOT NULL

---

#### `resource_versions`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `resources` (via `resource_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `resource_id` | `uuid` | No | - | FK → `resources(id)`, UNIQUE |
| `version_number` | `integer` | No | - | UNIQUE |
| `title` | `varchar(255)` | Yes | - | - |
| `description` | `text` | Yes | - | - |
| `content` | `text` | Yes | - | - |
| `metadata` | `jsonb` | Yes | `'{}'::jsonb` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `change_summary` | `text` | Yes | - | - |

**Indexes**:

- **INDEX**: `resource_versions_created_at_idx` on (`created_at`)
- **INDEX**: `resource_versions_created_by_idx` on (`created_by`)
- **PRIMARY KEY**: `resource_versions_pkey` on (`id`)
- **INDEX**: `resource_versions_resource_idx` on (`resource_id`)
- **INDEX**: `resource_versions_resource_version_idx` on (`resource_id, version_number`)
- **UNIQUE INDEX**: `resource_versions_unique` on (`resource_id, version_number`)

**Foreign Keys**:

- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `resource_id` → `resources(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_482884_1_not_null`: id IS NOT NULL
- `2200_482884_2_not_null`: resource_id IS NOT NULL
- `2200_482884_3_not_null`: version_number IS NOT NULL

---

#### `resources`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `resource_categories` (via `category_id`)
  - `users` (via `created_by`)
  - `users` (via `published_by`)
  - `users` (via `updated_by`)
- **Has many**:
  - `resource_access_logs` (via `resource_id`)
  - `resource_audit_log` (via `resource_id`)
  - `resource_permissions` (via `resource_id`)
  - `resource_versions` (via `resource_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `category_id` | `uuid` | Yes | - | FK → `resource_categories(id)` |
| `title` | `varchar(255)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `type` | `varchar(50)` | No | - | - |
| `file_url` | `varchar(500)` | Yes | - | - |
| `external_url` | `varchar(500)` | Yes | - | - |
| `file_name` | `varchar(255)` | Yes | - | - |
| `file_size` | `integer` | Yes | - | - |
| `mime_type` | `varchar(100)` | Yes | - | - |
| `metadata` | `jsonb` | Yes | `'{}'::jsonb` | - |
| `views` | `integer` | Yes | `0` | - |
| `downloads` | `integer` | Yes | `0` | - |
| `is_featured` | `boolean` | Yes | `false` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `updated_by` | `uuid` | Yes | - | FK → `users(id)` |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `version_number` | `integer` | Yes | `1` | - |
| `is_draft` | `boolean` | Yes | `true` | - |
| `published_at` | `timestamptz` | Yes | - | - |
| `published_by` | `uuid` | Yes | - | FK → `users(id)` |
| `last_accessed_at` | `timestamptz` | Yes | - | - |
| `access_count` | `integer` | Yes | `0` | - |

**Indexes**:

- **INDEX**: `resources_access_count_idx` on (`access_count`)
- **INDEX**: `resources_category_id_index` on (`category_id`)
- **INDEX**: `resources_created_at_index` on (`created_at`)
- **INDEX**: `resources_is_active_index` on (`is_active`)
- **INDEX**: `resources_is_draft_idx` on (`is_draft`)
- **INDEX**: `resources_is_featured_index` on (`is_featured`)
- **INDEX**: `resources_last_accessed_idx` on (`last_accessed_at`)
- **PRIMARY KEY**: `resources_pkey` on (`id`)
- **INDEX**: `resources_published_at_idx` on (`published_at`)
- **INDEX**: `resources_published_by_idx` on (`published_by`)
- **INDEX**: `resources_type_index` on (`type`)
- **INDEX**: `resources_version_number_idx` on (`version_number`)

**Foreign Keys**:

- `category_id` → `resource_categories(id)`
  - ON DELETE: SET NULL
- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `published_by` → `users(id)`
  - ON DELETE: SET NULL
- `updated_by` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_482731_1_not_null`: id IS NOT NULL
- `2200_482731_3_not_null`: title IS NOT NULL
- `2200_482731_5_not_null`: type IS NOT NULL
- `2200_482731_18_not_null`: created_at IS NOT NULL
- `2200_482731_19_not_null`: updated_at IS NOT NULL

---

### RBAC & Permissions

**Tables**: 13

#### `rbac_configuration_templates`

**Purpose**: RBAC system configuration

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('rbac_configuration_templates_id_seq'::regclass)` | PRIMARY KEY |
| `template_name` | `varchar(255)` | No | - | UNIQUE |
| `template_description` | `text` | Yes | - | - |
| `resource_type` | `text` | No | - | - |
| `permission_mapping` | `json` | No | - | - |
| `categorization_rules` | `json` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `rbac_configuration_templates_is_active_index` on (`is_active`)
- **PRIMARY KEY**: `rbac_configuration_templates_pkey` on (`id`)
- **INDEX**: `rbac_configuration_templates_resource_type_index` on (`resource_type`)
- **UNIQUE INDEX**: `rbac_configuration_templates_template_name_unique` on (`template_name`)

**Check Constraints**:

- `rbac_configuration_templates_resource_type_check`: (resource_type = ANY (ARRAY['page'::text, 'endpoint'::text, 'function'::text]))
- `2200_483242_1_not_null`: id IS NOT NULL
- `2200_483242_2_not_null`: template_name IS NOT NULL
- `2200_483242_4_not_null`: resource_type IS NOT NULL
- `2200_483242_5_not_null`: permission_mapping IS NOT NULL
- `2200_483242_8_not_null`: created_at IS NOT NULL
- `2200_483242_9_not_null`: updated_at IS NOT NULL

---

#### `rbac_endpoints`

**Purpose**: RBAC system configuration

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('rbac_endpoints_id_seq'::regclass)` | PRIMARY KEY |
| `method` | `varchar(10)` | No | - | UNIQUE |
| `endpoint_path` | `varchar(255)` | No | - | UNIQUE |
| `controller` | `varchar(255)` | Yes | - | - |
| `action` | `varchar(100)` | Yes | - | - |
| `suggested_permissions` | `json` | Yes | - | - |
| `risk_level` | `text` | Yes | `'medium'::text` | - |
| `auto_detected` | `boolean` | Yes | `true` | - |
| `needs_configuration` | `boolean` | Yes | `true` | - |
| `configured_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `rbac_endpoints_auto_detected_index` on (`auto_detected`)
- **UNIQUE INDEX**: `rbac_endpoints_method_endpoint_path_unique` on (`method, endpoint_path`)
- **INDEX**: `rbac_endpoints_needs_configuration_index` on (`needs_configuration`)
- **PRIMARY KEY**: `rbac_endpoints_pkey` on (`id`)
- **INDEX**: `rbac_endpoints_risk_level_index` on (`risk_level`)

**Check Constraints**:

- `rbac_endpoints_risk_level_check`: (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))
- `2200_483179_1_not_null`: id IS NOT NULL
- `2200_483179_2_not_null`: method IS NOT NULL
- `2200_483179_3_not_null`: endpoint_path IS NOT NULL
- `2200_483179_11_not_null`: created_at IS NOT NULL
- `2200_483179_12_not_null`: updated_at IS NOT NULL

---

#### `rbac_functions`

**Purpose**: RBAC system configuration

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('rbac_functions_id_seq'::regclass)` | PRIMARY KEY |
| `function_name` | `varchar(255)` | No | - | UNIQUE |
| `module_path` | `varchar(500)` | No | - | UNIQUE |
| `category` | `varchar(100)` | Yes | `'general'::character varying` | - |
| `suggested_permissions` | `json` | Yes | - | - |
| `risk_level` | `text` | Yes | `'medium'::text` | - |
| `auto_detected` | `boolean` | Yes | `true` | - |
| `needs_configuration` | `boolean` | Yes | `true` | - |
| `configured_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `rbac_functions_category_index` on (`category`)
- **UNIQUE INDEX**: `rbac_functions_function_name_module_path_unique` on (`function_name, module_path`)
- **INDEX**: `rbac_functions_needs_configuration_index` on (`needs_configuration`)
- **PRIMARY KEY**: `rbac_functions_pkey` on (`id`)
- **INDEX**: `rbac_functions_risk_level_index` on (`risk_level`)

**Check Constraints**:

- `rbac_functions_risk_level_check`: (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))
- `2200_483199_1_not_null`: id IS NOT NULL
- `2200_483199_2_not_null`: function_name IS NOT NULL
- `2200_483199_3_not_null`: module_path IS NOT NULL
- `2200_483199_10_not_null`: created_at IS NOT NULL
- `2200_483199_11_not_null`: updated_at IS NOT NULL

---

#### `rbac_pages`

**Purpose**: RBAC system configuration

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('rbac_pages_id_seq'::regclass)` | PRIMARY KEY |
| `page_path` | `varchar(255)` | No | - | UNIQUE |
| `page_name` | `varchar(255)` | No | - | - |
| `page_category` | `varchar(100)` | Yes | `'General'::character varying` | - |
| `page_description` | `text` | Yes | - | - |
| `suggested_permissions` | `json` | Yes | - | - |
| `is_protected` | `boolean` | Yes | `false` | - |
| `auto_detected` | `boolean` | Yes | `true` | - |
| `needs_configuration` | `boolean` | Yes | `true` | - |
| `configured_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `rbac_pages_auto_detected_index` on (`auto_detected`)
- **INDEX**: `rbac_pages_needs_configuration_index` on (`needs_configuration`)
- **INDEX**: `rbac_pages_page_category_index` on (`page_category`)
- **UNIQUE INDEX**: `rbac_pages_page_path_unique` on (`page_path`)
- **PRIMARY KEY**: `rbac_pages_pkey` on (`id`)

**Check Constraints**:

- `2200_483159_1_not_null`: id IS NOT NULL
- `2200_483159_2_not_null`: page_path IS NOT NULL
- `2200_483159_3_not_null`: page_name IS NOT NULL
- `2200_483159_11_not_null`: created_at IS NOT NULL
- `2200_483159_12_not_null`: updated_at IS NOT NULL

---

#### `rbac_scan_history`

**Purpose**: RBAC system configuration

**Records**: 18 rows

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('rbac_scan_history_id_seq'::regclass)` | PRIMARY KEY |
| `scan_started_at` | `timestamptz` | No | - | - |
| `scan_completed_at` | `timestamptz` | Yes | - | - |
| `duration_ms` | `integer` | Yes | - | - |
| `pages_found` | `integer` | Yes | `0` | - |
| `endpoints_found` | `integer` | Yes | `0` | - |
| `functions_found` | `integer` | Yes | `0` | - |
| `new_items_registered` | `integer` | Yes | `0` | - |
| `scan_summary` | `json` | Yes | - | - |
| `scan_type` | `text` | Yes | `'manual'::text` | - |
| `status` | `text` | Yes | `'running'::text` | - |
| `error_message` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **PRIMARY KEY**: `rbac_scan_history_pkey` on (`id`)
- **INDEX**: `rbac_scan_history_scan_started_at_index` on (`scan_started_at`)
- **INDEX**: `rbac_scan_history_scan_type_index` on (`scan_type`)
- **INDEX**: `rbac_scan_history_status_index` on (`status`)

**Check Constraints**:

- `rbac_scan_history_scan_type_check`: (scan_type = ANY (ARRAY['automated'::text, 'manual'::text, 'startup'::text]))
- `rbac_scan_history_status_check`: (status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text]))
- `2200_483220_1_not_null`: id IS NOT NULL
- `2200_483220_2_not_null`: scan_started_at IS NOT NULL
- `2200_483220_13_not_null`: created_at IS NOT NULL
- `2200_483220_14_not_null`: updated_at IS NOT NULL

---

#### `referee_roles`

**Purpose**: Data storage and management

**Records**: 6 rows

**Relationships**:
- **Has many**:
  - `user_referee_roles` (via `referee_role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `permissions` | `json` | Yes | `'{}'::json` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **UNIQUE INDEX**: `referee_roles_name_unique` on (`name`)
- **PRIMARY KEY**: `referee_roles_pkey` on (`id`)

**Check Constraints**:

- `2200_482308_1_not_null`: id IS NOT NULL
- `2200_482308_2_not_null`: name IS NOT NULL
- `2200_482308_6_not_null`: created_at IS NOT NULL
- `2200_482308_7_not_null`: updated_at IS NOT NULL

---

#### `resource_category_permissions`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `resource_categories` (via `category_id`)
  - `users` (via `created_by`)
  - `roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `category_id` | `uuid` | No | - | FK → `resource_categories(id)`, UNIQUE |
| `role_id` | `uuid` | No | - | FK → `roles(id)`, UNIQUE |
| `can_view` | `boolean` | Yes | `true` | - |
| `can_create` | `boolean` | Yes | `false` | - |
| `can_edit` | `boolean` | Yes | `false` | - |
| `can_delete` | `boolean` | Yes | `false` | - |
| `can_manage` | `boolean` | Yes | `false` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |

**Indexes**:

- **INDEX**: `resource_category_permissions_category_idx` on (`category_id`)
- **INDEX**: `resource_category_permissions_created_idx` on (`created_at`)
- **PRIMARY KEY**: `resource_category_permissions_pkey` on (`id`)
- **INDEX**: `resource_category_permissions_role_idx` on (`role_id`)
- **UNIQUE INDEX**: `resource_category_permissions_unique` on (`category_id, role_id`)

**Foreign Keys**:

- `category_id` → `resource_categories(id)`
  - ON DELETE: CASCADE
- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `role_id` → `roles(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_482789_1_not_null`: id IS NOT NULL
- `2200_482789_2_not_null`: category_id IS NOT NULL
- `2200_482789_3_not_null`: role_id IS NOT NULL

---

#### `resource_permissions`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `resources` (via `resource_id`)
  - `roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `resource_id` | `uuid` | No | - | FK → `resources(id)`, UNIQUE |
| `role_id` | `uuid` | No | - | FK → `roles(id)`, UNIQUE |
| `can_view` | `boolean` | Yes | `true` | - |
| `can_edit` | `boolean` | Yes | `false` | - |
| `can_delete` | `boolean` | Yes | `false` | - |
| `can_manage` | `boolean` | Yes | `false` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |

**Indexes**:

- **INDEX**: `resource_permissions_created_idx` on (`created_at`)
- **PRIMARY KEY**: `resource_permissions_pkey` on (`id`)
- **INDEX**: `resource_permissions_resource_idx` on (`resource_id`)
- **INDEX**: `resource_permissions_role_idx` on (`role_id`)
- **UNIQUE INDEX**: `resource_permissions_unique` on (`resource_id, role_id`)

**Foreign Keys**:

- `created_by` → `users(id)`
  - ON DELETE: SET NULL
- `resource_id` → `resources(id)`
  - ON DELETE: CASCADE
- `role_id` → `roles(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_482821_1_not_null`: id IS NOT NULL
- `2200_482821_2_not_null`: resource_id IS NOT NULL
- `2200_482821_3_not_null`: role_id IS NOT NULL

---

#### `role_api_access`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `role_id` | `uuid` | No | - | FK → `roles(id)`, UNIQUE |
| `http_method` | `varchar(10)` | No | - | UNIQUE |
| `endpoint_pattern` | `varchar(255)` | No | - | UNIQUE |
| `endpoint_category` | `varchar(100)` | Yes | - | - |
| `endpoint_description` | `varchar(500)` | Yes | - | - |
| `can_access` | `boolean` | Yes | `false` | - |
| `rate_limit` | `integer` | Yes | - | - |
| `conditions` | `jsonb` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `role_api_access_http_method_endpoint_pattern_index` on (`http_method, endpoint_pattern`)
- **PRIMARY KEY**: `role_api_access_pkey` on (`id`)
- **INDEX**: `role_api_access_role_id_can_access_index` on (`role_id, can_access`)
- **UNIQUE INDEX**: `role_api_access_role_id_http_method_endpoint_pattern_unique` on (`role_id, http_method, endpoint_pattern`)
- **INDEX**: `role_api_access_role_id_index` on (`role_id`)

**Foreign Keys**:

- `role_id` → `roles(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483073_1_not_null`: id IS NOT NULL
- `2200_483073_2_not_null`: role_id IS NOT NULL
- `2200_483073_3_not_null`: http_method IS NOT NULL
- `2200_483073_4_not_null`: endpoint_pattern IS NOT NULL
- `2200_483073_10_not_null`: created_at IS NOT NULL
- `2200_483073_11_not_null`: updated_at IS NOT NULL

---

#### `role_data_scopes`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `role_id` | `uuid` | No | - | FK → `roles(id)` |
| `entity_type` | `varchar(100)` | No | - | - |
| `scope_type` | `varchar(50)` | No | - | - |
| `conditions` | `jsonb` | Yes | - | - |
| `description` | `varchar(500)` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `role_data_scopes_entity_type_index` on (`entity_type`)
- **PRIMARY KEY**: `role_data_scopes_pkey` on (`id`)
- **INDEX**: `role_data_scopes_role_id_entity_type_is_active_index` on (`role_id, entity_type, is_active`)
- **INDEX**: `role_data_scopes_role_id_index` on (`role_id`)

**Foreign Keys**:

- `role_id` → `roles(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483115_1_not_null`: id IS NOT NULL
- `2200_483115_2_not_null`: role_id IS NOT NULL
- `2200_483115_3_not_null`: entity_type IS NOT NULL
- `2200_483115_4_not_null`: scope_type IS NOT NULL
- `2200_483115_8_not_null`: created_at IS NOT NULL
- `2200_483115_9_not_null`: updated_at IS NOT NULL

---

#### `role_features`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `role_id` | `uuid` | No | - | FK → `roles(id)`, UNIQUE |
| `feature_code` | `varchar(100)` | No | - | UNIQUE |
| `feature_name` | `varchar(255)` | No | - | - |
| `feature_category` | `varchar(100)` | Yes | - | - |
| `feature_description` | `varchar(500)` | Yes | - | - |
| `is_enabled` | `boolean` | Yes | `false` | - |
| `configuration` | `jsonb` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `role_features_feature_code_index` on (`feature_code`)
- **PRIMARY KEY**: `role_features_pkey` on (`id`)
- **UNIQUE INDEX**: `role_features_role_id_feature_code_unique` on (`role_id, feature_code`)
- **INDEX**: `role_features_role_id_index` on (`role_id`)
- **INDEX**: `role_features_role_id_is_enabled_index` on (`role_id, is_enabled`)

**Foreign Keys**:

- `role_id` → `roles(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483094_1_not_null`: id IS NOT NULL
- `2200_483094_2_not_null`: role_id IS NOT NULL
- `2200_483094_3_not_null`: feature_code IS NOT NULL
- `2200_483094_4_not_null`: feature_name IS NOT NULL
- `2200_483094_9_not_null`: created_at IS NOT NULL
- `2200_483094_10_not_null`: updated_at IS NOT NULL

---

#### `role_page_access`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `role_id` | `uuid` | No | - | FK → `roles(id)`, UNIQUE |
| `page_path` | `varchar(255)` | No | - | UNIQUE |
| `page_name` | `varchar(255)` | No | - | - |
| `page_category` | `varchar(100)` | Yes | - | - |
| `page_description` | `varchar(500)` | Yes | - | - |
| `can_access` | `boolean` | Yes | `false` | - |
| `conditions` | `jsonb` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `role_page_access_page_path_index` on (`page_path`)
- **PRIMARY KEY**: `role_page_access_pkey` on (`id`)
- **INDEX**: `role_page_access_role_id_can_access_index` on (`role_id, can_access`)
- **INDEX**: `role_page_access_role_id_index` on (`role_id`)
- **UNIQUE INDEX**: `role_page_access_role_id_page_path_unique` on (`role_id, page_path`)

**Foreign Keys**:

- `role_id` → `roles(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483052_1_not_null`: id IS NOT NULL
- `2200_483052_2_not_null`: role_id IS NOT NULL
- `2200_483052_3_not_null`: page_path IS NOT NULL
- `2200_483052_4_not_null`: page_name IS NOT NULL
- `2200_483052_9_not_null`: created_at IS NOT NULL
- `2200_483052_10_not_null`: updated_at IS NOT NULL

---

#### `roles`

**Purpose**: RBAC role definitions

**Records**: 1 rows

**Relationships**:
- **Has many**:
  - `access_control_audit` (via `role_id`)
  - `resource_category_permissions` (via `role_id`)
  - `resource_permissions` (via `role_id`)
  - `role_api_access` (via `role_id`)
  - `role_data_scopes` (via `role_id`)
  - `role_features` (via `role_id`)
  - `role_page_access` (via `role_id`)
  - `user_roles` (via `role_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(100)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `is_active` | `boolean` | No | `true` | - |
| `is_system` | `boolean` | No | `false` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `category` | `varchar(50)` | Yes | - | - |
| `referee_config` | `jsonb` | Yes | - | - |
| `color` | `varchar(7)` | Yes | `'#6B7280'::character varying` | - |
| `code` | `varchar(50)` | No | - | UNIQUE |

**Indexes**:

- **INDEX**: `roles_category_index` on (`category`)
- **INDEX**: `roles_code_index` on (`code`)
- **UNIQUE INDEX**: `roles_code_unique` on (`code`)
- **INDEX**: `roles_is_active_index` on (`is_active`)
- **INDEX**: `roles_name_index` on (`name`)
- **UNIQUE INDEX**: `roles_name_unique` on (`name`)
- **PRIMARY KEY**: `roles_pkey` on (`id`)

**Check Constraints**:

- `2200_482609_1_not_null`: id IS NOT NULL
- `2200_482609_2_not_null`: name IS NOT NULL
- `2200_482609_4_not_null`: is_active IS NOT NULL
- `2200_482609_5_not_null`: is_system IS NOT NULL
- `2200_482609_6_not_null`: created_at IS NOT NULL
- `2200_482609_7_not_null`: updated_at IS NOT NULL
- `2200_482609_11_not_null`: code IS NOT NULL

---

### Games & Assignments

**Tables**: 9

#### `ai_assignment_partner_preferences`

**Purpose**: AI/ML feature support

**Relationships**:
- **Belongs to**:
  - `users` (via `referee1_id`)
  - `users` (via `referee2_id`)
  - `ai_assignment_rules` (via `rule_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `rule_id` | `uuid` | Yes | - | FK → `ai_assignment_rules(id)`, UNIQUE |
| `referee1_id` | `uuid` | Yes | - | FK → `users(id)`, UNIQUE |
| `referee2_id` | `uuid` | Yes | - | FK → `users(id)`, UNIQUE |
| `preference_type` | `text` | No | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **PRIMARY KEY**: `ai_assignment_partner_preferences_pkey` on (`id`)
- **INDEX**: `ai_assignment_partner_preferences_referee1_id_index` on (`referee1_id`)
- **INDEX**: `ai_assignment_partner_preferences_referee2_id_index` on (`referee2_id`)
- **INDEX**: `ai_assignment_partner_preferences_rule_id_index` on (`rule_id`)
- **UNIQUE INDEX**: `ai_assignment_partner_preferences_rule_id_referee1_id_referee2_` on (`rule_id, referee1_id, referee2_id`)

**Foreign Keys**:

- `referee1_id` → `users(id)`
  - ON DELETE: CASCADE
- `referee2_id` → `users(id)`
  - ON DELETE: CASCADE
- `rule_id` → `ai_assignment_rules(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `ai_assignment_partner_preferences_preference_type_check`: (preference_type = ANY (ARRAY['preferred'::text, 'avoid'::text]))
- `2200_482249_1_not_null`: id IS NOT NULL
- `2200_482249_5_not_null`: preference_type IS NOT NULL
- `2200_482249_6_not_null`: created_at IS NOT NULL
- `2200_482249_7_not_null`: updated_at IS NOT NULL

---

#### `ai_assignment_rule_runs`

**Purpose**: AI/ML feature support

**Relationships**:
- **Belongs to**:
  - `ai_assignment_rules` (via `rule_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `rule_id` | `uuid` | Yes | - | FK → `ai_assignment_rules(id)` |
| `run_date` | `timestamptz` | No | - | - |
| `status` | `text` | No | - | - |
| `ai_system_used` | `text` | No | - | - |
| `games_processed` | `integer` | Yes | `0` | - |
| `assignments_created` | `integer` | Yes | `0` | - |
| `conflicts_found` | `integer` | Yes | `0` | - |
| `duration_seconds` | `numeric(8,2)` | Yes | `'0'::numeric` | - |
| `context_comments` | `ARRAY` | Yes | `'{}'::text[]` | - |
| `run_details` | `jsonb` | Yes | `'{}'::jsonb` | - |
| `error_message` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `ai_assignment_rule_runs_ai_system_used_index` on (`ai_system_used`)
- **PRIMARY KEY**: `ai_assignment_rule_runs_pkey` on (`id`)
- **INDEX**: `ai_assignment_rule_runs_rule_id_index` on (`rule_id`)
- **INDEX**: `ai_assignment_rule_runs_run_date_index` on (`run_date`)
- **INDEX**: `ai_assignment_rule_runs_status_index` on (`status`)

**Foreign Keys**:

- `rule_id` → `ai_assignment_rules(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `ai_assignment_rule_runs_ai_system_used_check`: (ai_system_used = ANY (ARRAY['algorithmic'::text, 'llm'::text]))
- `ai_assignment_rule_runs_status_check`: (status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text]))
- `2200_482280_1_not_null`: id IS NOT NULL
- `2200_482280_3_not_null`: run_date IS NOT NULL
- `2200_482280_4_not_null`: status IS NOT NULL
- `2200_482280_5_not_null`: ai_system_used IS NOT NULL
- `2200_482280_13_not_null`: created_at IS NOT NULL
- `2200_482280_14_not_null`: updated_at IS NOT NULL

---

#### `ai_assignment_rules`

**Purpose**: AI/ML feature support

**Relationships**:
- **Has many**:
  - `ai_assignment_partner_preferences` (via `rule_id`)
  - `ai_assignment_rule_runs` (via `rule_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `enabled` | `boolean` | Yes | `true` | - |
| `schedule_type` | `text` | No | `'manual'::text` | - |
| `frequency` | `text` | Yes | - | - |
| `day_of_week` | `varchar(255)` | Yes | - | - |
| `day_of_month` | `integer` | Yes | - | - |
| `schedule_time` | `time without time zone` | Yes | - | - |
| `start_date` | `date` | Yes | - | - |
| `end_date` | `date` | Yes | - | - |
| `next_run` | `timestamptz` | Yes | - | - |
| `game_types` | `ARRAY` | Yes | `'{}'::text[]` | - |
| `age_groups` | `ARRAY` | Yes | `'{}'::text[]` | - |
| `max_days_ahead` | `integer` | Yes | `14` | - |
| `min_referee_level` | `varchar(255)` | Yes | `'Rookie'::character varying` | - |
| `prioritize_experience` | `boolean` | Yes | `true` | - |
| `avoid_back_to_back` | `boolean` | Yes | `true` | - |
| `max_distance` | `integer` | Yes | `25` | - |
| `ai_system_type` | `text` | No | `'algorithmic'::text` | - |
| `distance_weight` | `integer` | Yes | `40` | - |
| `skill_weight` | `integer` | Yes | `30` | - |
| `experience_weight` | `integer` | Yes | `20` | - |
| `partner_preference_weight` | `integer` | Yes | `10` | - |
| `llm_model` | `varchar(255)` | Yes | `'gpt-4o'::character varying` | - |
| `temperature` | `numeric(2,1)` | Yes | `0.3` | - |
| `context_prompt` | `text` | Yes | - | - |
| `include_comments` | `boolean` | Yes | `true` | - |
| `last_run` | `timestamptz` | Yes | - | - |
| `last_run_status` | `text` | Yes | - | - |
| `assignments_created` | `integer` | Yes | `0` | - |
| `conflicts_found` | `integer` | Yes | `0` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `ai_assignment_rules_ai_system_type_index` on (`ai_system_type`)
- **INDEX**: `ai_assignment_rules_enabled_index` on (`enabled`)
- **INDEX**: `ai_assignment_rules_next_run_index` on (`next_run`)
- **PRIMARY KEY**: `ai_assignment_rules_pkey` on (`id`)
- **INDEX**: `ai_assignment_rules_schedule_type_index` on (`schedule_type`)

**Check Constraints**:

- `ai_assignment_rules_ai_system_type_check`: (ai_system_type = ANY (ARRAY['algorithmic'::text, 'llm'::text]))
- `ai_assignment_rules_frequency_check`: (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))
- `ai_assignment_rules_last_run_status_check`: (last_run_status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text]))
- `ai_assignment_rules_schedule_type_check`: (schedule_type = ANY (ARRAY['manual'::text, 'recurring'::text, 'one-time'::text]))
- `2200_482212_1_not_null`: id IS NOT NULL
- `2200_482212_2_not_null`: name IS NOT NULL
- `2200_482212_5_not_null`: schedule_type IS NOT NULL
- `2200_482212_20_not_null`: ai_system_type IS NOT NULL
- `2200_482212_33_not_null`: created_at IS NOT NULL
- `2200_482212_34_not_null`: updated_at IS NOT NULL

---

#### `assignment_patterns`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `referee_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `referee_id` | `uuid` | No | - | FK → `users(id)` |
| `referee_name` | `varchar(255)` | No | - | - |
| `day_of_week` | `varchar(255)` | No | - | - |
| `location` | `varchar(255)` | No | - | - |
| `time_slot` | `varchar(255)` | No | - | - |
| `level` | `varchar(255)` | No | - | - |
| `frequency_count` | `integer` | No | `0` | - |
| `success_rate` | `numeric(5,2)` | Yes | `'0'::numeric` | - |
| `first_assigned` | `date` | Yes | - | - |
| `last_assigned` | `date` | Yes | - | - |
| `total_assignments` | `integer` | Yes | `0` | - |
| `completed_assignments` | `integer` | Yes | `0` | - |
| `declined_assignments` | `integer` | Yes | `0` | - |
| `additional_data` | `jsonb` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `assignment_patterns_day_of_week_index` on (`day_of_week`)
- **INDEX**: `assignment_patterns_frequency_count_index` on (`frequency_count`)
- **INDEX**: `assignment_patterns_is_active_index` on (`is_active`)
- **INDEX**: `assignment_patterns_level_index` on (`level`)
- **INDEX**: `assignment_patterns_location_index` on (`location`)
- **PRIMARY KEY**: `assignment_patterns_pkey` on (`id`)
- **INDEX**: `assignment_patterns_referee_id_index` on (`referee_id`)
- **INDEX**: `assignment_patterns_success_rate_index` on (`success_rate`)
- **INDEX**: `pattern_match_index` on (`referee_id, day_of_week, location, time_slot`)

**Foreign Keys**:

- `referee_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480414_1_not_null`: id IS NOT NULL
- `2200_480414_2_not_null`: referee_id IS NOT NULL
- `2200_480414_3_not_null`: referee_name IS NOT NULL
- `2200_480414_4_not_null`: day_of_week IS NOT NULL
- `2200_480414_5_not_null`: location IS NOT NULL
- `2200_480414_6_not_null`: time_slot IS NOT NULL
- `2200_480414_7_not_null`: level IS NOT NULL
- `2200_480414_8_not_null`: frequency_count IS NOT NULL
- `2200_480414_17_not_null`: created_at IS NOT NULL
- `2200_480414_18_not_null`: updated_at IS NOT NULL

---

#### `chunk_games`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `game_chunks` (via `chunk_id`)
  - `games` (via `game_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `chunk_id` | `uuid` | No | - | FK → `game_chunks(id)`, UNIQUE |
| `game_id` | `uuid` | No | - | FK → `games(id)`, UNIQUE |
| `sort_order` | `integer` | Yes | `0` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `chunk_games_chunk_id_index` on (`chunk_id`)
- **INDEX**: `chunk_games_game_id_index` on (`game_id`)
- **PRIMARY KEY**: `chunk_games_pkey` on (`id`)
- **INDEX**: `chunk_games_sort_order_index` on (`sort_order`)
- **UNIQUE INDEX**: `unique_chunk_game` on (`chunk_id, game_id`)

**Foreign Keys**:

- `chunk_id` → `game_chunks(id)`
  - ON DELETE: CASCADE
- `game_id` → `games(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480478_1_not_null`: id IS NOT NULL
- `2200_480478_2_not_null`: chunk_id IS NOT NULL
- `2200_480478_3_not_null`: game_id IS NOT NULL
- `2200_480478_5_not_null`: created_at IS NOT NULL
- `2200_480478_6_not_null`: updated_at IS NOT NULL

---

#### `game_assignments`

**Purpose**: Assignment of referees/officials to specific games

**Relationships**:
- **Belongs to**:
  - `users` (via `assigned_by`)
  - `games` (via `game_id`)
  - `financial_transactions` (via `payroll_transaction_id`)
  - `positions` (via `position_id`)
  - `users` (via `user_id`)
- **Has many**:
  - `financial_transactions` (via `payroll_assignment_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `game_id` | `uuid` | Yes | - | FK → `games(id)`, UNIQUE |
| `position_id` | `uuid` | Yes | - | FK → `positions(id)`, UNIQUE |
| `assigned_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `assigned_by` | `uuid` | Yes | - | FK → `users(id)` |
| `status` | `text` | Yes | `'assigned'::text` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `calculated_wage` | `numeric(8,2)` | Yes | - | - |
| `user_id` | `uuid` | Yes | - | FK → `users(id)`, UNIQUE |
| `payroll_transaction_id` | `uuid` | Yes | - | FK → `financial_transactions(id)` |
| `payment_status` | `text` | Yes | `'pending'::text` | - |
| `payment_date` | `date` | Yes | - | - |
| `decline_reason` | `text` | Yes | - | - |
| `decline_category` | `varchar(100)` | Yes | - | - |
| `reminder_sent_at` | `timestamptz` | Yes | - | - |

**Indexes**:

- **INDEX**: `game_assignments_decline_category_index` on (`decline_category`)
- **INDEX**: `game_assignments_game_id_index` on (`game_id`)
- **UNIQUE INDEX**: `game_assignments_game_id_position_id_unique` on (`game_id, position_id`)
- **UNIQUE INDEX**: `game_assignments_game_id_user_id_unique` on (`game_id, user_id`)
- **INDEX**: `game_assignments_payment_status_index` on (`payment_status`)
- **PRIMARY KEY**: `game_assignments_pkey` on (`id`)
- **INDEX**: `game_assignments_reminder_sent_at_index` on (`reminder_sent_at`)
- **INDEX**: `game_assignments_user_id_index` on (`user_id`)
- **INDEX**: `idx_assignments_status_date` on (`status, created_at`)
- **INDEX**: `idx_assignments_user_game` on (`game_id, user_id`)
- **INDEX**: `idx_assignments_user_status_date` on (`status, created_at, user_id`)
- **INDEX**: `idx_game_assignments_compound` on (`game_id, status, user_id`)

**Foreign Keys**:

- `assigned_by` → `users(id)`
- `game_id` → `games(id)`
  - ON DELETE: CASCADE
- `payroll_transaction_id` → `financial_transactions(id)`
  - ON DELETE: SET NULL
- `position_id` → `positions(id)`
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `check_assignment_status_valid`: (status = ANY (ARRAY['assigned'::text, 'accepted'::text, 'declined'::text, 'completed'::text, 'cancelled'::text]))
- `game_assignments_payment_status_check`: (payment_status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'cancelled'::text]))
- `game_assignments_status_check`: (status = ANY (ARRAY['pending'::text, 'assigned'::text, 'accepted'::text, 'declined'::text, 'completed'::text]))
- `2200_480083_1_not_null`: id IS NOT NULL
- `2200_480083_8_not_null`: created_at IS NOT NULL
- `2200_480083_9_not_null`: updated_at IS NOT NULL

---

#### `game_chunks`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `assigned_by`)
  - `users` (via `assigned_referee_id`)
  - `users` (via `created_by`)
- **Has many**:
  - `chunk_games` (via `chunk_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | - |
| `location` | `varchar(255)` | No | - | - |
| `date` | `date` | No | - | - |
| `start_time` | `time without time zone` | No | - | - |
| `end_time` | `time without time zone` | No | - | - |
| `assigned_referee_id` | `uuid` | Yes | - | FK → `users(id)` |
| `total_referees_needed` | `integer` | No | `0` | - |
| `game_count` | `integer` | No | `0` | - |
| `notes` | `text` | Yes | - | - |
| `status` | `text` | Yes | `'unassigned'::text` | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `assigned_by` | `uuid` | Yes | - | FK → `users(id)` |
| `assigned_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `game_chunks_assigned_referee_id_index` on (`assigned_referee_id`)
- **INDEX**: `game_chunks_created_by_index` on (`created_by`)
- **INDEX**: `game_chunks_date_index` on (`date`)
- **INDEX**: `game_chunks_location_index` on (`location`)
- **PRIMARY KEY**: `game_chunks_pkey` on (`id`)
- **INDEX**: `game_chunks_status_index` on (`status`)
- **INDEX**: `location_date_index` on (`location, date`)

**Foreign Keys**:

- `assigned_by` → `users(id)`
- `assigned_referee_id` → `users(id)`
  - ON DELETE: SET NULL
- `created_by` → `users(id)`

**Check Constraints**:

- `game_chunks_status_check`: (status = ANY (ARRAY['unassigned'::text, 'assigned'::text, 'completed'::text, 'cancelled'::text]))
- `2200_480443_1_not_null`: id IS NOT NULL
- `2200_480443_2_not_null`: name IS NOT NULL
- `2200_480443_3_not_null`: location IS NOT NULL
- `2200_480443_4_not_null`: date IS NOT NULL
- `2200_480443_5_not_null`: start_time IS NOT NULL
- `2200_480443_6_not_null`: end_time IS NOT NULL
- `2200_480443_8_not_null`: total_referees_needed IS NOT NULL
- `2200_480443_9_not_null`: game_count IS NOT NULL
- `2200_480443_15_not_null`: created_at IS NOT NULL
- `2200_480443_16_not_null`: updated_at IS NOT NULL

---

#### `game_fees`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `games` (via `game_id`)
  - `users` (via `recorded_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `game_id` | `uuid` | No | - | FK → `games(id)` |
| `amount` | `numeric(10,2)` | No | - | - |
| `payment_status` | `varchar(255)` | No | `'pending'::character varying` | - |
| `payment_date` | `timestamptz` | Yes | - | - |
| `payment_method` | `varchar(255)` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `recorded_by` | `uuid` | Yes | - | FK → `users(id)` |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `game_fees_game_id_index` on (`game_id`)
- **INDEX**: `game_fees_payment_date_index` on (`payment_date`)
- **INDEX**: `game_fees_payment_status_index` on (`payment_status`)
- **PRIMARY KEY**: `game_fees_pkey` on (`id`)

**Foreign Keys**:

- `game_id` → `games(id)`
  - ON DELETE: CASCADE
- `recorded_by` → `users(id)`

**Check Constraints**:

- `2200_482348_1_not_null`: id IS NOT NULL
- `2200_482348_2_not_null`: game_id IS NOT NULL
- `2200_482348_3_not_null`: amount IS NOT NULL
- `2200_482348_4_not_null`: payment_status IS NOT NULL
- `2200_482348_9_not_null`: created_at IS NOT NULL
- `2200_482348_10_not_null`: updated_at IS NOT NULL

---

#### `games`

**Purpose**: Game/match schedules and details

**Records**: 180 rows

**Relationships**:
- **Belongs to**:
  - `teams` (via `away_team_id`)
  - `teams` (via `home_team_id`)
  - `leagues` (via `league_id`)
  - `locations` (via `location_id`)
- **Has many**:
  - `ai_suggestions` (via `game_id`)
  - `chunk_games` (via `game_id`)
  - `game_assignments` (via `game_id`)
  - `game_fees` (via `game_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `game_date` | `date` | No | - | - |
| `game_time` | `time without time zone` | No | - | - |
| `location` | `varchar(255)` | No | - | - |
| `postal_code` | `varchar(10)` | No | - | - |
| `level` | `text` | No | - | - |
| `pay_rate` | `numeric(10,2)` | No | - | - |
| `status` | `text` | Yes | `'unassigned'::text` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `refs_needed` | `integer` | No | `2` | - |
| `wage_multiplier` | `numeric(4,2)` | Yes | `'1'::numeric` | - |
| `wage_multiplier_reason` | `text` | Yes | - | - |
| `home_team_id` | `uuid` | No | - | FK → `teams(id)` |
| `away_team_id` | `uuid` | No | - | FK → `teams(id)` |
| `league_id` | `uuid` | No | - | FK → `leagues(id)` |
| `location_cost` | `numeric(8,2)` | Yes | - | - |
| `cost_notes` | `text` | Yes | - | - |
| `location_id` | `uuid` | Yes | - | FK → `locations(id)` |
| `external_id` | `varchar(255)` | Yes | - | - |
| `game_type` | `text` | Yes | `'Community'::text` | - |

**Indexes**:

- **INDEX**: `games_away_team_id_index` on (`away_team_id`)
- **INDEX**: `games_external_id_index` on (`external_id`)
- **INDEX**: `games_game_date_index` on (`game_date`)
- **INDEX**: `games_game_type_index` on (`game_type`)
- **INDEX**: `games_home_team_id_index` on (`home_team_id`)
- **INDEX**: `games_league_id_index` on (`league_id`)
- **INDEX**: `games_level_index` on (`level`)
- **INDEX**: `games_location_id_index` on (`location_id`)
- **PRIMARY KEY**: `games_pkey` on (`id`)
- **INDEX**: `games_postal_code_index` on (`postal_code`)
- **INDEX**: `games_status_index` on (`status`)
- **INDEX**: `idx_games_compound` on (`game_date, location, status`)
- **INDEX**: `idx_games_date_level_status` on (`game_date, level, status`)
- **INDEX**: `idx_games_date_location` on (`game_date, location`)
- **INDEX**: `idx_games_location_date_level` on (`game_date, level, location_id`)
- **INDEX**: `idx_games_status_date` on (`game_date, status`)

**Foreign Keys**:

- `away_team_id` → `teams(id)`
  - ON DELETE: CASCADE
- `home_team_id` → `teams(id)`
  - ON DELETE: CASCADE
- `league_id` → `leagues(id)`
  - ON DELETE: CASCADE
- `location_id` → `locations(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `check_game_date_not_too_old`: (game_date >= (CURRENT_DATE - '2 years'::interval))
- `check_game_status_valid`: (status = ANY (ARRAY['assigned'::text, 'unassigned'::text, 'up-for-grabs'::text, 'completed'::text, 'cancelled'::text]))
- `check_positive_pay_rate`: (pay_rate >= (0)::numeric)
- `check_positive_wage_multiplier`: (wage_multiplier > (0)::numeric)
- `check_refs_needed_positive`: ((refs_needed > 0) AND (refs_needed <= 10))
- `games_game_type_check`: (game_type = ANY (ARRAY['Community'::text, 'Club'::text, 'Tournament'::text, 'Private Tournament'::text]))
- `games_level_check`: (level = ANY (ARRAY['Recreational'::text, 'Competitive'::text, 'Elite'::text]))
- `games_status_check`: (status = ANY (ARRAY['assigned'::text, 'unassigned'::text, 'up-for-grabs'::text, 'completed'::text, 'cancelled'::text]))
- `2200_480056_1_not_null`: id IS NOT NULL
- `2200_480056_6_not_null`: game_date IS NOT NULL
- `2200_480056_7_not_null`: game_time IS NOT NULL
- `2200_480056_8_not_null`: location IS NOT NULL
- `2200_480056_9_not_null`: postal_code IS NOT NULL
- `2200_480056_10_not_null`: level IS NOT NULL
- `2200_480056_11_not_null`: pay_rate IS NOT NULL
- `2200_480056_13_not_null`: created_at IS NOT NULL
- `2200_480056_14_not_null`: updated_at IS NOT NULL
- `2200_480056_15_not_null`: refs_needed IS NOT NULL
- `2200_480056_22_not_null`: home_team_id IS NOT NULL
- `2200_480056_23_not_null`: away_team_id IS NOT NULL
- `2200_480056_24_not_null`: league_id IS NOT NULL

---

### User Management

**Tables**: 6

#### `user_earnings`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `users` (via `processed_by`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `earning_type` | `text` | No | - | - |
| `amount` | `numeric(10,2)` | No | - | - |
| `description` | `varchar(255)` | No | - | - |
| `reference_id` | `uuid` | Yes | - | - |
| `reference_type` | `varchar(255)` | Yes | - | - |
| `pay_period` | `varchar(255)` | No | - | - |
| `earned_date` | `date` | No | - | - |
| `pay_date` | `date` | Yes | - | - |
| `payment_status` | `text` | Yes | `'pending'::text` | - |
| `processed_by` | `uuid` | Yes | - | FK → `users(id)` |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `user_earnings_earned_date_payment_status_index` on (`earned_date, payment_status`)
- **INDEX**: `user_earnings_organization_id_pay_period_index` on (`organization_id, pay_period`)
- **PRIMARY KEY**: `user_earnings_pkey` on (`id`)
- **INDEX**: `user_earnings_reference_id_reference_type_index` on (`reference_id, reference_type`)
- **INDEX**: `user_earnings_user_id_earning_type_index` on (`user_id, earning_type`)
- **INDEX**: `user_earnings_user_id_pay_period_index` on (`user_id, pay_period`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `processed_by` → `users(id)`
  - ON DELETE: SET NULL
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `user_earnings_earning_type_check`: (earning_type = ANY (ARRAY['referee_pay'::text, 'reimbursement'::text, 'bonus'::text, 'adjustment'::text, 'other'::text]))
- `user_earnings_payment_status_check`: (payment_status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'paid'::text, 'cancelled'::text]))
- `2200_481960_1_not_null`: id IS NOT NULL
- `2200_481960_2_not_null`: user_id IS NOT NULL
- `2200_481960_3_not_null`: organization_id IS NOT NULL
- `2200_481960_4_not_null`: earning_type IS NOT NULL
- `2200_481960_5_not_null`: amount IS NOT NULL
- `2200_481960_6_not_null`: description IS NOT NULL
- `2200_481960_9_not_null`: pay_period IS NOT NULL
- `2200_481960_10_not_null`: earned_date IS NOT NULL

---

#### `user_location_distances`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `locations` (via `location_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `location_id` | `uuid` | No | - | FK → `locations(id)`, UNIQUE |
| `distance_meters` | `integer` | Yes | - | - |
| `distance_text` | `varchar(20)` | Yes | - | - |
| `drive_time_seconds` | `integer` | Yes | - | - |
| `drive_time_text` | `varchar(20)` | Yes | - | - |
| `drive_time_minutes` | `integer` | Yes | - | - |
| `calculation_provider` | `varchar(50)` | Yes | - | - |
| `calculated_at` | `timestamptz` | Yes | - | - |
| `route_data` | `json` | Yes | - | - |
| `calculation_successful` | `boolean` | No | `false` | - |
| `calculation_error` | `text` | Yes | - | - |
| `calculation_attempts` | `integer` | No | `1` | - |
| `last_calculation_attempt` | `timestamptz` | Yes | - | - |
| `needs_recalculation` | `boolean` | No | `false` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `user_location_distances_calculated_at_index` on (`calculated_at`)
- **INDEX**: `user_location_distances_calculation_successful_index` on (`calculation_successful`)
- **INDEX**: `user_location_distances_distance_meters_index` on (`distance_meters`)
- **INDEX**: `user_location_distances_drive_time_minutes_index` on (`drive_time_minutes`)
- **INDEX**: `user_location_distances_location_id_index` on (`location_id`)
- **INDEX**: `user_location_distances_needs_recalculation_index` on (`needs_recalculation`)
- **PRIMARY KEY**: `user_location_distances_pkey` on (`id`)
- **INDEX**: `user_location_distances_user_id_index` on (`user_id`)
- **INDEX**: `user_location_distances_user_id_location_id_index` on (`user_id, location_id`)
- **UNIQUE INDEX**: `user_location_distances_user_id_location_id_unique` on (`user_id, location_id`)

**Foreign Keys**:

- `location_id` → `locations(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480557_1_not_null`: id IS NOT NULL
- `2200_480557_2_not_null`: user_id IS NOT NULL
- `2200_480557_3_not_null`: location_id IS NOT NULL
- `2200_480557_12_not_null`: calculation_successful IS NOT NULL
- `2200_480557_14_not_null`: calculation_attempts IS NOT NULL
- `2200_480557_16_not_null`: needs_recalculation IS NOT NULL
- `2200_480557_17_not_null`: created_at IS NOT NULL
- `2200_480557_18_not_null`: updated_at IS NOT NULL

---

#### `user_locations`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `full_address` | `varchar(500)` | Yes | - | - |
| `street_number` | `varchar(20)` | Yes | - | - |
| `street_name` | `varchar(255)` | Yes | - | - |
| `city` | `varchar(100)` | No | - | - |
| `province` | `varchar(50)` | No | `'AB'::character varying` | - |
| `postal_code` | `varchar(10)` | No | - | - |
| `country` | `varchar(50)` | No | `'Canada'::character varying` | - |
| `latitude` | `numeric(10,8)` | Yes | - | - |
| `longitude` | `numeric(11,8)` | Yes | - | - |
| `geocoding_provider` | `varchar(50)` | Yes | - | - |
| `geocoding_confidence` | `numeric(4,3)` | Yes | - | - |
| `address_type` | `varchar(50)` | Yes | - | - |
| `raw_geocoding_data` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `user_locations_city_index` on (`city`)
- **INDEX**: `user_locations_geocoding_provider_index` on (`geocoding_provider`)
- **INDEX**: `user_locations_latitude_longitude_index` on (`latitude, longitude`)
- **PRIMARY KEY**: `user_locations_pkey` on (`id`)
- **INDEX**: `user_locations_postal_code_index` on (`postal_code`)
- **INDEX**: `user_locations_user_id_index` on (`user_id`)
- **UNIQUE INDEX**: `user_locations_user_id_unique` on (`user_id`)

**Foreign Keys**:

- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480533_1_not_null`: id IS NOT NULL
- `2200_480533_2_not_null`: user_id IS NOT NULL
- `2200_480533_6_not_null`: city IS NOT NULL
- `2200_480533_7_not_null`: province IS NOT NULL
- `2200_480533_8_not_null`: postal_code IS NOT NULL
- `2200_480533_9_not_null`: country IS NOT NULL
- `2200_480533_16_not_null`: created_at IS NOT NULL
- `2200_480533_17_not_null`: updated_at IS NOT NULL

---

#### `user_referee_roles`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `assigned_by`)
  - `referee_roles` (via `referee_role_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `referee_role_id` | `uuid` | No | - | FK → `referee_roles(id)`, UNIQUE |
| `assigned_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `assigned_by` | `uuid` | Yes | - | FK → `users(id)` |
| `is_active` | `boolean` | Yes | `true` | - |

**Indexes**:

- **PRIMARY KEY**: `user_referee_roles_pkey` on (`id`)
- **UNIQUE INDEX**: `user_referee_roles_user_id_referee_role_id_unique` on (`user_id, referee_role_id`)

**Foreign Keys**:

- `assigned_by` → `users(id)`
  - ON DELETE: SET NULL
- `referee_role_id` → `referee_roles(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_482323_1_not_null`: id IS NOT NULL
- `2200_482323_2_not_null`: user_id IS NOT NULL
- `2200_482323_3_not_null`: referee_role_id IS NOT NULL

---

#### `user_roles`

**Purpose**: Junction table linking users to their assigned roles

**Records**: 1 rows

**Relationships**:
- **Belongs to**:
  - `users` (via `assigned_by`)
  - `roles` (via `role_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `role_id` | `uuid` | No | - | FK → `roles(id)`, UNIQUE |
| `assigned_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `assigned_by` | `uuid` | Yes | - | FK → `users(id)` |
| `expires_at` | `timestamptz` | Yes | - | - |
| `is_active` | `boolean` | No | `true` | - |

**Indexes**:

- **INDEX**: `user_roles_expires_at_index` on (`expires_at`)
- **INDEX**: `user_roles_is_active_index` on (`is_active`)
- **PRIMARY KEY**: `user_roles_pkey` on (`id`)
- **INDEX**: `user_roles_role_id_index` on (`role_id`)
- **INDEX**: `user_roles_user_id_index` on (`user_id`)
- **UNIQUE INDEX**: `user_roles_user_id_role_id_unique` on (`user_id, role_id`)

**Foreign Keys**:

- `assigned_by` → `users(id)`
  - ON DELETE: SET NULL
- `role_id` → `roles(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_482666_1_not_null`: id IS NOT NULL
- `2200_482666_2_not_null`: user_id IS NOT NULL
- `2200_482666_3_not_null`: role_id IS NOT NULL
- `2200_482666_7_not_null`: is_active IS NOT NULL

---

#### `users`

**Purpose**: Core user accounts and authentication credentials

**Records**: 1 rows

**Relationships**:
- **Belongs to**:
  - `referee_levels` (via `referee_level_id`)
- **Has many**:
  - `access_control_audit` (via `user_id`)
  - `accounting_integrations` (via `organization_id`)
  - `accounting_sync_logs` (via `organization_id`)
  - `ai_assignment_partner_preferences` (via `referee1_id, referee2_id`)
  - `ai_processing_logs` (via `organization_id, user_id`)
  - `ai_suggestions` (via `created_by, processed_by, referee_id`)
  - `approval_requests` (via `organization_id, requested_by`)
  - `approval_workflows` (via `organization_id`)
  - `assignment_patterns` (via `referee_id`)
  - `audit_logs` (via `user_id`)
  - `budget_alerts` (via `acknowledged_by, organization_id`)
  - `budget_approvals` (via `approver_id, requested_by`)
  - `budget_categories` (via `organization_id`)
  - `budget_forecasts` (via `organization_id`)
  - `budget_periods` (via `created_by, organization_id`)
  - `budgets` (via `organization_id, owner_id`)
  - `cash_flow_forecasts` (via `organization_id`)
  - `chart_of_accounts` (via `organization_id`)
  - `communication_recipients` (via `recipient_id`)
  - `company_credit_cards` (via `blocked_by, created_by, organization_id, primary_holder_id, updated_by`)
  - `content_analytics` (via `user_id`)
  - `content_attachments` (via `uploaded_by`)
  - `content_items` (via `author_id`)
  - `content_permissions` (via `granted_by, user_id`)
  - `content_versions` (via `created_by`)
  - `departments` (via `manager_id`)
  - `document_access` (via `user_id`)
  - `document_acknowledgments` (via `user_id`)
  - `document_versions` (via `uploaded_by`)
  - `documents` (via `approved_by, uploaded_by`)
  - `employees` (via `user_id`)
  - `expense_approvals` (via `approver_id, organization_id, user_id`)
  - `expense_categories` (via `organization_id`)
  - `expense_data` (via `compliance_reviewed_by, corrected_by, organization_id, payment_approved_by, reconciled_by, reimbursement_user_id, user_id`)
  - `expense_receipts` (via `organization_id, user_id`)
  - `expense_reimbursements` (via `organization_id, processed_by, reimbursement_user_id`)
  - `financial_audit_trail` (via `organization_id, user_id`)
  - `financial_dashboards` (via `organization_id, user_id`)
  - `financial_insights` (via `organization_id, reviewed_by`)
  - `financial_kpis` (via `organization_id`)
  - `financial_reports_config` (via `created_by, organization_id`)
  - `financial_transactions` (via `created_by, organization_id`)
  - `game_assignments` (via `assigned_by, user_id`)
  - `game_chunks` (via `assigned_by, assigned_referee_id, created_by`)
  - `game_fees` (via `recorded_by`)
  - `internal_communications` (via `author_id`)
  - `invitations` (via `invited_by`)
  - `journal_entries` (via `approved_by, created_by, organization_id`)
  - `mentorship_documents` (via `uploaded_by`)
  - `mentorship_notes` (via `author_id`)
  - `mentorships` (via `mentee_id, mentor_id`)
  - `notification_preferences` (via `user_id`)
  - `notifications` (via `user_id`)
  - `payment_methods` (via `created_by, organization_id, updated_by`)
  - `post_reads` (via `user_id`)
  - `posts` (via `author_id`)
  - `purchase_orders` (via `approved_by, organization_id, requested_by`)
  - `referee_profiles` (via `user_id`)
  - `resource_access_logs` (via `user_id`)
  - `resource_audit_log` (via `user_id`)
  - `resource_categories` (via `created_by, managed_by`)
  - `resource_category_managers` (via `assigned_by, user_id`)
  - `resource_category_permissions` (via `created_by`)
  - `resource_permissions` (via `created_by`)
  - `resource_versions` (via `created_by`)
  - `resources` (via `created_by, published_by, updated_by`)
  - `spending_limits` (via `organization_id, user_id`)
  - `user_earnings` (via `organization_id, processed_by, user_id`)
  - `user_location_distances` (via `user_id`)
  - `user_locations` (via `user_id`)
  - `user_referee_roles` (via `assigned_by, user_id`)
  - `user_roles` (via `assigned_by, user_id`)
  - `vendors` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `email` | `varchar(255)` | No | - | UNIQUE |
| `password_hash` | `varchar(255)` | No | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `name` | `varchar(255)` | Yes | - | - |
| `phone` | `varchar(255)` | Yes | - | - |
| `location` | `varchar(255)` | Yes | - | - |
| `postal_code` | `varchar(255)` | Yes | - | - |
| `max_distance` | `integer` | Yes | `25` | - |
| `is_available` | `boolean` | Yes | `true` | - |
| `wage_per_game` | `numeric(8,2)` | Yes | - | - |
| `referee_level_id` | `uuid` | Yes | - | FK → `referee_levels(id)` |
| `years_experience` | `integer` | Yes | - | - |
| `games_refereed_season` | `integer` | Yes | `0` | - |
| `evaluation_score` | `numeric(4,2)` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `roles` | `ARRAY` | Yes | `'{}'::text[]` | - |
| `is_white_whistle` | `boolean` | Yes | `false` | - |
| `new_referee_level` | `text` | Yes | - | - |
| `first_name` | `varchar(255)` | Yes | - | - |
| `last_name` | `varchar(255)` | Yes | - | - |
| `date_of_birth` | `date` | Yes | - | - |
| `street_address` | `varchar(255)` | Yes | - | - |
| `city` | `varchar(255)` | Yes | - | - |
| `province_state` | `varchar(255)` | Yes | - | - |
| `postal_zip_code` | `varchar(255)` | Yes | - | - |
| `country` | `varchar(255)` | Yes | - | - |
| `emergency_contact_name` | `varchar(255)` | Yes | - | - |
| `emergency_contact_phone` | `varchar(255)` | Yes | - | - |
| `year_started_refereeing` | `integer` | Yes | - | - |
| `certifications` | `json` | Yes | - | - |
| `specializations` | `json` | Yes | - | - |
| `availability_status` | `text` | Yes | `'active'::text` | - |
| `organization_id` | `varchar(255)` | Yes | `'1'::character varying` | - |
| `registration_date` | `date` | Yes | `CURRENT_TIMESTAMP` | - |
| `last_login` | `timestamptz` | Yes | - | - |
| `profile_completion_percentage` | `integer` | Yes | `0` | - |
| `admin_notes` | `text` | Yes | - | - |
| `profile_photo_url` | `varchar(255)` | Yes | - | - |
| `communication_preferences` | `json` | Yes | - | - |
| `banking_info` | `json` | Yes | - | - |
| `is_referee` | `boolean` | Yes | `false` | - |

**Indexes**:

- **UNIQUE INDEX**: `users_email_unique` on (`email`)
- **PRIMARY KEY**: `users_pkey` on (`id`)

**Foreign Keys**:

- `referee_level_id` → `referee_levels(id)`

**Check Constraints**:

- `check_email_format`: ((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)
- `check_max_distance_reasonable`: ((max_distance IS NULL) OR ((max_distance >= 0) AND (max_distance <= 1000)))
- `check_years_experience_reasonable`: ((years_experience IS NULL) OR ((years_experience >= 0) AND (years_experience <= 100)))
- `users_availability_status_check`: (availability_status = ANY (ARRAY['active'::text, 'inactive'::text, 'on_break'::text]))
- `users_new_referee_level_check`: (new_referee_level = ANY (ARRAY['Rookie'::text, 'Junior'::text, 'Senior'::text]))
- `2200_479998_1_not_null`: id IS NOT NULL
- `2200_479998_2_not_null`: email IS NOT NULL
- `2200_479998_3_not_null`: password_hash IS NOT NULL
- `2200_479998_5_not_null`: created_at IS NOT NULL
- `2200_479998_6_not_null`: updated_at IS NOT NULL

---

### Communications

**Tables**: 5

#### `communication_recipients`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `internal_communications` (via `communication_id`)
  - `users` (via `recipient_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `communication_id` | `uuid` | No | - | FK → `internal_communications(id)`, UNIQUE |
| `recipient_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `sent_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `read_at` | `timestamptz` | Yes | - | - |
| `acknowledged_at` | `timestamptz` | Yes | - | - |
| `delivery_method` | `varchar(30)` | Yes | - | - |
| `delivery_status` | `varchar(30)` | Yes | `'pending'::character varying` | - |
| `delivery_error` | `text` | Yes | - | - |

**Indexes**:

- **INDEX**: `communication_recipients_communication_id_index` on (`communication_id`)
- **UNIQUE INDEX**: `communication_recipients_communication_id_recipient_id_unique` on (`communication_id, recipient_id`)
- **PRIMARY KEY**: `communication_recipients_pkey` on (`id`)
- **INDEX**: `communication_recipients_read_at_index` on (`read_at`)
- **INDEX**: `communication_recipients_recipient_id_index` on (`recipient_id`)
- **INDEX**: `communication_recipients_sent_at_index` on (`sent_at`)

**Foreign Keys**:

- `communication_id` → `internal_communications(id)`
  - ON DELETE: CASCADE
- `recipient_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481881_1_not_null`: id IS NOT NULL
- `2200_481881_2_not_null`: communication_id IS NOT NULL
- `2200_481881_3_not_null`: recipient_id IS NOT NULL

---

#### `internal_communications`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `author_id`)
- **Has many**:
  - `communication_recipients` (via `communication_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `title` | `varchar(200)` | No | - | - |
| `content` | `text` | No | - | - |
| `type` | `varchar(30)` | Yes | - | - |
| `priority` | `varchar(20)` | Yes | `'normal'::character varying` | - |
| `author_id` | `uuid` | No | - | FK → `users(id)` |
| `target_audience` | `json` | Yes | - | - |
| `publish_date` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `expiration_date` | `timestamptz` | Yes | - | - |
| `requires_acknowledgment` | `boolean` | Yes | `false` | - |
| `status` | `varchar(30)` | Yes | `'draft'::character varying` | - |
| `attachments` | `json` | Yes | - | - |
| `tags` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `internal_communications_author_id_index` on (`author_id`)
- **PRIMARY KEY**: `internal_communications_pkey` on (`id`)
- **INDEX**: `internal_communications_priority_index` on (`priority`)
- **INDEX**: `internal_communications_publish_date_index` on (`publish_date`)
- **INDEX**: `internal_communications_status_index` on (`status`)
- **INDEX**: `internal_communications_type_index` on (`type`)

**Foreign Keys**:

- `author_id` → `users(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `2200_481857_1_not_null`: id IS NOT NULL
- `2200_481857_2_not_null`: title IS NOT NULL
- `2200_481857_3_not_null`: content IS NOT NULL
- `2200_481857_6_not_null`: author_id IS NOT NULL
- `2200_481857_14_not_null`: created_at IS NOT NULL
- `2200_481857_15_not_null`: updated_at IS NOT NULL

---

#### `invitations`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `invited_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `email` | `varchar(255)` | No | - | UNIQUE |
| `first_name` | `varchar(255)` | No | - | - |
| `last_name` | `varchar(255)` | No | - | - |
| `role` | `varchar(255)` | No | `'referee'::character varying` | - |
| `invited_by` | `uuid` | Yes | - | FK → `users(id)` |
| `token` | `varchar(255)` | No | - | UNIQUE |
| `expires_at` | `timestamptz` | No | - | - |
| `used` | `boolean` | No | `false` | - |
| `used_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `invitations_email_index` on (`email`)
- **UNIQUE INDEX**: `invitations_email_unique` on (`email`)
- **INDEX**: `invitations_expires_at_index` on (`expires_at`)
- **PRIMARY KEY**: `invitations_pkey` on (`id`)
- **INDEX**: `invitations_token_index` on (`token`)
- **UNIQUE INDEX**: `invitations_token_unique` on (`token`)

**Foreign Keys**:

- `invited_by` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_480138_1_not_null`: id IS NOT NULL
- `2200_480138_2_not_null`: email IS NOT NULL
- `2200_480138_3_not_null`: first_name IS NOT NULL
- `2200_480138_4_not_null`: last_name IS NOT NULL
- `2200_480138_5_not_null`: role IS NOT NULL
- `2200_480138_7_not_null`: token IS NOT NULL
- `2200_480138_8_not_null`: expires_at IS NOT NULL
- `2200_480138_9_not_null`: used IS NOT NULL
- `2200_480138_11_not_null`: created_at IS NOT NULL
- `2200_480138_12_not_null`: updated_at IS NOT NULL

---

#### `notification_preferences`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `user_id` | `uuid` | No | - | PRIMARY KEY, FK → `users(id)` |
| `email_assignments` | `boolean` | Yes | `true` | - |
| `email_reminders` | `boolean` | Yes | `true` | - |
| `email_status_changes` | `boolean` | Yes | `true` | - |
| `sms_assignments` | `boolean` | Yes | `true` | - |
| `sms_reminders` | `boolean` | Yes | `true` | - |
| `in_app_enabled` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **PRIMARY KEY**: `notification_preferences_pkey` on (`user_id`)

**Foreign Keys**:

- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483346_1_not_null`: user_id IS NOT NULL

---

#### `notifications`

**Purpose**: System notification delivery

**Relationships**:
- **Belongs to**:
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `type` | `varchar(50)` | No | - | - |
| `title` | `varchar(255)` | No | - | - |
| `message` | `text` | No | - | - |
| `link` | `varchar(500)` | Yes | - | - |
| `metadata` | `jsonb` | Yes | - | - |
| `is_read` | `boolean` | Yes | `false` | - |
| `read_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **PRIMARY KEY**: `notifications_pkey` on (`id`)
- **INDEX**: `notifications_type_index` on (`type`)
- **INDEX**: `notifications_user_created_index` on (`user_id, created_at`)
- **INDEX**: `notifications_user_unread_index` on (`user_id, is_read`)

**Foreign Keys**:

- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483328_1_not_null`: id IS NOT NULL
- `2200_483328_2_not_null`: user_id IS NOT NULL
- `2200_483328_3_not_null`: type IS NOT NULL
- `2200_483328_4_not_null`: title IS NOT NULL
- `2200_483328_5_not_null`: message IS NOT NULL

---

### Authentication & Security

**Tables**: 4

#### `access_control_audit`

**Purpose**: Audit tracking for compliance

**Relationships**:
- **Belongs to**:
  - `roles` (via `role_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `action_type` | `varchar(50)` | No | - | - |
| `resource_type` | `varchar(50)` | No | - | - |
| `role_id` | `uuid` | Yes | - | FK → `roles(id)` |
| `resource_identifier` | `varchar(255)` | Yes | - | - |
| `old_value` | `jsonb` | Yes | - | - |
| `new_value` | `jsonb` | Yes | - | - |
| `reason` | `varchar(500)` | Yes | - | - |
| `ip_address` | `varchar(45)` | Yes | - | - |
| `user_agent` | `varchar(255)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `access_control_audit_action_type_index` on (`action_type`)
- **INDEX**: `access_control_audit_created_at_index` on (`created_at`)
- **PRIMARY KEY**: `access_control_audit_pkey` on (`id`)
- **INDEX**: `access_control_audit_resource_type_index` on (`resource_type`)
- **INDEX**: `access_control_audit_role_id_index` on (`role_id`)
- **INDEX**: `access_control_audit_user_id_index` on (`user_id`)

**Foreign Keys**:

- `role_id` → `roles(id)`
  - ON DELETE: SET NULL
- `user_id` → `users(id)`

**Check Constraints**:

- `2200_483134_1_not_null`: id IS NOT NULL
- `2200_483134_2_not_null`: user_id IS NOT NULL
- `2200_483134_3_not_null`: action_type IS NOT NULL
- `2200_483134_4_not_null`: resource_type IS NOT NULL

---

#### `audit_logs`

**Purpose**: Security and compliance audit trail

**Records**: 60 rows

**Relationships**:
- **Belongs to**:
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('audit_logs_id_seq'::regclass)` | PRIMARY KEY |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `user_email` | `varchar(255)` | Yes | - | - |
| `event_type` | `varchar(255)` | No | - | - |
| `resource_type` | `varchar(255)` | Yes | - | - |
| `resource_id` | `varchar(255)` | Yes | - | - |
| `old_values` | `json` | Yes | - | - |
| `new_values` | `json` | Yes | - | - |
| `request_path` | `varchar(255)` | Yes | - | - |
| `request_method` | `varchar(255)` | Yes | - | - |
| `ip_address` | `varchar(255)` | Yes | - | - |
| `user_agent` | `varchar(255)` | Yes | - | - |
| `success` | `boolean` | Yes | `true` | - |
| `error_message` | `text` | Yes | - | - |
| `additional_data` | `json` | Yes | - | - |
| `severity` | `varchar(255)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `audit_logs_created_at_index` on (`created_at`)
- **INDEX**: `audit_logs_event_type_index` on (`event_type`)
- **PRIMARY KEY**: `audit_logs_pkey` on (`id`)
- **INDEX**: `audit_logs_resource_type_resource_id_index` on (`resource_type, resource_id`)
- **INDEX**: `audit_logs_user_id_index` on (`user_id`)

**Foreign Keys**:

- `user_id` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_482696_1_not_null`: id IS NOT NULL
- `2200_482696_4_not_null`: event_type IS NOT NULL

---

#### `resource_access_logs`

**Purpose**: Logging and audit trail

**Relationships**:
- **Belongs to**:
  - `resources` (via `resource_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `resource_id` | `uuid` | Yes | - | FK → `resources(id)` |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `action` | `varchar(50)` | No | - | - |
| `ip_address` | `varchar(45)` | Yes | - | - |
| `user_agent` | `varchar(500)` | Yes | - | - |
| `accessed_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `resource_access_logs_accessed_at_index` on (`accessed_at`)
- **INDEX**: `resource_access_logs_action_index` on (`action`)
- **PRIMARY KEY**: `resource_access_logs_pkey` on (`id`)
- **INDEX**: `resource_access_logs_resource_id_index` on (`resource_id`)
- **INDEX**: `resource_access_logs_user_id_index` on (`user_id`)

**Foreign Keys**:

- `resource_id` → `resources(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_482766_1_not_null`: id IS NOT NULL
- `2200_482766_4_not_null`: action IS NOT NULL

---

#### `resource_audit_log`

**Purpose**: Audit tracking for compliance

**Relationships**:
- **Belongs to**:
  - `resource_categories` (via `category_id`)
  - `resources` (via `resource_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `resource_id` | `uuid` | Yes | - | FK → `resources(id)` |
| `category_id` | `uuid` | Yes | - | FK → `resource_categories(id)` |
| `user_id` | `uuid` | Yes | - | FK → `users(id)` |
| `action` | `varchar(50)` | No | - | - |
| `changes` | `jsonb` | Yes | - | - |
| `metadata` | `jsonb` | Yes | `'{}'::jsonb` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `resource_audit_log_action_idx` on (`action`)
- **INDEX**: `resource_audit_log_category_idx` on (`category_id`)
- **INDEX**: `resource_audit_log_created_idx` on (`created_at`)
- **PRIMARY KEY**: `resource_audit_log_pkey` on (`id`)
- **INDEX**: `resource_audit_log_resource_idx` on (`resource_id`)
- **INDEX**: `resource_audit_log_resource_time_idx` on (`resource_id, created_at`)
- **INDEX**: `resource_audit_log_user_idx` on (`user_id`)
- **INDEX**: `resource_audit_log_user_time_idx` on (`user_id, created_at`)

**Foreign Keys**:

- `category_id` → `resource_categories(id)`
  - ON DELETE: SET NULL
- `resource_id` → `resources(id)`
  - ON DELETE: SET NULL
- `user_id` → `users(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_482852_1_not_null`: id IS NOT NULL
- `2200_482852_5_not_null`: action IS NOT NULL

---

### Teams & Leagues

**Tables**: 4

#### `job_positions`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `departments` (via `department_id`)
- **Has many**:
  - `employees` (via `position_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `title` | `varchar(100)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `department_id` | `uuid` | No | - | FK → `departments(id)` |
| `level` | `varchar(50)` | Yes | - | - |
| `min_salary` | `numeric(12,2)` | Yes | - | - |
| `max_salary` | `numeric(12,2)` | Yes | - | - |
| `required_skills` | `json` | Yes | - | - |
| `preferred_skills` | `json` | Yes | - | - |
| `responsibilities` | `text` | Yes | - | - |
| `active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `job_positions_active_index` on (`active`)
- **INDEX**: `job_positions_department_id_index` on (`department_id`)
- **INDEX**: `job_positions_level_index` on (`level`)
- **PRIMARY KEY**: `job_positions_pkey` on (`id`)

**Foreign Keys**:

- `department_id` → `departments(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481466_1_not_null`: id IS NOT NULL
- `2200_481466_2_not_null`: title IS NOT NULL
- `2200_481466_4_not_null`: department_id IS NOT NULL
- `2200_481466_12_not_null`: created_at IS NOT NULL
- `2200_481466_13_not_null`: updated_at IS NOT NULL

---

#### `leagues`

**Purpose**: League/competition organization

**Records**: 6 rows

**Relationships**:
- **Belongs to**:
  - `organizations` (via `organization_id`)
- **Has many**:
  - `games` (via `league_id`)
  - `teams` (via `league_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization` | `varchar(255)` | No | - | UNIQUE |
| `age_group` | `varchar(255)` | No | - | UNIQUE |
| `gender` | `varchar(255)` | No | - | UNIQUE |
| `division` | `varchar(255)` | No | - | UNIQUE |
| `season` | `varchar(255)` | No | - | UNIQUE |
| `level` | `varchar(255)` | No | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `organization_id` | `uuid` | Yes | - | FK → `organizations(id)` |

**Indexes**:

- **INDEX**: `idx_leagues_organization` on (`organization_id`)
- **INDEX**: `leagues_level_index` on (`level`)
- **UNIQUE INDEX**: `leagues_organization_age_group_gender_division_season_unique` on (`organization, age_group, gender, division, season`)
- **INDEX**: `leagues_organization_age_group_gender_index` on (`organization, age_group, gender`)
- **PRIMARY KEY**: `leagues_pkey` on (`id`)
- **INDEX**: `leagues_season_index` on (`season`)

**Foreign Keys**:

- `organization_id` → `organizations(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_480205_1_not_null`: id IS NOT NULL
- `2200_480205_2_not_null`: organization IS NOT NULL
- `2200_480205_3_not_null`: age_group IS NOT NULL
- `2200_480205_4_not_null`: gender IS NOT NULL
- `2200_480205_5_not_null`: division IS NOT NULL
- `2200_480205_6_not_null`: season IS NOT NULL
- `2200_480205_7_not_null`: level IS NOT NULL
- `2200_480205_8_not_null`: created_at IS NOT NULL
- `2200_480205_9_not_null`: updated_at IS NOT NULL

---

#### `positions`

**Purpose**: Data storage and management

**Relationships**:
- **Has many**:
  - `game_assignments` (via `position_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(100)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **UNIQUE INDEX**: `positions_name_unique` on (`name`)
- **PRIMARY KEY**: `positions_pkey` on (`id`)

**Check Constraints**:

- `2200_480011_1_not_null`: id IS NOT NULL
- `2200_480011_2_not_null`: name IS NOT NULL
- `2200_480011_4_not_null`: created_at IS NOT NULL
- `2200_480011_5_not_null`: updated_at IS NOT NULL

---

#### `teams`

**Purpose**: Sports teams information

**Records**: 36 rows

**Relationships**:
- **Belongs to**:
  - `leagues` (via `league_id`)
  - `organizations` (via `organization_id`)
- **Has many**:
  - `games` (via `away_team_id, home_team_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | UNIQUE |
| `location` | `varchar(255)` | Yes | - | - |
| `contact_email` | `varchar(255)` | Yes | - | - |
| `contact_phone` | `varchar(20)` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `league_id` | `uuid` | No | - | FK → `leagues(id)`, UNIQUE |
| `rank` | `integer` | No | `1` | - |
| `organization_id` | `uuid` | Yes | - | FK → `organizations(id)` |

**Indexes**:

- **INDEX**: `idx_teams_league_rank` on (`league_id, rank`)
- **INDEX**: `idx_teams_league_rank_name` on (`name, league_id, rank`)
- **INDEX**: `idx_teams_organization` on (`organization_id`)
- **INDEX**: `teams_league_id_index` on (`league_id`)
- **UNIQUE INDEX**: `teams_league_id_name_unique` on (`name, league_id`)
- **INDEX**: `teams_league_id_rank_index` on (`league_id, rank`)
- **PRIMARY KEY**: `teams_pkey` on (`id`)

**Foreign Keys**:

- `league_id` → `leagues(id)`
  - ON DELETE: CASCADE
- `organization_id` → `organizations(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `check_team_rank_positive`: ((rank > 0) AND (rank <= 100))
- `2200_480046_1_not_null`: id IS NOT NULL
- `2200_480046_2_not_null`: name IS NOT NULL
- `2200_480046_6_not_null`: created_at IS NOT NULL
- `2200_480046_7_not_null`: updated_at IS NOT NULL
- `2200_480046_8_not_null`: league_id IS NOT NULL
- `2200_480046_9_not_null`: rank IS NOT NULL

---

### Assets & Resources

**Tables**: 3

#### `asset_checkouts`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `assets` (via `asset_id`)
  - `employees` (via `checked_in_by`)
  - `employees` (via `checked_out_by`)
  - `employees` (via `employee_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `asset_id` | `uuid` | No | - | FK → `assets(id)` |
| `employee_id` | `uuid` | No | - | FK → `employees(id)` |
| `checked_out_by` | `uuid` | No | - | FK → `employees(id)` |
| `checked_in_by` | `uuid` | Yes | - | FK → `employees(id)` |
| `checkout_date` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `expected_return_date` | `timestamptz` | Yes | - | - |
| `actual_return_date` | `timestamptz` | Yes | - | - |
| `checkout_condition` | `varchar(30)` | Yes | `'good'::character varying` | - |
| `return_condition` | `varchar(30)` | Yes | - | - |
| `checkout_notes` | `text` | Yes | - | - |
| `return_notes` | `text` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'checked_out'::character varying` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `asset_checkouts_asset_id_index` on (`asset_id`)
- **INDEX**: `asset_checkouts_checkout_date_index` on (`checkout_date`)
- **INDEX**: `asset_checkouts_employee_id_index` on (`employee_id`)
- **INDEX**: `asset_checkouts_expected_return_date_index` on (`expected_return_date`)
- **PRIMARY KEY**: `asset_checkouts_pkey` on (`id`)
- **INDEX**: `asset_checkouts_status_index` on (`status`)

**Foreign Keys**:

- `asset_id` → `assets(id)`
  - ON DELETE: CASCADE
- `checked_in_by` → `employees(id)`
  - ON DELETE: SET NULL
- `checked_out_by` → `employees(id)`
  - ON DELETE: RESTRICT
- `employee_id` → `employees(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481631_1_not_null`: id IS NOT NULL
- `2200_481631_2_not_null`: asset_id IS NOT NULL
- `2200_481631_3_not_null`: employee_id IS NOT NULL
- `2200_481631_4_not_null`: checked_out_by IS NOT NULL
- `2200_481631_14_not_null`: created_at IS NOT NULL
- `2200_481631_15_not_null`: updated_at IS NOT NULL

---

#### `asset_maintenance`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `assets` (via `asset_id`)
  - `employees` (via `performed_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `asset_id` | `uuid` | No | - | FK → `assets(id)` |
| `maintenance_type` | `varchar(50)` | Yes | - | - |
| `scheduled_date` | `date` | Yes | - | - |
| `completed_date` | `date` | Yes | - | - |
| `performed_by` | `uuid` | Yes | - | FK → `employees(id)` |
| `vendor` | `varchar(100)` | Yes | - | - |
| `cost` | `numeric(10,2)` | Yes | - | - |
| `description` | `text` | Yes | - | - |
| `parts_replaced` | `text` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'scheduled'::character varying` | - |
| `next_maintenance_due` | `date` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `asset_maintenance_asset_id_index` on (`asset_id`)
- **INDEX**: `asset_maintenance_completed_date_index` on (`completed_date`)
- **INDEX**: `asset_maintenance_maintenance_type_index` on (`maintenance_type`)
- **PRIMARY KEY**: `asset_maintenance_pkey` on (`id`)
- **INDEX**: `asset_maintenance_scheduled_date_index` on (`scheduled_date`)
- **INDEX**: `asset_maintenance_status_index` on (`status`)

**Foreign Keys**:

- `asset_id` → `assets(id)`
  - ON DELETE: CASCADE
- `performed_by` → `employees(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_481605_1_not_null`: id IS NOT NULL
- `2200_481605_2_not_null`: asset_id IS NOT NULL
- `2200_481605_14_not_null`: created_at IS NOT NULL
- `2200_481605_15_not_null`: updated_at IS NOT NULL

---

#### `assets`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `employees` (via `assigned_to`)
  - `locations` (via `location_id`)
- **Has many**:
  - `asset_checkouts` (via `asset_id`)
  - `asset_maintenance` (via `asset_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `asset_tag` | `varchar(50)` | No | - | UNIQUE |
| `name` | `varchar(200)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `category` | `varchar(50)` | Yes | - | - |
| `subcategory` | `varchar(50)` | Yes | - | - |
| `brand` | `varchar(100)` | Yes | - | - |
| `model` | `varchar(100)` | Yes | - | - |
| `serial_number` | `varchar(100)` | Yes | - | - |
| `purchase_date` | `date` | Yes | - | - |
| `purchase_cost` | `numeric(12,2)` | Yes | - | - |
| `current_value` | `numeric(12,2)` | Yes | - | - |
| `location_id` | `uuid` | Yes | - | FK → `locations(id)` |
| `assigned_to` | `uuid` | Yes | - | FK → `employees(id)` |
| `condition` | `varchar(30)` | Yes | `'good'::character varying` | - |
| `status` | `varchar(30)` | Yes | `'available'::character varying` | - |
| `specifications` | `json` | Yes | - | - |
| `warranty_expiration` | `date` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `assets_asset_tag_index` on (`asset_tag`)
- **UNIQUE INDEX**: `assets_asset_tag_unique` on (`asset_tag`)
- **INDEX**: `assets_assigned_to_index` on (`assigned_to`)
- **INDEX**: `assets_category_index` on (`category`)
- **INDEX**: `assets_condition_index` on (`condition`)
- **INDEX**: `assets_location_id_index` on (`location_id`)
- **PRIMARY KEY**: `assets_pkey` on (`id`)
- **INDEX**: `assets_status_index` on (`status`)
- **INDEX**: `assets_subcategory_index` on (`subcategory`)

**Foreign Keys**:

- `assigned_to` → `employees(id)`
  - ON DELETE: SET NULL
- `location_id` → `locations(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_481574_1_not_null`: id IS NOT NULL
- `2200_481574_2_not_null`: asset_tag IS NOT NULL
- `2200_481574_3_not_null`: name IS NOT NULL
- `2200_481574_20_not_null`: created_at IS NOT NULL
- `2200_481574_21_not_null`: updated_at IS NOT NULL

---

### Organizations

**Tables**: 3

#### `departments`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `manager_id`)
  - `departments` (via `parent_department_id`)
- **Has many**:
  - `compliance_tracking` (via `responsible_department`)
  - `departments` (via `parent_department_id`)
  - `employees` (via `department_id`)
  - `job_positions` (via `department_id`)
  - `risk_assessments` (via `owner_department`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(100)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `parent_department_id` | `uuid` | Yes | - | FK → `departments(id)` |
| `manager_id` | `uuid` | Yes | - | FK → `users(id)` |
| `cost_center` | `varchar(50)` | Yes | - | - |
| `budget_allocated` | `numeric(15,2)` | Yes | `'0'::numeric` | - |
| `budget_spent` | `numeric(15,2)` | Yes | `'0'::numeric` | - |
| `active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `departments_active_index` on (`active`)
- **INDEX**: `departments_manager_id_index` on (`manager_id`)
- **INDEX**: `departments_parent_department_id_index` on (`parent_department_id`)
- **PRIMARY KEY**: `departments_pkey` on (`id`)

**Foreign Keys**:

- `manager_id` → `users(id)`
  - ON DELETE: SET NULL
- `parent_department_id` → `departments(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_481440_1_not_null`: id IS NOT NULL
- `2200_481440_2_not_null`: name IS NOT NULL
- `2200_481440_10_not_null`: created_at IS NOT NULL
- `2200_481440_11_not_null`: updated_at IS NOT NULL

---

#### `organization_settings`

**Purpose**: Data storage and management

**Records**: 1 rows

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_name` | `varchar(255)` | No | `'Sports Organization'::character varying` | - |
| `payment_model` | `USER-DEFINED` | Yes | `'INDIVIDUAL'::payment_model_enum` | - |
| `default_game_rate` | `numeric(8,2)` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `availability_strategy` | `USER-DEFINED` | Yes | `'BLACKLIST'::availability_strategy_enum` | - |

**Indexes**:

- **PRIMARY KEY**: `organization_settings_pkey` on (`id`)

**Check Constraints**:

- `2200_480273_1_not_null`: id IS NOT NULL
- `2200_480273_2_not_null`: organization_name IS NOT NULL

---

#### `organizations`

**Purpose**: Multi-tenant organization records

**Records**: 1 rows

**Relationships**:
- **Belongs to**:
  - `organizations` (via `parent_organization_id`)
- **Has many**:
  - `leagues` (via `organization_id`)
  - `organizations` (via `parent_organization_id`)
  - `teams` (via `organization_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | - |
| `slug` | `varchar(100)` | No | - | UNIQUE |
| `description` | `text` | Yes | - | - |
| `logo_url` | `varchar(255)` | Yes | - | - |
| `settings` | `json` | Yes | `'{}'::json` | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `parent_organization_id` | `uuid` | Yes | - | FK → `organizations(id)` |

**Indexes**:

- **INDEX**: `idx_organizations_parent` on (`parent_organization_id`)
- **INDEX**: `organizations_is_active_index` on (`is_active`)
- **PRIMARY KEY**: `organizations_pkey` on (`id`)
- **INDEX**: `organizations_slug_index` on (`slug`)
- **UNIQUE INDEX**: `organizations_slug_unique` on (`slug`)

**Foreign Keys**:

- `parent_organization_id` → `organizations(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `no_self_parent`: ((parent_organization_id IS NULL) OR (parent_organization_id <> id))
- `2200_480233_1_not_null`: id IS NOT NULL
- `2200_480233_2_not_null`: name IS NOT NULL
- `2200_480233_3_not_null`: slug IS NOT NULL
- `2200_480233_8_not_null`: created_at IS NOT NULL
- `2200_480233_9_not_null`: updated_at IS NOT NULL

---

### Employee Management

**Tables**: 3

#### `employee_evaluations`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `employees` (via `employee_id`)
  - `employees` (via `evaluator_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `employee_id` | `uuid` | No | - | FK → `employees(id)` |
| `evaluator_id` | `uuid` | No | - | FK → `employees(id)` |
| `evaluation_period` | `varchar(50)` | Yes | - | - |
| `evaluation_date` | `date` | No | - | - |
| `period_start` | `date` | No | - | - |
| `period_end` | `date` | No | - | - |
| `overall_rating` | `integer` | Yes | - | - |
| `category_ratings` | `json` | Yes | - | - |
| `achievements` | `text` | Yes | - | - |
| `areas_for_improvement` | `text` | Yes | - | - |
| `goals_next_period` | `text` | Yes | - | - |
| `evaluator_comments` | `text` | Yes | - | - |
| `employee_comments` | `text` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'draft'::character varying` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `employee_evaluations_employee_id_index` on (`employee_id`)
- **INDEX**: `employee_evaluations_evaluation_date_index` on (`evaluation_date`)
- **INDEX**: `employee_evaluations_evaluator_id_index` on (`evaluator_id`)
- **PRIMARY KEY**: `employee_evaluations_pkey` on (`id`)
- **INDEX**: `employee_evaluations_status_index` on (`status`)

**Foreign Keys**:

- `employee_id` → `employees(id)`
  - ON DELETE: CASCADE
- `evaluator_id` → `employees(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `employee_evaluations_overall_rating_check`: (overall_rating = ANY (ARRAY[1, 2, 3, 4, 5]))
- `2200_481527_1_not_null`: id IS NOT NULL
- `2200_481527_2_not_null`: employee_id IS NOT NULL
- `2200_481527_3_not_null`: evaluator_id IS NOT NULL
- `2200_481527_5_not_null`: evaluation_date IS NOT NULL
- `2200_481527_6_not_null`: period_start IS NOT NULL
- `2200_481527_7_not_null`: period_end IS NOT NULL
- `2200_481527_16_not_null`: created_at IS NOT NULL
- `2200_481527_17_not_null`: updated_at IS NOT NULL

---

#### `employees`

**Purpose**: Employee/staff records

**Relationships**:
- **Belongs to**:
  - `departments` (via `department_id`)
  - `employees` (via `manager_id`)
  - `job_positions` (via `position_id`)
  - `users` (via `user_id`)
- **Has many**:
  - `asset_checkouts` (via `checked_in_by, checked_out_by, employee_id`)
  - `asset_maintenance` (via `performed_by`)
  - `assets` (via `assigned_to`)
  - `compliance_tracking` (via `responsible_employee`)
  - `employee_evaluations` (via `employee_id, evaluator_id`)
  - `employees` (via `manager_id`)
  - `incidents` (via `assigned_investigator, reported_by`)
  - `risk_assessments` (via `owner_employee`)
  - `training_records` (via `employee_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `employee_id` | `varchar(20)` | No | - | UNIQUE |
| `department_id` | `uuid` | No | - | FK → `departments(id)` |
| `position_id` | `uuid` | No | - | FK → `job_positions(id)` |
| `manager_id` | `uuid` | Yes | - | FK → `employees(id)` |
| `hire_date` | `date` | No | - | - |
| `termination_date` | `date` | Yes | - | - |
| `employment_type` | `varchar(30)` | Yes | `'full_time'::character varying` | - |
| `employment_status` | `varchar(30)` | Yes | `'active'::character varying` | - |
| `base_salary` | `numeric(12,2)` | Yes | - | - |
| `pay_frequency` | `varchar(20)` | Yes | `'monthly'::character varying` | - |
| `emergency_contacts` | `json` | Yes | - | - |
| `benefits_enrolled` | `json` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `employees_department_id_index` on (`department_id`)
- **INDEX**: `employees_employee_id_index` on (`employee_id`)
- **UNIQUE INDEX**: `employees_employee_id_unique` on (`employee_id`)
- **INDEX**: `employees_employment_status_index` on (`employment_status`)
- **INDEX**: `employees_hire_date_index` on (`hire_date`)
- **INDEX**: `employees_manager_id_index` on (`manager_id`)
- **PRIMARY KEY**: `employees_pkey` on (`id`)
- **INDEX**: `employees_position_id_index` on (`position_id`)
- **INDEX**: `employees_user_id_index` on (`user_id`)

**Foreign Keys**:

- `department_id` → `departments(id)`
  - ON DELETE: RESTRICT
- `manager_id` → `employees(id)`
  - ON DELETE: SET NULL
- `position_id` → `job_positions(id)`
  - ON DELETE: RESTRICT
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481485_1_not_null`: id IS NOT NULL
- `2200_481485_2_not_null`: user_id IS NOT NULL
- `2200_481485_3_not_null`: employee_id IS NOT NULL
- `2200_481485_4_not_null`: department_id IS NOT NULL
- `2200_481485_5_not_null`: position_id IS NOT NULL
- `2200_481485_7_not_null`: hire_date IS NOT NULL
- `2200_481485_16_not_null`: created_at IS NOT NULL
- `2200_481485_17_not_null`: updated_at IS NOT NULL

---

#### `training_records`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `employees` (via `employee_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `employee_id` | `uuid` | No | - | FK → `employees(id)` |
| `training_name` | `varchar(200)` | No | - | - |
| `training_type` | `varchar(50)` | Yes | - | - |
| `provider` | `varchar(100)` | Yes | - | - |
| `completion_date` | `date` | Yes | - | - |
| `expiration_date` | `date` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'in_progress'::character varying` | - |
| `cost` | `numeric(10,2)` | Yes | - | - |
| `hours_completed` | `integer` | Yes | - | - |
| `certificate_number` | `varchar(100)` | Yes | - | - |
| `certificate_url` | `text` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `training_records_completion_date_index` on (`completion_date`)
- **INDEX**: `training_records_employee_id_index` on (`employee_id`)
- **INDEX**: `training_records_expiration_date_index` on (`expiration_date`)
- **PRIMARY KEY**: `training_records_pkey` on (`id`)
- **INDEX**: `training_records_status_index` on (`status`)
- **INDEX**: `training_records_training_type_index` on (`training_type`)

**Foreign Keys**:

- `employee_id` → `employees(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_481553_1_not_null`: id IS NOT NULL
- `2200_481553_2_not_null`: employee_id IS NOT NULL
- `2200_481553_3_not_null`: training_name IS NOT NULL
- `2200_481553_14_not_null`: created_at IS NOT NULL
- `2200_481553_15_not_null`: updated_at IS NOT NULL

---

### Referees & Officials

**Tables**: 3

#### `incidents`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `employees` (via `assigned_investigator`)
  - `locations` (via `location_id`)
  - `employees` (via `reported_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `incident_number` | `varchar(50)` | No | - | UNIQUE |
| `incident_type` | `varchar(50)` | Yes | - | - |
| `severity` | `varchar(20)` | Yes | - | - |
| `incident_date` | `timestamptz` | No | - | - |
| `location_id` | `uuid` | Yes | - | FK → `locations(id)` |
| `reported_by` | `uuid` | No | - | FK → `employees(id)` |
| `assigned_investigator` | `uuid` | Yes | - | FK → `employees(id)` |
| `description` | `text` | No | - | - |
| `immediate_actions_taken` | `text` | Yes | - | - |
| `people_involved` | `json` | Yes | - | - |
| `witnesses` | `json` | Yes | - | - |
| `assets_involved` | `json` | Yes | - | - |
| `root_cause_analysis` | `text` | Yes | - | - |
| `corrective_actions` | `text` | Yes | - | - |
| `preventive_actions` | `text` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'reported'::character varying` | - |
| `target_resolution_date` | `date` | Yes | - | - |
| `actual_resolution_date` | `date` | Yes | - | - |
| `attachments` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `incidents_incident_date_index` on (`incident_date`)
- **INDEX**: `incidents_incident_number_index` on (`incident_number`)
- **UNIQUE INDEX**: `incidents_incident_number_unique` on (`incident_number`)
- **INDEX**: `incidents_incident_type_index` on (`incident_type`)
- **PRIMARY KEY**: `incidents_pkey` on (`id`)
- **INDEX**: `incidents_reported_by_index` on (`reported_by`)
- **INDEX**: `incidents_severity_index` on (`severity`)
- **INDEX**: `incidents_status_index` on (`status`)

**Foreign Keys**:

- `assigned_investigator` → `employees(id)`
  - ON DELETE: SET NULL
- `location_id` → `locations(id)`
  - ON DELETE: SET NULL
- `reported_by` → `employees(id)`
  - ON DELETE: RESTRICT

**Check Constraints**:

- `2200_481794_1_not_null`: id IS NOT NULL
- `2200_481794_2_not_null`: incident_number IS NOT NULL
- `2200_481794_5_not_null`: incident_date IS NOT NULL
- `2200_481794_7_not_null`: reported_by IS NOT NULL
- `2200_481794_9_not_null`: description IS NOT NULL
- `2200_481794_21_not_null`: created_at IS NOT NULL
- `2200_481794_22_not_null`: updated_at IS NOT NULL

---

#### `referee_levels`

**Purpose**: Data storage and management

**Records**: 3 rows

**Relationships**:
- **Has many**:
  - `users` (via `referee_level_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | UNIQUE |
| `wage_amount` | `numeric(8,2)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `allowed_divisions` | `json` | Yes | - | - |
| `experience_requirements` | `json` | Yes | - | - |
| `capability_requirements` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **UNIQUE INDEX**: `referee_levels_name_unique` on (`name`)
- **PRIMARY KEY**: `referee_levels_pkey` on (`id`)

**Check Constraints**:

- `2200_480165_1_not_null`: id IS NOT NULL
- `2200_480165_2_not_null`: name IS NOT NULL
- `2200_480165_3_not_null`: wage_amount IS NOT NULL
- `2200_480165_8_not_null`: created_at IS NOT NULL
- `2200_480165_9_not_null`: updated_at IS NOT NULL

---

#### `referee_profiles`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `wage_amount` | `numeric(8,2)` | No | - | - |
| `wage_currency` | `varchar(3)` | Yes | `'CAD'::character varying` | - |
| `payment_method` | `varchar(20)` | Yes | `'direct_deposit'::character varying` | - |
| `years_experience` | `integer` | No | `0` | - |
| `evaluation_score` | `numeric(5,2)` | Yes | - | - |
| `certification_number` | `varchar(50)` | Yes | - | - |
| `certification_date` | `date` | Yes | - | - |
| `certification_expiry` | `date` | Yes | - | - |
| `certification_level` | `varchar(50)` | Yes | - | - |
| `is_white_whistle` | `boolean` | Yes | `false` | - |
| `max_weekly_games` | `integer` | Yes | `10` | - |
| `preferred_positions` | `jsonb` | Yes | - | - |
| `availability_pattern` | `jsonb` | Yes | - | - |
| `emergency_contact` | `jsonb` | Yes | - | - |
| `special_qualifications` | `jsonb` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `referee_profiles_is_active_index` on (`is_active`)
- **PRIMARY KEY**: `referee_profiles_pkey` on (`id`)
- **INDEX**: `referee_profiles_user_id_index` on (`user_id`)
- **UNIQUE INDEX**: `referee_profiles_user_id_unique` on (`user_id`)
- **INDEX**: `referee_profiles_wage_amount_index` on (`wage_amount`)
- **INDEX**: `referee_profiles_years_experience_index` on (`years_experience`)

**Foreign Keys**:

- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `referee_profiles_evaluation_score_check`: ((evaluation_score >= (0)::numeric) AND (evaluation_score <= (100)::numeric))
- `referee_profiles_max_weekly_games_check`: (max_weekly_games > 0)
- `referee_profiles_wage_amount_check`: (wage_amount > (0)::numeric)
- `referee_profiles_years_experience_check`: (years_experience >= 0)
- `2200_483259_1_not_null`: id IS NOT NULL
- `2200_483259_2_not_null`: user_id IS NOT NULL
- `2200_483259_3_not_null`: wage_amount IS NOT NULL
- `2200_483259_6_not_null`: years_experience IS NOT NULL
- `2200_483259_20_not_null`: created_at IS NOT NULL
- `2200_483259_21_not_null`: updated_at IS NOT NULL

---

### Mentorship

**Tables**: 3

#### `mentorship_documents`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `mentorships` (via `mentorship_id`)
  - `users` (via `uploaded_by`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `mentorship_id` | `uuid` | No | - | FK → `mentorships(id)` |
| `document_name` | `varchar(255)` | No | - | - |
| `document_path` | `varchar(500)` | No | - | - |
| `document_type` | `varchar(100)` | No | - | - |
| `file_size` | `bigint` | No | - | - |
| `uploaded_by` | `uuid` | No | - | FK → `users(id)` |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `idx_mentorship_documents_created` on (`created_at`)
- **INDEX**: `idx_mentorship_documents_mentorship` on (`mentorship_id`)
- **INDEX**: `idx_mentorship_documents_size` on (`file_size`)
- **INDEX**: `idx_mentorship_documents_type` on (`document_type`)
- **INDEX**: `idx_mentorship_documents_uploader` on (`uploaded_by`)
- **PRIMARY KEY**: `mentorship_documents_pkey` on (`id`)

**Foreign Keys**:

- `mentorship_id` → `mentorships(id)`
  - ON DELETE: CASCADE
- `uploaded_by` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_483028_1_not_null`: id IS NOT NULL
- `2200_483028_2_not_null`: mentorship_id IS NOT NULL
- `2200_483028_3_not_null`: document_name IS NOT NULL
- `2200_483028_4_not_null`: document_path IS NOT NULL
- `2200_483028_5_not_null`: document_type IS NOT NULL
- `2200_483028_6_not_null`: file_size IS NOT NULL
- `2200_483028_7_not_null`: uploaded_by IS NOT NULL
- `2200_483028_8_not_null`: created_at IS NOT NULL

---

#### `mentorship_notes`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `author_id`)
  - `mentorships` (via `mentorship_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `mentorship_id` | `uuid` | No | - | FK → `mentorships(id)` |
| `author_id` | `uuid` | No | - | FK → `users(id)` |
| `title` | `varchar(255)` | No | - | - |
| `content` | `text` | No | - | - |
| `note_type` | `text` | No | `'general'::text` | - |
| `is_private` | `boolean` | No | `false` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `idx_mentorship_notes_author` on (`author_id`)
- **INDEX**: `idx_mentorship_notes_created` on (`created_at`)
- **INDEX**: `idx_mentorship_notes_mentorship` on (`mentorship_id`)
- **INDEX**: `idx_mentorship_notes_privacy` on (`is_private`)
- **INDEX**: `idx_mentorship_notes_type` on (`note_type`)
- **PRIMARY KEY**: `mentorship_notes_pkey` on (`id`)

**Foreign Keys**:

- `author_id` → `users(id)`
  - ON DELETE: CASCADE
- `mentorship_id` → `mentorships(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `mentorship_notes_note_type_check`: (note_type = ANY (ARRAY['progress'::text, 'concern'::text, 'achievement'::text, 'general'::text]))
- `2200_483000_1_not_null`: id IS NOT NULL
- `2200_483000_2_not_null`: mentorship_id IS NOT NULL
- `2200_483000_3_not_null`: author_id IS NOT NULL
- `2200_483000_4_not_null`: title IS NOT NULL
- `2200_483000_5_not_null`: content IS NOT NULL
- `2200_483000_6_not_null`: note_type IS NOT NULL
- `2200_483000_7_not_null`: is_private IS NOT NULL
- `2200_483000_8_not_null`: created_at IS NOT NULL
- `2200_483000_9_not_null`: updated_at IS NOT NULL

---

#### `mentorships`

**Purpose**: Mentorship program tracking

**Relationships**:
- **Belongs to**:
  - `users` (via `mentee_id`)
  - `users` (via `mentor_id`)
- **Has many**:
  - `mentorship_documents` (via `mentorship_id`)
  - `mentorship_notes` (via `mentorship_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `mentor_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `mentee_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `start_date` | `date` | No | - | - |
| `end_date` | `date` | Yes | - | - |
| `status` | `text` | No | `'active'::text` | - |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `idx_mentorships_end_date` on (`end_date`)
- **INDEX**: `idx_mentorships_mentee` on (`mentee_id`)
- **INDEX**: `idx_mentorships_mentor` on (`mentor_id`)
- **INDEX**: `idx_mentorships_start_date` on (`start_date`)
- **INDEX**: `idx_mentorships_status` on (`status`)
- **PRIMARY KEY**: `mentorships_pkey` on (`id`)
- **UNIQUE INDEX**: `unique_mentor_mentee_pair` on (`mentor_id, mentee_id`)

**Foreign Keys**:

- `mentee_id` → `users(id)`
  - ON DELETE: CASCADE
- `mentor_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `mentor_mentee_different`: (mentor_id <> mentee_id)
- `mentorships_status_check`: (status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'terminated'::text]))
- `2200_482970_1_not_null`: id IS NOT NULL
- `2200_482970_2_not_null`: mentor_id IS NOT NULL
- `2200_482970_3_not_null`: mentee_id IS NOT NULL
- `2200_482970_4_not_null`: start_date IS NOT NULL
- `2200_482970_6_not_null`: status IS NOT NULL
- `2200_482970_8_not_null`: created_at IS NOT NULL
- `2200_482970_9_not_null`: updated_at IS NOT NULL

---

### AI & Machine Learning

**Tables**: 2

#### `ai_processing_logs`

**Purpose**: Logging and audit trail

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `expense_receipts` (via `receipt_id`)
  - `users` (via `user_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `receipt_id` | `uuid` | No | - | FK → `expense_receipts(id)` |
| `user_id` | `uuid` | No | - | FK → `users(id)` |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `service_type` | `varchar(255)` | No | - | - |
| `service_provider` | `varchar(255)` | No | - | - |
| `model_version` | `varchar(255)` | Yes | - | - |
| `api_version` | `varchar(255)` | Yes | - | - |
| `status` | `text` | No | - | - |
| `input_data` | `text` | Yes | - | - |
| `output_data` | `json` | Yes | - | - |
| `error_message` | `text` | Yes | - | - |
| `processing_time_ms` | `integer` | Yes | - | - |
| `tokens_used` | `numeric(12)` | Yes | - | - |
| `cost_usd` | `numeric(8,4)` | Yes | - | - |
| `usage_metadata` | `json` | Yes | - | - |
| `confidence_score` | `numeric(3,2)` | Yes | - | - |
| `quality_metrics` | `json` | Yes | - | - |
| `requires_retry` | `boolean` | Yes | `false` | - |
| `retry_count` | `integer` | Yes | `0` | - |
| `started_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `completed_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `ai_processing_logs_organization_id_started_at_index` on (`organization_id, started_at`)
- **PRIMARY KEY**: `ai_processing_logs_pkey` on (`id`)
- **INDEX**: `ai_processing_logs_receipt_id_service_type_index` on (`receipt_id, service_type`)
- **INDEX**: `ai_processing_logs_requires_retry_index` on (`requires_retry`)
- **INDEX**: `ai_processing_logs_service_type_status_index` on (`service_type, status`)
- **INDEX**: `ai_processing_logs_started_at_index` on (`started_at`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `receipt_id` → `expense_receipts(id)`
  - ON DELETE: CASCADE
- `user_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `ai_processing_logs_status_check`: (status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text, 'timeout'::text, 'rate_limited'::text]))
- `2200_480741_1_not_null`: id IS NOT NULL
- `2200_480741_2_not_null`: receipt_id IS NOT NULL
- `2200_480741_3_not_null`: user_id IS NOT NULL
- `2200_480741_4_not_null`: organization_id IS NOT NULL
- `2200_480741_5_not_null`: service_type IS NOT NULL
- `2200_480741_6_not_null`: service_provider IS NOT NULL
- `2200_480741_9_not_null`: status IS NOT NULL

---

#### `ai_suggestions`

**Purpose**: AI/ML feature support

**Relationships**:
- **Belongs to**:
  - `users` (via `created_by`)
  - `games` (via `game_id`)
  - `users` (via `processed_by`)
  - `users` (via `referee_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `game_id` | `uuid` | No | - | FK → `games(id)`, UNIQUE |
| `referee_id` | `uuid` | No | - | FK → `users(id)`, UNIQUE |
| `confidence_score` | `numeric(3,2)` | No | - | - |
| `reasoning` | `text` | Yes | - | - |
| `proximity_score` | `numeric(3,2)` | Yes | - | - |
| `availability_score` | `numeric(3,2)` | Yes | - | - |
| `experience_score` | `numeric(3,2)` | Yes | - | - |
| `performance_score` | `numeric(3,2)` | Yes | - | - |
| `status` | `text` | Yes | `'pending'::text` | UNIQUE |
| `rejection_reason` | `text` | Yes | - | - |
| `created_by` | `uuid` | Yes | - | FK → `users(id)` |
| `processed_by` | `uuid` | Yes | - | FK → `users(id)` |
| `processed_at` | `timestamptz` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `ai_suggestions_confidence_score_index` on (`confidence_score`)
- **INDEX**: `ai_suggestions_created_at_index` on (`created_at`)
- **INDEX**: `ai_suggestions_game_id_index` on (`game_id`)
- **PRIMARY KEY**: `ai_suggestions_pkey` on (`id`)
- **INDEX**: `ai_suggestions_referee_id_index` on (`referee_id`)
- **INDEX**: `ai_suggestions_status_index` on (`status`)
- **UNIQUE INDEX**: `unique_active_suggestion` on (`game_id, referee_id, status`)

**Foreign Keys**:

- `created_by` → `users(id)`
- `game_id` → `games(id)`
  - ON DELETE: CASCADE
- `processed_by` → `users(id)`
- `referee_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `ai_suggestions_availability_score_check`: ((availability_score >= (0)::numeric) AND (availability_score <= (1)::numeric))
- `ai_suggestions_confidence_score_check`: ((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))
- `ai_suggestions_experience_score_check`: ((experience_score >= (0)::numeric) AND (experience_score <= (1)::numeric))
- `ai_suggestions_performance_score_check`: ((performance_score >= (0)::numeric) AND (performance_score <= (1)::numeric))
- `ai_suggestions_proximity_score_check`: ((proximity_score >= (0)::numeric) AND (proximity_score <= (1)::numeric))
- `ai_suggestions_status_check`: (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]))
- `2200_480370_1_not_null`: id IS NOT NULL
- `2200_480370_2_not_null`: game_id IS NOT NULL
- `2200_480370_3_not_null`: referee_id IS NOT NULL
- `2200_480370_4_not_null`: confidence_score IS NOT NULL
- `2200_480370_15_not_null`: created_at IS NOT NULL
- `2200_480370_16_not_null`: updated_at IS NOT NULL

---

### Approval Workflows

**Tables**: 2

#### `approval_requests`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
  - `users` (via `requested_by`)
  - `approval_workflows` (via `workflow_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `workflow_id` | `uuid` | No | - | FK → `approval_workflows(id)` |
| `requested_by` | `uuid` | No | - | FK → `users(id)` |
| `request_type` | `text` | No | - | - |
| `reference_id` | `uuid` | No | - | - |
| `reference_table` | `varchar(255)` | No | - | - |
| `amount` | `numeric(12,2)` | Yes | - | - |
| `request_reason` | `text` | Yes | - | - |
| `status` | `text` | Yes | `'pending'::text` | - |
| `current_step` | `integer` | Yes | `1` | - |
| `approval_history` | `json` | Yes | - | - |
| `requested_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `completed_at` | `timestamptz` | Yes | - | - |
| `expires_at` | `date` | Yes | - | - |

**Indexes**:

- **INDEX**: `approval_requests_organization_id_status_index` on (`organization_id, status`)
- **PRIMARY KEY**: `approval_requests_pkey` on (`id`)
- **INDEX**: `approval_requests_reference_id_reference_table_index` on (`reference_id, reference_table`)
- **INDEX**: `approval_requests_requested_by_index` on (`requested_by`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE
- `requested_by` → `users(id)`
  - ON DELETE: CASCADE
- `workflow_id` → `approval_workflows(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `approval_requests_request_type_check`: (request_type = ANY (ARRAY['expense'::text, 'budget_change'::text, 'payroll'::text, 'vendor'::text, 'journal_entry'::text, 'limit_override'::text]))
- `approval_requests_status_check`: (status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'withdrawn'::text, 'expired'::text]))
- `2200_481290_1_not_null`: id IS NOT NULL
- `2200_481290_2_not_null`: organization_id IS NOT NULL
- `2200_481290_3_not_null`: workflow_id IS NOT NULL
- `2200_481290_4_not_null`: requested_by IS NOT NULL
- `2200_481290_5_not_null`: request_type IS NOT NULL
- `2200_481290_6_not_null`: reference_id IS NOT NULL
- `2200_481290_7_not_null`: reference_table IS NOT NULL

---

#### `approval_workflows`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `users` (via `organization_id`)
- **Has many**:
  - `approval_requests` (via `workflow_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `organization_id` | `uuid` | No | - | FK → `users(id)` |
| `workflow_name` | `varchar(255)` | No | - | - |
| `workflow_type` | `text` | No | - | - |
| `conditions` | `json` | Yes | - | - |
| `approval_steps` | `json` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `priority` | `integer` | Yes | `0` | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `approval_workflows_organization_id_workflow_type_is_active_inde` on (`organization_id, workflow_type, is_active`)
- **PRIMARY KEY**: `approval_workflows_pkey` on (`id`)

**Foreign Keys**:

- `organization_id` → `users(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `approval_workflows_workflow_type_check`: (workflow_type = ANY (ARRAY['expense_approval'::text, 'budget_approval'::text, 'payroll_approval'::text, 'vendor_approval'::text, 'journal_entry_approval'::text]))
- `2200_481271_1_not_null`: id IS NOT NULL
- `2200_481271_2_not_null`: organization_id IS NOT NULL
- `2200_481271_3_not_null`: workflow_name IS NOT NULL
- `2200_481271_4_not_null`: workflow_type IS NOT NULL

---

### Locations & Facilities

**Tables**: 2

#### `budget_allocations`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `budgets` (via `budget_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `budget_id` | `uuid` | No | - | FK → `budgets(id)`, UNIQUE |
| `allocation_year` | `integer` | No | - | UNIQUE |
| `allocation_month` | `integer` | No | - | UNIQUE |
| `allocated_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `actual_amount` | `numeric(12,2)` | Yes | `'0'::numeric` | - |
| `notes` | `text` | Yes | - | - |
| `created_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | Yes | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `budget_allocations_budget_id_allocation_year_allocation_month_i` on (`budget_id, allocation_year, allocation_month`)
- **UNIQUE INDEX**: `budget_allocations_budget_id_allocation_year_allocation_month_u` on (`budget_id, allocation_year, allocation_month`)
- **PRIMARY KEY**: `budget_allocations_pkey` on (`id`)

**Foreign Keys**:

- `budget_id` → `budgets(id)`
  - ON DELETE: CASCADE

**Check Constraints**:

- `2200_480866_1_not_null`: id IS NOT NULL
- `2200_480866_2_not_null`: budget_id IS NOT NULL
- `2200_480866_3_not_null`: allocation_year IS NOT NULL
- `2200_480866_4_not_null`: allocation_month IS NOT NULL

---

#### `locations`

**Purpose**: Venues and facilities where games are held

**Records**: 10 rows

**Relationships**:
- **Has many**:
  - `assets` (via `location_id`)
  - `games` (via `location_id`)
  - `incidents` (via `location_id`)
  - `user_location_distances` (via `location_id`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `name` | `varchar(255)` | No | - | - |
| `address` | `varchar(500)` | No | - | - |
| `city` | `varchar(100)` | No | - | - |
| `province` | `varchar(50)` | No | `'AB'::character varying` | - |
| `postal_code` | `varchar(10)` | No | - | - |
| `country` | `varchar(50)` | No | `'Canada'::character varying` | - |
| `latitude` | `numeric(10,8)` | Yes | - | - |
| `longitude` | `numeric(11,8)` | Yes | - | - |
| `capacity` | `integer` | Yes | `0` | - |
| `contact_name` | `varchar(255)` | Yes | - | - |
| `contact_phone` | `varchar(20)` | Yes | - | - |
| `contact_email` | `varchar(255)` | Yes | - | - |
| `rental_rate` | `numeric(8,2)` | Yes | - | - |
| `parking_spaces` | `integer` | Yes | - | - |
| `facilities` | `json` | Yes | - | - |
| `accessibility_features` | `json` | Yes | - | - |
| `notes` | `text` | Yes | - | - |
| `is_active` | `boolean` | Yes | `true` | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `hourly_rate` | `numeric(8,2)` | Yes | - | - |
| `game_rate` | `numeric(8,2)` | Yes | - | - |
| `cost_notes` | `text` | Yes | - | - |

**Indexes**:

- **INDEX**: `locations_city_index` on (`city`)
- **INDEX**: `locations_is_active_index` on (`is_active`)
- **INDEX**: `locations_latitude_longitude_index` on (`latitude, longitude`)
- **INDEX**: `locations_name_index` on (`name`)
- **PRIMARY KEY**: `locations_pkey` on (`id`)
- **INDEX**: `locations_postal_code_index` on (`postal_code`)

**Check Constraints**:

- `check_positive_capacity`: (capacity >= 0)
- `2200_480502_1_not_null`: id IS NOT NULL
- `2200_480502_2_not_null`: name IS NOT NULL
- `2200_480502_3_not_null`: address IS NOT NULL
- `2200_480502_4_not_null`: city IS NOT NULL
- `2200_480502_5_not_null`: province IS NOT NULL
- `2200_480502_6_not_null`: postal_code IS NOT NULL
- `2200_480502_7_not_null`: country IS NOT NULL
- `2200_480502_20_not_null`: created_at IS NOT NULL
- `2200_480502_21_not_null`: updated_at IS NOT NULL

---

### Compliance & Tracking

**Tables**: 2

#### `compliance_tracking`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `departments` (via `responsible_department`)
  - `employees` (via `responsible_employee`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `compliance_type` | `varchar(100)` | No | - | - |
| `regulation_name` | `varchar(200)` | No | - | - |
| `description` | `text` | Yes | - | - |
| `responsible_employee` | `uuid` | Yes | - | FK → `employees(id)` |
| `responsible_department` | `uuid` | Yes | - | FK → `departments(id)` |
| `frequency` | `varchar(30)` | Yes | - | - |
| `last_audit_date` | `date` | Yes | - | - |
| `next_audit_date` | `date` | No | - | - |
| `status` | `varchar(30)` | Yes | `'compliant'::character varying` | - |
| `current_findings` | `text` | Yes | - | - |
| `action_items` | `text` | Yes | - | - |
| `required_documents` | `json` | Yes | - | - |
| `evidence_files` | `json` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `compliance_tracking_compliance_type_index` on (`compliance_type`)
- **INDEX**: `compliance_tracking_next_audit_date_index` on (`next_audit_date`)
- **PRIMARY KEY**: `compliance_tracking_pkey` on (`id`)
- **INDEX**: `compliance_tracking_responsible_department_index` on (`responsible_department`)
- **INDEX**: `compliance_tracking_responsible_employee_index` on (`responsible_employee`)
- **INDEX**: `compliance_tracking_status_index` on (`status`)

**Foreign Keys**:

- `responsible_department` → `departments(id)`
  - ON DELETE: SET NULL
- `responsible_employee` → `employees(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `2200_481768_1_not_null`: id IS NOT NULL
- `2200_481768_2_not_null`: compliance_type IS NOT NULL
- `2200_481768_3_not_null`: regulation_name IS NOT NULL
- `2200_481768_9_not_null`: next_audit_date IS NOT NULL
- `2200_481768_15_not_null`: created_at IS NOT NULL
- `2200_481768_16_not_null`: updated_at IS NOT NULL

---

#### `risk_assessments`

**Purpose**: Data storage and management

**Relationships**:
- **Belongs to**:
  - `departments` (via `owner_department`)
  - `employees` (via `owner_employee`)

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PRIMARY KEY |
| `risk_title` | `varchar(200)` | No | - | - |
| `risk_description` | `text` | Yes | - | - |
| `risk_category` | `varchar(50)` | Yes | - | - |
| `owner_employee` | `uuid` | Yes | - | FK → `employees(id)` |
| `owner_department` | `uuid` | Yes | - | FK → `departments(id)` |
| `probability_score` | `integer` | Yes | - | - |
| `impact_score` | `integer` | Yes | - | - |
| `risk_score` | `integer` | No | - | - |
| `risk_level` | `varchar(20)` | Yes | - | - |
| `current_controls` | `text` | Yes | - | - |
| `mitigation_actions` | `text` | Yes | - | - |
| `status` | `varchar(30)` | Yes | `'identified'::character varying` | - |
| `review_date` | `date` | Yes | - | - |
| `next_review_date` | `date` | Yes | - | - |
| `created_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `timestamptz` | No | `CURRENT_TIMESTAMP` | - |

**Indexes**:

- **INDEX**: `risk_assessments_next_review_date_index` on (`next_review_date`)
- **INDEX**: `risk_assessments_owner_department_index` on (`owner_department`)
- **INDEX**: `risk_assessments_owner_employee_index` on (`owner_employee`)
- **PRIMARY KEY**: `risk_assessments_pkey` on (`id`)
- **INDEX**: `risk_assessments_risk_category_index` on (`risk_category`)
- **INDEX**: `risk_assessments_risk_level_index` on (`risk_level`)
- **INDEX**: `risk_assessments_status_index` on (`status`)

**Foreign Keys**:

- `owner_department` → `departments(id)`
  - ON DELETE: SET NULL
- `owner_employee` → `employees(id)`
  - ON DELETE: SET NULL

**Check Constraints**:

- `risk_assessments_impact_score_check`: (impact_score = ANY (ARRAY[1, 2, 3, 4, 5]))
- `risk_assessments_probability_score_check`: (probability_score = ANY (ARRAY[1, 2, 3, 4, 5]))
- `2200_481828_1_not_null`: id IS NOT NULL
- `2200_481828_2_not_null`: risk_title IS NOT NULL
- `2200_481828_9_not_null`: risk_score IS NOT NULL
- `2200_481828_16_not_null`: created_at IS NOT NULL
- `2200_481828_17_not_null`: updated_at IS NOT NULL

---

### System & Configuration

**Tables**: 2

#### `knex_migrations`

**Purpose**: Data storage and management

**Records**: 110 rows

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `integer` | No | `nextval('knex_migrations_id_seq'::regclass)` | PRIMARY KEY |
| `name` | `varchar(255)` | Yes | - | - |
| `batch` | `integer` | Yes | - | - |
| `migration_time` | `timestamptz` | Yes | - | - |

**Indexes**:

- **PRIMARY KEY**: `knex_migrations_pkey` on (`id`)

**Check Constraints**:

- `2200_479985_1_not_null`: id IS NOT NULL

---

#### `knex_migrations_lock`

**Purpose**: Data storage and management

**Records**: 1 rows

**Columns**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `index` | `integer` | No | `nextval('knex_migrations_lock_index_seq'::regclass)` | PRIMARY KEY |
| `is_locked` | `integer` | Yes | - | - |

**Indexes**:

- **PRIMARY KEY**: `knex_migrations_lock_pkey` on (`index`)

**Check Constraints**:

- `2200_479992_1_not_null`: index IS NOT NULL

---

## Relationship Diagram Overview

### Key Relationships

#### Core Entity Relationships

- **users** → **organizations** - Users belong to organizations
- **users** ↔ **roles** (via `user_roles`) - Users have many roles (RBAC)
- **game_assignments** → **games** - Officials assigned to games
- **game_assignments** → **users** - Users assigned as officials
- **games** → **teams** - Games involve teams
- **games** → **leagues** - Games belong to leagues
- **games** → **locations** - Games held at locations
- **mentorships** → **users** - Mentor-mentee relationships
- **expenses** → **users** - User expense tracking
- **budgets** → **organizations** - Organization budget management

---

## Data Statistics

### Tables with Data

| Table | Category | Rows | Avg Row Size |
|-------|----------|------|--------------|
| `games` | Games & Assignments | 180 | - |
| `knex_migrations` | System & Configuration | 110 | - |
| `audit_logs` | Authentication & Security | 60 | - |
| `teams` | Teams & Leagues | 36 | - |
| `rbac_scan_history` | RBAC & Permissions | 18 | - |
| `locations` | Locations & Facilities | 10 | - |
| `leagues` | Teams & Leagues | 6 | - |
| `referee_roles` | RBAC & Permissions | 6 | - |
| `referee_levels` | Referees & Officials | 3 | - |
| `knex_migrations_lock` | System & Configuration | 1 | - |
| `organization_settings` | Organizations | 1 | - |
| `organizations` | Organizations | 1 | - |
| `roles` | RBAC & Permissions | 1 | - |
| `user_roles` | User Management | 1 | - |
| `users` | User Management | 1 | - |

---

## Technical Notes

### Primary Key Strategy
- **Type**: UUID (v4)
- **Generator**: `gen_random_uuid()` or `uuid_generate_v4()`
- **Benefits**: Distributed system support, no ID collision, harder to enumerate

### Timestamp Strategy
- **Creation**: `created_at` (timestamptz, default CURRENT_TIMESTAMP)
- **Updates**: `updated_at` (timestamptz, updated via triggers or application)
- **Timezone**: All timestamps stored with timezone (timestamptz)

### Foreign Key Actions
- **Default**: NO ACTION (database enforces referential integrity)
- **CASCADE**: Used selectively for dependent data cleanup
- **SET NULL**: Used where relationship is optional

### Indexing Strategy
- **Primary Keys**: Automatically indexed
- **Foreign Keys**: Indexed for join performance
- **Lookup Fields**: Email, phone, username, code fields indexed
- **Composite Indexes**: Used for common query patterns

---

## Maintenance Notes

### Schema Updates
- Managed via Knex.js migrations
- Migration files located in `backend/migrations/`
- Run migrations: `npm run migrate:latest`
- Rollback: `npm run migrate:rollback`

### Regenerating This Documentation
```bash
# Extract schema from database
node extract-database-schema.js

# Generate markdown documentation
node generate-schema-documentation.js
```

---

*Generated automatically from PostgreSQL database on 2025-10-18, 3:35:32 p.m.*