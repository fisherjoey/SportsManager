#!/bin/bash

# Test Login API with proper escaping
# This script tests the login endpoint with various escaping methods

echo "=== Testing Login API ==="
echo ""

# Method 1: Single quotes (prevents ! expansion)
echo "Method 1: Using single quotes for data"
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"assignor@cmba.ca","password":"Admin123!"}'

echo -e "\n\n"

# Method 2: Escape the ! character
echo "Method 2: Escaping the ! character"
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"assignor@cmba.ca\",\"password\":\"Admin123\!\"}"

echo -e "\n\n"

# Method 3: Use a file
echo "Method 3: Using data from file"
cat > /tmp/login-data.json <<'EOF'
{"email":"assignor@cmba.ca","password":"Admin123!"}
EOF

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login-data.json

rm /tmp/login-data.json

echo -e "\n\n=== Testing Complete ==="
