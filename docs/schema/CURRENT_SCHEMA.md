# Database Schema Documentation

**Generated:** 2025-09-30T06:12:40.236Z

**Database:** sports_management

**Total Tables:** 51

## Table of Contents

- [access_control_audit](#access-control-audit)
- [audit_logs](#audit-logs)
- [communication_recipients](#communication-recipients)
- [content_analytics](#content-analytics)
- [content_analytics_monthly](#content-analytics-monthly)
- [content_attachments](#content-attachments)
- [content_categories](#content-categories)
- [content_item_tags](#content-item-tags)
- [content_items](#content-items)
- [content_permissions](#content-permissions)
- [content_search_index](#content-search-index)
- [content_tags](#content-tags)
- [content_versions](#content-versions)
- [game_assignments](#game-assignments)
- [games](#games)
- [internal_communications](#internal-communications)
- [knex_migrations](#knex-migrations)
- [knex_migrations_lock](#knex-migrations-lock)
- [leagues](#leagues)
- [locations](#locations)
- [mentorship_documents](#mentorship-documents)
- [mentorship_notes](#mentorship-notes)
- [mentorships](#mentorships)
- [organizations](#organizations)
- [post_categories](#post-categories)
- [post_media](#post-media)
- [post_reads](#post-reads)
- [posts](#posts)
- [rbac_configuration_templates](#rbac-configuration-templates)
- [rbac_endpoints](#rbac-endpoints)
- [rbac_functions](#rbac-functions)
- [rbac_pages](#rbac-pages)
- [rbac_scan_history](#rbac-scan-history)
- [referee_profiles](#referee-profiles)
- [regions](#regions)
- [resource_access_logs](#resource-access-logs)
- [resource_categories](#resource-categories)
- [resources](#resources)
- [role_api_access](#role-api-access)
- [role_data_scopes](#role-data-scopes)
- [role_features](#role-features)
- [role_page_access](#role-page-access)
- [roles](#roles)
- [teams](#teams)
- [user_region_assignments](#user-region-assignments)
- [user_roles](#user-roles)
- [users](#users)
- [workflow_approvals](#workflow-approvals)
- [workflow_definitions](#workflow-definitions)
- [workflow_instances](#workflow-instances)
- [workflow_step_executions](#workflow-step-executions)

---

## access_control_audit

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | NO | - | - |
| action_type | character varying(50) | NO | - | - |
| resource_type | character varying(50) | NO | - | - |
| role_id | uuid | YES | - | - |
| resource_identifier | character varying(255) | YES | - | - |
| old_value | jsonb | YES | - | - |
| new_value | jsonb | YES | - | - |
| reason | character varying(500) | YES | - | - |
| ip_address | character varying(45) | YES | - | - |
| user_agent | character varying(255) | YES | - | - |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users.id | NO ACTION | NO ACTION |
| role_id | roles.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| access_control_audit_action_type_index | action_type | INDEX |
| access_control_audit_created_at_index | created_at | INDEX |
| access_control_audit_pkey | id | PRIMARY KEY |
| access_control_audit_resource_type_index | resource_type | INDEX |
| access_control_audit_role_id_index | role_id | INDEX |
| access_control_audit_user_id_index | user_id | INDEX |

---

## audit_logs

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('audit_logs_id_seq'::r... | PK |
| user_id | uuid | YES | - | - |
| user_email | character varying(255) | YES | - | - |
| event_type | character varying(255) | NO | - | - |
| resource_type | character varying(255) | YES | - | - |
| resource_id | character varying(255) | YES | - | - |
| old_values | json | YES | - | - |
| new_values | json | YES | - | - |
| request_path | character varying(255) | YES | - | - |
| request_method | character varying(255) | YES | - | - |
| ip_address | character varying(255) | YES | - | - |
| user_agent | character varying(255) | YES | - | - |
| success | boolean | YES | true | - |
| error_message | text | YES | - | - |
| additional_data | json | YES | - | - |
| severity | character varying(255) | YES | - | - |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| audit_logs_created_at_index | created_at | INDEX |
| audit_logs_event_type_index | event_type | INDEX |
| audit_logs_pkey | id | PRIMARY KEY |
| audit_logs_resource_type_resource_id_index | resource_type, resource_id | INDEX |
| audit_logs_user_id_index | user_id | INDEX |

---

## communication_recipients

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| communication_id | uuid | NO | - | UNIQUE |
| recipient_id | uuid | NO | - | UNIQUE |
| delivery_method | text | YES | 'app'::text | - |
| delivery_status | text | YES | 'pending'::text | - |
| sent_at | timestamp with time zone | YES | - | - |
| read_at | timestamp with time zone | YES | - | - |
| acknowledged_at | timestamp with time zone | YES | - | - |
| acknowledged | boolean | YES | false | - |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| communication_id | internal_communications.id | CASCADE | NO ACTION |
| recipient_id | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| communication_recipients_acknowledged_at_index | acknowledged_at | INDEX |
| communication_recipients_communication_id_index | communication_id | INDEX |
| communication_recipients_communication_id_recipient_id_unique | communication_id, recipient_id | UNIQUE |
| communication_recipients_delivery_status_index | delivery_status | INDEX |
| communication_recipients_pkey | id | PRIMARY KEY |
| communication_recipients_read_at_index | read_at | INDEX |
| communication_recipients_recipient_id_index | recipient_id | INDEX |

### Check Constraints

- **communication_recipients_delivery_method_check**: `CHECK ((delivery_method = ANY (ARRAY['app'::text, 'email'::text, 'sms'::text])))`
- **communication_recipients_delivery_status_check**: `CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'read'::text])))`

---

## content_analytics

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_analytics_id_... | PK |
| content_item_id | integer | NO | - | - |
| user_id | uuid | YES | - | - |
| ip_address | character varying(45) | YES | - | - |
| user_agent | character varying(500) | YES | - | - |
| action | text | NO | - | - |
| time_spent | integer | YES | - | - |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |
| user_id | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_analytics_content_item_id_action_index | content_item_id, action | INDEX |
| content_analytics_created_at_index | created_at | INDEX |
| content_analytics_pkey | id | PRIMARY KEY |

### Check Constraints

- **content_analytics_action_check**: `CHECK ((action = ANY (ARRAY['view'::text, 'download'::text, 'share'::text])))`

---

## content_analytics_monthly

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_analytics_mon... | PK |
| content_item_id | integer | NO | - | UNIQUE |
| year | integer | NO | - | UNIQUE |
| month | integer | NO | - | UNIQUE |
| view_count | integer | YES | 0 | - |
| download_count | integer | YES | 0 | - |
| unique_viewers | integer | YES | 0 | - |
| total_time_spent | integer | YES | 0 | - |
| bounce_rate | numeric | YES | '0'::numeric | - |
| last_updated | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_analytics_monthly_content_item_id_year_month_unique | content_item_id, year, month | UNIQUE |
| content_analytics_monthly_pkey | id | PRIMARY KEY |
| content_analytics_monthly_year_month_index | year, month | INDEX |

---

## content_attachments

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_attachments_i... | PK |
| content_item_id | integer | YES | - | - |
| file_name | character varying(255) | NO | - | - |
| file_path | character varying(500) | NO | - | - |
| file_url | character varying(500) | NO | - | - |
| file_hash | character varying(64) | NO | - | - |
| file_size | integer | NO | - | - |
| mime_type | character varying(100) | NO | - | - |
| attachment_type | text | NO | - | - |
| is_embedded | boolean | YES | false | - |
| alt_text | character varying(500) | YES | - | - |
| uploaded_by | uuid | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |
| uploaded_by | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_attachments_attachment_type_index | attachment_type | INDEX |
| content_attachments_content_item_id_index | content_item_id | INDEX |
| content_attachments_file_hash_index | file_hash | INDEX |
| content_attachments_is_embedded_index | is_embedded | INDEX |
| content_attachments_pkey | id | PRIMARY KEY |

### Check Constraints

- **content_attachments_attachment_type_check**: `CHECK ((attachment_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'document'::text, 'archive'::text, 'other'::text])))`

---

## content_categories

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_categories_id... | PK |
| name | character varying(255) | NO | - | - |
| slug | character varying(255) | NO | - | UNIQUE |
| description | text | YES | - | - |
| color | character varying(7) | YES | - | - |
| icon | character varying(50) | YES | - | - |
| parent_id | integer | YES | - | - |
| is_active | boolean | YES | true | - |
| sort_order | integer | YES | 0 | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| parent_id | content_categories.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_categories_is_active_index | is_active | INDEX |
| content_categories_parent_id_index | parent_id | INDEX |
| content_categories_pkey | id | PRIMARY KEY |
| content_categories_slug_index | slug | INDEX |
| content_categories_slug_unique | slug | UNIQUE |

---

## content_item_tags

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_item_tags_id_... | PK |
| content_item_id | integer | NO | - | UNIQUE |
| tag_id | integer | NO | - | UNIQUE |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |
| tag_id | content_tags.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_item_tags_content_item_id_index | content_item_id | INDEX |
| content_item_tags_content_item_id_tag_id_unique | content_item_id, tag_id | UNIQUE |
| content_item_tags_pkey | id | PRIMARY KEY |
| content_item_tags_tag_id_index | tag_id | INDEX |

---

## content_items

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_items_id_seq'... | PK |
| title | character varying(500) | NO | - | - |
| slug | character varying(500) | NO | - | UNIQUE |
| description | text | YES | - | - |
| content | text | NO | - | - |
| content_plain | text | YES | - | - |
| type | text | YES | 'document'::text | - |
| status | text | YES | 'draft'::text | UNIQUE |
| visibility | text | YES | 'public'::text | - |
| category_id | integer | YES | - | - |
| author_id | uuid | YES | - | - |
| search_keywords | json | YES | - | - |
| is_featured | boolean | YES | false | - |
| published_at | timestamp with time zone | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| category_id | content_categories.id | NO ACTION | NO ACTION |
| author_id | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_items_author_id_index | author_id | INDEX |
| content_items_category_id_index | category_id | INDEX |
| content_items_pkey | id | PRIMARY KEY |
| content_items_published_at_index | published_at | INDEX |
| content_items_slug_index | slug | INDEX |
| content_items_slug_status_unique | slug, status | UNIQUE |
| content_items_status_index | status | INDEX |
| content_items_status_visibility_published_at_index | status, visibility, published_at | INDEX |
| content_items_visibility_index | visibility | INDEX |

### Check Constraints

- **content_items_type_check**: `CHECK ((type = ANY (ARRAY['document'::text, 'video'::text, 'link'::text, 'mixed'::text])))`
- **content_items_status_check**: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text])))`
- **content_items_visibility_check**: `CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text, 'restricted'::text])))`

---

## content_permissions

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_permissions_i... | PK |
| content_item_id | integer | NO | - | - |
| user_id | uuid | YES | - | - |
| role_name | character varying(50) | YES | - | - |
| permission_level | text | NO | - | - |
| granted_by | uuid | YES | - | - |
| granted_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| expires_at | timestamp with time zone | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |
| user_id | users.id | NO ACTION | NO ACTION |
| granted_by | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_permissions_content_item_id_index | content_item_id | INDEX |
| content_permissions_pkey | id | PRIMARY KEY |
| content_permissions_role_name_index | role_name | INDEX |
| content_permissions_user_id_index | user_id | INDEX |

### Check Constraints

- **content_permissions_permission_level_check**: `CHECK ((permission_level = ANY (ARRAY['read'::text, 'write'::text, 'delete'::text, 'publish'::text])))`
- **content_permissions_check**: `CHECK ((((user_id IS NOT NULL) AND (role_name IS NULL)) OR ((user_id IS NULL) AND (role_name IS NOT NULL))))`

---

## content_search_index

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| content_item_id | integer | NO | - | PK |
| search_vector | tsvector | YES | - | - |
| last_indexed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_search_index_pkey | content_item_id | PRIMARY KEY |
| content_search_index_search_vector_index | search_vector | INDEX |

---

## content_tags

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_tags_id_seq':... | PK |
| name | character varying(100) | NO | - | UNIQUE |
| slug | character varying(100) | NO | - | UNIQUE |
| color | character varying(7) | YES | - | - |
| usage_count | integer | YES | 0 | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_tags_name_unique | name | UNIQUE |
| content_tags_pkey | id | PRIMARY KEY |
| content_tags_slug_index | slug | INDEX |
| content_tags_slug_unique | slug | UNIQUE |
| content_tags_usage_count_index | usage_count | INDEX |

---

## content_versions

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('content_versions_id_s... | PK |
| content_item_id | integer | NO | - | UNIQUE |
| version_number | integer | NO | - | UNIQUE |
| title | character varying(500) | NO | - | - |
| content | text | NO | - | - |
| description | text | YES | - | - |
| search_keywords | json | YES | - | - |
| created_by | uuid | YES | - | - |
| change_summary | character varying(500) | YES | - | - |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| content_item_id | content_items.id | NO ACTION | NO ACTION |
| created_by | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| content_versions_content_item_id_version_number_index | content_item_id, version_number | INDEX |
| content_versions_content_item_id_version_number_unique | content_item_id, version_number | UNIQUE |
| content_versions_pkey | id | PRIMARY KEY |

---

## game_assignments

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| game_id | uuid | YES | - | UNIQUE |
| referee_id | uuid | YES | - | UNIQUE |
| position | character varying(255) | YES | - | - |
| status | character varying(255) | YES | 'pending'::character varying | - |
| calculated_wage | numeric | YES | - | - |
| metadata | json | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| game_id | games.id | CASCADE | NO ACTION |
| referee_id | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| game_assignments_game_id_index | game_id | INDEX |
| game_assignments_game_id_referee_id_unique | game_id, referee_id | UNIQUE |
| game_assignments_pkey | id | PRIMARY KEY |
| game_assignments_referee_id_index | referee_id | INDEX |
| game_assignments_status_index | status | INDEX |

---

## games

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| game_number | character varying(255) | NO | - | - |
| home_team_id | uuid | YES | - | - |
| away_team_id | uuid | YES | - | - |
| league_id | uuid | YES | - | - |
| date_time | timestamp with time zone | NO | - | - |
| field | character varying(255) | NO | - | - |
| division | character varying(255) | YES | - | - |
| game_type | character varying(255) | YES | 'regular'::character varying | - |
| refs_needed | integer | YES | 2 | - |
| base_wage | numeric | YES | - | - |
| wage_multiplier | numeric | YES | '1'::numeric | - |
| metadata | json | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| location_cost | numeric | YES | - | - |
| cost_notes | text | YES | - | - |
| organization_id | uuid | YES | - | - |
| region_id | uuid | YES | - | - |
| created_by | uuid | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| home_team_id | teams.id | SET NULL | NO ACTION |
| away_team_id | teams.id | SET NULL | NO ACTION |
| league_id | leagues.id | SET NULL | NO ACTION |
| organization_id | organizations.id | SET NULL | NO ACTION |
| region_id | regions.id | SET NULL | NO ACTION |
| created_by | users.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| games_away_team_id_index | away_team_id | INDEX |
| games_date_time_index | date_time | INDEX |
| games_game_number_index | game_number | INDEX |
| games_game_type_index | game_type | INDEX |
| games_home_team_id_index | home_team_id | INDEX |
| games_league_id_index | league_id | INDEX |
| games_pkey | id | PRIMARY KEY |
| idx_games_created_by | created_by | INDEX |
| idx_games_org_region | organization_id, region_id | INDEX |
| idx_games_organization | organization_id | INDEX |
| idx_games_region | region_id | INDEX |

---

## internal_communications

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| title | character varying(200) | NO | - | - |
| content | text | NO | - | - |
| type | text | NO | - | - |
| priority | text | YES | 'normal'::text | - |
| author_id | uuid | NO | - | - |
| target_audience | jsonb | NO | - | - |
| publish_date | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| expiration_date | timestamp with time zone | YES | - | - |
| requires_acknowledgment | boolean | YES | false | - |
| attachments | jsonb | YES | - | - |
| tags | jsonb | YES | - | - |
| status | text | YES | 'draft'::text | - |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| sent_at | timestamp with time zone | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| author_id | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| internal_communications_author_id_index | author_id | INDEX |
| internal_communications_pkey | id | PRIMARY KEY |
| internal_communications_priority_index | priority | INDEX |
| internal_communications_status_publish_date_index | publish_date, status | INDEX |
| internal_communications_type_index | type | INDEX |

### Check Constraints

- **internal_communications_type_check**: `CHECK ((type = ANY (ARRAY['announcement'::text, 'memo'::text, 'policy_update'::text, 'emergency'::text, 'newsletter'::text])))`
- **internal_communications_priority_check**: `CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])))`
- **internal_communications_status_check**: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`

---

## knex_migrations

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('knex_migrations_id_se... | PK |
| name | character varying(255) | YES | - | - |
| batch | integer | YES | - | - |
| migration_time | timestamp with time zone | YES | - | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| knex_migrations_pkey | id | PRIMARY KEY |

---

## knex_migrations_lock

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| index | integer | NO | nextval('knex_migrations_lock_... | PK |
| is_locked | integer | YES | - | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| knex_migrations_lock_pkey | index | PRIMARY KEY |

---

## leagues

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| organization | character varying(255) | NO | - | UNIQUE |
| age_group | character varying(255) | NO | - | UNIQUE |
| gender | character varying(255) | NO | - | UNIQUE |
| division | character varying(255) | NO | - | UNIQUE |
| season | character varying(255) | NO | - | UNIQUE |
| name | character varying(255) | NO | - | - |
| display_name | character varying(255) | YES | - | - |
| status | character varying(255) | YES | 'active'::character varying | - |
| metadata | json | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| organization_id | uuid | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| organization_id | organizations.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_leagues_organization | organization_id | INDEX |
| leagues_age_group_index | age_group | INDEX |
| leagues_gender_index | gender | INDEX |
| leagues_organization_age_group_gender_division_season_unique | organization, age_group, gender, division, season | UNIQUE |
| leagues_organization_index | organization | INDEX |
| leagues_pkey | id | PRIMARY KEY |
| leagues_season_index | season | INDEX |
| leagues_status_index | status | INDEX |

---

## locations

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | character varying(255) | NO | - | - |
| address | character varying(500) | NO | - | - |
| city | character varying(100) | NO | - | - |
| province | character varying(50) | NO | 'AB'::character varying | - |
| postal_code | character varying(10) | NO | - | - |
| country | character varying(50) | NO | 'Canada'::character varying | - |
| latitude | numeric | YES | - | - |
| longitude | numeric | YES | - | - |
| capacity | integer | YES | - | - |
| contact_name | character varying(255) | YES | - | - |
| contact_phone | character varying(20) | YES | - | - |
| contact_email | character varying(255) | YES | - | - |
| rental_rate | numeric | YES | - | - |
| parking_spaces | integer | YES | - | - |
| facilities | json | YES | - | - |
| accessibility_features | json | YES | - | - |
| notes | text | YES | - | - |
| is_active | boolean | NO | true | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| hourly_rate | numeric | YES | - | - |
| game_rate | numeric | YES | - | - |
| cost_notes | text | YES | - | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| locations_city_index | city | INDEX |
| locations_is_active_index | is_active | INDEX |
| locations_latitude_longitude_index | latitude, longitude | INDEX |
| locations_name_index | name | INDEX |
| locations_pkey | id | PRIMARY KEY |
| locations_postal_code_index | postal_code | INDEX |

---

## mentorship_documents

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| mentorship_id | uuid | NO | - | - |
| document_name | character varying(255) | NO | - | - |
| document_path | character varying(500) | NO | - | - |
| document_type | character varying(100) | NO | - | - |
| file_size | bigint | NO | - | - |
| uploaded_by | uuid | NO | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| mentorship_id | mentorships.id | CASCADE | NO ACTION |
| uploaded_by | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_mentorship_documents_created | created_at | INDEX |
| idx_mentorship_documents_mentorship | mentorship_id | INDEX |
| idx_mentorship_documents_size | file_size | INDEX |
| idx_mentorship_documents_type | document_type | INDEX |
| idx_mentorship_documents_uploader | uploaded_by | INDEX |
| mentorship_documents_pkey | id | PRIMARY KEY |

---

## mentorship_notes

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| mentorship_id | uuid | NO | - | - |
| author_id | uuid | NO | - | - |
| title | character varying(255) | NO | - | - |
| content | text | NO | - | - |
| note_type | text | NO | 'general'::text | - |
| is_private | boolean | NO | false | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| author_id | users.id | CASCADE | NO ACTION |
| mentorship_id | mentorships.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_mentorship_notes_author | author_id | INDEX |
| idx_mentorship_notes_created | created_at | INDEX |
| idx_mentorship_notes_mentorship | mentorship_id | INDEX |
| idx_mentorship_notes_privacy | is_private | INDEX |
| idx_mentorship_notes_type | note_type | INDEX |
| mentorship_notes_pkey | id | PRIMARY KEY |

### Check Constraints

- **mentorship_notes_note_type_check**: `CHECK ((note_type = ANY (ARRAY['progress'::text, 'concern'::text, 'achievement'::text, 'general'::text])))`

---

## mentorships

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| mentor_id | uuid | NO | - | UNIQUE |
| mentee_id | uuid | NO | - | UNIQUE |
| start_date | date | NO | - | - |
| end_date | date | YES | - | - |
| status | text | NO | 'active'::text | - |
| notes | text | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| mentor_id | users.id | CASCADE | NO ACTION |
| mentee_id | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_mentorships_end_date | end_date | INDEX |
| idx_mentorships_mentee | mentee_id | INDEX |
| idx_mentorships_mentor | mentor_id | INDEX |
| idx_mentorships_start_date | start_date | INDEX |
| idx_mentorships_status | status | INDEX |
| mentorships_pkey | id | PRIMARY KEY |
| unique_mentor_mentee_pair | mentor_id, mentee_id | UNIQUE |

### Check Constraints

- **mentorships_status_check**: `CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'terminated'::text])))`
- **mentor_mentee_different**: `CHECK ((mentor_id <> mentee_id))`

---

## organizations

> Multi-tenant organizations. Each org has isolated data.

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | character varying(255) | NO | - | - |
| slug | character varying(100) | NO | - | UNIQUE |
| settings | jsonb | YES | '{}'::jsonb | - |
| created_at | timestamp without time zone | YES | now() | - |
| updated_at | timestamp without time zone | YES | now() | - |
| parent_organization_id | uuid | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| parent_organization_id | organizations.id | RESTRICT | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_organizations_parent | parent_organization_id | INDEX |
| idx_organizations_slug | slug | INDEX |
| organizations_pkey | id | PRIMARY KEY |
| organizations_slug_key | slug | UNIQUE |

### Check Constraints

- **no_self_parent**: `CHECK (((parent_organization_id IS NULL) OR (parent_organization_id <> id)))`

---

## post_categories

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | character varying(100) | NO | - | UNIQUE |
| slug | character varying(100) | NO | - | UNIQUE |
| description | character varying(255) | YES | - | - |
| icon | character varying(50) | YES | - | - |
| color | character varying(7) | YES | - | - |
| sort_order | integer | YES | 0 | - |
| is_active | boolean | YES | true | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| post_categories_is_active_index | is_active | INDEX |
| post_categories_name_unique | name | UNIQUE |
| post_categories_pkey | id | PRIMARY KEY |
| post_categories_slug_index | slug | INDEX |
| post_categories_slug_unique | slug | UNIQUE |
| post_categories_sort_order_index | sort_order | INDEX |

---

## post_media

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| post_id | uuid | YES | - | - |
| file_name | character varying(255) | NO | - | - |
| file_url | character varying(500) | NO | - | - |
| file_type | character varying(50) | NO | - | - |
| file_size | integer | YES | - | - |
| alt_text | character varying(255) | YES | - | - |
| sort_order | integer | YES | 0 | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| post_id | posts.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| post_media_file_type_index | file_type | INDEX |
| post_media_pkey | id | PRIMARY KEY |
| post_media_post_id_index | post_id | INDEX |

---

## post_reads

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| post_id | uuid | YES | - | UNIQUE |
| user_id | uuid | YES | - | UNIQUE |
| read_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| post_id | posts.id | CASCADE | NO ACTION |
| user_id | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| post_reads_pkey | id | PRIMARY KEY |
| post_reads_post_id_index | post_id | INDEX |
| post_reads_post_id_user_id_unique | post_id, user_id | UNIQUE |
| post_reads_read_at_index | read_at | INDEX |
| post_reads_user_id_index | user_id | INDEX |

---

## posts

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| title | character varying(255) | NO | - | - |
| content | text | NO | - | - |
| excerpt | text | YES | - | - |
| status | character varying(20) | YES | 'draft'::character varying | - |
| category | character varying(50) | YES | - | - |
| tags | json | YES | - | - |
| author_id | uuid | YES | - | - |
| published_at | timestamp with time zone | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| author_id | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| posts_author_id_index | author_id | INDEX |
| posts_category_index | category | INDEX |
| posts_created_at_index | created_at | INDEX |
| posts_pkey | id | PRIMARY KEY |
| posts_published_at_index | published_at | INDEX |
| posts_status_index | status | INDEX |

---

## rbac_configuration_templates

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('rbac_configuration_te... | PK |
| template_name | character varying(255) | NO | - | UNIQUE |
| template_description | text | YES | - | - |
| resource_type | text | NO | - | - |
| permission_mapping | json | NO | - | - |
| categorization_rules | json | YES | - | - |
| is_active | boolean | YES | true | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| rbac_configuration_templates_is_active_index | is_active | INDEX |
| rbac_configuration_templates_pkey | id | PRIMARY KEY |
| rbac_configuration_templates_resource_type_index | resource_type | INDEX |
| rbac_configuration_templates_template_name_unique | template_name | UNIQUE |

### Check Constraints

- **rbac_configuration_templates_resource_type_check**: `CHECK ((resource_type = ANY (ARRAY['page'::text, 'endpoint'::text, 'function'::text])))`

---

## rbac_endpoints

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('rbac_endpoints_id_seq... | PK |
| method | character varying(10) | NO | - | UNIQUE |
| endpoint_path | character varying(255) | NO | - | UNIQUE |
| controller | character varying(255) | YES | - | - |
| action | character varying(100) | YES | - | - |
| suggested_permissions | json | YES | - | - |
| risk_level | text | YES | 'medium'::text | - |
| auto_detected | boolean | YES | true | - |
| needs_configuration | boolean | YES | true | - |
| configured_at | timestamp with time zone | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| rbac_endpoints_auto_detected_index | auto_detected | INDEX |
| rbac_endpoints_method_endpoint_path_unique | method, endpoint_path | UNIQUE |
| rbac_endpoints_needs_configuration_index | needs_configuration | INDEX |
| rbac_endpoints_pkey | id | PRIMARY KEY |
| rbac_endpoints_risk_level_index | risk_level | INDEX |

### Check Constraints

- **rbac_endpoints_risk_level_check**: `CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))`

---

## rbac_functions

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('rbac_functions_id_seq... | PK |
| function_name | character varying(255) | NO | - | UNIQUE |
| module_path | character varying(500) | NO | - | UNIQUE |
| category | character varying(100) | YES | 'general'::character varying | - |
| suggested_permissions | json | YES | - | - |
| risk_level | text | YES | 'medium'::text | - |
| auto_detected | boolean | YES | true | - |
| needs_configuration | boolean | YES | true | - |
| configured_at | timestamp with time zone | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| rbac_functions_category_index | category | INDEX |
| rbac_functions_function_name_module_path_unique | function_name, module_path | UNIQUE |
| rbac_functions_needs_configuration_index | needs_configuration | INDEX |
| rbac_functions_pkey | id | PRIMARY KEY |
| rbac_functions_risk_level_index | risk_level | INDEX |

### Check Constraints

- **rbac_functions_risk_level_check**: `CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))`

---

## rbac_pages

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('rbac_pages_id_seq'::r... | PK |
| page_path | character varying(255) | NO | - | UNIQUE |
| page_name | character varying(255) | NO | - | - |
| page_category | character varying(100) | YES | 'General'::character varying | - |
| page_description | text | YES | - | - |
| suggested_permissions | json | YES | - | - |
| is_protected | boolean | YES | false | - |
| auto_detected | boolean | YES | true | - |
| needs_configuration | boolean | YES | true | - |
| configured_at | timestamp with time zone | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| rbac_pages_auto_detected_index | auto_detected | INDEX |
| rbac_pages_needs_configuration_index | needs_configuration | INDEX |
| rbac_pages_page_category_index | page_category | INDEX |
| rbac_pages_page_path_unique | page_path | UNIQUE |
| rbac_pages_pkey | id | PRIMARY KEY |

---

## rbac_scan_history

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('rbac_scan_history_id_... | PK |
| scan_started_at | timestamp with time zone | NO | - | - |
| scan_completed_at | timestamp with time zone | YES | - | - |
| duration_ms | integer | YES | - | - |
| pages_found | integer | YES | 0 | - |
| endpoints_found | integer | YES | 0 | - |
| functions_found | integer | YES | 0 | - |
| new_items_registered | integer | YES | 0 | - |
| scan_summary | json | YES | - | - |
| scan_type | text | YES | 'manual'::text | - |
| status | text | YES | 'running'::text | - |
| error_message | text | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| rbac_scan_history_pkey | id | PRIMARY KEY |
| rbac_scan_history_scan_started_at_index | scan_started_at | INDEX |
| rbac_scan_history_scan_type_index | scan_type | INDEX |
| rbac_scan_history_status_index | status | INDEX |

### Check Constraints

- **rbac_scan_history_scan_type_check**: `CHECK ((scan_type = ANY (ARRAY['automated'::text, 'manual'::text, 'startup'::text])))`
- **rbac_scan_history_status_check**: `CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))`

---

## referee_profiles

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | NO | - | UNIQUE |
| wage_amount | numeric | NO | - | - |
| wage_currency | character varying(3) | YES | 'CAD'::character varying | - |
| payment_method | character varying(20) | YES | 'direct_deposit'::character va... | - |
| years_experience | integer | NO | 0 | - |
| evaluation_score | numeric | YES | - | - |
| certification_number | character varying(50) | YES | - | - |
| certification_date | date | YES | - | - |
| certification_expiry | date | YES | - | - |
| certification_level | character varying(50) | YES | - | - |
| is_white_whistle | boolean | YES | false | - |
| max_weekly_games | integer | YES | 10 | - |
| preferred_positions | jsonb | YES | - | - |
| availability_pattern | jsonb | YES | - | - |
| emergency_contact | jsonb | YES | - | - |
| special_qualifications | jsonb | YES | - | - |
| notes | text | YES | - | - |
| is_active | boolean | YES | true | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| referee_profiles_is_active_index | is_active | INDEX |
| referee_profiles_pkey | id | PRIMARY KEY |
| referee_profiles_user_id_index | user_id | INDEX |
| referee_profiles_user_id_unique | user_id | UNIQUE |
| referee_profiles_wage_amount_index | wage_amount | INDEX |
| referee_profiles_years_experience_index | years_experience | INDEX |

### Check Constraints

- **referee_profiles_evaluation_score_check**: `CHECK (((evaluation_score >= (0)::numeric) AND (evaluation_score <= (100)::numeric)))`
- **referee_profiles_wage_amount_check**: `CHECK ((wage_amount > (0)::numeric))`
- **referee_profiles_years_experience_check**: `CHECK ((years_experience >= 0))`
- **referee_profiles_max_weekly_games_check**: `CHECK ((max_weekly_games > 0))`

---

## regions

> Geographic or organizational regions within an organization

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| organization_id | uuid | NO | - | UNIQUE |
| name | character varying(255) | NO | - | - |
| slug | character varying(100) | NO | - | UNIQUE |
| parent_region_id | uuid | YES | - | - |
| settings | jsonb | YES | '{}'::jsonb | - |
| created_at | timestamp without time zone | YES | now() | - |
| updated_at | timestamp without time zone | YES | now() | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| organization_id | organizations.id | CASCADE | NO ACTION |
| parent_region_id | regions.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_regions_organization | organization_id | INDEX |
| idx_regions_parent | parent_region_id | INDEX |
| idx_regions_slug | organization_id, slug | INDEX |
| regions_organization_id_slug_key | organization_id, slug | UNIQUE |
| regions_pkey | id | PRIMARY KEY |

---

## resource_access_logs

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| resource_id | uuid | YES | - | - |
| user_id | uuid | YES | - | - |
| action | character varying(50) | NO | - | - |
| ip_address | character varying(45) | YES | - | - |
| user_agent | character varying(500) | YES | - | - |
| accessed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| resource_id | resources.id | CASCADE | NO ACTION |
| user_id | users.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| resource_access_logs_accessed_at_index | accessed_at | INDEX |
| resource_access_logs_action_index | action | INDEX |
| resource_access_logs_pkey | id | PRIMARY KEY |
| resource_access_logs_resource_id_index | resource_id | INDEX |
| resource_access_logs_user_id_index | user_id | INDEX |

---

## resource_categories

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | character varying(100) | NO | - | - |
| slug | character varying(100) | NO | - | UNIQUE |
| description | text | YES | - | - |
| icon | character varying(50) | YES | - | - |
| order_index | integer | YES | 0 | - |
| is_active | boolean | YES | true | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| resource_categories_is_active_index | is_active | INDEX |
| resource_categories_pkey | id | PRIMARY KEY |
| resource_categories_slug_index | slug | INDEX |
| resource_categories_slug_unique | slug | UNIQUE |

---

## resources

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| category_id | uuid | YES | - | - |
| title | character varying(255) | NO | - | - |
| description | text | YES | - | - |
| type | character varying(50) | NO | - | - |
| file_url | character varying(500) | YES | - | - |
| external_url | character varying(500) | YES | - | - |
| file_name | character varying(255) | YES | - | - |
| file_size | integer | YES | - | - |
| mime_type | character varying(100) | YES | - | - |
| metadata | jsonb | YES | '{}'::jsonb | - |
| views | integer | YES | 0 | - |
| downloads | integer | YES | 0 | - |
| is_featured | boolean | YES | false | - |
| is_active | boolean | YES | true | - |
| created_by | uuid | YES | - | - |
| updated_by | uuid | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| category_id | resource_categories.id | SET NULL | NO ACTION |
| created_by | users.id | SET NULL | NO ACTION |
| updated_by | users.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| resources_category_id_index | category_id | INDEX |
| resources_created_at_index | created_at | INDEX |
| resources_is_active_index | is_active | INDEX |
| resources_is_featured_index | is_featured | INDEX |
| resources_pkey | id | PRIMARY KEY |
| resources_type_index | type | INDEX |

---

## role_api_access

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| role_id | uuid | NO | - | UNIQUE |
| http_method | character varying(10) | NO | - | UNIQUE |
| endpoint_pattern | character varying(255) | NO | - | UNIQUE |
| endpoint_category | character varying(100) | YES | - | - |
| endpoint_description | character varying(500) | YES | - | - |
| can_access | boolean | YES | false | - |
| rate_limit | integer | YES | - | - |
| conditions | jsonb | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| role_id | roles.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| role_api_access_http_method_endpoint_pattern_index | http_method, endpoint_pattern | INDEX |
| role_api_access_pkey | id | PRIMARY KEY |
| role_api_access_role_id_can_access_index | role_id, can_access | INDEX |
| role_api_access_role_id_http_method_endpoint_pattern_unique | role_id, http_method, endpoint_pattern | UNIQUE |
| role_api_access_role_id_index | role_id | INDEX |

---

## role_data_scopes

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| role_id | uuid | NO | - | - |
| entity_type | character varying(100) | NO | - | - |
| scope_type | character varying(50) | NO | - | - |
| conditions | jsonb | YES | - | - |
| description | character varying(500) | YES | - | - |
| is_active | boolean | YES | true | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| role_id | roles.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| role_data_scopes_entity_type_index | entity_type | INDEX |
| role_data_scopes_pkey | id | PRIMARY KEY |
| role_data_scopes_role_id_entity_type_is_active_index | role_id, entity_type, is_active | INDEX |
| role_data_scopes_role_id_index | role_id | INDEX |

---

## role_features

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| role_id | uuid | NO | - | UNIQUE |
| feature_code | character varying(100) | NO | - | UNIQUE |
| feature_name | character varying(255) | NO | - | - |
| feature_category | character varying(100) | YES | - | - |
| feature_description | character varying(500) | YES | - | - |
| is_enabled | boolean | YES | false | - |
| configuration | jsonb | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| role_id | roles.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| role_features_feature_code_index | feature_code | INDEX |
| role_features_pkey | id | PRIMARY KEY |
| role_features_role_id_feature_code_unique | role_id, feature_code | UNIQUE |
| role_features_role_id_index | role_id | INDEX |
| role_features_role_id_is_enabled_index | role_id, is_enabled | INDEX |

---

## role_page_access

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| role_id | uuid | NO | - | UNIQUE |
| page_path | character varying(255) | NO | - | UNIQUE |
| page_name | character varying(255) | NO | - | - |
| page_category | character varying(100) | YES | - | - |
| page_description | character varying(500) | YES | - | - |
| can_access | boolean | YES | false | - |
| conditions | jsonb | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| role_id | roles.id | CASCADE | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| role_page_access_page_path_index | page_path | INDEX |
| role_page_access_pkey | id | PRIMARY KEY |
| role_page_access_role_id_can_access_index | role_id, can_access | INDEX |
| role_page_access_role_id_index | role_id | INDEX |
| role_page_access_role_id_page_path_unique | role_id, page_path | UNIQUE |

---

## roles

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | character varying(100) | NO | - | UNIQUE |
| description | text | YES | - | - |
| is_active | boolean | NO | true | - |
| is_system | boolean | NO | false | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| category | character varying(50) | YES | - | - |
| referee_config | jsonb | YES | - | - |
| color | character varying(7) | YES | '#6B7280'::character varying | - |
| profile_visibility_settings | json | YES | - | - |
| advanced_settings | json | YES | - | - |
| code | character varying(50) | NO | - | UNIQUE |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| roles_category_index | category | INDEX |
| roles_code_index | code | INDEX |
| roles_code_unique | code | UNIQUE |
| roles_is_active_index | is_active | INDEX |
| roles_name_index | name | INDEX |
| roles_name_unique | name | UNIQUE |
| roles_pkey | id | PRIMARY KEY |

---

## teams

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| league_id | uuid | YES | - | UNIQUE |
| team_number | character varying(255) | NO | - | UNIQUE |
| name | character varying(255) | NO | - | - |
| display_name | character varying(255) | YES | - | - |
| contact_email | character varying(255) | YES | - | - |
| contact_phone | character varying(255) | YES | - | - |
| metadata | json | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| organization_id | uuid | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| league_id | leagues.id | CASCADE | NO ACTION |
| organization_id | organizations.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_teams_organization | organization_id | INDEX |
| teams_league_id_index | league_id | INDEX |
| teams_league_id_team_number_unique | league_id, team_number | UNIQUE |
| teams_pkey | id | PRIMARY KEY |
| teams_team_number_index | team_number | INDEX |

---

## user_region_assignments

> Assigns users specific roles in specific regions

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| user_id | uuid | NO | - | PK |
| region_id | uuid | NO | - | PK |
| role | character varying(50) | NO | - | PK |
| assigned_at | timestamp without time zone | YES | now() | - |
| assigned_by | uuid | YES | - | - |
| expires_at | timestamp without time zone | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users.id | CASCADE | NO ACTION |
| region_id | regions.id | CASCADE | NO ACTION |
| assigned_by | users.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_user_region_assignments_region | region_id | INDEX |
| idx_user_region_assignments_role | role | INDEX |
| idx_user_region_assignments_user | user_id | INDEX |
| user_region_assignments_pkey | user_id, region_id, role | PRIMARY KEY |

---

## user_roles

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | NO | - | UNIQUE |
| role_id | uuid | NO | - | UNIQUE |
| assigned_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| assigned_by | uuid | YES | - | - |
| expires_at | timestamp with time zone | YES | - | - |
| is_active | boolean | NO | true | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users.id | CASCADE | NO ACTION |
| role_id | roles.id | CASCADE | NO ACTION |
| assigned_by | users.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| user_roles_expires_at_index | expires_at | INDEX |
| user_roles_is_active_index | is_active | INDEX |
| user_roles_pkey | id | PRIMARY KEY |
| user_roles_role_id_index | role_id | INDEX |
| user_roles_user_id_index | user_id | INDEX |
| user_roles_user_id_role_id_unique | user_id, role_id | UNIQUE |

---

## users

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| email | character varying(255) | NO | - | UNIQUE |
| password_hash | character varying(255) | NO | - | - |
| name | character varying(255) | YES | - | - |
| phone | character varying(255) | YES | - | - |
| location | character varying(255) | YES | - | - |
| postal_code | character varying(255) | YES | - | - |
| max_distance | integer | YES | - | - |
| is_available | boolean | YES | true | - |
| wage_per_game | numeric | YES | - | - |
| years_experience | integer | YES | - | - |
| evaluation_score | numeric | YES | - | - |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | - |
| notes | text | YES | - | - |
| organization_id | uuid | YES | - | - |
| primary_region_id | uuid | YES | - | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| organization_id | organizations.id | SET NULL | NO ACTION |
| primary_region_id | regions.id | SET NULL | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_users_organization | organization_id | INDEX |
| idx_users_region | primary_region_id | INDEX |
| users_email_unique | email | UNIQUE |
| users_notes_index | notes | INDEX |
| users_pkey | id | PRIMARY KEY |

---

## workflow_approvals

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| workflow_instance_id | uuid | YES | - | - |
| step_execution_id | uuid | YES | - | - |
| approver_id | uuid | YES | - | - |
| status | character varying(30) | YES | 'pending'::character varying | - |
| decision_date | timestamp without time zone | YES | - | - |
| comments | text | YES | - | - |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| workflow_instance_id | workflow_instances.id | CASCADE | NO ACTION |
| step_execution_id | workflow_step_executions.id | CASCADE | NO ACTION |
| approver_id | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_workflow_approvals_approver | approver_id, status | INDEX |
| workflow_approvals_pkey | id | PRIMARY KEY |

---

## workflow_definitions

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | character varying(100) | NO | - | - |
| description | text | YES | - | - |
| category | character varying(50) | YES | - | - |
| trigger_event | character varying(100) | YES | - | - |
| is_active | boolean | YES | true | - |
| steps | jsonb | NO | - | - |
| conditions | jsonb | YES | - | - |
| created_by | uuid | YES | - | - |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| created_by | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| workflow_definitions_pkey | id | PRIMARY KEY |

---

## workflow_instances

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| workflow_definition_id | uuid | YES | - | - |
| entity_type | character varying(50) | YES | - | - |
| entity_id | uuid | YES | - | - |
| status | character varying(30) | YES | 'pending'::character varying | - |
| current_step | integer | YES | 0 | - |
| context | jsonb | YES | - | - |
| started_by | uuid | YES | - | - |
| started_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |
| completed_at | timestamp without time zone | YES | - | - |
| error_message | text | YES | - | - |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| workflow_definition_id | workflow_definitions.id | CASCADE | NO ACTION |
| started_by | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_workflow_instances_entity | entity_type, entity_id | INDEX |
| idx_workflow_instances_status | status | INDEX |
| workflow_instances_pkey | id | PRIMARY KEY |

---

## workflow_step_executions

### Columns

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| workflow_instance_id | uuid | YES | - | - |
| step_number | integer | NO | - | - |
| step_name | character varying(100) | NO | - | - |
| status | character varying(30) | YES | 'pending'::character varying | - |
| assigned_to | uuid | YES | - | - |
| started_at | timestamp without time zone | YES | - | - |
| completed_at | timestamp without time zone | YES | - | - |
| due_date | timestamp without time zone | YES | - | - |
| input_data | jsonb | YES | - | - |
| output_data | jsonb | YES | - | - |
| error_message | text | YES | - | - |
| notes | text | YES | - | - |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | - |

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| workflow_instance_id | workflow_instances.id | CASCADE | NO ACTION |
| assigned_to | users.id | NO ACTION | NO ACTION |

### Indexes

| Index Name | Columns | Type |
|------------|---------|------|
| idx_workflow_step_executions_assigned | status, assigned_to | INDEX |
| workflow_step_executions_pkey | id | PRIMARY KEY |

---

