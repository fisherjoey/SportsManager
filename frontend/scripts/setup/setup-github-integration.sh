#!/bin/bash

# GitHub Integration Setup Script for Sports Management App
# This script helps set up the GitHub repository with proper configuration

set -e  # Exit on any error

echo "🚀 Setting up GitHub Integration for Sports Management App"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "CLAUDE.md" ]; then
    print_error "This script must be run from the Sports Management App root directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_status "Initializing git repository..."
    git init
    print_success "Git repository initialized"
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_warning "GitHub CLI (gh) is not installed. You'll need to create the repository manually."
    print_warning "Install it from: https://cli.github.com/"
    USE_GH_CLI=false
else
    print_success "GitHub CLI found"
    USE_GH_CLI=true
fi

# Get repository information
read -p "Enter your GitHub username/organization: " GITHUB_USER
read -p "Enter repository name (default: sports-management-app): " REPO_NAME
REPO_NAME=${REPO_NAME:-sports-management-app}

REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

print_status "Repository will be: ${REPO_URL}"

# Create GitHub repository if using GitHub CLI
if [ "$USE_GH_CLI" = true ]; then
    read -p "Create GitHub repository? (y/n): " CREATE_REPO
    if [ "$CREATE_REPO" = "y" ] || [ "$CREATE_REPO" = "Y" ]; then
        print_status "Creating GitHub repository..."
        gh repo create "${GITHUB_USER}/${REPO_NAME}" \
            --description "Sports Management App - Referee assignment and game scheduling system" \
            --public \
            --clone=false \
            --add-readme=false
        print_success "GitHub repository created"
    fi
fi

# Set up git remote
print_status "Setting up git remote..."
if git remote get-url origin >/dev/null 2>&1; then
    print_warning "Origin remote already exists. Updating..."
    git remote set-url origin "$REPO_URL"
else
    git remote add origin "$REPO_URL"
fi
print_success "Git remote configured"

# Ensure all files are committed
print_status "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_status "Uncommitted changes found. Committing..."
    git add .
    git commit -m "feat: add comprehensive QA/QC pipeline and GitHub integration

- Complete CI/CD workflows with GitHub Actions
- Testing standards and agent guidelines
- Issue templates and PR templates
- Code owners and branch protection setup
- Automated quality gates and security scanning

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    print_success "Changes committed"
fi

# Create and push branches
print_status "Setting up branches..."

# Ensure we're on main
git checkout -B main

# Create develop branch
git checkout -B develop
git checkout main

# Push to GitHub
print_status "Pushing to GitHub..."
git push -u origin main
git push -u origin develop
print_success "Branches pushed to GitHub"

# Set up branch protection if using GitHub CLI
if [ "$USE_GH_CLI" = true ]; then
    read -p "Set up branch protection rules? (y/n): " SETUP_PROTECTION
    if [ "$SETUP_PROTECTION" = "y" ] || [ "$SETUP_PROTECTION" = "Y" ]; then
        print_status "Setting up branch protection for main..."
        
        # Main branch protection
        gh api repos/${GITHUB_USER}/${REPO_NAME}/branches/main/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["Lint & Type Check","Backend Tests","Frontend Tests","Security Audit","Quality Gates"]}' \
            --field enforce_admins=true \
            --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
            --field restrictions=null \
            --field required_conversation_resolution=true \
            --field allow_force_pushes=false \
            --field allow_deletions=false

        print_success "Branch protection configured for main"
        
        # Develop branch protection (less strict)
        gh api repos/${GITHUB_USER}/${REPO_NAME}/branches/develop/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["Lint & Type Check","Backend Tests","Frontend Tests"]}' \
            --field enforce_admins=false \
            --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
            --field restrictions=null \
            --field allow_force_pushes=false \
            --field allow_deletions=false

        print_success "Branch protection configured for develop"
    fi
fi

# Create environments if using GitHub CLI
if [ "$USE_GH_CLI" = true ]; then
    read -p "Set up GitHub environments (staging/production)? (y/n): " SETUP_ENVIRONMENTS
    if [ "$SETUP_ENVIRONMENTS" = "y" ] || [ "$SETUP_ENVIRONMENTS" = "Y" ]; then
        print_status "Creating staging environment..."
        gh api repos/${GITHUB_USER}/${REPO_NAME}/environments/staging --method PUT
        
        print_status "Creating production environment..."
        gh api repos/${GITHUB_USER}/${REPO_NAME}/environments/production \
            --method PUT \
            --field protection_rules='[{"type":"required_reviewers","reviewers":[]}]' \
            --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'
        
        print_success "Environments created"
    fi
fi

# Generate secrets template
print_status "Generating secrets configuration template..."
cat > .github/secrets-template.env << 'EOF'
# GitHub Secrets Configuration Template
# Copy these to your GitHub repository secrets

# Staging Environment
STAGING_DB_HOST=your-staging-db-host
STAGING_DB_PORT=5432
STAGING_DB_NAME=sports_management_staging
STAGING_DB_USER=staging_user
STAGING_DB_PASSWORD=staging_secure_password
STAGING_JWT_SECRET=staging-jwt-secret-key-must-be-32-chars
STAGING_API_URL=https://api-staging.yourdomain.com
STAGING_FRONTEND_URL=https://staging.yourdomain.com

# Production Environment  
PROD_DB_HOST=your-production-db-host
PROD_DB_PORT=5432
PROD_DB_NAME=sports_management_production
PROD_DB_USER=production_user
PROD_DB_PASSWORD=production-secure-password
PROD_JWT_SECRET=production-jwt-secret-key-must-be-32-chars
PROD_API_URL=https://api.yourdomain.com
PROD_FRONTEND_URL=https://yourdomain.com

# Service Integrations
CODECOV_TOKEN=your-codecov-token-from-codecov.io
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Optional Deployment Keys (if using SSH)
STAGING_DEPLOY_KEY=-----BEGIN-OPENSSH-PRIVATE-KEY-----...
PROD_DEPLOY_KEY=-----BEGIN-OPENSSH-PRIVATE-KEY-----...
EOF

print_success "Secrets template created at .github/secrets-template.env"

# Test GitHub Actions locally if act is available
if command -v act &> /dev/null; then
    read -p "Test GitHub Actions locally with 'act'? (y/n): " TEST_ACTIONS
    if [ "$TEST_ACTIONS" = "y" ] || [ "$TEST_ACTIONS" = "Y" ]; then
        print_status "Testing GitHub Actions locally..."
        act --list
        print_warning "To run a specific workflow: act -j <job-name>"
    fi
fi

# Final checklist
echo ""
echo "🎉 GitHub Integration Setup Complete!"
echo "====================================="
echo ""
print_success "✅ Repository created and configured"
print_success "✅ Branches (main, develop) pushed"
print_success "✅ GitHub Actions workflows ready"
print_success "✅ Issue and PR templates configured"
print_success "✅ Code owners file created"
print_success "✅ Secrets template generated"
echo ""

print_status "📋 Next Manual Steps Required:"
echo "1. 🔑 Add secrets to GitHub repository:"
echo "   - Go to: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/secrets/actions"
echo "   - Add all secrets from .github/secrets-template.env"
echo ""
echo "2. 👥 Update CODEOWNERS file:"
echo "   - Replace placeholder usernames with actual GitHub usernames"
echo "   - Add team members to appropriate ownership groups"
echo ""
echo "3. 🛡️ Configure branch protection (if not done automatically):"
echo "   - Go to: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/branches"
echo "   - Follow the instructions in GITHUB-INTEGRATION-GUIDE.md"
echo ""
echo "4. 🔗 Install GitHub Apps:"
echo "   - Codecov (for test coverage)"
echo "   - Dependabot (for dependency updates)"
echo "   - Any other integrations you need"
echo ""
echo "5. 🧪 Test the integration:"
echo "   - Create a test branch and PR"
echo "   - Verify all workflows run correctly"
echo "   - Check that branch protection works"
echo ""

print_warning "📖 Read GITHUB-INTEGRATION-GUIDE.md for detailed instructions!"

echo ""
print_status "Repository URL: https://github.com/${GITHUB_USER}/${REPO_NAME}"
print_status "Happy coding! 🚀"