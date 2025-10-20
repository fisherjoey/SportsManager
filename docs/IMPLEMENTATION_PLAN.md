# SportsManager Development Workflow Implementation Plan

**Date:** October 19, 2025
**Status:** Ready to implement
**Estimated Time:** 5-6 hours

---

## Current State

### Infrastructure
- **CT101 (gateway)**: Cloudflare Tunnel, Nginx, Grafana, GitHub Actions runner
- **CT102 (websites)**: Production and dev Docker containers
  - Production: Backend (3001), Frontend (3004), Postgres, Cerbos
  - Dev: Backend-dev (3002), Frontend-dev (3005) - currently using main branch
- **Domains**:
  - Production: https://syncedsport.com
  - Dev: https://dev.syncedsport.com (configured but not used)

### Git Setup
- **Current branch on CT102**: main
- **Working features**: Production deployment, Cerbos authorization, all containers healthy

### Issues to Fix
1. **CI/CD fails** - SSH key on CT101 runner is corrupted (1 byte instead of full key)
2. **No develop branch** - All work happens on main
3. **No local dev setup** - Developers can't easily run locally
4. **Dev containers unused** - dev.syncedsport.com exists but containers track main

---

## Goals (From User Requirements)

### 1. Local Development
- 5 developers need easy local setup
- One command to start: `docker-compose up`
- Includes: Postgres with seed data, Cerbos, Backend, Frontend
- Hot-reload for frontend and backend
- Seed data = current production data (export from prod DB)

### 2. Git Workflow
```
feature/* → develop (auto-deploy to dev.syncedsport.com)
develop → main (auto-deploy to syncedsport.com)
```

### 3. Branch Protection
- **main**: No direct push, no force push
- **develop**: No protection, allow direct push

### 4. CI/CD
- Fix production pipeline (SSH issue on CT101 runner)
- Create dev pipeline (deploy on merge to develop)
- No CI/CD checks on develop (yet)

---

## Implementation Steps

### Phase 1: Fix Production CI/CD (1 hour)

**Problem:** Runner SSH key is corrupted (only 1 byte)

**Location:** CT101 → `/home/runner/.ssh/id_rsa` is corrupted

**Fix:**
```bash
# 1. Get the correct SSH key from host
ssh -i ~/.ssh/id_rsa root@10.0.0.5 "cat ~/.ssh/id_rsa"

# 2. Copy it to runner user on CT101
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 101 -- bash -c "cat > /home/runner/.ssh/id_rsa << '\''EOF'\''
[PASTE FULL KEY HERE]
EOF
chmod 600 /home/runner/.ssh/id_rsa
chown runner:runner /home/runner/.ssh/id_rsa"'

# 3. Test SSH as runner user
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 101 -- bash -c "su - runner -c \"ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa root@10.0.0.5 echo test\""'

# 4. Update workflow to NOT recreate SSH key
# Remove this step from .github/workflows/deploy-production.yml:
#   - name: Setup SSH key
#     run: |
#       mkdir -p ~/.ssh
#       echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa  # <-- REMOVE THIS
#       chmod 600 ~/.ssh/id_rsa
#       ssh-keyscan -H ${{ env.SERVER_HOST }} >> ~/.ssh/known_hosts
```

**Updated workflow step:**
```yaml
- name: Ensure SSH known_hosts
  run: |
    mkdir -p ~/.ssh
    ssh-keyscan -H ${{ env.SERVER_HOST }} >> ~/.ssh/known_hosts 2>/dev/null || true
```

**Test:** Push a commit to main and verify it deploys

---

### Phase 2: Export Production Data for Seeds (30 min)

```bash
# 1. Export full database
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- bash -c "docker exec -e PGPASSWORD=postgres123 sportsmanager-postgres pg_dump -U postgres -d sports_management --data-only --inserts -f /tmp/seed_data.sql"'

# 2. Copy to local machine
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- bash -c "docker cp sportsmanager-postgres:/tmp/seed_data.sql /root/"'
scp -i ~/.ssh/id_rsa root@10.0.0.5:/root/seed_data.sql ./deployment/seed-data/

# 3. Split into logical files (optional but recommended)
# deployment/seed-data/
#   01-users.sql
#   02-roles.sql
#   03-organizations.sql
#   04-teams.sql
#   05-games.sql
#   06-referees.sql
```

---

### Phase 3: Create Develop Branch (10 min)

```bash
# 1. Create and push develop branch
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop

# 2. Update CT102 dev containers to track develop
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- bash -c "cd /root/SportsManager && git fetch --all && git checkout -b develop origin/develop"'

# 3. No need to change docker-compose.dev.yml yet - it already exists
```

---

### Phase 4: Create Local Development Setup (2 hours)

**Files to create:**

1. **`deployment/docker-compose.local.yml`** - Full local environment
2. **`backend/Dockerfile.dev`** - Hot-reload backend
3. **`frontend/Dockerfile.dev`** - Hot-reload frontend
4. **`deployment/.env.local.example`** - Template environment file
5. **`deployment/seed-data/`** - Production data export

**Key features:**
- Mounts source code as volumes (no rebuild needed)
- Hot-reload: nodemon for backend, Next.js dev mode for frontend
- Exposes ports: Frontend (3000), Backend (3001), Postgres (5432), Cerbos (3592/3593)
- Auto-loads seed data on first run

**See full docker-compose.local.yml in previous chat context**

---

### Phase 5: Create Dev CI/CD Workflow (30 min)

**File:** `.github/workflows/deploy-development.yml`

```yaml
name: Deploy to Development

on:
  push:
    branches: [develop]
  workflow_dispatch:

env:
  SERVER_HOST: 10.0.0.5
  CONTAINER_ID: 102
  DEPLOY_PATH: /root/SportsManager

jobs:
  deploy-dev:
    name: Deploy to Dev Server
    runs-on: self-hosted

    steps:
      - name: Ensure SSH known_hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ env.SERVER_HOST }} >> ~/.ssh/known_hosts 2>/dev/null || true

      - name: Pull latest code on dev
        run: |
          ssh -i ~/.ssh/id_rsa root@${{ env.SERVER_HOST }} \
            "pct exec ${{ env.CONTAINER_ID }} -- bash -c '\
              cd ${{ env.DEPLOY_PATH }} && \
              git fetch --all && \
              git checkout develop && \
              git pull origin develop\
            '"

      - name: Run database migrations
        run: |
          ssh -i ~/.ssh/id_rsa root@${{ env.SERVER_HOST }} \
            "pct exec ${{ env.CONTAINER_ID }} -- bash -c '\
              docker exec sportsmanager-backend-dev sh -c \"cd /app && npx knex migrate:latest\"\
            '"

      - name: Rebuild dev containers
        run: |
          ssh -i ~/.ssh/id_rsa root@${{ env.SERVER_HOST }} \
            "pct exec ${{ env.CONTAINER_ID }} -- bash -c '\
              cd ${{ env.DEPLOY_PATH }}/deployment && \
              docker compose -f docker-compose.dev.yml up -d --build\
            '"

      - name: Health checks
        run: |
          sleep 10
          ssh -i ~/.ssh/id_rsa root@${{ env.SERVER_HOST }} \
            "pct exec ${{ env.CONTAINER_ID }} -- bash -c '\
              curl -f http://localhost:3002/health || exit 1\
            '"
          curl -f https://dev.syncedsport.com || exit 1
```

---

### Phase 6: Update docker-compose.dev.yml (15 min)

**File:** `deployment/docker-compose.dev.yml`

Ensure it has:
- Backend-dev on port 3002 with `DISABLE_AUTH: true` (for Figma testing)
- Frontend-dev on port 3005 with `NEXT_PUBLIC_DISABLE_AUTH: true`
- Points to `sports_management_dev` database
- Environment variables for dev.syncedsport.com

**Already mostly exists - just verify it's correct**

---

### Phase 7: Documentation (1 hour)

**Files to create:**

1. **`docs/DEVELOPER_SETUP.md`** - Quick start guide (5 min to running)
2. **`docs/LOCAL_DEVELOPMENT.md`** - Detailed local dev guide
3. **`docs/WORKFLOW.md`** - Git workflow, PR process, deployment flow
4. **`README.md`** - Update with new workflow diagram

**Key sections:**
- Prerequisites (Docker, Git)
- Quick start (clone, checkout, docker-compose up)
- Test credentials (from seed data)
- Making changes (hot-reload behavior)
- Creating features (branch, commit, PR)
- Troubleshooting

---

### Phase 8: GitHub Branch Protection (5 min)

**On GitHub web UI:**

1. Go to: Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Do not allow bypassing the above settings
   - ❌ Everything else off
4. Save

**Result:** Can't direct push or force push to main, must use PR

---

## File Structure Created

```
SportsManager/
├── .github/workflows/
│   ├── deploy-production.yml     (UPDATE - remove SSH key setup)
│   └── deploy-development.yml    (NEW)
│
├── deployment/
│   ├── docker-compose.local.yml  (NEW - for developers)
│   ├── docker-compose.dev.yml    (EXISTS - verify config)
│   ├── docker-compose.deploy.yml (EXISTS - no changes)
│   ├── .env.local.example        (NEW)
│   └── seed-data/                (NEW)
│       └── seed_data.sql         (Export from prod)
│
├── backend/
│   └── Dockerfile.dev            (NEW - hot-reload)
│
├── frontend/
│   └── Dockerfile.dev            (NEW - hot-reload)
│
└── docs/
    ├── DEVELOPER_SETUP.md        (NEW)
    ├── LOCAL_DEVELOPMENT.md      (NEW)
    ├── WORKFLOW.md               (NEW)
    └── IMPLEMENTATION_PLAN.md    (THIS FILE)
```

---

## Developer Workflow (Final)

### Day-to-day Development

```bash
# 1. Start local environment
cd SportsManager/deployment
docker-compose -f docker-compose.local.yml up

# 2. Make changes (auto-reload)
# - Edit frontend/src/* → browser refreshes
# - Edit backend/src/* → server restarts

# 3. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 4. Commit and push
git add .
git commit -m "feat: Add my feature"
git push origin feature/my-feature

# 5. Create PR on GitHub
# feature/my-feature → develop (no review required)

# 6. Merge PR
# → Auto-deploys to dev.syncedsport.com

# 7. Test on dev server
# Open https://dev.syncedsport.com

# 8. When ready for production
# Create PR: develop → main
# → Auto-deploys to syncedsport.com (after review if needed)
```

---

## Testing Checklist

After implementation, verify:

- [ ] Production CI/CD works (push to main deploys)
- [ ] Dev CI/CD works (push to develop deploys to dev.syncedsport.com)
- [ ] Local dev starts with one command
- [ ] Hot-reload works (frontend and backend)
- [ ] Seed data loads on first run
- [ ] Branch protection prevents direct push to main
- [ ] Dev server accessible at https://dev.syncedsport.com
- [ ] Prod server accessible at https://syncedsport.com
- [ ] All containers healthy on CT102

---

## Current Issues to Remember

### Already Fixed ✅
- Cerbos healthcheck (now using built-in command)
- Super admin authorization (backend needed restart)
- Containers renamed (CT101=gateway, CT102=websites)
- Auto-start on boot enabled

### To Fix in New Chat
1. **SSH key on runner** - Currently 1 byte, needs full key
2. **docker-compose.dev.yml** - May need environment variable updates
3. **Create all the new files** - Local dev setup, docs, workflows

---

## Quick Commands Reference

```bash
# Access containers
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 101 -- bash'  # Gateway
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- bash'  # Websites

# Check Docker containers
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- docker ps'

# View logs
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- docker logs sportsmanager-backend'

# Runner logs
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 101 -- systemctl status actions.runner.fisherjoey-SportsManager.ct101-sports-runner'

# Database export
ssh -i ~/.ssh/id_rsa root@10.0.0.5 'pct exec 102 -- docker exec -e PGPASSWORD=postgres123 sportsmanager-postgres pg_dump -U postgres -d sports_management --data-only --inserts -f /tmp/seed.sql'
```

---

## Important Context for New Chat

### What's Working
- Production site: https://syncedsport.com ✅
- All containers healthy ✅
- Cerbos authorization working ✅
- Super admin has full access ✅
- Cloudflare Tunnel configured for both prod and dev ✅
- Nginx configured for both domains ✅

### Critical Files
- Production workflow: `.github/workflows/deploy-production.yml`
- Production compose: `deployment/docker-compose.deploy.yml`
- Dev compose: `deployment/docker-compose.dev.yml`
- Cerbos policies: `cerbos-policies/` (all working correctly)

### Key Decisions Made
1. Keep runner on CT101, fix SSH (not move to CT102)
2. Seed data = full production database export
3. No PR reviews required for develop
4. Main branch: only protect against direct/force push

---

## Start Here in New Chat

**Prompt for new chat:**

```
I need to implement a complete developer workflow for a 5-person team.
Here's the implementation plan: [attach this file]

Current state:
- Production is working (syncedsport.com)
- CI/CD is broken (SSH key issue on GitHub runner)
- No develop branch yet
- No local dev environment

Can you help me implement this plan? Let's start with Phase 1: fixing the SSH key on the GitHub Actions runner at CT101.
```

---

## Estimated Timeline

| Phase | Time | Priority |
|-------|------|----------|
| 1. Fix Prod CI/CD | 1h | HIGH |
| 2. Export Seed Data | 30m | HIGH |
| 3. Create Develop Branch | 10m | HIGH |
| 4. Local Dev Setup | 2h | MEDIUM |
| 5. Dev CI/CD | 30m | MEDIUM |
| 6. Update Dev Compose | 15m | MEDIUM |
| 7. Documentation | 1h | LOW |
| 8. Branch Protection | 5m | MEDIUM |
| **Total** | **~5.5h** | |

---

## Success Criteria

✅ **Working when:**
1. Pushing to main deploys to production automatically
2. Pushing to develop deploys to dev.syncedsport.com automatically
3. Developers can run `docker-compose up` and start coding
4. Hot-reload works for both frontend and backend
5. Cannot direct push to main (branch protection)
6. Documentation is clear enough for new developers

---

**End of Implementation Plan**
