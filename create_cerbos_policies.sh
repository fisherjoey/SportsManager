#!/bin/bash

# Cerbos Policy Creation Script
# Creates individual policy files for all 38 remaining resources
# Run from project root: ./create_cerbos_policies.sh

set -e  # Exit on error

echo "=========================================="
echo "Cerbos Policy Creation Script"
echo "=========================================="
echo ""

# List of resources that need policies (excluding user, game, assignment which already exist)
RESOURCES=(
  "team" "league" "location" "referee" "tournament" "post"
  "organization" "role" "invitation" "region"
  "expense" "budget" "financial_transaction" "financial_report"
  "financial_dashboard" "receipt" "game_fee" "purchase_order"
  "company_credit_card" "accounting"
  "employee" "asset"
  "document" "communication" "content"
  "mentorship" "mentee_game"
  "report" "organizational_analytics"
  "cerbos_policy" "referee_role" "referee_level" "maintenance" "updatable"
  "ai_suggestion" "historic_pattern" "chunk" "ai_assignment_rule"
  "calendar"
)

POLICY_DIR="cerbos/policies"

# Check if directory exists
if [ ! -d "$POLICY_DIR" ]; then
  echo "ERROR: Directory $POLICY_DIR not found"
  echo "Please run this script from the project root"
  exit 1
fi

cd "$POLICY_DIR"

echo "Creating ${#RESOURCES[@]} policy files in $(pwd)..."
echo ""

# Counter for created files
CREATED=0

for resource in "${RESOURCES[@]}"; do
  FILE="$resource.yaml"

  # Skip if file already exists
  if [ -f "$FILE" ]; then
    echo "⏭️  Skipping $FILE (already exists)"
    continue
  fi

  echo "✅ Creating $FILE..."

  cat > "$FILE" << EOF
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "$resource"
  rules:
    - actions:
        - view
        - view:list
        - view:details
        - view:stats
        - create
        - update
        - delete
        - manage
      effect: EFFECT_ALLOW
      roles:
        - admin
        - super_admin
EOF

  ((CREATED++))
done

echo ""
echo "=========================================="
echo "Summary:"
echo "  Created: $CREATED new policy files"
echo "  Skipped: $((${#RESOURCES[@]} - CREATED)) existing files"
echo "=========================================="
echo ""

# Return to project root
cd ../..

echo "Restarting Cerbos container..."
docker restart sportsmanager-cerbos

echo "Waiting for Cerbos to start..."
sleep 5

echo ""
echo "=========================================="
echo "Checking Cerbos status..."
echo "=========================================="

# Check if Cerbos is healthy
if docker logs sportsmanager-cerbos 2>&1 | grep -q "HTTP server stopped"; then
  echo "⚠️  Cerbos may still be starting..."
  echo "Wait a few more seconds and check manually:"
  echo "  docker logs sportsmanager-cerbos | tail -20"
else
  # Show policy count
  echo ""
  docker logs sportsmanager-cerbos 2>&1 | grep "Found.*executable policies" | tail -1 || echo "No policy count found yet"

  # Check for errors
  echo ""
  echo "Checking for errors..."
  ERROR_COUNT=$(docker logs sportsmanager-cerbos 2>&1 | grep -c "load_failures" || echo "0")

  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "⚠️  Found $ERROR_COUNT load failures"
    echo "Run this to see details:"
    echo "  docker logs sportsmanager-cerbos 2>&1 | grep -A 5 'load_failures'"
  else
    echo "✅ No load failures detected"
  fi
fi

echo ""
echo "=========================================="
echo "Testing API access..."
echo "=========================================="
echo ""
echo "Test with this command:"
echo ""
echo 'TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjViOTRmMy1hNzAwLTRjNTktYTI5Ny01ZGNiNTQzZDM3MmQiLCJlbWFpbCI6ImFkbWluQHJlZmFzc2lnbi5jb20iLCJyb2xlcyI6WyJTdXBlciBBZG1pbiIsIkFkbWluIl0sImlhdCI6MTc1OTAwNzQzMCwiZXhwIjoxNzU5NjEyMjMwfQ.kWjM3-7HEnRKs4FCWW6Nm59nx66bWUZAPOp9xcn7gV8"'
echo 'curl -s -X GET "http://localhost:3001/api/teams" -H "Authorization: Bearer $TOKEN" | head -20'
echo ""
echo "Expected: JSON response with team data (not 403 Forbidden)"
echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="