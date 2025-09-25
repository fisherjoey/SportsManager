#!/bin/bash

# GitHub Integration Validation Script
# This script validates that the GitHub integration is working correctly

set -e

echo "🔍 Validating GitHub Integration"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

VALIDATION_ERRORS=0

validate_file() {
    if [ -f "$1" ]; then
        print_success "✅ $1 exists"
    else
        print_error "❌ $1 missing"
        ((VALIDATION_ERRORS++))
    fi
}

validate_directory() {
    if [ -d "$1" ]; then
        print_success "✅ $1 directory exists"
    else
        print_error "❌ $1 directory missing"
        ((VALIDATION_ERRORS++))
    fi
}

validate_executable() {
    if [ -x "$1" ]; then
        print_success "✅ $1 is executable"
    else
        print_warning "⚠️  $1 is not executable (run: chmod +x $1)"
    fi
}

echo ""
print_status "Validating core files..."

# Core configuration files
validate_file "package.json"
validate_file "jest.config.js"
validate_file ".eslintrc.js"
validate_file "backend/package.json"
validate_file "backend/jest.config.js"
validate_file "backend/.eslintrc.js"

echo ""
print_status "Validating QA/QC documentation..."

# Documentation files
validate_file "QA-QC-PLAN.md"
validate_file "docs/TESTING-STANDARDS.md"
validate_file "AGENT-GUIDELINES.md"
validate_file "GITHUB-INTEGRATION-GUIDE.md"

echo ""
print_status "Validating GitHub configuration..."

# GitHub configuration
validate_directory ".github"
validate_directory ".github/workflows"
validate_directory ".github/ISSUE_TEMPLATE"
validate_file ".github/workflows/ci.yml"
validate_file ".github/workflows/pr-checks.yml"
validate_file ".github/workflows/deploy-staging.yml"
validate_file ".github/workflows/deploy-production.yml"
validate_file ".github/ISSUE_TEMPLATE/bug_report.yml"
validate_file ".github/ISSUE_TEMPLATE/feature_request.yml"
validate_file ".github/ISSUE_TEMPLATE/agent_task.yml"
validate_file ".github/pull_request_template.md"
validate_file ".github/CODEOWNERS"

echo ""
print_status "Validating scripts..."

validate_directory "scripts"
validate_file "scripts/setup-github-integration.sh"
validate_executable "scripts/setup-github-integration.sh"
validate_executable "scripts/validate-github-integration.sh"

echo ""
print_status "Validating workflow syntax..."

# Check YAML syntax if yq is available
if command -v yq &> /dev/null; then
    for workflow in .github/workflows/*.yml; do
        if yq eval . "$workflow" > /dev/null 2>&1; then
            print_success "✅ $workflow syntax valid"
        else
            print_error "❌ $workflow has invalid YAML syntax"
            ((VALIDATION_ERRORS++))
        fi
    done
else
    print_warning "⚠️  yq not installed - skipping YAML syntax validation"
fi

echo ""
print_status "Validating Git configuration..."

# Check git configuration
if [ -d ".git" ]; then
    print_success "✅ Git repository initialized"
    
    # Check if remote exists
    if git remote get-url origin >/dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin)
        print_success "✅ Git remote configured: $REMOTE_URL"
    else
        print_warning "⚠️  No git remote configured"
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_status "Current branch: $CURRENT_BRANCH"
    
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "⚠️  Uncommitted changes detected"
        git status --short
    else
        print_success "✅ Working directory clean"
    fi
else
    print_error "❌ Not a git repository"
    ((VALIDATION_ERRORS++))
fi

echo ""
print_status "Validating Node.js setup..."

# Check Node.js and npm
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "✅ Node.js installed: $NODE_VERSION"
else
    print_error "❌ Node.js not installed"
    ((VALIDATION_ERRORS++))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "✅ npm installed: $NPM_VERSION"
else
    print_error "❌ npm not installed"
    ((VALIDATION_ERRORS++))
fi

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    print_success "✅ Frontend dependencies installed"
else
    print_warning "⚠️  Frontend dependencies not installed (run: npm ci)"
fi

if [ -d "backend/node_modules" ]; then
    print_success "✅ Backend dependencies installed"
else
    print_warning "⚠️  Backend dependencies not installed (run: cd backend && npm ci)"
fi

echo ""
print_status "Testing basic commands..."

# Test npm scripts
if npm run lint --silent > /dev/null 2>&1 || [ $? -eq 0 ]; then
    print_success "✅ Frontend lint command works"
else
    print_warning "⚠️  Frontend lint may need configuration"
fi

if [ -f "backend/package.json" ] && cd backend && npm test --silent > /dev/null 2>&1 || [ $? -eq 0 ]; then
    print_success "✅ Backend test command works"
    cd ..
else
    print_warning "⚠️  Backend tests may need setup"
    cd .. 2>/dev/null || true
fi

echo ""
print_status "Checking GitHub CLI integration..."

if command -v gh &> /dev/null; then
    print_success "✅ GitHub CLI installed"
    
    # Check if authenticated
    if gh auth status > /dev/null 2>&1; then
        print_success "✅ GitHub CLI authenticated"
    else
        print_warning "⚠️  GitHub CLI not authenticated (run: gh auth login)"
    fi
else
    print_warning "⚠️  GitHub CLI not installed (recommended for easier setup)"
fi

echo ""
print_status "Validation Summary"
echo "=================="

if [ $VALIDATION_ERRORS -eq 0 ]; then
    print_success "🎉 All validations passed! GitHub integration is ready."
    echo ""
    echo "Next steps:"
    echo "1. Run: ./scripts/setup-github-integration.sh"
    echo "2. Follow the instructions in GITHUB-INTEGRATION-GUIDE.md"
    echo "3. Add secrets to your GitHub repository"
    echo "4. Update CODEOWNERS with real usernames"
    echo "5. Test with a sample PR"
else
    print_error "❌ $VALIDATION_ERRORS validation errors found."
    echo ""
    echo "Please fix the above issues before proceeding with GitHub integration."
    exit 1
fi

echo ""
echo "📖 For detailed setup instructions, see: GITHUB-INTEGRATION-GUIDE.md"
echo "🚀 Ready to integrate with GitHub!"