# Database Migration and Seeding Instructions

## Current Status
- Backend and Frontend are deployed to Cloud Run
- Cloud SQL instance `sports-management-db` is created and running
- Database tables need to be created via migrations
- CMBA season data needs to be seeded

## Step 1: Install Cloud SQL Proxy

Download and set up the Cloud SQL Proxy:

```bash
# Download Cloud SQL Proxy (macOS)
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy

# Or for Linux
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy

# Move to /usr/local/bin for global access
sudo mv cloud_sql_proxy /usr/local/bin/
```

## Step 2: Set Up Database Connection

Create the connection string and start the proxy:

```bash
# Set your project details
export PROJECT_ID="syncedsports"
export INSTANCE_NAME="sports-management-db"
export DB_USER="sports_user"
export DB_PASSWORD="[YOUR_DB_PASSWORD]"  # Get from Secret Manager
export DB_NAME="sports_management"

# Start Cloud SQL Proxy in background
cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:${INSTANCE_NAME}=tcp:5432 &

# Wait a few seconds for proxy to start
sleep 5
```

## Step 3: Run Database Migrations

Navigate to the backend directory and run migrations:

```bash
cd "backend"

# Set up environment for production database
export NODE_ENV=production
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# Install dependencies if not already done
npm install

# Run all migrations to create tables
npm run migrate

# Verify migration success
echo "Migrations completed. Checking migration status..."
npx knex migrate:status
```

## Step 4: Seed Database with CMBA Data

Run the seed scripts to populate with data:

```bash
# Run all seed files (will include CMBA full season data)
npm run seed

# Verify data was seeded
echo "Seeding completed. Checking table counts..."
```

## Step 5: Verify Database Setup

Connect to the database and verify tables were created:

```bash
# Connect directly to Cloud SQL (alternative method)
gcloud sql connect sports-management-db --user=sports_user --database=sports_management

# Or use psql through proxy
psql "postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
```

In the PostgreSQL shell, verify tables:

```sql
-- List all tables
\dt

-- Check key tables have data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM leagues;
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM games;
SELECT COUNT(*) FROM referees;
SELECT COUNT(*) FROM game_assignments;

-- Check admin user was created
SELECT email, role, name FROM users WHERE role = 'admin';

-- Exit PostgreSQL
\q
```

## Step 6: Test Backend Connection

Test that the backend can connect to the database:

```bash
# Test backend health endpoint
curl https://sports-management-backend-140708809250.us-central1.run.app/api/health

# Test API endpoints
curl https://sports-management-backend-140708809250.us-central1.run.app/api/leagues
curl https://sports-management-backend-140708809250.us-central1.run.app/api/games
```

## Troubleshooting

### Connection Issues
```bash
# Check Cloud SQL instance status
gcloud sql instances describe sports-management-db

# Check if proxy is running
ps aux | grep cloud_sql_proxy

# Kill proxy if needed and restart
pkill cloud_sql_proxy
cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:${INSTANCE_NAME}=tcp:5432 &
```

### Migration Issues
```bash
# Check current migration status
npx knex migrate:status

# Rollback last migration if needed
npx knex migrate:rollback

# Run specific migration
npx knex migrate:up 001_create_users.js
```

### Seed Issues
```bash
# Run specific seed file
npx knex seed:run --specific=009_cmba_full_season.js

# Check if seed data exists
psql "postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" -c "SELECT COUNT(*) FROM games;"
```

## Expected Results

After successful migration and seeding:
- **~50+ tables** created (users, games, teams, leagues, referees, etc.)
- **CMBA admin user** created with email `admin@cmba.ca`
- **Full CMBA season data** including leagues, teams, and games
- **Referee levels** and **sample referees** created
- **Backend health check** returns 200 OK
- **API endpoints** return proper JSON responses

## Security Notes

- Database password should be retrieved from Google Secret Manager
- Never commit database credentials to version control
- Use environment variables for all sensitive configuration
- Stop Cloud SQL Proxy when not needed to limit exposure

## Next Steps After Database Setup

1. Update backend with DeepSeek API key
2. Redeploy backend service
3. Configure DNS records
4. Test complete system functionality