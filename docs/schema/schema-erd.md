1# Database Entity Relationship Diagram

**Generated:** 2025-09-30T06:12:40.238Z

```mermaid
erDiagram
  ACCESS_CONTROL_AUDIT {
    UUID id "PK,NOT NULL"
    UUID user_id "NOT NULL"
    CHARACTER VARYING action_type "NOT NULL"
    CHARACTER VARYING resource_type "NOT NULL"
    UUID role_id
    CHARACTER VARYING resource_identifier
    JSONB old_value
    JSONB new_value
    CHARACTER VARYING reason
    CHARACTER VARYING ip_address
    string ..._2_more_columns
  }

  AUDIT_LOGS {
    INTEGER id "PK,NOT NULL"
    UUID user_id
    CHARACTER VARYING user_email
    CHARACTER VARYING event_type "NOT NULL"
    CHARACTER VARYING resource_type
    CHARACTER VARYING resource_id
    JSON old_values
    JSON new_values
    CHARACTER VARYING request_path
    CHARACTER VARYING request_method
    string ..._7_more_columns
  }

  COMMUNICATION_RECIPIENTS {
    UUID id "PK,NOT NULL"
    UUID communication_id "UK,NOT NULL"
    UUID recipient_id "UK,NOT NULL"
    TEXT delivery_method
    TEXT delivery_status
    TIMESTAMP WITH TIME ZONE sent_at
    TIMESTAMP WITH TIME ZONE read_at
    TIMESTAMP WITH TIME ZONE acknowledged_at
    BOOLEAN acknowledged
    TIMESTAMP WITH TIME ZONE created_at
  }

  CONTENT_ANALYTICS {
    INTEGER id "PK,NOT NULL"
    INTEGER content_item_id "NOT NULL"
    UUID user_id
    CHARACTER VARYING ip_address
    CHARACTER VARYING user_agent
    TEXT action "NOT NULL"
    INTEGER time_spent
    TIMESTAMP WITH TIME ZONE created_at
  }

  CONTENT_ANALYTICS_MONTHLY {
    INTEGER id "PK,NOT NULL"
    INTEGER content_item_id "UK,NOT NULL"
    INTEGER year "UK,NOT NULL"
    INTEGER month "UK,NOT NULL"
    INTEGER view_count
    INTEGER download_count
    INTEGER unique_viewers
    INTEGER total_time_spent
    NUMERIC bounce_rate
    TIMESTAMP WITH TIME ZONE last_updated
  }

  CONTENT_ATTACHMENTS {
    INTEGER id "PK,NOT NULL"
    INTEGER content_item_id
    CHARACTER VARYING file_name "NOT NULL"
    CHARACTER VARYING file_path "NOT NULL"
    CHARACTER VARYING file_url "NOT NULL"
    CHARACTER VARYING file_hash "NOT NULL"
    INTEGER file_size "NOT NULL"
    CHARACTER VARYING mime_type "NOT NULL"
    TEXT attachment_type "NOT NULL"
    BOOLEAN is_embedded
    string ..._4_more_columns
  }

  CONTENT_CATEGORIES {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    TEXT description
    CHARACTER VARYING color
    CHARACTER VARYING icon
    INTEGER parent_id
    BOOLEAN is_active
    INTEGER sort_order
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    string ..._1_more_columns
  }

  CONTENT_ITEM_TAGS {
    INTEGER id "PK,NOT NULL"
    INTEGER content_item_id "UK,NOT NULL"
    INTEGER tag_id "UK,NOT NULL"
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  CONTENT_ITEMS {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING title "NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    TEXT description
    TEXT content "NOT NULL"
    TEXT content_plain
    TEXT type
    TEXT status "UK"
    TEXT visibility
    INTEGER category_id
    string ..._6_more_columns
  }

  CONTENT_PERMISSIONS {
    INTEGER id "PK,NOT NULL"
    INTEGER content_item_id "NOT NULL"
    UUID user_id
    CHARACTER VARYING role_name
    TEXT permission_level "NOT NULL"
    UUID granted_by
    TIMESTAMP WITH TIME ZONE granted_at
    TIMESTAMP WITH TIME ZONE expires_at
  }

  CONTENT_SEARCH_INDEX {
    INTEGER content_item_id "PK,NOT NULL"
    TSVECTOR search_vector
    TIMESTAMP WITH TIME ZONE last_indexed_at
  }

  CONTENT_TAGS {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING name "UK,NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    CHARACTER VARYING color
    INTEGER usage_count
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  CONTENT_VERSIONS {
    INTEGER id "PK,NOT NULL"
    INTEGER content_item_id "UK,NOT NULL"
    INTEGER version_number "UK,NOT NULL"
    CHARACTER VARYING title "NOT NULL"
    TEXT content "NOT NULL"
    TEXT description
    JSON search_keywords
    UUID created_by
    CHARACTER VARYING change_summary
    TIMESTAMP WITH TIME ZONE created_at
  }

  GAME_ASSIGNMENTS {
    UUID id "PK,NOT NULL"
    UUID game_id "UK"
    UUID referee_id "UK"
    CHARACTER VARYING position
    CHARACTER VARYING status
    NUMERIC calculated_wage
    JSON metadata
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  GAMES {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING game_number "NOT NULL"
    UUID home_team_id
    UUID away_team_id
    UUID league_id
    TIMESTAMP WITH TIME ZONE date_time "NOT NULL"
    CHARACTER VARYING field "NOT NULL"
    CHARACTER VARYING division
    CHARACTER VARYING game_type
    INTEGER refs_needed
    string ..._10_more_columns
  }

  INTERNAL_COMMUNICATIONS {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING title "NOT NULL"
    TEXT content "NOT NULL"
    TEXT type "NOT NULL"
    TEXT priority
    UUID author_id "NOT NULL"
    JSONB target_audience "NOT NULL"
    TIMESTAMP WITH TIME ZONE publish_date
    TIMESTAMP WITH TIME ZONE expiration_date
    BOOLEAN requires_acknowledgment
    string ..._6_more_columns
  }

  KNEX_MIGRATIONS {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING name
    INTEGER batch
    TIMESTAMP WITH TIME ZONE migration_time
  }

  KNEX_MIGRATIONS_LOCK {
    INTEGER index "PK,NOT NULL"
    INTEGER is_locked
  }

  LEAGUES {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING organization "UK,NOT NULL"
    CHARACTER VARYING age_group "UK,NOT NULL"
    CHARACTER VARYING gender "UK,NOT NULL"
    CHARACTER VARYING division "UK,NOT NULL"
    CHARACTER VARYING season "UK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING display_name
    CHARACTER VARYING status
    JSON metadata
    string ..._3_more_columns
  }

  LOCATIONS {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING address "NOT NULL"
    CHARACTER VARYING city "NOT NULL"
    CHARACTER VARYING province "NOT NULL"
    CHARACTER VARYING postal_code "NOT NULL"
    CHARACTER VARYING country "NOT NULL"
    NUMERIC latitude
    NUMERIC longitude
    INTEGER capacity
    string ..._14_more_columns
  }

  MENTORSHIP_DOCUMENTS {
    UUID id "PK,NOT NULL"
    UUID mentorship_id "NOT NULL"
    CHARACTER VARYING document_name "NOT NULL"
    CHARACTER VARYING document_path "NOT NULL"
    CHARACTER VARYING document_type "NOT NULL"
    BIGINT file_size "NOT NULL"
    UUID uploaded_by "NOT NULL"
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
  }

  MENTORSHIP_NOTES {
    UUID id "PK,NOT NULL"
    UUID mentorship_id "NOT NULL"
    UUID author_id "NOT NULL"
    CHARACTER VARYING title "NOT NULL"
    TEXT content "NOT NULL"
    TEXT note_type "NOT NULL"
    BOOLEAN is_private "NOT NULL"
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  MENTORSHIPS {
    UUID id "PK,NOT NULL"
    UUID mentor_id "UK,NOT NULL"
    UUID mentee_id "UK,NOT NULL"
    DATE start_date "NOT NULL"
    DATE end_date
    TEXT status "NOT NULL"
    TEXT notes
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  ORGANIZATIONS {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    JSONB settings
    TIMESTAMP WITHOUT TIME ZONE created_at
    TIMESTAMP WITHOUT TIME ZONE updated_at
    UUID parent_organization_id
  }

  POST_CATEGORIES {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING name "UK,NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    CHARACTER VARYING description
    CHARACTER VARYING icon
    CHARACTER VARYING color
    INTEGER sort_order
    BOOLEAN is_active
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  POST_MEDIA {
    UUID id "PK,NOT NULL"
    UUID post_id
    CHARACTER VARYING file_name "NOT NULL"
    CHARACTER VARYING file_url "NOT NULL"
    CHARACTER VARYING file_type "NOT NULL"
    INTEGER file_size
    CHARACTER VARYING alt_text
    INTEGER sort_order
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  POST_READS {
    UUID id "PK,NOT NULL"
    UUID post_id "UK"
    UUID user_id "UK"
    TIMESTAMP WITH TIME ZONE read_at
  }

  POSTS {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING title "NOT NULL"
    TEXT content "NOT NULL"
    TEXT excerpt
    CHARACTER VARYING status
    CHARACTER VARYING category
    JSON tags
    UUID author_id
    TIMESTAMP WITH TIME ZONE published_at
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    string ..._1_more_columns
  }

  RBAC_CONFIGURATION_TEMPLATES {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING template_name "UK,NOT NULL"
    TEXT template_description
    TEXT resource_type "NOT NULL"
    JSON permission_mapping "NOT NULL"
    JSON categorization_rules
    BOOLEAN is_active
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  RBAC_ENDPOINTS {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING method "UK,NOT NULL"
    CHARACTER VARYING endpoint_path "UK,NOT NULL"
    CHARACTER VARYING controller
    CHARACTER VARYING action
    JSON suggested_permissions
    TEXT risk_level
    BOOLEAN auto_detected
    BOOLEAN needs_configuration
    TIMESTAMP WITH TIME ZONE configured_at
    string ..._2_more_columns
  }

  RBAC_FUNCTIONS {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING function_name "UK,NOT NULL"
    CHARACTER VARYING module_path "UK,NOT NULL"
    CHARACTER VARYING category
    JSON suggested_permissions
    TEXT risk_level
    BOOLEAN auto_detected
    BOOLEAN needs_configuration
    TIMESTAMP WITH TIME ZONE configured_at
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    string ..._1_more_columns
  }

  RBAC_PAGES {
    INTEGER id "PK,NOT NULL"
    CHARACTER VARYING page_path "UK,NOT NULL"
    CHARACTER VARYING page_name "NOT NULL"
    CHARACTER VARYING page_category
    TEXT page_description
    JSON suggested_permissions
    BOOLEAN is_protected
    BOOLEAN auto_detected
    BOOLEAN needs_configuration
    TIMESTAMP WITH TIME ZONE configured_at
    string ..._2_more_columns
  }

  RBAC_SCAN_HISTORY {
    INTEGER id "PK,NOT NULL"
    TIMESTAMP WITH TIME ZONE scan_started_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE scan_completed_at
    INTEGER duration_ms
    INTEGER pages_found
    INTEGER endpoints_found
    INTEGER functions_found
    INTEGER new_items_registered
    JSON scan_summary
    TEXT scan_type
    string ..._4_more_columns
  }

  REFEREE_PROFILES {
    UUID id "PK,NOT NULL"
    UUID user_id "UK,NOT NULL"
    NUMERIC wage_amount "NOT NULL"
    CHARACTER VARYING wage_currency
    CHARACTER VARYING payment_method
    INTEGER years_experience "NOT NULL"
    NUMERIC evaluation_score
    CHARACTER VARYING certification_number
    DATE certification_date
    DATE certification_expiry
    string ..._11_more_columns
  }

  REGIONS {
    UUID id "PK,NOT NULL"
    UUID organization_id "UK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    UUID parent_region_id
    JSONB settings
    TIMESTAMP WITHOUT TIME ZONE created_at
    TIMESTAMP WITHOUT TIME ZONE updated_at
  }

  RESOURCE_ACCESS_LOGS {
    UUID id "PK,NOT NULL"
    UUID resource_id
    UUID user_id
    CHARACTER VARYING action "NOT NULL"
    CHARACTER VARYING ip_address
    CHARACTER VARYING user_agent
    TIMESTAMP WITH TIME ZONE accessed_at
  }

  RESOURCE_CATEGORIES {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING slug "UK,NOT NULL"
    TEXT description
    CHARACTER VARYING icon
    INTEGER order_index
    BOOLEAN is_active
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  RESOURCES {
    UUID id "PK,NOT NULL"
    UUID category_id
    CHARACTER VARYING title "NOT NULL"
    TEXT description
    CHARACTER VARYING type "NOT NULL"
    CHARACTER VARYING file_url
    CHARACTER VARYING external_url
    CHARACTER VARYING file_name
    INTEGER file_size
    CHARACTER VARYING mime_type
    string ..._9_more_columns
  }

  ROLE_API_ACCESS {
    UUID id "PK,NOT NULL"
    UUID role_id "UK,NOT NULL"
    CHARACTER VARYING http_method "UK,NOT NULL"
    CHARACTER VARYING endpoint_pattern "UK,NOT NULL"
    CHARACTER VARYING endpoint_category
    CHARACTER VARYING endpoint_description
    BOOLEAN can_access
    INTEGER rate_limit
    JSONB conditions
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    string ..._1_more_columns
  }

  ROLE_DATA_SCOPES {
    UUID id "PK,NOT NULL"
    UUID role_id "NOT NULL"
    CHARACTER VARYING entity_type "NOT NULL"
    CHARACTER VARYING scope_type "NOT NULL"
    JSONB conditions
    CHARACTER VARYING description
    BOOLEAN is_active
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  ROLE_FEATURES {
    UUID id "PK,NOT NULL"
    UUID role_id "UK,NOT NULL"
    CHARACTER VARYING feature_code "UK,NOT NULL"
    CHARACTER VARYING feature_name "NOT NULL"
    CHARACTER VARYING feature_category
    CHARACTER VARYING feature_description
    BOOLEAN is_enabled
    JSONB configuration
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  ROLE_PAGE_ACCESS {
    UUID id "PK,NOT NULL"
    UUID role_id "UK,NOT NULL"
    CHARACTER VARYING page_path "UK,NOT NULL"
    CHARACTER VARYING page_name "NOT NULL"
    CHARACTER VARYING page_category
    CHARACTER VARYING page_description
    BOOLEAN can_access
    JSONB conditions
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
  }

  ROLES {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING name "UK,NOT NULL"
    TEXT description
    BOOLEAN is_active "NOT NULL"
    BOOLEAN is_system "NOT NULL"
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
    CHARACTER VARYING category
    JSONB referee_config
    CHARACTER VARYING color
    string ..._3_more_columns
  }

  TEAMS {
    UUID id "PK,NOT NULL"
    UUID league_id "UK"
    CHARACTER VARYING team_number "UK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    CHARACTER VARYING display_name
    CHARACTER VARYING contact_email
    CHARACTER VARYING contact_phone
    JSON metadata
    TIMESTAMP WITH TIME ZONE created_at "NOT NULL"
    TIMESTAMP WITH TIME ZONE updated_at "NOT NULL"
    string ..._1_more_columns
  }

  USER_REGION_ASSIGNMENTS {
    UUID user_id "PK,NOT NULL"
    UUID region_id "PK,NOT NULL"
    CHARACTER VARYING role "PK,NOT NULL"
    TIMESTAMP WITHOUT TIME ZONE assigned_at
    UUID assigned_by
    TIMESTAMP WITHOUT TIME ZONE expires_at
  }

  USER_ROLES {
    UUID id "PK,NOT NULL"
    UUID user_id "UK,NOT NULL"
    UUID role_id "UK,NOT NULL"
    TIMESTAMP WITH TIME ZONE assigned_at
    UUID assigned_by
    TIMESTAMP WITH TIME ZONE expires_at
    BOOLEAN is_active "NOT NULL"
  }

  USERS {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING email "UK,NOT NULL"
    CHARACTER VARYING password_hash "NOT NULL"
    CHARACTER VARYING name
    CHARACTER VARYING phone
    CHARACTER VARYING location
    CHARACTER VARYING postal_code
    INTEGER max_distance
    BOOLEAN is_available
    NUMERIC wage_per_game
    string ..._7_more_columns
  }

  WORKFLOW_APPROVALS {
    UUID id "PK,NOT NULL"
    UUID workflow_instance_id
    UUID step_execution_id
    UUID approver_id
    CHARACTER VARYING status
    TIMESTAMP WITHOUT TIME ZONE decision_date
    TEXT comments
    TIMESTAMP WITHOUT TIME ZONE created_at
  }

  WORKFLOW_DEFINITIONS {
    UUID id "PK,NOT NULL"
    CHARACTER VARYING name "NOT NULL"
    TEXT description
    CHARACTER VARYING category
    CHARACTER VARYING trigger_event
    BOOLEAN is_active
    JSONB steps "NOT NULL"
    JSONB conditions
    UUID created_by
    TIMESTAMP WITHOUT TIME ZONE created_at
    string ..._1_more_columns
  }

  WORKFLOW_INSTANCES {
    UUID id "PK,NOT NULL"
    UUID workflow_definition_id
    CHARACTER VARYING entity_type
    UUID entity_id
    CHARACTER VARYING status
    INTEGER current_step
    JSONB context
    UUID started_by
    TIMESTAMP WITHOUT TIME ZONE started_at
    TIMESTAMP WITHOUT TIME ZONE completed_at
    string ..._3_more_columns
  }

  WORKFLOW_STEP_EXECUTIONS {
    UUID id "PK,NOT NULL"
    UUID workflow_instance_id
    INTEGER step_number "NOT NULL"
    CHARACTER VARYING step_name "NOT NULL"
    CHARACTER VARYING status
    UUID assigned_to
    TIMESTAMP WITHOUT TIME ZONE started_at
    TIMESTAMP WITHOUT TIME ZONE completed_at
    TIMESTAMP WITHOUT TIME ZONE due_date
    JSONB input_data
    string ..._5_more_columns
  }

  ACCESS_CONTROL_AUDIT }o--|| USERS : "user_id"
  ACCESS_CONTROL_AUDIT }o--|| ROLES : "role_id"
  AUDIT_LOGS }o--|| USERS : "user_id"
  COMMUNICATION_RECIPIENTS ||--|| INTERNAL_COMMUNICATIONS : "communication_id"
  COMMUNICATION_RECIPIENTS ||--|| USERS : "recipient_id"
  CONTENT_ANALYTICS }o--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_ANALYTICS }o--|| USERS : "user_id"
  CONTENT_ANALYTICS_MONTHLY ||--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_ATTACHMENTS }o--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_ATTACHMENTS }o--|| USERS : "uploaded_by"
  CONTENT_CATEGORIES }o--|| CONTENT_CATEGORIES : "parent_id"
  CONTENT_ITEM_TAGS ||--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_ITEM_TAGS ||--|| CONTENT_TAGS : "tag_id"
  CONTENT_ITEMS }o--|| CONTENT_CATEGORIES : "category_id"
  CONTENT_ITEMS }o--|| USERS : "author_id"
  CONTENT_PERMISSIONS }o--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_PERMISSIONS }o--|| USERS : "user_id"
  CONTENT_PERMISSIONS }o--|| USERS : "granted_by"
  CONTENT_SEARCH_INDEX }o--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_VERSIONS ||--|| CONTENT_ITEMS : "content_item_id"
  CONTENT_VERSIONS }o--|| USERS : "created_by"
  GAME_ASSIGNMENTS ||--|| GAMES : "game_id"
  GAME_ASSIGNMENTS ||--|| USERS : "referee_id"
  GAMES }o--|| TEAMS : "home_team_id"
  GAMES }o--|| TEAMS : "away_team_id"
  GAMES }o--|| LEAGUES : "league_id"
  GAMES }o--|| ORGANIZATIONS : "organization_id"
  GAMES }o--|| REGIONS : "region_id"
  GAMES }o--|| USERS : "created_by"
  INTERNAL_COMMUNICATIONS }o--|| USERS : "author_id"
  LEAGUES }o--|| ORGANIZATIONS : "organization_id"
  MENTORSHIP_DOCUMENTS }o--|| MENTORSHIPS : "mentorship_id"
  MENTORSHIP_DOCUMENTS }o--|| USERS : "uploaded_by"
  MENTORSHIP_NOTES }o--|| USERS : "author_id"
  MENTORSHIP_NOTES }o--|| MENTORSHIPS : "mentorship_id"
  MENTORSHIPS ||--|| USERS : "mentor_id"
  MENTORSHIPS ||--|| USERS : "mentee_id"
  ORGANIZATIONS }o--|| ORGANIZATIONS : "parent_organization_id"
  POST_MEDIA }o--|| POSTS : "post_id"
  POST_READS ||--|| POSTS : "post_id"
  POST_READS ||--|| USERS : "user_id"
  POSTS }o--|| USERS : "author_id"
  REFEREE_PROFILES ||--|| USERS : "user_id"
  REGIONS ||--|| ORGANIZATIONS : "organization_id"
  REGIONS }o--|| REGIONS : "parent_region_id"
  RESOURCE_ACCESS_LOGS }o--|| RESOURCES : "resource_id"
  RESOURCE_ACCESS_LOGS }o--|| USERS : "user_id"
  RESOURCES }o--|| RESOURCE_CATEGORIES : "category_id"
  RESOURCES }o--|| USERS : "created_by"
  RESOURCES }o--|| USERS : "updated_by"
  ROLE_API_ACCESS ||--|| ROLES : "role_id"
  ROLE_DATA_SCOPES }o--|| ROLES : "role_id"
  ROLE_FEATURES ||--|| ROLES : "role_id"
  ROLE_PAGE_ACCESS ||--|| ROLES : "role_id"
  TEAMS ||--|| LEAGUES : "league_id"
  TEAMS }o--|| ORGANIZATIONS : "organization_id"
  USER_REGION_ASSIGNMENTS }o--|| USERS : "user_id"
  USER_REGION_ASSIGNMENTS }o--|| REGIONS : "region_id"
  USER_REGION_ASSIGNMENTS }o--|| USERS : "assigned_by"
  USER_ROLES ||--|| USERS : "user_id"
  USER_ROLES ||--|| ROLES : "role_id"
  USER_ROLES }o--|| USERS : "assigned_by"
  USERS }o--|| ORGANIZATIONS : "organization_id"
  USERS }o--|| REGIONS : "primary_region_id"
  WORKFLOW_APPROVALS }o--|| WORKFLOW_INSTANCES : "workflow_instance_id"
  WORKFLOW_APPROVALS }o--|| WORKFLOW_STEP_EXECUTIONS : "step_execution_id"
  WORKFLOW_APPROVALS }o--|| USERS : "approver_id"
  WORKFLOW_DEFINITIONS }o--|| USERS : "created_by"
  WORKFLOW_INSTANCES }o--|| WORKFLOW_DEFINITIONS : "workflow_definition_id"
  WORKFLOW_INSTANCES }o--|| USERS : "started_by"
  WORKFLOW_STEP_EXECUTIONS }o--|| WORKFLOW_INSTANCES : "workflow_instance_id"
  WORKFLOW_STEP_EXECUTIONS }o--|| USERS : "assigned_to"
```
