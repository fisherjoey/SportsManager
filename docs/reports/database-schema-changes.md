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
