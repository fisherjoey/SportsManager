# Database Schema Changes

This file tracks database schema changes for periodic diagram updates. An agent will update the database diagram every ~20 commits and clear this file.

## Instructions for Agents
When making database schema changes, add them below with:
- Date
- Brief description of change
- Tables/fields affected

---

## Pending Changes

### August 3, 2025 - Referee Profile System Redesign
- **Modified Table**: `referee_levels`
  - Updated existing levels from (Learning, Learning+, Growing, Growing+, Teaching, Expert) to (Rookie, Junior, Senior)
  - Revised wage amounts and capability requirements
  - Updated allowed_divisions for new level structure
- **Enhanced Logic**: White whistle display logic
  - Rookie level: Always displays white whistle (is_white_whistle = true)
  - Junior level: Conditionally displays white whistle based on is_white_whistle flag
  - Senior level: Never displays white whistle (is_white_whistle = false)
- **Admin-Defined Roles**: Enhanced roles system
  - Available roles: Referee, Evaluator, Mentor, Regional Lead, Assignor, Inspector
  - Replaces old certifications system
  - Roles are stored in users.roles array field (already exists)
- **Purpose**: Implements CLAUDE.md specifications for simplified level system and admin-configurable roles

### July 24, 2025 - Organization Settings Implementation
- **New Table**: `organization_settings`
  - `id` (UUID, primary key)
  - `organization_name` (VARCHAR(255), default: 'Sports Organization')
  - `payment_model` (ENUM: 'INDIVIDUAL', 'FLAT_RATE', default: 'INDIVIDUAL')
  - `default_game_rate` (DECIMAL(8,2), nullable)
  - `created_at`, `updated_at` (TIMESTAMP)
- **New Type**: `payment_model_enum` with values 'INDIVIDUAL' and 'FLAT_RATE'
- **Purpose**: Enables organizations to choose between individual referee wages or flat rate per game divided among referees
