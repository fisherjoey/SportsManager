# Repository Structure Plan

## Current Status

### TypeScript Migration Achievement ✅
- **Backend Migration Complete**: Successfully migrated from JavaScript to TypeScript
- **Files Converted**: 231 TypeScript files (100% conversion rate)
- **Remaining JS Files**: 0 (all successfully migrated)
- **Runtime Status**: Backend server running successfully on port 3006
- **Build Status**: Compiles and runs without errors

### Repository Organization
The repository currently has frontend files mixed at the root level while the backend is properly isolated in its own directory. The backend has been fully migrated to TypeScript and is functioning correctly.

## Proposed Reorganization

### Target Structure
```
SportsManager/
├── backend/          # Node.js/Express API (already isolated)
├── frontend/         # Next.js application (to be created)
├── docs/            # Shared documentation
├── scripts/         # Shared build/deploy scripts
├── .github/         # GitHub workflows and templates
└── README.md        # Project overview
```

### What Moves to `frontend/`

#### Directories
- **Core Code**: `app/`, `components/`, `hooks/`, `lib/`, `types/`
- **Assets**: `public/`
- **Testing**: `__tests__/`, `playwright-report/`, `test-results/`, `test-screenshots/`
- **Development**: `content/`, `stories/`
- **Deployment**: `deploy/`

#### Configuration Files
- **Next.js**: `next.config.js`, `next.config.mjs`, `next-env.d.ts`
- **Testing**: `jest.config.js`, `jest.setup.js`, `playwright.config.js`
- **Styling**: `tailwind.config.ts`, `postcss.config.mjs`
- **Build**: `package.json`, `package-lock.json`, `tsconfig.json`
- **Linting**: `.eslintrc.js`, `.prettierrc`
- **Environment**: `.dockerignore`, `.env.example`

### Required Updates

#### 1. GitHub Workflows (`.github/workflows/`)
- Update build commands: `npm run build` → `cd frontend && npm run build`
- Update path filters: `app/**` → `frontend/app/**`
- Files affected: `ci.yml`, `pr-checks.yml`, `deploy-*.yml`

#### 2. Docker Configuration
- Update Dockerfile paths for frontend builds
- Adjust `WORKDIR` and `COPY` commands

#### 3. Development Scripts
- Update any root-level scripts that reference frontend paths
- Consider adding workspace management scripts

### Benefits

1. **Clear Separation**: Backend and frontend are completely isolated
2. **No Import Changes**: All `@/` import aliases remain unchanged within frontend
3. **Independent Deployment**: Frontend and backend can be deployed separately
4. **Team Collaboration**: Clear boundaries for frontend and backend developers
5. **Monorepo Ready**: Easy to add tools like Turborepo, Nx, or Lerna later

### Migration Impact

- **Low Risk**: Backend remains untouched
- **Build Updates**: Only CI/CD scripts need updating
- **No Code Changes**: Import paths stay the same
- **Reversible**: Can be undone if needed

### Implementation Checklist

- [ ] Create `frontend/` directory
- [ ] Move all frontend directories
- [ ] Move all frontend configuration files
- [ ] Update GitHub workflow files
- [ ] Update Docker configuration
- [ ] Test build process
- [ ] Update documentation
- [ ] Commit changes

## Implementation Timeline

### Phase 1: Documentation Update ✅
- Update repository structure documentation with TypeScript migration status
- Document the successful backend migration

### Phase 2: Frontend Reorganization
- Create `frontend/` directory
- Move all frontend files and configurations
- Preserve all import paths and aliases

### Phase 3: CI/CD Updates
- Update GitHub Actions workflows
- Adjust path filters and build commands

### Phase 4: Docker Configuration
- Update Dockerfile paths
- Adjust build contexts

### Phase 5: Root-Level Setup
- Create workspace management scripts
- Update root README.md

### Phase 6: Documentation Finalization
- Update all path references
- Create migration notes

### Phase 7: Testing & Validation
- Verify builds work correctly
- Test deployment pipelines
- Ensure development workflow is smooth

## Decision Status

**Status**: In Progress
**Date**: September 24, 2025
**Backend TypeScript Migration**: Completed ✅
**Frontend Reorganization**: Starting
**Rationale**: Improve repository organization after successful TypeScript migration