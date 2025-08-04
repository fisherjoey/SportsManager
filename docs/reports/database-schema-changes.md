# Database Schema Changes

This file tracks database schema changes for periodic diagram updates. An agent will update the database diagram every ~20 commits and clear this file.

## Instructions for Agents
When making database schema changes, add them below with:
- Date
- Brief description of change
- Tables/fields affected

---

## Pending Changes

### July 24, 2025 - Organization Settings Implementation
- **New Table**: `organization_settings`
  - `id` (UUID, primary key)
  - `organization_name` (VARCHAR(255), default: 'Sports Organization')
  - `payment_model` (ENUM: 'INDIVIDUAL', 'FLAT_RATE', default: 'INDIVIDUAL')
  - `default_game_rate` (DECIMAL(8,2), nullable)
  - `created_at`, `updated_at` (TIMESTAMP)
- **New Type**: `payment_model_enum` with values 'INDIVIDUAL' and 'FLAT_RATE'
- **Purpose**: Enables organizations to choose between individual referee wages or flat rate per game divided among referees

### August 4, 2025 - Referee Profile System Redesign  
- **Modified Table**: `referee_levels`
  - Replaced old levels (Learning, Growing, Teaching, etc.) with new system:
    - `Rookie` ($25/game)
    - `Junior` ($35/game) 
    - `Senior` ($45/game)
- **Modified Table**: `users`
  - Added `is_white_whistle` (BOOLEAN, default false) - Individual white whistle flag
  - Added `postal_code` (VARCHAR(10)) - For distance calculations
- **New Table**: `referee_roles`
  - `id` (UUID, primary key)
  - `name` (VARCHAR) - Admin-defined roles (Referee, Evaluator, Mentor, etc.)
  - `description` (TEXT)
  - `is_active` (BOOLEAN, default true)
  - `created_at`, `updated_at` (TIMESTAMP)
- **New Table**: `user_roles` 
  - `id` (UUID, primary key)
  - `user_id` (UUID, FK to users)
  - `role_id` (UUID, FK to referee_roles)
  - `assigned_at` (TIMESTAMP)
  - `assigned_by` (UUID, FK to users)
- **Purpose**: Implements CLAUDE.md specifications for referee profile system with new level structure, white whistle logic, and admin-defined roles
