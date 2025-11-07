# Database Audit Report

**Date:** 2025-09-30T06:45:28.645Z
**Database:** sports_management

## Overall Score: 88/100

🟡 **Health Status:** Good

### Summary

- 🔴 **Critical Issues:** 0
- 🟡 **Warnings:** 4
- ✅ **Passed Checks:** 4

### 🟡 Warnings

1. 14 foreign keys without indexes
2. 14 tables without audit timestamps
3. 22 JSONB columns without GIN indexes
4. 17 timestamp columns without timezone

## schema Structure

### 1. 14 foreign keys without indexes

**Severity:** warning

**Recommendation:** Add indexes on foreign key columns for better join performance

**Details:** 14 items found (see JSON report)

## data Integrity

### 1. 45 nullable foreign keys (may be intentional)

**Severity:** info

**Recommendation:** Review if these foreign keys should be required (NOT NULL)

## largest Tables

### 1. undefined

**Severity:** undefined

### 2. undefined

**Severity:** undefined

### 3. undefined

**Severity:** undefined

### 4. undefined

**Severity:** undefined

### 5. undefined

**Severity:** undefined

### 6. undefined

**Severity:** undefined

### 7. undefined

**Severity:** undefined

### 8. undefined

**Severity:** undefined

### 9. undefined

**Severity:** undefined

### 10. undefined

**Severity:** undefined

## performance

### 1. Performance audit partially completed

**Severity:** info

**Recommendation:** Some performance checks were skipped due to database version or permissions

## security

### 1. 14 tables without audit timestamps

**Severity:** warning

**Recommendation:** Add created_at and updated_at columns for audit trail

**Affected Tables:** access_control_audit, audit_logs, communication_recipients, content_analytics, content_analytics_monthly, content_permissions, content_search_index, content_versions, mentorship_documents, post_reads, resource_access_logs, user_region_assignments, user_roles, workflow_approvals

## maintenance

### 1. 1 tables not vacuumed recently

**Severity:** info

**Recommendation:** Ensure autovacuum is running or schedule manual VACUUM

## scalability

### 1. 22 JSONB columns without GIN indexes

**Severity:** warning

**Recommendation:** Add GIN indexes on JSONB columns for better query performance

**Details:** 22 items found (see JSON report)

## best Practices

### 1. 17 timestamp columns without timezone

**Severity:** warning

**Recommendation:** Use TIMESTAMP WITH TIME ZONE for proper timezone handling

**Details:** 17 items found (see JSON report)

## Largest Tables

| Table | Size | Rows |
|-------|------|------|
| audit_logs | 1680 kB | 2659 |
| rbac_scan_history | 1000 kB | 396 |
| games | 416 kB | 239 |
| rbac_endpoints | 184 kB | 0 |
| access_control_audit | 184 kB | 1 |
| roles | 184 kB | 18 |
| content_items | 176 kB | 0 |
| rbac_functions | 168 kB | 0 |
| teams | 160 kB | 72 |
| role_page_access | 160 kB | 60 |

