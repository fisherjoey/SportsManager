#!/bin/bash

# Automated Work Session Script for Sports Management App
# Usage: ./scripts/setup/automated-work-session.sh [duration_minutes]

set -e

DURATION=${1:-120}  # Default 2 hours
SESSION_ID=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs/sessions"
LOG_FILE="$LOG_DIR/session_$SESSION_ID.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p $LOG_DIR

echo -e "${BLUE}🚀 Starting Automated Work Session${NC}"
echo -e "${BLUE}Session ID: $SESSION_ID${NC}"
echo -e "${BLUE}Duration: $DURATION minutes${NC}"
echo -e "${BLUE}Log file: $LOG_FILE${NC}"
echo ""

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Error handling
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $LOG_FILE
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $LOG_FILE
}

log "=== AUTOMATED WORK SESSION STARTED ==="

# Phase 1: Environment Setup and Validation
echo -e "${BLUE}Phase 1: Environment Setup (5 minutes)${NC}"

log "Checking project structure..."
if [[ ! -f "package.json" ]]; then
    error_exit "Not in project root directory"
fi

log "Installing dependencies if needed..."
if [[ ! -d "node_modules" ]]; then
    npm install --silent || error_exit "Failed to install dependencies"
fi

log "Starting development server..."
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 10

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    success "Frontend server running on port 3000"
else
    warning "Frontend server may not be fully ready"
fi

# Start backend if available
if [[ -d "backend" ]]; then
    log "Starting backend server..."
    cd backend
    npm start > /dev/null 2>&1 &
    BACKEND_PID=$!
    cd ..
    sleep 5
    
    if curl -s http://localhost:5000/api/health > /dev/null; then
        success "Backend server running on port 5000"
    else
        warning "Backend server may not be ready"
    fi
fi

# Run initial frontend tests
log "Running initial frontend health check..."
npm run test:frontend > test-results/initial-test.log 2>&1 &
TEST_PID=$!

sleep 30  # Give tests time to run

# Phase 2: Automated Development Session
echo -e "${BLUE}Phase 2: Automated Development ($DURATION minutes)${NC}"

# Create detailed instruction file for Claude
INSTRUCTION_FILE="temp_instructions_$SESSION_ID.md"
cat > $INSTRUCTION_FILE << EOF
# Automated Work Session Instructions

## Session Context
- Session ID: $SESSION_ID
- Duration: $DURATION minutes
- Started: $(date)
- Log file: $LOG_FILE

## Current Status
Frontend: Running on http://localhost:3000
Backend: $(if [[ -n "$BACKEND_PID" ]]; then echo "Running on http://localhost:5000"; else echo "Not started"; fi)
Tests: Running initial health check

## Primary Objectives (Priority Order)
1. **Fix Authentication System** - Complete login/registration flow
2. **Enhance Game Management** - Add conflict detection and scheduling
3. **Improve Assignment System** - Implement smart algorithms
4. **Add Communication Features** - Notifications and messaging
5. **Enhance Mobile Experience** - Responsive design improvements

## Instructions
1. Start by reviewing the test results in test-results/initial-test.log
2. Follow the detailed instructions in docs/plans/automated-work-instructions-template.md
3. Focus on high-priority issues found in testing
4. Make incremental commits with descriptive messages
5. Run frontend tests after each major change
6. Document any blockers or issues encountered
7. Provide progress updates every 30 minutes

## Quality Requirements
- All code must pass TypeScript compilation
- No console errors or warnings
- Responsive design (mobile-first)
- Comprehensive error handling
- Proper loading states

## Testing Requirements
- npm run test:frontend must pass
- npm run lint must pass  
- npm run build must succeed

## Session Completion
- Commit all changes with proper commit messages
- Run final test suite
- Generate session summary report
- Update documentation as needed

## Emergency Contacts
If critical issues arise:
- Check logs in $LOG_FILE
- Review troubleshooting guide in automated-work-instructions-template.md
- Focus on fallback priorities if blocked

Start working immediately. Good luck!
EOF

log "Created instruction file: $INSTRUCTION_FILE"

# Start the actual automated work session
log "Launching Claude Code with automated instructions..."
echo -e "${GREEN}Starting automated development session...${NC}"

# Use Claude Code in headless mode
claude-code -p "$(cat $INSTRUCTION_FILE)" --output-format stream-json > $LOG_DIR/claude_output_$SESSION_ID.json 2>&1 &
CLAUDE_PID=$!

# Monitor the session
ELAPSED=0
INTERVAL=300  # 5 minute intervals

while [[ $ELAPSED -lt $(($DURATION * 60)) ]]; do
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
    REMAINING=$((($DURATION * 60) - ELAPSED))
    
    log "Session progress: $((ELAPSED / 60)) minutes elapsed, $((REMAINING / 60)) minutes remaining"
    
    # Check if Claude is still running
    if ! kill -0 $CLAUDE_PID 2>/dev/null; then
        warning "Claude Code session ended early"
        break
    fi
    
    # Run periodic health checks
    if curl -s http://localhost:3000 > /dev/null; then
        log "Frontend still running"
    else
        warning "Frontend server may have stopped"
    fi
done

log "Work session duration completed"

# Phase 3: Session Cleanup and Reporting
echo -e "${BLUE}Phase 3: Session Cleanup${NC}"

# Stop Claude Code if still running
if kill -0 $CLAUDE_PID 2>/dev/null; then
    log "Stopping Claude Code session..."
    kill $CLAUDE_PID 2>/dev/null || true
fi

# Run final tests
log "Running final test suite..."
npm run test:frontend > test-results/final-test.log 2>&1 || warning "Final tests had issues"

# Check build
log "Testing build process..."
npm run build > build-test.log 2>&1 && success "Build successful" || warning "Build had issues"

# Git status
log "Checking git status..."
git status > git-status.log

# Generate session report
REPORT_FILE="$LOG_DIR/session_report_$SESSION_ID.md"
cat > $REPORT_FILE << EOF
# Automated Work Session Report

## Session Details
- **Session ID:** $SESSION_ID
- **Duration:** $DURATION minutes
- **Started:** $(date -r $LOG_FILE '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown")
- **Completed:** $(date)

## Files Generated
- Session Log: $LOG_FILE
- Claude Output: $LOG_DIR/claude_output_$SESSION_ID.json
- Initial Tests: test-results/initial-test.log
- Final Tests: test-results/final-test.log
- Build Test: build-test.log
- Git Status: git-status.log

## Test Results
### Initial Tests
\`\`\`
$(head -20 test-results/initial-test.log 2>/dev/null || echo "No initial test results")
\`\`\`

### Final Tests
\`\`\`
$(head -20 test-results/final-test.log 2>/dev/null || echo "No final test results")
\`\`\`

## Git Changes
\`\`\`
$(cat git-status.log 2>/dev/null || echo "No git status available")
\`\`\`

## Next Steps
1. Review the detailed logs for specific changes made
2. Test the application manually to verify improvements
3. Address any remaining issues from the final test results
4. Plan the next automated session based on remaining priorities

## Session Artifacts
All session files are preserved in the logs/sessions/ directory for review.
EOF

success "Session report generated: $REPORT_FILE"

# Cleanup
log "Cleaning up temporary files..."
rm -f $INSTRUCTION_FILE build-test.log git-status.log

# Stop servers
if [[ -n "$DEV_PID" ]]; then
    kill $DEV_PID 2>/dev/null || true
    log "Stopped frontend server"
fi

if [[ -n "$BACKEND_PID" ]]; then
    kill $BACKEND_PID 2>/dev/null || true
    log "Stopped backend server"
fi

log "=== AUTOMATED WORK SESSION COMPLETED ==="

echo ""
echo -e "${GREEN}🎉 Automated work session completed!${NC}"
echo -e "${BLUE}📊 Session report: $REPORT_FILE${NC}"
echo -e "${BLUE}📝 Full logs: $LOG_FILE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the session report"
echo "2. Test the application manually"
echo "3. Check git changes and commit if needed"
echo "4. Plan next session based on remaining work"