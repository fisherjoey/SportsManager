# SportsManager Claude Skills

This directory contains specialized Claude Skills designed for the SportsManager project.

## Available Skills

### 1. 📊 API Endpoint Analyzer
**File:** `api-endpoint-analyzer.md`

**Purpose:** Analyzes all backend API endpoints for quality, security, and consistency.

**Use when:**
- Auditing API security (checking Cerbos authorization)
- Finding duplicate routes
- Validating error handling patterns
- Checking endpoint documentation

**Example usage:**
```
Analyze all API endpoints
```

**What it checks:**
- ✅ Cerbos authorization coverage (330+ endpoints)
- ✅ Route conflicts and duplicates
- ✅ Error handling patterns
- ✅ Response consistency
- ✅ Documentation completeness

**Output:** Comprehensive quality report with actionable recommendations

---

### 2. 🔗 Frontend-Backend Contract Validator
**File:** `frontend-backend-contract-validator.md`

**Purpose:** Validates that frontend API calls match backend implementations.

**Use when:**
- Adding new API endpoints
- Modifying existing endpoints
- Before deploying to production
- Investigating API-related bugs

**Example usage:**
```
Validate frontend-backend API contract
```

**What it checks:**
- ✅ All 168 frontend requirements vs 330 backend endpoints
- ✅ Request/response type compatibility
- ✅ Missing endpoints (47 identified in audit)
- ✅ Breaking changes

**Output:** Contract validation report with critical mismatches highlighted

---

### 3. 🗄️ Database Schema Analyzer
**File:** `database-schema-analyzer.md`

**Purpose:** Analyzes PostgreSQL schema for quality, performance, and documentation sync.

**Use when:**
- Adding new tables/columns
- Optimizing database performance
- Finding missing indexes
- Checking schema documentation drift
- Before production deployments

**Example usage:**
```
Analyze database schema
```

**What it checks:**
- ✅ 116+ tables analyzed
- ✅ Missing indexes on foreign keys
- ✅ Schema vs documentation comparison
- ✅ Performance issues
- ✅ Constraint validation

**Output:** Schema health report with ERD diagrams and optimization recommendations

---

### 4. 🌱 Seed Data Generator
**File:** `seed-data-generator.md`

**Purpose:** Generates realistic test seed data following project conventions.

**Use when:**
- Creating seed data for new tables (e.g., mentorship system)
- Setting up local development
- Generating demo data
- Testing specific scenarios

**Example usage:**
```
Generate seed data for mentorship tables
```

**What it creates:**
- ✅ Realistic, contextually appropriate data
- ✅ Respects foreign key constraints
- ✅ Idempotent seed files (can run multiple times)
- ✅ Follows your 4-seed-file convention
- ✅ Includes test account credentials

**Output:** Complete Knex seed file ready to run

---

## How to Use Skills

### Method 1: Direct Invocation
Simply describe what you want:
```
Analyze all API endpoints
```

I'll recognize the intent and invoke the appropriate skill.

### Method 2: Explicit Skill Name
Reference the skill directly:
```
Use the API Endpoint Analyzer skill to check for missing Cerbos authorization
```

### Method 3: Specific Task
Be specific about what you need:
```
Generate seed data for the new mentorship_assignments table with 15 test records
```

---

## Skill Integration with Your Roadmap

These skills directly support your 218-hour implementation roadmap:

### Phase 1 (Weeks 1-2) - Critical
- **Seed Data Generator** → Create mentorship test data (4 tables)
- **Database Schema Analyzer** → Validate new tables before deployment
- **API Endpoint Analyzer** → Ensure new endpoints have Cerbos auth

### Phase 2 (Weeks 3-5) - High Priority
- **Frontend-Backend Contract Validator** → Verify new endpoints match frontend
- **API Endpoint Analyzer** → Check 13 new P1 endpoints

### Phase 3-5 (Weeks 6-9) - Medium/Low
- **Database Schema Analyzer** → Optimize performance (< 200ms target)
- **All Skills** → Maintain quality as you build 71 endpoints

---

## Expected Time Savings

Using these skills effectively can save:

| Skill | Time Saved | How |
|-------|------------|-----|
| API Endpoint Analyzer | 8-12 hours | Automated security/quality checks vs manual review |
| Contract Validator | 10-15 hours | Catch API mismatches before runtime testing |
| Schema Analyzer | 6-10 hours | Find missing indexes/issues faster |
| Seed Data Generator | 4-8 hours | Automated seed file creation vs manual |
| **TOTAL** | **28-45 hours** | Out of 218-hour roadmap (13-20% savings) |

---

## Best Practices

### When to Run Skills

**Daily:**
- API Endpoint Analyzer (after adding endpoints)
- Frontend-Backend Contract Validator (after API changes)

**Weekly:**
- Database Schema Analyzer (track schema evolution)
- Seed Data Generator (as you add tables)

**Before Deployment:**
- All 4 skills (comprehensive quality check)

### Skill Chaining

Run skills in sequence for comprehensive analysis:

1. **Database Schema Analyzer** → Ensure schema is healthy
2. **Seed Data Generator** → Create test data for new tables
3. **API Endpoint Analyzer** → Validate endpoints are secure
4. **Contract Validator** → Ensure frontend-backend alignment

---

## Skill Outputs

All skills generate:
- ✅ **Executive summaries** (quick overview)
- ✅ **Critical issues** (must fix)
- ✅ **Warnings** (should fix)
- ✅ **Recommendations** (nice to have)
- ✅ **Integration with audit docs** (links to your roadmap)

---

## Troubleshooting

### "Skill not found"
Make sure you're in the project root directory. Skills are in `.claude/skills/`.

### "Skill ran but no output"
Some skills need database access or specific files. Check the skill's "What this skill will do" section.

### "Output too verbose"
Ask for a summary:
```
Analyze all API endpoints and give me just the critical issues
```

### "Want different output format"
Specify your preference:
```
Check schema and output as a markdown table
```

---

## Project Context

These skills are designed specifically for SportsManager:

**Your Stack:**
- Backend: Node.js/Express/TypeScript
- Frontend: Next.js 15/React 19
- Database: PostgreSQL + Knex
- Auth: Cerbos RBAC
- Deployment: Docker + GitHub Actions

**Your Current Status:**
- ✅ 330 backend endpoints
- ✅ 168 frontend requirements
- ✅ 116 database tables
- 🔄 47 endpoints to implement (P0-P3)
- 🔄 12 tables to create (mentorship)
- 🔄 218 hours of work (9 weeks)

**Your Goals:**
- 85%+ test coverage
- < 200ms p95 response time
- Complete RBAC migration
- Finish implementation roadmap

---

## Feedback & Improvements

As you use these skills, consider:
- What worked well?
- What could be improved?
- What other skills would help?
- Should skills be combined or split?

Skills can be updated by editing the markdown files in this directory.

---

## Quick Reference

**Want to...**
- Check API security? → API Endpoint Analyzer
- Verify frontend works with backend? → Contract Validator
- Find database issues? → Schema Analyzer
- Create test data? → Seed Data Generator

**Remember:** Skills are tools to help you complete your 218-hour roadmap faster and with higher quality!

---

**Created:** 2025-10-19
**For:** SportsManager Project
**Context:** 218-hour implementation roadmap (9 weeks)
