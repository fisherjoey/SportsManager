#!/bin/bash

# Test Auto-Chunk API
# This script tests the auto-chunk feature with the existing games in the database

echo "🧪 Testing Auto-Chunk Feature"
echo "================================"
echo ""

# Get auth token
echo "1. Getting authentication token..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sportsmanager.com","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."
echo ""

# Check how many games we have
echo "2. Checking available games..."
GAME_COUNT=$(PGPASSWORD=postgres123 "/c/Program Files/PostgreSQL/17/bin/psql" -U postgres -h localhost -p 5432 -d sports_management -t -c "SELECT COUNT(*) FROM games WHERE id NOT IN (SELECT game_id FROM game_assignments WHERE status IN ('pending', 'accepted'));")
echo "   Found $GAME_COUNT unassigned games"
echo ""

# Test auto-chunk
echo "3. Creating chunks..."
echo "   Parameters:"
echo "   - Group by: location_date"
echo "   - Min games: 1"
echo "   - Max games: 10"
echo "   - Max time gap: 300 minutes (5 hours)"
echo "   - Date range: 2025-02-01 to 2025-12-31"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/api/chunks/auto-create \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "criteria": {
      "group_by": "location_date",
      "min_games": 1,
      "max_games": 10,
      "max_time_gap": 300
    },
    "date_range": {
      "start_date": "2025-02-01",
      "end_date": "2025-12-31"
    }
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  CHUNKS_CREATED=$(echo "$RESPONSE" | grep -o '"chunks_created":[0-9]*' | grep -o '[0-9]*')
  GAMES_CHUNKED=$(echo "$RESPONSE" | grep -o '"games_chunked":[0-9]*' | grep -o '[0-9]*')

  echo "================================"
  echo "✅ Auto-Chunk Test PASSED"
  echo "   Created: $CHUNKS_CREATED chunks"
  echo "   Games chunked: $GAMES_CHUNKED"
  echo "================================"
else
  echo "================================"
  echo "❌ Auto-Chunk Test FAILED"
  echo "================================"
fi
