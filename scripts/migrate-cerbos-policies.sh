#!/bin/bash
# Cerbos Policy Migration Script
# Migrates disk-based YAML policies to PostgreSQL storage
#
# Prerequisites:
# - cerbosctl CLI installed
# - Cerbos server running with PostgreSQL backend
# - PostgreSQL database accessible

set -e

# Configuration
CERBOS_HOST="${CERBOS_HOST:-localhost:3592}"
POLICIES_DIR="${POLICIES_DIR:-./cerbos-policies}"

echo "=== Cerbos Policy Migration to PostgreSQL ==="
echo "Cerbos Host: $CERBOS_HOST"
echo "Policies Directory: $POLICIES_DIR"
echo ""

# Check if cerbosctl is available
if ! command -v cerbosctl &> /dev/null; then
    echo "cerbosctl not found. Installing..."
    # Download cerbosctl for the appropriate platform
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "Please download cerbosctl from https://github.com/cerbos/cerbos/releases"
        echo "Or use: curl -L https://github.com/cerbos/cerbos/releases/latest/download/cerbosctl_Windows_x86_64.zip -o cerbosctl.zip"
        exit 1
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        curl -L https://github.com/cerbos/cerbos/releases/latest/download/cerbosctl_Darwin_x86_64.tar.gz | tar xz
    else
        curl -L https://github.com/cerbos/cerbos/releases/latest/download/cerbosctl_Linux_x86_64.tar.gz | tar xz
    fi
fi

# Wait for Cerbos to be healthy
echo "Waiting for Cerbos server to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://$CERBOS_HOST/_cerbos/health" > /dev/null 2>&1; then
        echo "Cerbos server is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for Cerbos... (attempt $attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: Cerbos server did not become healthy"
    exit 1
fi

# Put policies to the store
echo ""
echo "Uploading policies to PostgreSQL store..."

# First upload derived roles
if [ -d "$POLICIES_DIR/derived_roles" ]; then
    echo "Uploading derived roles..."
    cerbosctl --server="$CERBOS_HOST" put derived_roles "$POLICIES_DIR/derived_roles/"*.yaml || true
fi

# Then upload principal policies
if [ -d "$POLICIES_DIR/principals" ]; then
    echo "Uploading principal policies..."
    cerbosctl --server="$CERBOS_HOST" put principal "$POLICIES_DIR/principals/"*.yaml || true
fi

# Finally upload resource policies
if [ -d "$POLICIES_DIR/resources" ]; then
    echo "Uploading resource policies..."
    for policy_file in "$POLICIES_DIR/resources/"*.yaml; do
        if [ -f "$policy_file" ]; then
            echo "  Uploading: $(basename "$policy_file")"
            cerbosctl --server="$CERBOS_HOST" put resource "$policy_file" || echo "    Warning: Failed to upload $(basename "$policy_file")"
        fi
    done
fi

# Verify policies were uploaded
echo ""
echo "Verifying uploaded policies..."
cerbosctl --server="$CERBOS_HOST" get policies --no-headers | head -20

echo ""
echo "=== Migration Complete ==="
echo "Policies have been migrated from disk to PostgreSQL storage."
echo ""
echo "Note: You can manage policies using cerbosctl commands:"
echo "  cerbosctl --server=$CERBOS_HOST get policies        # List all policies"
echo "  cerbosctl --server=$CERBOS_HOST get derived_roles   # List derived roles"
echo "  cerbosctl --server=$CERBOS_HOST put resource <file> # Add/update a policy"
echo "  cerbosctl --server=$CERBOS_HOST delete policy <id>  # Delete a policy"
