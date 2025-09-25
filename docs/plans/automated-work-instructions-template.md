# Automated Work Session Instructions Template

## Session Overview
**Duration:** 1-2 hours
**Objective:** Systematic improvement of Sports Management App with focus on core functionality
**Priority:** High-impact features that enhance user experience and business value

---

## **Pre-Work Setup Checklist**

### Environment Verification
```bash
# 1. Verify development environment
npm run dev & sleep 5 && curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend failed"

# 2. Check backend status
cd backend && npm start & sleep 5 && curl -s http://localhost:5000/api/health > /dev/null && echo "✅ Backend running" || echo "❌ Backend failed"

# 3. Run frontend health check
npm run test:frontend

# 4. Check git status
git status && echo "✅ Git status checked"
```

### Documentation Review
- Read `/docs/reports/app-page-expectations-analysis.md` for context
- Review `/CLAUDE.md` for project instructions
- Check current branch and any pending work

---

## **Work Session Priority Matrix**

### **Priority 1 (Critical - Address First)**
1. **Authentication System Enhancement**
   - Fix login/logout functionality issues
   - Add user registration flow
   - Implement password reset
   - Add role-based route protection

2. **Core Game Management**
   - Enhance game scheduling with conflict detection
   - Improve assignment workflow
   - Add game status tracking
   - Implement referee confirmation system

### **Priority 2 (High Impact)**
1. **Assignment System Intelligence**
   - Enhance AI assignment algorithms
   - Add bulk assignment capabilities
   - Implement turn-back management
   - Add assignment conflict resolution

2. **Communication System**
   - Build notification system
   - Add email/SMS integration
   - Create announcement system
   - Implement emergency broadcasts

### **Priority 3 (Feature Enhancement)**
1. **Financial System**
   - Enhance payroll processing
   - Add automated invoicing
   - Improve expense tracking
   - Add financial reporting

2. **Mobile Experience**
   - Improve responsive design
   - Add PWA capabilities
   - Enhance mobile navigation
   - Add touch-friendly interactions

---

## **Detailed Work Instructions**

### **Session Structure (120 minutes total)**

#### **Phase 1: Assessment & Planning (15 minutes)**
```bash
# Take screenshots of current state
npm run test:frontend

# Identify specific issues from test results
# Create focused todo list based on findings
# Prioritize based on impact and complexity
```

#### **Phase 2: High-Priority Implementation (60 minutes)**

**Authentication Enhancement (30 minutes):**
```typescript
// 1. Fix login form validation and error handling
// 2. Add registration page with proper validation
// 3. Implement password reset flow
// 4. Add role-based route guards
// 5. Test all authentication flows
```

**Game Management Core (30 minutes):**
```typescript
// 1. Add conflict detection to game scheduling
// 2. Enhance assignment confirmation workflow  
// 3. Add game status updates (scheduled, in-progress, completed)
// 4. Implement referee check-in system
// 5. Add basic game result entry
```

#### **Phase 3: Feature Development (30 minutes)**

**Assignment System:**
```typescript
// 1. Enhance AI assignment with proximity calculation
// 2. Add bulk assignment tools
// 3. Implement assignment acceptance/decline
// 4. Add substitute referee system
// 5. Create assignment history tracking
```

#### **Phase 4: Testing & Validation (15 minutes)**
```bash
# 1. Run comprehensive frontend tests
npm run test:frontend

# 2. Test critical user flows
# 3. Check console for errors
# 4. Validate responsive design
# 5. Test database operations
```

---

## **Specific Implementation Examples**

### **Authentication Flow Enhancement**
```typescript
// Example: Registration page implementation
// File: app/register/page.tsx
export default function RegisterPage() {
  // Form validation with zod
  // Role selection (admin, referee, organization)
  // Email verification flow
  // Integration with backend API
  // Redirect to appropriate dashboard
}
```

### **Game Management Enhancement**
```typescript
// Example: Conflict detection system
// File: lib/game-scheduling.ts
export function detectSchedulingConflicts(gameData) {
  // Check referee availability
  // Verify venue booking
  // Validate official requirements
  // Return conflict list with recommendations
}
```

### **Assignment Intelligence**
```typescript
// Example: Smart assignment algorithm
// File: lib/ai-assignment-algorithm.ts
export function calculateOptimalAssignments(games, referees) {
  // Factor in proximity, availability, level, past performance
  // Minimize travel costs
  // Balance workload distribution
  // Consider referee preferences
}
```

---

## **Quality Standards & Validation**

### **Code Quality Requirements**
- All new code must pass TypeScript compilation
- Components must be responsive (mobile-first)
- Error handling must be comprehensive
- Loading states must be implemented
- Accessibility compliance (WCAG 2.1)

### **Testing Requirements**
```bash
# Must pass before completion
npm run lint
npm run test:frontend
npm run build

# Optional but recommended
npm run test:coverage
```

### **User Experience Standards**
- Pages must load in <3 seconds
- No console errors or warnings
- Forms must have proper validation
- Loading indicators for async operations
- Success/error feedback for user actions

---

## **Troubleshooting & Fallback Plans**

### **Common Issues & Solutions**

**Frontend Won't Start:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Database Connection Issues:**
```bash
cd backend
npm run migrate:latest
npm run seed:run
```

**Test Failures:**
```bash
# Update test selectors based on actual UI
# Check for timing issues in async operations
# Verify test data exists
```

### **Fallback Priorities**
If high-priority items are blocked:
1. Focus on UI/UX improvements
2. Enhance existing functionality
3. Add documentation and comments
4. Refactor and optimize existing code
5. Add comprehensive error handling

---

## **Progress Tracking & Communication**

### **Status Updates (Every 30 minutes)**
```markdown
## Progress Update [Timestamp]
**Completed:**
- [ ] Task 1 with specific details
- [ ] Task 2 with specific details

**In Progress:**
- [ ] Current task with estimated completion

**Blocked/Issues:**
- Issue description and attempted solutions

**Next Steps:**
- Next priority task
- Time estimate
```

### **Session Completion Report**
```markdown
## Work Session Summary
**Duration:** X hours
**Tasks Completed:** X/X
**Major Achievements:**
- Specific feature implemented
- Bug fixed with impact description
- Performance improvement

**Issues Encountered:**
- Problem description and resolution

**Next Session Priorities:**
- Carry-over tasks
- New priorities discovered

**Testing Results:**
- Frontend tests: X/X passing
- Console errors: X resolved
- Performance: Load time improvements
```

---

## **Technical Specifications**

### **Development Environment**
- Node.js 18+
- Next.js 15.2.4
- TypeScript 5+
- Tailwind CSS
- Radix UI components
- Playwright for testing

### **Backend Integration**
- Express.js server on port 5000
- SQLite database with Knex migrations
- RESTful API endpoints
- JWT authentication

### **Deployment Considerations**
- Build must pass without errors
- Environment variables properly configured
- Database migrations up to date
- Assets optimized and compressed

---

## **Success Metrics**

### **Quantitative Goals**
- Reduce console errors by 80%
- Improve page load times by 25%
- Increase test coverage to 90%
- Complete 80% of prioritized tasks

### **Qualitative Goals**
- Enhanced user experience flow
- Improved visual consistency
- Better error handling and feedback
- More intuitive navigation

---

*Template Version: 1.0*
*Last Updated: July 31, 2025*
*Next Review: After first automated session*