# Manual Testing Guide for Permissions Management

## What Has Been Fixed

1. **Backend Permission Service** - Removed invalid 'active' column filter that was causing permissions not to load
2. **API Client** - Changed HTTP method from PUT to POST for assigning permissions to match backend route
3. **PermissionMatrix Component** - Fixed data structure mismatch (now properly converts categorized permissions object to flat array)

## Backend Status
- Backend is running on port 3001 ✅
- Permissions API endpoint is working ✅
- Returns 42 permissions across 10 categories ✅

## Testing Steps

### Option 1: Test Through the Application UI

1. **Open the application**
   - Navigate to: http://localhost:3000/login
   
2. **Login as admin**
   - Email: admin@cmba.ca
   - Password: password

3. **Navigate to Role Management**
   - Go to: http://localhost:3000/dashboard/admin/roles
   - Or click "Role Management" in the sidebar under Admin section

4. **Test Manage Permissions**
   - Find any role card (e.g., Admin, Referee, Assignor)
   - Click the three dots menu (⋮) button
   - Click "Manage Permissions"

5. **Expected Result**
   - Dialog should open showing "Manage Permissions for [Role Name]"
   - You should see 10 permission categories:
     - assignments
     - communication
     - content
     - finance
     - games
     - referees
     - reports
     - settings
     - system
     - users
   - Each category should have multiple permission checkboxes
   - Total of 42 permissions should be displayed

6. **Test Functionality**
   - Click individual checkboxes to toggle permissions
   - Click category header to select/deselect all permissions in that category
   - Click "Save Permissions" to save changes
   - Should see success toast message

### Option 2: Direct API Test

Open the test HTML file directly in your browser:
- File: C:\Users\School\Desktop\SportsManager\test-permissions-direct.html
- Click "Test Permissions API" button
- Should see 42 permissions loaded successfully with categories

## Troubleshooting

If permissions still don't show:

1. **Check Backend Logs**
   - Look for any error messages in the terminal running the backend
   - Ensure no "column does not exist" errors for permissions table

2. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for any errors
   - Check Network tab to see if API calls are successful

3. **Verify Frontend is Updated**
   - The file `components/admin/rbac/PermissionMatrix.tsx` should have the fix at lines 56-68
   - The file `lib/api.ts` should use POST method for assignPermissionsToRole

## Current Known Issues
- Some database tables are missing (expense_data, game_fees) causing errors in finance dashboard
- These don't affect the permissions functionality

## Success Criteria
✅ Permissions dialog opens when clicking "Manage Permissions"
✅ All 42 permissions are displayed in categorized groups
✅ Checkboxes are interactive and can be toggled
✅ Category select-all functionality works
✅ Save button successfully updates permissions