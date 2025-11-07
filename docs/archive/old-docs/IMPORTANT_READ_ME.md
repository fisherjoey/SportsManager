# ⚠️ IMPORTANT: PLEASE LOGOUT AND LOGIN AGAIN ⚠️

## Why?

You're currently logged in with an **old JWT token** that was created BEFORE we assigned the Super Admin role.

The backend logs show:
```
JWT decoded - Roles array: []
CERBOS DEBUG - Principal roles: [ 'guest' ]
```

This means you're being treated as a **guest** with no permissions.

## Fix: Logout and Login Again

1. **Open your browser at http://localhost:3000**
2. **Click Logout** (if there's a logout button)
3. **Or clear your browser's localStorage:**
   - Press F12 to open Developer Tools
   - Go to Application tab → Storage → Local Storage
   - Clear all items
   - Refresh the page

4. **Login again with:**
   - Email: `admin@test.com`
   - Password: `password`

5. **Your new JWT token will include:**
   ```json
   {
     "roles": ["super_admin"]
   }
   ```

6. **Cerbos will now recognize you as:**
   - Principal roles: `["super_admin"]`
   - Full access to all resources ✅

## What You'll See After Relogin

The backend logs will show:
```
JWT decoded - Roles array: ["super_admin"]
CERBOS DEBUG - Principal roles: ["super_admin"]
```

And all API calls will succeed! 🎉

