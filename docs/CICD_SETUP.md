# CI/CD Pipeline Setup Guide

## Overview

This repository uses **GitHub Actions** for automated deployments to your Proxmox server. The monorepo structure allows us to deploy frontend, backend, Cerbos policies, and database migrations from a single workflow.

## Architecture

### Monorepo Structure ✅
```
SportsManager/
├── backend/                 # Node.js/Express API
├── frontend/                # Next.js application
├── cerbos-policies/         # Authorization policies
├── deployment/              # Docker Compose configs
└── .github/workflows/       # CI/CD workflows
```

**Why Monorepo?**
- Single source of truth for all components
- Atomic deployments across frontend/backend
- Easier dependency management
- Simplified CI/CD workflows

## Branch Strategy

Following **Git Flow** best practices:

| Branch    | Purpose                          | Deploys To                |
|-----------|----------------------------------|---------------------------|
| `main`    | Production-ready code            | https://syncedsport.com   |
| `develop` | Integration branch for features  | Staging (optional)        |
| `feature/*` | Feature development            | Local/dev only            |

### Workflow

1. **Feature Development**: Create branch from `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Merge to Develop**: When feature is complete
   ```bash
   git checkout develop
   git merge feature/my-feature
   git push origin develop
   ```

3. **Release to Production**: When ready to deploy
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

   ➡️ This triggers automatic deployment via GitHub Actions

## Deployment Pipeline

### Production Deployment (`main` branch)

**Triggered by:** Push to `main` or manual workflow dispatch

**Steps:**
1. **Pre-deployment Checks**
   - Detect database migrations
   - Detect Docker configuration changes

2. **Deployment** (to Proxmox CT102 at 10.0.0.108)
   - Create database backup
   - Pull latest code via SSH
   - Run migrations (if detected)
   - Rebuild Docker containers
   - Wait for services to be healthy

3. **Health Checks**
   - Internal: http://localhost:3001/health
   - Internal: http://localhost:3004
   - External: https://syncedsport.com
   - API Test: https://syncedsport.com/api/games

4. **Post-deployment**
   - Display deployment summary
   - Show container statuses

### Rollback Strategy

If deployment fails:
- Logs are automatically captured
- Services remain in previous state (Docker keeps old containers if build fails)
- Manual rollback option available (currently commented out)

To enable automatic rollback, uncomment lines 167-173 in `.github/workflows/deploy-production.yml`

## Setup Instructions

### 1. Configure GitHub Secrets

Navigate to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**

Add the following secret:

| Secret Name        | Description                      | Value                          |
|--------------------|----------------------------------|--------------------------------|
| `SSH_PRIVATE_KEY`  | SSH private key for Proxmox host | Contents of `~/.ssh/id_rsa`    |

**To get your SSH private key:**
```bash
cat ~/.ssh/id_rsa
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

### 2. Configure GitHub Environment

Create a **production** environment for deployment approvals (optional but recommended):

1. Go to: **Settings** → **Environments** → **New environment**
2. Name: `production`
3. Configure protection rules:
   - ✅ Required reviewers (add yourself)
   - ⏱️ Wait timer: 0 minutes (or add delay for safety)
4. Save

This ensures production deployments require manual approval.

### 3. Test the Pipeline

**Option 1: Push to main**
```bash
git checkout main
git commit --allow-empty -m "test: Trigger deployment pipeline"
git push origin main
```

**Option 2: Manual trigger**
1. Go to: **Actions** tab in GitHub
2. Select: **Deploy to Production**
3. Click: **Run workflow**
4. Choose branch: `main`
5. Click: **Run workflow**

### 4. Monitor Deployment

Watch the deployment in real-time:
1. Go to **Actions** tab
2. Click on the running workflow
3. Expand each step to see logs

Expected duration: **3-5 minutes**

## Deployment Capabilities

### What Gets Deployed

When you push to `main`, the pipeline will:

✅ **Frontend Changes**
- Next.js app rebuilt
- New environment variables applied
- Static assets updated

✅ **Backend Changes**
- Node.js app rebuilt
- Dependencies installed
- API server restarted

✅ **Database Changes**
- Migrations automatically detected
- Backup created before migration
- Migrations run in transaction

✅ **Cerbos Policy Changes**
- Policies mounted into container
- Cerbos service reloaded

✅ **Docker Config Changes**
- Images rebuilt from scratch
- New containers created
- Old containers replaced

### Zero-Downtime Deployment

Docker Compose handles this automatically:
1. Builds new images
2. Creates new containers
3. Health checks pass
4. Removes old containers

**Downtime:** < 10 seconds during container swap

## Troubleshooting

### Deployment Fails at "Wait for services to stabilize"

**Cause:** Containers aren't becoming healthy

**Solution:**
```bash
# SSH into server and check logs
ssh -i ~/.ssh/id_rsa root@10.0.0.5
pct exec 102 -- bash
cd /root/SportsManager/deployment
docker compose -f docker-compose.deploy.yml logs --tail=100
```

### SSH Authentication Failed

**Cause:** GitHub doesn't have your SSH key

**Solution:**
1. Verify secret is set correctly in GitHub
2. Ensure key has no passphrase
3. Test SSH access locally:
   ```bash
   ssh -i ~/.ssh/id_rsa root@10.0.0.5 "echo 'SSH works'"
   ```

### Database Migration Fails

**Cause:** Migration syntax error or data conflict

**Solution:**
```bash
# SSH into container
ssh -i ~/.ssh/id_rsa root@10.0.0.5
pct exec 102 -- bash
docker exec -it sportsmanager-backend sh

# Check migration status
cd /app
npx knex migrate:currentVersion

# Rollback last migration
npx knex migrate:rollback

# Re-run migrations
npx knex migrate:latest
```

### Health Check Fails

**Cause:** Services are running but not responding

**Solution:**
```bash
# Check service logs
ssh -i ~/.ssh/id_rsa root@10.0.0.5
pct exec 102 -- bash

# Backend logs
docker logs sportsmanager-backend --tail=50

# Frontend logs
docker logs sportsmanager-frontend --tail=50

# Test endpoints manually
curl http://localhost:3001/health
curl http://localhost:3004
```

## Best Practices

### Before Pushing to Main

1. ✅ Test locally with `npm run dev`
2. ✅ Run migrations locally first
3. ✅ Check `git status` for untracked files
4. ✅ Review changes with `git diff develop..main`
5. ✅ Ensure no hardcoded secrets

### Database Migrations

- Always test migrations on a copy of production data
- Use transactions where possible
- Never delete columns without data migration
- Keep migrations small and focused

### Environment Variables

- Never commit `.env` files
- Use `.env.example` as template
- Update deployment/.env on server manually for secrets

### Monitoring After Deployment

1. Check https://syncedsport.com loads
2. Test critical API endpoints
3. Check Docker container health:
   ```bash
   docker ps
   ```
4. Monitor logs for errors:
   ```bash
   docker logs sportsmanager-backend --follow
   ```

## Advanced Configuration

### Adding Staging Environment

1. Create new Proxmox container (e.g., CT103)
2. Copy `.github/workflows/deploy-production.yml` to `deploy-staging.yml`
3. Change:
   - Branch trigger: `develop`
   - Container ID: `103`
   - Domain: `staging.syncedsport.com`
4. Configure Cloudflare Tunnel for staging subdomain

### Database Backup Retention

Backups are stored in: `/root/SportsManager/deployment/database-dumps/backups/`

To clean old backups (keep last 7 days):
```bash
find /root/SportsManager/deployment/database-dumps/backups/ -name "backup_*.dump" -mtime +7 -delete
```

Add this to a cron job on the server.

### Slack Notifications

Add to `.github/workflows/deploy-production.yml`:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Production deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

Then add `SLACK_WEBHOOK` secret to GitHub.

## Summary

Your CI/CD pipeline is now configured with:

✅ Automated deployments on push to `main`
✅ Database backup before changes
✅ Automatic migration detection
✅ Health checks and verification
✅ Rollback capability
✅ Production environment protection

**Next Steps:**
1. Add `SSH_PRIVATE_KEY` to GitHub Secrets
2. Create `production` environment in GitHub
3. Test deployment with empty commit
4. Monitor first deployment carefully
5. Document any custom configuration

## Questions?

- **How do I deploy manually?** Use workflow_dispatch in Actions tab
- **Can I rollback?** Yes, uncomment rollback section or push previous commit
- **How long does deployment take?** 3-5 minutes typically
- **Is there downtime?** < 10 seconds during container swap
- **What if migration fails?** Deployment stops, old version stays running
