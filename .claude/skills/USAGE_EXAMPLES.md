# Skill Usage Examples

Real-world examples of using SportsManager Claude Skills.

## Quick Commands Cheat Sheet

| Task | Command |
|------|---------|
| Security check | "Analyze all API endpoints for missing Cerbos authorization" |
| Performance check | "Analyze database schema for missing indexes" |
| Before deploy | "Validate frontend-backend contract for critical issues" |
| New table | "Generate seed data for [table_name]" |
| Weekly report | "Run all quality checks" |
| Bug investigation | "Check schema for performance issues in [table_name]" |
| After adding endpoint | "Validate [endpoint] matches frontend requirements" |
| Documentation gap | "Find undocumented API endpoints" |

---

## Scenario 1: Starting Phase 1 (Mentorship System)

### Day 1: Database Setup

**You:**
```
Analyze database schema to prepare for adding mentorship tables
```

**Skill Used:** Database Schema Analyzer

**Expected Output:**
- Current schema status (104/116 tables)
- List of 12 missing tables
- Recommended migration file structure
- Index requirements

---

**You:**
```
Generate seed data for the new mentorship tables
```

**Skill Used:** Seed Data Generator

**Expected Output:**
- Complete Knex seed file
- 2 mentors, 5 mentees, 15 assignments
- Realistic test data
- Test account credentials

---

### Day 2: Implementing Endpoints

**You:**
```
After implementing GET /api/mentees/:menteeId, analyze all endpoints
```

**Skill Used:** API Endpoint Analyzer

**What it checks:**
- New endpoint has Cerbos authorization
- Error handling is proper
- Response format is consistent
- Documentation is added

---

### Day 3: Frontend Integration

**You:**
```
Validate that the new mentorship endpoints match frontend requirements
```

**Skill Used:** Frontend-Backend Contract Validator

**What it checks:**
- Request/response types match
- All required fields present
- Frontend expectations align with backend

---

## Scenario 2: Pre-Deployment Quality Check

**You:**
```
I'm about to deploy Phase 1 to dev. Run a comprehensive quality check.
```

**Recommended Sequence:**

1. Database Schema Analyzer - Validate new tables
2. API Endpoint Analyzer - Check security
3. Frontend-Backend Contract Validator - Verify alignment
4. Seed Data Generator - Ensure test data works

---

## Scenario 3: Investigating a Bug

**User reports:** "Mentee detail page is loading slowly"

**You:**
```
Analyze database schema focusing on performance issues for mentorship tables
```

**Skill Used:** Database Schema Analyzer

**What it finds:**
- Missing indexes on foreign keys
- N+1 query problems
- Sequential scan issues
- Recommended fixes with time improvements

---

## Scenario 4: Adding a New Feature

**Task:** Implement expense approval workflow (Phase 2)

**Step 1:**
```
Generate seed data for testing expense approval workflow
```

**What you get:**
- Expenses in all states (pending, approved, rejected)
- Realistic amounts and descriptions
- Proper user relationships

**Step 2:**
```
After implementing the endpoints, validate they match frontend requirements
```

**What it checks:**
- All 3 endpoints match frontend expectations
- Required fields are present
- Error responses are consistent

---

## Scenario 5: Refactoring Response Formats

**You:**
```
Check how many endpoints use non-standard response formats
```

**Skill Used:** API Endpoint Analyzer

**What it shows:**
- Endpoints using { data, pagination } format
- Endpoints using other formats
- Recommended standardization plan
- Impact estimate

---

## Scenario 6: Documentation Sync

**You:**
```
Find all undocumented API endpoints
```

**Skill Used:** API Endpoint Analyzer

**What it finds:**
- Endpoints missing from API.md
- Endpoints without JSDoc comments
- Recommended documentation updates

---

## Scenario 7: Weekly Health Check

**Every Monday:**
```
Run all quality checks
```

**Combined Report Shows:**
- API endpoint health score
- Contract compliance percentage
- Schema health status
- Seed data status
- Weekly progress toward 218-hour goal

---

## Tips for Best Results

### Be Specific
- Bad: "Check the database"
- Good: "Analyze database schema focusing on missing indexes in mentorship tables"

### Provide Context
- Bad: "Generate seed data"
- Good: "Generate seed data for mentorship tables with 3 mentors and 10 mentees"

### Ask for What You Need
- Bad: "Run all checks"
- Good: "I'm deploying Phase 1 to production. Run critical checks only."

### Follow Up
- First: "Analyze endpoints"
- Then: "Show me how to fix the 3 critical issues you found"

---

## Common Use Cases

### Before Starting a Phase
```
1. Analyze database schema for [phase] tables
2. Generate seed data for testing
3. Check which endpoints need implementation
```

### After Implementing Endpoints
```
1. Analyze endpoints for security issues
2. Validate contract with frontend
3. Check documentation completeness
```

### Before Deployment
```
1. Run all quality checks
2. Validate schema changes
3. Verify seed data works
4. Check for critical issues
```

### Weekly Maintenance
```
1. Analyze all endpoints (security & quality)
2. Validate frontend-backend contracts
3. Check schema health
4. Review progress against roadmap
```

---

## Time Savings Examples

| Task | Manual Time | With Skill | Savings |
|------|-------------|------------|---------|
| Check all 330 endpoints for Cerbos auth | 3-4 hours | 5 minutes | 3.9 hours |
| Validate 168 frontend requirements | 4-6 hours | 5 minutes | 5.9 hours |
| Find missing database indexes | 2-3 hours | 5 minutes | 2.9 hours |
| Create realistic seed data | 1-2 hours | 5 minutes | 1.9 hours |
| **Total per cycle** | **10-15 hours** | **20 minutes** | **14.6 hours** |

---

**Remember:** Skills save you 28-45 hours across your 218-hour roadmap. Use them frequently!
