# Role Pages Backend Integration - TODO

## Current Status

The frontend UnifiedRoleEditor now has a "Pages" tab that allows admins to select which pages a role can access. However, the backend integration is **not yet complete**.

## Frontend Implementation ✅

- `UnifiedRoleEditor.tsx` has Pages tab
- Sends `pages: string[]` in role create/update requests
- UI shows 25 pages organized by category
- Proper state management and validation

## Backend Integration Needed ⏳

### Option A: Database Storage (Recommended for MVP)

Store page assignments in a `role_pages` junction table.

**Pros**:
- Simple to implement
- Decoupled from Cerbos policies
- Easy to query and modify
- No file system access needed

**Implementation**:

1. **Create Migration**:
```sql
CREATE TABLE role_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(50) NOT NULL,
  page_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_name, page_id),
  FOREIGN KEY (role_name) REFERENCES roles(name) ON DELETE CASCADE
);

CREATE INDEX idx_role_pages_role ON role_pages(role_name);
CREATE INDEX idx_role_pages_page ON role_pages(page_id);
```

2. **Update `backend/src/routes/admin/unified-roles.ts`**:

Add to interfaces:
```typescript
interface UnifiedRole {
  name: string;
  description?: string;
  permissions: string[];
  pages?: string[];  // Add this
  userCount?: number;
  color?: string;
  source: 'cerbos' | 'database' | 'both';
}

interface RoleCreateData {
  name: string;
  description?: string;
  permissions: string[];
  pages?: string[];  // Add this
  color?: string;
}
```

Add to validation:
```typescript
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(500).allow('', null),
  permissions: Joi.array().items(Joi.string()).default([]),
  pages: Joi.array().items(Joi.string()).default([]),  // Add this
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6B7280')
});
```

3. **Update GET /api/admin/unified-roles/:name**:
```typescript
// After fetching role from database
const rolePages = await db('role_pages')
  .where({ role_name: name })
  .pluck('page_id');

return res.json({
  success: true,
  data: {
    ...role,
    pages: rolePages
  }
});
```

4. **Update POST /api/admin/unified-roles** (Create):
```typescript
// After creating role in Cerbos policy
if (pages && pages.length > 0) {
  const pageRecords = pages.map(pageId => ({
    role_name: name,
    page_id: pageId
  }));

  await db('role_pages').insert(pageRecords);
}
```

5. **Update PUT /api/admin/unified-roles/:name** (Update):
```typescript
// After updating role
if (pages !== undefined) {
  // Delete existing pages
  await db('role_pages').where({ role_name: name }).delete();

  // Insert new pages
  if (pages.length > 0) {
    const pageRecords = pages.map(pageId => ({
      role_name: name,
      page_id: pageId
    }));

    await db('role_pages').insert(pageRecords);
  }
}
```

6. **Update AuthProvider Page Permissions**:

Modify `backend/src/routes/pages.ts` GET `/permissions` to include role-based pages:

```typescript
// Get user's roles
const userRoles = user.roles || [];

// Get pages assigned to user's roles
const rolePages = await db('role_pages')
  .whereIn('role_name', userRoles)
  .pluck('page_id');

// Add to permissions response
const permissions = COMMON_PAGES.map(pageId => ({
  pageId,
  actions: {
    view: rolePages.includes(pageId),  // Check against role_pages
    access: rolePages.includes(pageId)
  }
}));
```

### Option B: Update Cerbos Policies (Future Enhancement)

Modify the `page.yaml` policy file directly to add role-based rules.

**Pros**:
- True single source of truth (Cerbos)
- Proper policy-driven access control
- Audit trail in policy history

**Cons**:
- Requires file system write access
- Need to reload Cerbos after changes
- More complex error handling
- Need YAML parsing/generation

**Implementation**: (Complex - not recommended for MVP)

Would require modifying Cerbos policy files programmatically and reloading Cerbos container.

## Recommendation

**Use Option A** (Database Storage) for now because:
1. Faster to implement
2. Easier to debug and maintain
3. Works well with existing role management
4. Can migrate to Option B later if needed

## Testing Checklist

Once implemented:
- [ ] Create role with pages selected → Pages saved to database
- [ ] Edit role and add/remove pages → Pages updated correctly
- [ ] Delete role → Associated pages deleted (CASCADE)
- [ ] User with role → Can access assigned pages
- [ ] User without role → Cannot access pages (403/redirect)
- [ ] Multiple roles → Union of all role pages accessible
- [ ] Admin role → Bypasses page restrictions
- [ ] Page permissions fetched on login
- [ ] Role change → Page permissions refresh

## Priority

**Medium-High**: The UI is ready but won't function until backend is implemented.

Estimated implementation time: 2-3 hours
