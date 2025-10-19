#!/bin/bash
#
# Database Restore Script
# Restores the SportsManager database from the dump file
#

set -e

echo "========================================="
echo "SportsManager Database Restore"
echo "========================================="
echo ""

# Configuration
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres123}"
DB_NAME="${POSTGRES_DB:-sports_management}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DUMP_FILE="/docker-entrypoint-initdb.d/sports_management_full.dump"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"
echo ""

# Check if database already has data
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt "5" ]; then
  echo "⚠️  Database already contains $TABLE_COUNT tables"
  echo "Skipping restore to avoid overwriting existing data"
  echo ""
  echo "To force restore, run:"
  echo "  docker-compose exec postgres dropdb -U $DB_USER $DB_NAME"
  echo "  docker-compose exec postgres createdb -U $DB_USER $DB_NAME"
  echo "  docker-compose exec postgres pg_restore -U $DB_USER -d $DB_NAME $DUMP_FILE"
  exit 0
fi

# Restore database
if [ -f "$DUMP_FILE" ]; then
  echo "Restoring database from dump..."
  echo "File: $DUMP_FILE"
  echo ""

  PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl \
    "$DUMP_FILE"

  echo ""
  echo "✅ Database restored successfully!"
  echo ""

  # Show table count
  TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
  echo "📊 Total tables: $TABLE_COUNT"

else
  echo "❌ Dump file not found: $DUMP_FILE"
  echo "Skipping database restore"
  exit 1
fi
