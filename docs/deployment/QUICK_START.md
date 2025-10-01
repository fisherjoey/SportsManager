# Quick Start: Creating Cerbos Policies

## TL;DR

Run this command from the project root:

```bash
./create_cerbos_policies.sh
```

This will create 38 policy files and restart Cerbos.

---

## What This Fixes

**Problem**: Super Admin getting "403 Forbidden" on API calls (except users, games, assignments)

**Root Cause**: Cerbos has policies for only 3 resources out of 41

**Solution**: Create individual policy files for all 38 remaining resources

---

## Files Created

1. **CERBOS_POLICY_CREATION_PLAN.md** - Complete documentation (read this for details)
2. **create_cerbos_policies.sh** - Automated script (run this to execute)
3. **QUICK_START.md** - This file (quick reference)

---

## Step by Step (Manual)

If the script doesn't work, create files manually:

1. Go to policies directory:
   ```bash
   cd cerbos/policies/
   ```

2. Create each policy file (example for `team`):
   ```bash
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
   ```

3. Repeat for all 38 resources listed in CERBOS_POLICY_CREATION_PLAN.md

4. Restart Cerbos:
   ```bash
   docker restart sportsmanager-cerbos
   ```

---

## Verification

1. **Check policy count**:
   ```bash
   docker logs sportsmanager-cerbos 2>&1 | grep "Found.*executable policies" | tail -1
   ```
   Should show: "Found 41 executable policies"

2. **Test an endpoint**:
   ```bash
   TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjViOTRmMy1hNzAwLTRjNTktYTI5Ny01ZGNiNTQzZDM3MmQiLCJlbWFpbCI6ImFkbWluQHJlZmFzc2lnbi5jb20iLCJyb2xlcyI6WyJTdXBlciBBZG1pbiIsIkFkbWluIl0sImlhdCI6MTc1OTAwNzQzMCwiZXhwIjoxNzU5NjEyMjMwfQ.kWjM3-7HEnRKs4FCWW6Nm59nx66bWUZAPOp9xcn7gV8"
   curl -s -X GET "http://localhost:3001/api/teams" -H "Authorization: Bearer $TOKEN"
   ```
   Should return JSON data (not 403 error)

---

## Resources That Need Policies

- Core: team, league, location, referee, tournament, post
- Organization: organization, role, invitation, region
- Financial: expense, budget, financial_transaction, financial_report, financial_dashboard, receipt, game_fee, purchase_order, company_credit_card, accounting
- HR: employee, asset
- Communication: document, communication, content
- Mentorship: mentorship, mentee_game
- Reporting: report, organizational_analytics
- Config: cerbos_policy, referee_role, referee_level, maintenance, updatable
- AI: ai_suggestion, historic_pattern, chunk, ai_assignment_rule
- Scheduling: calendar

---

## Current Status

✅ Fixed: Cerbos now uses disk storage (loads YAML files)
✅ Working: user, game, assignment resources
❌ Needs work: 38 remaining resources

---

## Key Configuration

**Cerbos Config** (`cerbos/config/config.yaml`):
```yaml
storage:
  driver: "disk"
  disk:
    directory: "/policies"
    watchForChanges: true
```

**Policy Location**: `cerbos/policies/*.yaml`

**Cerbos Container**: `sportsmanager-cerbos`

---

## Troubleshooting

### Issue: Script doesn't run
```bash
chmod +x create_cerbos_policies.sh
./create_cerbos_policies.sh
```

### Issue: Cerbos shows errors
```bash
docker logs --tail 50 sportsmanager-cerbos | grep error
```

### Issue: Still getting 403
- Check policy file name matches resource name exactly
- Restart Cerbos: `docker restart sportsmanager-cerbos`
- Check logs: `docker logs sportsmanager-cerbos | tail -30`

---

## Success Criteria

- [ ] 41 policy files exist in `cerbos/policies/`
- [ ] Cerbos logs show "Found 41 executable policies"
- [ ] No load failures in Cerbos logs
- [ ] API calls return data (not 403 errors)
- [ ] Super Admin can access all endpoints

---

For complete documentation, see: **CERBOS_POLICY_CREATION_PLAN.md**