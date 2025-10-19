# Resource Centre - UX/UI Audit & Documentation

**Page:** Resource Centre (`/resources`)
**Date Audited:** 2025-10-01
**Viewport:** Desktop (1920x1080)
**Auditor:** Claude Code (AI Vision Analysis)

---

## Overview

The Resource Centre page provides access to training materials, guides, forms, and other important resources. Currently showing an **empty state** with "No resources found" message.

---

## Visual Design Assessment

### ✅ Strengths

1. **Clear Page Header**
   - Title: "Resource Centre" (~28-32px bold)
   - Subtitle: "Access training materials, guides, forms, and other important resources"
   - Sets clear expectations for page purpose

2. **Search & Filter Bar**
   - Prominent search input: "Search resources..." with magnifying glass icon
   - Two filter dropdowns: "All Categories" and "All Types"
   - Well-organized filter controls

3. **Empty State Message**
   - Info icon (circle with i)
   - Clear message: "No resources found."
   - Centered in content area

4. **Dark Theme Consistency**
   - Matches application theme
   - Dark navy background (#0f1419-ish)
   - Subtle card borders

### ⚠️ Areas for Improvement

1. **Empty State Lacks Guidance**
   - No explanation for why resources aren't found
   - No call-to-action for users
   - No suggestion to add resources (for admins)
   - No "Try adjusting filters" message

2. **Search Bar Size**
   - Search bar is quite wide (~650px)
   - Could be narrower with more prominent filters

3. **Filter Dropdowns**
   - "All Categories" and "All Types" don't explain what categories/types exist
   - No indication of filter counts
   - Dropdown styling minimal (just text + chevron)

4. **No Upload/Add Resource Button**
   - If user has permission, should see "Add Resource" button
   - Common pattern: action button in top-right of page header

---

## Accessibility Analysis

### ✅ Positive Points

1. **Form Labels**
   - Search input has placeholder text
   - Dropdowns have clear labels

2. **Semantic Structure**
   - Proper heading hierarchy
   - Info icon for empty state

3. **Keyboard Navigation**
   - Search and filters likely keyboard accessible

### ❌ Critical Issues

1. **Empty State Icon**
   - Info icon should have accessible label
   - Should use `aria-label` or `sr-only` text

2. **Filter Dropdowns**
   - Should announce selected values to screen readers
   - Need proper ARIA attributes

---

## Empty State Analysis

### Current State
- Icon + "No resources found."
- Very minimal guidance

### Recommended Empty State

**If filters are active:**
```tsx
<div className="flex flex-col items-center justify-center py-16">
  <SearchXIcon className="w-16 h-16 text-gray-600 mb-4" />
  <h3 className="text-xl font-semibold mb-2">No resources found</h3>
  <p className="text-gray-400 mb-4">
    Try adjusting your search or filters to find what you're looking for.
  </p>
  <Button variant="outline" onClick={clearFilters}>
    Clear Filters
  </Button>
</div>
```

**If no resources exist in system:**
```tsx
<div className="flex flex-col items-center justify-center py-16">
  <FolderOpenIcon className="w-16 h-16 text-gray-600 mb-4" />
  <h3 className="text-xl font-semibold mb-2">No resources yet</h3>
  <p className="text-gray-400 mb-4">
    Resources like training materials, guides, and forms will appear here.
  </p>
  {hasPermission('resource:create') && (
    <Button onClick={openAddResource}>
      <PlusIcon /> Add Resource
    </Button>
  )}
</div>
```

---

## Component Inventory

### Page Header
- **Title:** "Resource Centre" (~28-32px bold, white)
- **Subtitle:** "Access training materials..." (~14px, gray-400)

### Search & Filter Bar
- **Search Input:**
  - Placeholder: "Search resources..."
  - Magnifying glass icon (left)
  - Width: ~650px
  - Background: Dark (#1a1a1a-ish)
  - Border: Subtle gray

- **Category Dropdown:**
  - Label: "All Categories"
  - Chevron down icon
  - Width: ~180px
  - Dark background

- **Type Dropdown:**
  - Label: "All Types"
  - Chevron down icon
  - Width: ~150px
  - Dark background

### Empty State
- **Icon:** Info circle (gray)
- **Message:** "No resources found." (gray text)
- **Background:** Subtle card/border
- **Padding:** ~20px

---

## Recommendations Priority

### 🔴 High Priority

1. **Improve Empty State**
   - Add helpful message explaining why no resources shown
   - Add "Clear Filters" button if filters active
   - Add "Add Resource" button for admins
   - Differentiate between "no results" and "no resources exist"

2. **Add Action Button**
   ```tsx
   // Top-right of page header
   {hasPermission('resource:create') && (
     <Button>
       <PlusIcon /> Add Resource
     </Button>
   )}
   ```

3. **Improve Filter UX**
   - Show filter counts: "All Categories (5)", "All Types (3)"
   - Add visual indicator when filters are active
   - Add "Clear all filters" link if any filter is active

### 🟡 Medium Priority

4. **Add Resource Type Icons**
   - Show what types exist: Document, Video, Form, Guide, etc.
   - Visual categorization

5. **Add Recent Resources Widget**
   - Even when empty, could show placeholder
   - "Recently Added" or "Popular Resources" section

6. **Add Breadcrumbs**
   - Resource Centre > [Category] > [Resource]
   - Help users navigate hierarchy

### 🔵 Low Priority

7. **Add Resource Grid Preview**
   - Show example resource cards in empty state
   - "This is what your resources will look like"

8. **Add Quick Links**
   - "Browse by Category", "Browse by Type"
   - Visual category cards

---

## Expected Content (When Resources Exist)

### Resource Cards
- **Card Layout:** Grid (3-4 columns)
- **Card Content:**
  - Resource icon (PDF, video, form, etc.)
  - Title
  - Description (truncated)
  - Category badge
  - Type badge
  - Upload date
  - File size (if applicable)
  - Download/View button

### Resource Detail View
- Full description
- Preview (if supported)
- Download button
- Related resources
- Tags/categories
- Uploaded by + date

---

## Comparison to Best Practices

| Best Practice | Status | Notes |
|---------------|--------|-------|
| Clear Empty State | ⚠️ Partial | Message exists but lacks guidance |
| Action CTA in Empty State | ❌ Missing | No "Add Resource" button |
| Search Functionality | ✅ Good | Prominent search bar |
| Filter Controls | ✅ Good | Category and type filters |
| Visual Hierarchy | ✅ Good | Clear header and content area |
| Keyboard Navigation | ✅ Good | Likely accessible |
| Responsive Design | ❓ Unknown | Not visible in screenshot |

---

## Testing Checklist

- [ ] Test with actual resources loaded
- [ ] Test search functionality
- [ ] Test category filter (all options)
- [ ] Test type filter (all options)
- [ ] Test combined search + filters
- [ ] Test "Add Resource" flow (if admin)
- [ ] Test resource card interactions
- [ ] Test resource download/view
- [ ] Test empty state with active filters
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Test on mobile device
- [ ] Test at 200% zoom level

---

## Code Recommendations

```tsx
// Improved Empty State
const EmptyState = ({ hasActiveFilters, hasPermission, onClearFilters, onAddResource }) => {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <SearchXIcon className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No resources found</h3>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Try adjusting your search terms or filters to find what you're looking for.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear All Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <FolderOpenIcon className="w-16 h-16 text-gray-600 mb-4" />
      <h3 className="text-xl font-semibold mb-2">No resources yet</h3>
      <p className="text-gray-400 mb-6 text-center max-w-md">
        Training materials, guides, forms, and other important resources will appear here once they're added.
      </p>
      {hasPermission('resource:create') && (
        <Button onClick={onAddResource}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add First Resource
        </Button>
      )}
    </div>
  );
};

// Enhanced Filter Badges
const FilterBadges = ({ activeFilters, onRemoveFilter }) => {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex gap-2 mb-4">
      {activeFilters.map(filter => (
        <Badge key={filter.key} variant="secondary">
          {filter.label}
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="ml-2 hover:text-red-400"
          >
            ×
          </button>
        </Badge>
      ))}
      <button
        onClick={() => onRemoveFilter('all')}
        className="text-sm text-blue-400 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
};
```

---

## Conclusion

The Resource Centre page has a **solid foundation** with clear purpose, good search/filter controls, and consistent design. However, the empty state needs significant improvement to guide users.

**Critical Needs:**
1. Better empty state with actionable guidance
2. "Add Resource" button for admins
3. Differentiate between "no results" and "no resources exist"
4. Show active filters and allow clearing them

**Strengths:**
1. Clear page purpose and description
2. Prominent search functionality
3. Good filter controls
4. Clean, professional design

This page will be excellent once resources are added and the empty state is improved to better guide users.

**Overall Rating: 6/10** ⭐⭐⭐⭐⭐⭐★★★★

*After recommended fixes: 8/10*
