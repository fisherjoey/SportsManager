#!/bin/bash

# Cerbos Policy Validation Script
# Validates all Cerbos YAML policies for common issues
# Run before committing changes to cerbos-policies/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
POLICIES_DIR="$PROJECT_ROOT/cerbos-policies"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating Cerbos policies in: $POLICIES_DIR"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Version format validation
echo "✓ Checking version format (must use underscores, not dots)..."
INVALID_VERSIONS=$(find "$POLICIES_DIR" -name "*.yaml" -exec grep -l 'version.*:.*".*\..*"' {} \; 2>/dev/null || true)

if [ -n "$INVALID_VERSIONS" ]; then
  echo -e "${RED}✗ FAILED: Found policies with invalid version format (dots instead of underscores):${NC}"
  echo "$INVALID_VERSIONS" | while read file; do
    echo "  - $file"
    grep -n 'version.*:.*".*\..*"' "$file" | sed 's/^/    /'
  done
  echo ""
  echo -e "${YELLOW}Fix: Replace dots with underscores. Example:${NC}"
  echo '  version: "1.0"  ❌'
  echo '  version: "1_0"  ✅'
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ All version formats valid${NC}"
fi

# Check 2: Required fields validation
echo ""
echo "✓ Checking for required fields..."
MISSING_API_VERSION=$(find "$POLICIES_DIR" -name "*.yaml" ! -name ".cerbos.yaml" ! -exec grep -q "apiVersion:" {} \; -print 2>/dev/null || true)

if [ -n "$MISSING_API_VERSION" ]; then
  echo -e "${RED}✗ FAILED: Found policies missing apiVersion:${NC}"
  echo "$MISSING_API_VERSION" | sed 's/^/  - /'
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ All policies have apiVersion${NC}"
fi

# Check 3: YAML syntax validation (basic)
echo ""
echo "✓ Checking YAML syntax..."
SYNTAX_ERRORS=0

find "$POLICIES_DIR" -name "*.yaml" | while read file; do
  # Basic YAML validation - check for common issues
  if grep -q $'\t' "$file"; then
    echo -e "${RED}✗ Found tabs in $file (use spaces)${NC}"
    SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
  fi
done

if [ $SYNTAX_ERRORS -eq 0 ]; then
  echo -e "${GREEN}  ✓ No basic YAML syntax errors detected${NC}"
fi

# Check 4: Validate with Cerbos CLI if available
echo ""
echo "✓ Checking for Cerbos CLI..."
if command -v cerbos &> /dev/null; then
  echo "  Found Cerbos CLI - running full validation..."
  if cerbos compile "$POLICIES_DIR" &> /dev/null; then
    echo -e "${GREEN}  ✓ Cerbos CLI validation passed${NC}"
  else
    echo -e "${RED}✗ FAILED: Cerbos CLI validation failed${NC}"
    echo ""
    echo "Full error output:"
    cerbos compile "$POLICIES_DIR" 2>&1 | sed 's/^/  /'
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}  ⚠ Cerbos CLI not installed - skipping full validation${NC}"
  echo "  Install: https://docs.cerbos.dev/cerbos/latest/installation.html"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Docker-based validation (fallback if CLI not available)
if ! command -v cerbos &> /dev/null; then
  echo ""
  echo "✓ Attempting Docker-based validation..."
  if command -v docker &> /dev/null; then
    # Try to start Cerbos container and validate policies
    CERBOS_VALIDATION=$(docker run --rm \
      -v "$POLICIES_DIR:/policies:ro" \
      ghcr.io/cerbos/cerbos:latest \
      compile /policies 2>&1 || true)

    if echo "$CERBOS_VALIDATION" | grep -q "failed to build index"; then
      echo -e "${RED}✗ FAILED: Docker Cerbos validation failed${NC}"
      echo "$CERBOS_VALIDATION" | sed 's/^/  /'
      ERRORS=$((ERRORS + 1))
    elif echo "$CERBOS_VALIDATION" | grep -q "ERROR"; then
      echo -e "${RED}✗ FAILED: Docker Cerbos validation found errors${NC}"
      echo "$CERBOS_VALIDATION" | sed 's/^/  /'
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}  ✓ Docker-based validation passed${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠ Docker not available - cannot run validation${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All validation checks passed!${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠  $WARNINGS warning(s)${NC}"
  fi
  exit 0
else
  echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠  $WARNINGS warning(s)${NC}"
  fi
  exit 1
fi
