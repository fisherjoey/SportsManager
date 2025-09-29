# Cerbos Policy Creation Plan

## Executive Summary

**Current Status**: Super Admin can only access 3 resources (user, game, assignment). Need to create policies for the remaining 38 resources.

**Goal**: Create individual Cerbos policy YAML files for all 41 resources so Super Admin and Admin roles have full access to all API endpoints.

---

## Background: What Was Fixed

### Problem Identified
- Super Admin was getting "403 Forbidden" on all API calls except games and assignments
- Root cause: Cerbos was configured to use SQLite storage instead of loading YAML policy files from disk
- Secondary issue: Policy files had multiple YAML documents which the disk driver doesn't support

### Solution Applied
1. Changed `cerbos/config/config.yaml` storage driver from `sqlite3` to `disk`:
   ```yaml
   storage:
     driver: "disk"
     disk:
       directory: "/policies"
       watchForChanges: true
   ```

2. Backed up problematic multi-document files:
   - `cerbos/policies/default_resource.yaml` → `default_resource.yaml.bak`
   - `cerbos/policies/principal_admin.yaml` → `principal_admin.yaml.bak`
   - `cerbos/policies/_schemas.yaml` → `_schemas.yaml.bak`

3. Created individual policy file: `cerbos/policies/user.yaml`

4. Restarted Cerbos: `docker restart sportsmanager-cerbos`

---

## Current Working Policies

Located in `cerbos/policies/`:

1. **game.yaml** - Game resource policies (already existed)
2. **assignment.yaml** - Assignment resource policies (already existed)
3. **user.yaml** - User resource policies (newly created)

---

## Resources Requiring Policy Files

Based on backend route analysis, these 38 resources need policy files created:

### Category: Core Resources
1. **team** - Team management
2. **league** - League management
3. **location** - Location/venue management
4. **referee** - Referee management
5. **tournament** - Tournament management
6. **post** - Post/announcement management

### Category: Organization & Roles
7. **organization** - Organization management
8. **role** - Role management
9. **invitation** - User invitation management
10. **region** - Region management

### Category: Financial
11. **expense** - Expense tracking
12. **budget** - Budget management
13. **financial_transaction** - Transaction records
14. **financial_report** - Financial reporting
15. **financial_dashboard** - Financial dashboard data
16. **receipt** - Receipt management
17. **game_fee** - Game fee management
18. **purchase_order** - Purchase order management
19. **company_credit_card** - Credit card management
20. **accounting** - Accounting operations

### Category: HR & Personnel
21. **employee** - Employee management
22. **asset** - Asset management

### Category: Communication & Documents
23. **document** - Document management
24. **communication** - Communication management
25. **content** - Content management

### Category: Mentorship & Development
26. **mentorship** - Mentorship program management
27. **mentee_game** - Mentee game tracking

### Category: Reporting & Analytics
28. **report** - Report generation
29. **organizational_analytics** - Analytics data

### Category: Configuration & Admin
30. **cerbos_policy** - Cerbos policy management
31. **referee_role** - Referee role configuration
32. **referee_level** - Referee level configuration
33. **maintenance** - System maintenance operations
34. **updatable** - Updatable resource management

### Category: AI & Intelligence
35. **ai_suggestion** - AI-generated suggestions
36. **historic_pattern** - Historical pattern analysis
37. **chunk** - Data chunk management
38. **ai_assignment_rule** - AI assignment rule configuration

### Category: Scheduling
39. **calendar** - Calendar management

---

## Policy File Template

Each resource needs a file named `{resource}.yaml` in `cerbos/policies/` with this structure:

```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "{resource_name}"
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
```

### Important Notes:
- **File naming**: Must be `{resource}.yaml` (lowercase, matches resource name)
- **Single document**: Each file contains ONE resource policy (no `---` separators for multiple documents)
- **Action list**: Use the standard actions shown above (view, view:list, view:details, view:stats, create, update, delete, manage)
- **Roles**: Include both `admin` and `super_admin` for full access
- **No comments**: Keep the file clean - Cerbos is sensitive to formatting

---

## Step-by-Step Execution Plan

### Phase 1: Create Core Resource Policies (6 files)
Create policies for the most commonly used resources:

```bash
cd cerbos/policies/

# Create team.yaml
cat > team.yaml << 'EOF'
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "team"
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

# Repeat for: league.yaml, location.yaml, referee.yaml, tournament.yaml, post.yaml
```

### Phase 2: Create Organization & Role Policies (4 files)
```bash
# Create organization.yaml, role.yaml, invitation.yaml, region.yaml
```

### Phase 3: Create Financial Policies (10 files)
```bash
# Create expense.yaml, budget.yaml, financial_transaction.yaml, etc.
```

### Phase 4: Create HR & Personnel Policies (2 files)
```bash
# Create employee.yaml, asset.yaml
```

### Phase 5: Create Communication & Document Policies (3 files)
```bash
# Create document.yaml, communication.yaml, content.yaml
```

### Phase 6: Create Mentorship Policies (2 files)
```bash
# Create mentorship.yaml, mentee_game.yaml
```

### Phase 7: Create Reporting Policies (2 files)
```bash
# Create report.yaml, organizational_analytics.yaml
```

### Phase 8: Create Configuration Policies (4 files)
```bash
# Create cerbos_policy.yaml, referee_role.yaml, referee_level.yaml, maintenance.yaml, updatable.yaml
```

### Phase 9: Create AI Policies (4 files)
```bash
# Create ai_suggestion.yaml, historic_pattern.yaml, chunk.yaml, ai_assignment_rule.yaml
```

### Phase 10: Create Scheduling Policy (1 file)
```bash
# Create calendar.yaml
```

---

## Verification After Each Phase

After creating each batch of policies:

1. **Check Cerbos logs** for policy count:
   ```bash
   docker logs sportsmanager-cerbos 2>&1 | grep "Found.*executable policies" | tail -1
   ```
   Should show increasing policy count (started at 3, should end at 41)

2. **Test an endpoint** from that category:
   ```bash
   TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjViOTRmMy1hNzAwLTRjNTktYTI5Ny01ZGNiNTQzZDM3MmQiLCJlbWFpbCI6ImFkbWluQHJlZmFzc2lnbi5jb20iLCJyb2xlcyI6WyJTdXBlciBBZG1pbiIsIkFkbWluIl0sImlhdCI6MTc1OTAwNzQzMCwiZXhwIjoxNzU5NjEyMjMwfQ.kWjM3-7HEnRKs4FCWW6Nm59nx66bWUZAPOp9xcn7gV8"

   curl -s -X GET "http://localhost:3001/api/teams" \
     -H "Authorization: Bearer $TOKEN" | python -m json.tool
   ```

3. **Check for errors**:
   ```bash
   docker logs --tail 20 sportsmanager-cerbos 2>&1 | grep -i error
   ```

---

## Automated Script Option

For faster execution, create a script `create_policies.sh`:

```bash
#!/bin/bash

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

cd cerbos/policies/

for resource in "${RESOURCES[@]}"; do
  echo "Creating $resource.yaml..."
  cat > "$resource.yaml" << EOF
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
done

echo "Created ${#RESOURCES[@]} policy files"
echo "Restarting Cerbos..."
docker restart sportsmanager-cerbos

sleep 5
echo "Checking policy count..."
docker logs sportsmanager-cerbos 2>&1 | grep "Found.*executable policies" | tail -1
```

Run with:
```bash
chmod +x create_policies.sh
./create_policies.sh
```

---

## Expected Final State

After completion:

1. **Policy files**: 41 total YAML files in `cerbos/policies/`
2. **Cerbos logs**: Should show "Found 41 executable policies"
3. **API access**: Super Admin can access all endpoints without 403 errors
4. **Health check**: `curl http://localhost:3592/_cerbos/health` returns `{"status":"SERVING"}`

---

## Troubleshooting

### Issue: Cerbos shows "load failures"
- **Check**: Ensure no syntax errors in YAML files
- **Check**: Ensure each file has only ONE `---` separator at the top
- **Check**: Ensure proper indentation (2 spaces, no tabs)
- **View errors**: `docker logs sportsmanager-cerbos 2>&1 | grep -i error`

### Issue: Policy count not increasing
- **Check**: Cerbos `watchForChanges` is enabled (it is)
- **Manual reload**: `docker restart sportsmanager-cerbos`
- **Verify files exist**: `ls -l cerbos/policies/*.yaml | wc -l`

### Issue: Still getting 403 errors
- **Check resource name**: Ensure policy file name matches resource name in code exactly
- **Check roles**: Verify user has `admin` or `super_admin` role in database
- **Check Cerbos logs**: `docker logs --tail 50 sportsmanager-cerbos | grep CheckResources`
- **Enable debug logging**: Add to `backend/src/services/CerbosAuthService.ts`:
  ```typescript
  console.log('[CERBOS CHECK] Request:', JSON.stringify({
    principal: { id: principal.id, roles: principal.roles },
    resource: { kind: resource.kind, id: resource.id },
    action
  }, null, 2));
  ```

### Issue: Cerbos not loading policies from disk
- **Verify config**: Check `cerbos/config/config.yaml` has:
  ```yaml
  storage:
    driver: "disk"
    disk:
      directory: "/policies"
  ```
- **Check docker-compose**: Ensure policies directory is mounted:
  ```yaml
  volumes:
    - ./cerbos/policies:/policies:ro
  ```

---

## Testing Checklist

After creating all policies, test key endpoints:

- [ ] `GET /api/users` - User management
- [ ] `GET /api/teams` - Team management
- [ ] `GET /api/games` - Game management
- [ ] `GET /api/leagues` - League management
- [ ] `GET /api/tournaments` - Tournament management
- [ ] `GET /api/expenses` - Financial management
- [ ] `GET /api/documents` - Document management
- [ ] `GET /api/reports` - Reporting
- [ ] `GET /api/roles` - Role management
- [ ] `GET /api/organizations` - Organization management

All should return 200 OK with data (not 403 Forbidden).

---

## Reference Files

### Working Example: user.yaml
Located at: `cerbos/policies/user.yaml`

```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "user"
  rules:
    - actions:
        - view
        - view:list
        - view:details
        - view:stats
        - view:roles
        - create
        - update
        - delete
        - manage
      effect: EFFECT_ALLOW
      roles:
        - admin
        - super_admin
```

### Cerbos Configuration
Located at: `cerbos/config/config.yaml`

```yaml
storage:
  driver: "disk"
  disk:
    directory: "/policies"
    watchForChanges: true
```

### Docker Compose Configuration
Located at: `docker-compose.yml` (verify this section exists):

```yaml
cerbos:
  container_name: sportsmanager-cerbos
  image: ghcr.io/cerbos/cerbos:latest
  ports:
    - "3592:3592"
    - "3593:3593"
  volumes:
    - ./cerbos/config:/config:ro
    - ./cerbos/policies:/policies:ro
  command: ["server", "--config=/config/config.yaml"]
```

---

## Completion Criteria

✅ All 41 policy files created
✅ Cerbos logs show "Found 41 executable policies"
✅ No load failures in Cerbos logs
✅ Super Admin can access all tested endpoints
✅ No 403 Forbidden errors for admin/super_admin roles

---

## Next Steps After Completion

1. **Fine-tune policies**: Add role-specific permissions for non-admin roles (Referee, Assignor, etc.)
2. **Add conditions**: Implement resource-level conditions (e.g., users can only edit their own data)
3. **Testing**: Comprehensive testing with different user roles
4. **Documentation**: Update API documentation with required roles for each endpoint
5. **Cleanup**: Remove `.bak` backup files once confirmed working

---

## Contact & Support

- **Cerbos Documentation**: https://docs.cerbos.dev/
- **Cerbos Policy Examples**: https://github.com/cerbos/cerbos/tree/main/docs/examples
- **Project Location**: `C:\Users\School\OneDrive\Desktop\SportsManager-pre-typescript`
- **Cerbos Health Check**: http://localhost:3592/_cerbos/health