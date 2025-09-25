## 🎯 Description
<!-- Provide a brief summary of the changes in this PR -->

## 📋 Type of Change
<!-- Mark the relevant option with an 'x' -->
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Maintenance/refactoring
- [ ] 🧪 Tests only
- [ ] 🚀 CI/CD changes

## 🔗 Related Issues
<!-- Link to the GitHub issue this PR addresses -->
Closes #<!-- issue number -->
Related to #<!-- issue number -->

## 🧪 Testing
<!-- Describe the testing that has been done -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated  
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing completed
- [ ] Tests pass locally (`npm test && cd backend && npm test`)
- [ ] Database migrations tested (if applicable)

### Test Coverage
<!-- Include coverage information if significant -->
- **Frontend**: X% coverage (target: 70%+)
- **Backend**: X% coverage (target: 75%+)

## 🔍 Code Quality Checklist
<!-- Verify these items before requesting review -->
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented where necessary
- [ ] No console.log statements left in production code
- [ ] Error handling is implemented appropriately
- [ ] TypeScript types are properly defined
- [ ] Security considerations have been addressed

## 📊 Performance Impact
<!-- Assess any performance implications -->
- [ ] Bundle size impact assessed (frontend changes)
- [ ] Database query performance considered (backend changes)
- [ ] API response time impact evaluated
- [ ] Memory usage impact considered

## 🗃️ Database Changes
<!-- If this PR includes database changes -->
- [ ] Migration files included
- [ ] Migration rollback tested
- [ ] Seed data updated (if needed)
- [ ] Database indexes considered
- [ ] Backward compatibility maintained

## 📱 Frontend Changes
<!-- If this PR includes frontend changes -->
- [ ] Responsive design tested
- [ ] Cross-browser compatibility verified
- [ ] Accessibility guidelines followed
- [ ] Loading states implemented
- [ ] Error states handled

## 🔧 Backend Changes
<!-- If this PR includes backend changes -->
- [ ] API documentation updated
- [ ] Input validation implemented
- [ ] Error responses standardized
- [ ] Logging added for debugging
- [ ] Rate limiting considered (if needed)

## 🔒 Security Considerations
<!-- Address any security implications -->
- [ ] Input sanitization implemented
- [ ] Authentication/authorization verified
- [ ] Sensitive data handling reviewed
- [ ] SQL injection prevention verified
- [ ] XSS prevention measures in place

## 📸 Screenshots/Demo
<!-- Include screenshots for UI changes or demo links -->
### Before
<!-- Screenshot or description of current state -->

### After  
<!-- Screenshot or description of new state -->

## 🚀 Deployment Notes
<!-- Any special considerations for deployment -->
- [ ] Environment variables added/changed
- [ ] Configuration updates required
- [ ] Third-party service dependencies
- [ ] Deployment order requirements
- [ ] Rollback plan considered

## 👀 Review Focus Areas
<!-- Guide reviewers on what to focus on -->
Please pay special attention to:
- [ ] Logic in `filename.js:line-range`
- [ ] Database migration safety
- [ ] Error handling patterns
- [ ] Performance optimizations
- [ ] Security implications

## 📋 Agent Completion Checklist
<!-- For Claude Code agents - verify all requirements met -->
- [ ] TodoWrite tool used to track progress
- [ ] All acceptance criteria from original issue met  
- [ ] Code follows AGENT-GUIDELINES.md standards
- [ ] Testing follows TESTING-STANDARDS.md requirements
- [ ] Documentation updated as needed
- [ ] Git commit messages follow conventional format
- [ ] No breaking changes without proper communication

## 🤝 Collaboration Notes
<!-- Any notes for other developers or future work -->
- **Dependencies**: This PR depends on #XXX being merged first
- **Follow-up work**: Issue #XXX should be created for...
- **Technical debt**: Consider refactoring X in a future PR
- **Known limitations**: This approach has limitations with...

---

## 📝 Reviewer Guidelines
### Required Reviews
- [ ] **Code Owner**: @username (required for architecture changes)
- [ ] **Security Review**: @security-team (required for auth/data changes)
- [ ] **Database Review**: @database-team (required for schema changes)

### Testing Verification
Please verify:
1. All tests pass in your local environment
2. Changes work as expected in manual testing
3. No regression in existing functionality
4. Performance impact is acceptable

---

**Agent Signature**: 🤖 Generated with [Claude Code](https://claude.ai/code)

<!-- 
For Reviewers:
- Check that all boxes are marked before approving
- Verify the code follows our established patterns
- Test locally if the change is significant
- Consider the impact on other parts of the system
-->