# Setup Instructions

Before running the full audit, you need to provide valid login credentials:

1. Edit `audit-config.json`
2. Update lines 6-7 with valid credentials:

```json
"credentials": {
  "email": "your-actual-email@example.com",
  "password": "your-actual-password"
}
```

## Finding Valid Credentials

Run this command to see available users:

```bash
export PGPASSWORD=postgres123 && "/c/Program Files/PostgreSQL/17/bin/psql" -U postgres -h localhost -d sports_management -c "SELECT email FROM users LIMIT 5;"
```

Then use one of those emails with its password, or create a test user if needed.
