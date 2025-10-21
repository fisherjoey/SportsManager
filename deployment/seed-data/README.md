# Seed Data

This directory contains seed data exported from the production database to help developers get started quickly with a realistic dataset.

## Files

- `seed_data.sql` - Full production database export (data-only, INSERT statements)

## What's Included

The seed data contains:
- **Referee Levels**: Rookie, Junior, Senior levels with pay rates and requirements
- **Roles**: Super Admin, Admin, Assignment Manager, Referee Coordinator, Senior Referee, Junior Referee, Assignor
- **Users**: Test users with various roles
- **Organizations**: Sports organizations and their configurations
- **Teams**: Sample teams with divisions and age groups
- **Games**: Historical game data with assignments
- **Referees**: Sample referee profiles with certifications
- **And more**: Financial data, settings, locations, etc.

## Test Credentials

All test users have the same password: `Admin123!`

### Available Test Accounts

| Email | Role | Description |
|-------|------|-------------|
| admin@sportsmanager.com | Super Admin | Full system access |
| admin@cmba.ca | Admin | Administrative access |
| assignor@cmba.ca | Assignment Manager | Can assign referees to games |
| coordinator@cmba.ca | Referee Coordinator | Manages referee activities |

## Usage in Local Development

This seed data is automatically loaded when you use the local development setup:

```bash
cd deployment
docker-compose -f docker-compose.local.yml up
```

The database will be initialized with this seed data on first run.

## Usage in Manual Setup

If you need to manually load the seed data:

```bash
# Inside the postgres container
docker exec -i sportsmanager-postgres psql -U postgres -d sports_management < seed_data.sql
```

Note: Due to circular foreign key constraints, you may need to temporarily disable triggers:

```sql
SET session_replication_role = 'replica';
-- Load your data here
SET session_replication_role = 'origin';
```

## Updating Seed Data

To update this seed data from production:

```bash
# SSH into the production server
ssh -i ~/.ssh/id_rsa root@10.0.0.5

# Export from production database
pct exec 102 -- bash -c "docker exec -e PGPASSWORD=postgres123 sportsmanager-postgres pg_dump -U postgres -d sports_management --data-only --inserts -f /tmp/seed_data.sql"

# Copy to local machine
pct exec 102 -- cat /root/seed_data.sql > ./deployment/seed-data/seed_data.sql
```

## Notes

- Passwords are bcrypt hashed
- UUIDs are preserved from production
- Some data may reference external services (use test/mock credentials locally)
- Financial data is anonymized but realistic
