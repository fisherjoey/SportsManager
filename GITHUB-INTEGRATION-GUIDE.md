# GitHub Integration Guide - Sports Management App

## 🎯 Overview
This guide walks through integrating the QA/QC pipeline into GitHub with proper configuration, security, and automation.

## 📋 Step-by-Step Integration Process

### Phase 1: Repository Setup and Push

#### 1. Initialize and Push to GitHub
```bash
# If not already a git repository
git init
git add .
git commit -m "Initial commit with QA/QC pipeline"

# Add GitHub remote (replace with your repository)
git remote add origin https://github.com/yourusername/sports-management-app.git
git branch -M main
git push -u origin main

# Create and push develop branch
git checkout -b develop
git push -u origin develop
```

### Phase 2: GitHub Repository Settings

#### 2. Configure Repository Settings
Navigate to your GitHub repository → Settings:

**General Settings:**
- ✅ Enable "Allow merge commits"
- ✅ Enable "Allow squash merging" 
- ✅ Enable "Allow rebase merging"
- ✅ Enable "Always suggest updating pull request branches"
- ✅ Enable "Allow auto-merge"
- ✅ Enable "Automatically delete head branches"

**Security Settings:**
- ✅ Enable "Restrict pushes that create files larger than 100 MB"
- ✅ Enable vulnerability alerts
- ✅ Enable dependency graph
- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates

#### 3. Set Up Branch Protection Rules
Repository → Settings → Branches → Add rule:

**For `main` branch:**
```
Branch name pattern: main

✅ Require a pull request before merging
  - ✅ Require approvals: 2
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners

✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - Lint & Type Check
    - Backend Tests  
    - Frontend Tests
    - Security Audit
    - Quality Gates

✅ Require conversation resolution before merging
✅ Require signed commits
✅ Include administrators
✅ Restrict pushes that create files larger than 100 MB
```

**For `develop` branch:**
```
Branch name pattern: develop

✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale PR approvals when new commits are pushed

✅ Require status checks to pass before merging
  - Required status checks:
    - Lint & Type Check
    - Backend Tests
    - Frontend Tests

✅ Include administrators
```

### Phase 3: GitHub Actions Secrets Configuration

#### 4. Set Up Repository Secrets
Repository → Settings → Secrets and variables → Actions:

**Required Secrets:**
```bash
# Database Configuration (Staging)
STAGING_DB_HOST=your-staging-db-host
STAGING_DB_PORT=5432
STAGING_DB_NAME=sports_management_staging
STAGING_DB_USER=staging_user
STAGING_DB_PASSWORD=staging_secure_password
STAGING_JWT_SECRET=staging-jwt-secret-key-32-chars

# Database Configuration (Production)
PROD_DB_HOST=your-production-db-host
PROD_DB_PORT=5432
PROD_DB_NAME=sports_management_production
PROD_DB_USER=production_user
PROD_DB_PASSWORD=production-secure-password
PROD_JWT_SECRET=production-jwt-secret-key-32-chars

# Application URLs
STAGING_API_URL=https://api-staging.yourdomain.com
STAGING_FRONTEND_URL=https://staging.yourdomain.com
PROD_API_URL=https://api.yourdomain.com
PROD_FRONTEND_URL=https://yourdomain.com

# Deployment Keys (if using SSH)
STAGING_DEPLOY_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
PROD_DEPLOY_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...

# Service Integrations
CODECOV_TOKEN=your-codecov-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### 5. Set Up Environment Variables
Repository → Settings → Secrets and variables → Actions → Variables:

```bash
# Environment Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_NAME=Sports Management App

# Feature Flags
FEATURE_TOURNAMENT_GENERATOR=true
FEATURE_AI_ASSIGNMENTS=false
FEATURE_ADVANCED_REPORTING=true
```

### Phase 4: GitHub Environments

#### 6. Configure Environments
Repository → Settings → Environments:

**Staging Environment:**
```
Environment name: staging

Environment protection rules:
- ✅ Required reviewers: (optional for staging)
- ✅ Wait timer: 0 minutes
- ✅ Deployment branches: develop

Environment secrets:
- All STAGING_* secrets from above
```

**Production Environment:**
```
Environment name: production

Environment protection rules:
- ✅ Required reviewers: Add 2-3 senior team members
- ✅ Wait timer: 5 minutes (cooling off period)
- ✅ Deployment branches: main only

Environment secrets:
- All PROD_* secrets from above
```

### Phase 5: GitHub Apps and Integrations

#### 7. Install Required GitHub Apps
Repository → Settings → Integrations & services:

**Essential Apps:**
- **Codecov**: Code coverage reporting
- **Dependabot**: Dependency updates and security
- **CodeQL**: Security analysis
- **Prettier**: Code formatting
- **ESLint**: Code quality

**Optional but Recommended:**
- **Slack/Teams**: Deployment notifications
- **Jira/Linear**: Issue tracking integration
- **Vercel/Netlify**: Frontend deployment (if not self-hosted)

#### 8. Configure Code Owners
Create `.github/CODEOWNERS`:
```bash
# Global owners
* @team-lead @senior-developer

# QA/Testing files require QA approval
QA-QC-PLAN.md @qa-lead @team-lead
docs/TESTING-STANDARDS.md @qa-lead
.github/workflows/ @devops-lead @team-lead

# Database changes require DB approval
backend/migrations/ @database-admin @team-lead
backend/seeds/ @database-admin

# Frontend architecture
components/ @frontend-lead
app/ @frontend-lead

# Backend architecture  
backend/src/routes/ @backend-lead
backend/src/middleware/ @backend-lead
```

### Phase 6: Issue and PR Templates

#### 9. Create Issue Templates
Create `.github/ISSUE_TEMPLATE/`:

**Bug Report** (`.github/ISSUE_TEMPLATE/bug_report.yml`):
```yaml
name: Bug Report
description: Report a bug in the Sports Management App
title: "[BUG] "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug! Please fill out the information below.
  
  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear description of what the bug is
      placeholder: Describe the bug...
    validations:
      required: true
  
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true
  
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen
    validations:
      required: true
  
  - type: dropdown
    id: environment
    attributes:
      label: Environment
      options:
        - Development
        - Staging
        - Production
    validations:
      required: true
  
  - type: checkboxes
    id: checklist
    attributes:
      label: Pre-submission Checklist
      options:
        - label: I have searched existing issues
          required: true
        - label: I have provided clear reproduction steps
          required: true
        - label: I have included relevant error messages/screenshots
          required: false
```

**Feature Request** (`.github/ISSUE_TEMPLATE/feature_request.yml`):
```yaml
name: Feature Request
description: Suggest a new feature for the Sports Management App
title: "[FEATURE] "
labels: ["enhancement", "triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this feature solve?
      placeholder: As a [user type], I want [goal] so that [benefit]
    validations:
      required: true
  
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe your proposed solution
    validations:
      required: true
  
  - type: textarea
    id: alternatives
    attributes:
      label: Alternative Solutions
      description: Any alternative solutions considered?
  
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options:
        - Low
        - Medium
        - High
        - Critical
    validations:
      required: true
```

#### 10. Create PR Template
Create `.github/pull_request_template.md`:
```markdown
## 🎯 Description
Brief description of what this PR does.

## 📋 Type of Change
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Maintenance/refactoring

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Tests pass locally (`npm test && cd backend && npm test`)

## 📝 Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented where necessary
- [ ] Documentation updated (if needed)
- [ ] No console.log statements left in code
- [ ] Database migrations tested (if applicable)
- [ ] Breaking changes documented

## 🔗 Related Issues
Closes #(issue number)

## 📸 Screenshots (if applicable)
Add screenshots for UI changes.

## 🚀 Deployment Notes
Any special deployment considerations?

## 👀 Reviewers
@mention specific reviewers if needed

---
**Agent Signature:** 🤖 Generated with [Claude Code](https://claude.ai/code)
```

### Phase 7: Advanced Configuration

#### 11. Configure GitHub Actions Settings
Repository → Settings → Actions → General:

**Actions permissions:**
- ✅ Allow all actions and reusable workflows

**Workflow permissions:**
- ✅ Read repository contents and metadata permissions
- ✅ Allow GitHub Actions to create and approve pull requests

**Fork pull request workflows:**
- ✅ Run workflows from fork pull requests
- ✅ Require approval for first-time contributors

#### 12. Set Up Status Checks
Repository → Settings → Branches → Edit protection rule:

Add these as required status checks:
- `Lint & Type Check`
- `Backend Tests`
- `Frontend Tests` 
- `Security Audit`
- `Quality Gates`
- `codecov/project` (if using Codecov)

### Phase 8: Testing and Validation

#### 13. Test the Integration
```bash
# Create a test branch
git checkout -b test/github-integration

# Make a small change
echo "# GitHub Integration Test" >> TEST.md
git add TEST.md
git commit -m "test: validate GitHub integration"
git push origin test/github-integration

# Create PR through GitHub UI and verify:
# 1. All GitHub Actions run
# 2. Status checks appear
# 3. Branch protection works
# 4. PR template loads
# 5. Code owners are requested for review
```

#### 14. Validate Environments
```bash
# Test staging deployment
git checkout develop
git commit --allow-empty -m "test: trigger staging deployment"
git push origin develop

# Verify staging workflow runs and deploys

# Test production deployment (be careful!)
git checkout main
git merge develop
git push origin main

# Verify production workflow requires approval
```

## 🔧 Troubleshooting Common Issues

### GitHub Actions Not Running
- Check Actions are enabled in repository settings
- Verify workflow syntax with GitHub Actions validator
- Check if workflows are in correct `.github/workflows/` directory

### Status Checks Not Required
- Ensure status check names match exactly in branch protection
- Status checks only appear after running at least once
- Check if branch protection applies to the correct branch

### Secrets Not Working
- Verify secret names match exactly (case-sensitive)
- Check environment-specific secrets are set correctly
- Ensure secrets don't contain newlines or extra spaces

### Environment Deployment Issues
- Verify environment names match workflow files
- Check required reviewers are available
- Ensure deployment branches are configured correctly

## 📋 Post-Integration Checklist

After completing the integration:

- [ ] All workflows run successfully
- [ ] Branch protection enforces quality gates
- [ ] PR template and issue templates work
- [ ] Code owners receive review requests
- [ ] Secrets are configured and working
- [ ] Environments deploy correctly
- [ ] Status checks prevent merging
- [ ] Team has access to necessary repositories
- [ ] Documentation is updated
- [ ] Training provided to team members

## 🎓 Team Training Required

Ensure all team members understand:
1. **Git workflow**: Feature branches, PR process, commit conventions
2. **Quality gates**: What checks must pass, how to fix failures
3. **Review process**: Code ownership, approval requirements
4. **Deployment process**: Staging vs production, approval gates
5. **Troubleshooting**: Common issues and resolution steps

---

**Next Steps:** Once this integration is complete, your QA/QC pipeline will be fully automated and enforced through GitHub!