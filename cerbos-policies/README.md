# Cerbos Authorization Policies

This directory contains Cerbos policy definitions for the Sports Management API.

## Structure

```
cerbos-policies/
├── .cerbos.yaml              # Cerbos server configuration
├── principals/               # Principal (user) policies
│   └── principal_policy.yaml
├── derived_roles/            # Common derived roles
│   └── common_roles.yaml
├── resources/                # Resource-specific policies
│   ├── game.yaml
│   ├── assignment.yaml
│   └── referee.yaml
└── tests/                    # Policy test suites
    ├── game_tests.yaml
    └── assignment_tests.yaml
```

## Running Cerbos

### Using Docker Compose (Recommended)

```bash
# From project root
docker-compose -f docker-compose.cerbos.yml up -d

# Check logs
docker-compose -f docker-compose.cerbos.yml logs -f cerbos

# Stop Cerbos
docker-compose -f docker-compose.cerbos.yml down
```

### Using Docker Directly

```bash
docker run -d \
  --name cerbos \
  -p 3592:3592 \
  -p 3593:3593 \
  -v $(pwd)/cerbos-policies:/policies:ro \
  ghcr.io/cerbos/cerbos:latest \
  server --config=/policies/.cerbos.yaml
```

### Health Check

```bash
curl http://localhost:3592/_cerbos/health
```

## Testing Policies

Cerbos provides a built-in test runner for policy tests:

```bash
# Run all tests
docker run --rm \
  -v $(pwd)/cerbos-policies:/policies:ro \
  ghcr.io/cerbos/cerbos:latest \
  compile --tests=/policies/tests /policies

# Run specific test file
docker run --rm \
  -v $(pwd)/cerbos-policies:/policies:ro \
  ghcr.io/cerbos/cerbos:latest \
  compile --tests=/policies/tests/game_tests.yaml /policies
```

## Policy Overview

### Roles

- **admin**: Full access within their organization
- **assignor**: Can create, update, and manage games and assignments in their regions
- **referee**: Can view games and manage their own assignments
- **guest**: Limited read-only access

### Derived Roles

- **owner**: User who created the resource
- **same_organization**: User belongs to the same organization as the resource
- **same_region**: User has access to the region where the resource is located
- **organization_admin**: Admin user within the resource's organization

### Game Resource Actions

- **view**: View game details
- **list**: List games
- **create**: Create new game
- **update**: Update game details
- **delete**: Delete game
- **assign**: Assign referees to game

### Assignment Resource Actions

- **view**: View assignment details
- **list**: List assignments
- **create**: Create new assignment
- **update**: Update assignment
- **delete**: Delete assignment
- **accept**: Accept assignment (referee only)
- **decline**: Decline assignment (referee only)

### Referee Resource Actions

- **view**: View referee profile
- **list**: List referees
- **create**: Create referee profile
- **update**: Update referee profile
- **delete**: Delete referee profile
- **assign**: Assign referee to games

## Policy Rules

### Game Policy

**Admin:**
- Full access to all games in their organization

**Assignor:**
- View/list games in their organization and regions
- Create games in their regions
- Update games they own if status is "scheduled" or "pending"
- Delete games they own if status is "scheduled"
- Assign referees to games in their regions

**Referee:**
- View games in their organization and regions
- View games they are assigned to

**Guest:**
- No access

### Assignment Policy

**Admin:**
- Full access to all assignments in their organization

**Assignor:**
- View/list assignments in their regions
- Create assignments for games in their regions
- Update pending/offered assignments
- Delete assignments they created (except completed)

**Referee:**
- View their own assignments
- Accept/decline pending or offered assignments
- Update their confirmed/completed assignments
- Cannot create or delete assignments

**Guest:**
- No access

### Referee Policy

**Admin:**
- Full access to all referees in their organization

**Assignor:**
- View/list referees in their organization
- Create referee profiles
- Update active referee profiles
- Delete referee profiles with no active assignments
- Assign available and active referees

**Referee:**
- View their own profile
- View referees in their regions
- Update their own profile

**Guest:**
- View public referee profiles

## Environment Variables

Configure your application to connect to Cerbos:

```bash
# .env
CERBOS_HOST=localhost:3592
CERBOS_TLS=false
CERBOS_CACHE_ENABLED=true
CERBOS_CACHE_TTL=300000  # 5 minutes
```

## Updating Policies

1. Edit policy files in this directory
2. Cerbos automatically reloads when files change (if watchForChanges is enabled)
3. Run policy tests to verify changes:
   ```bash
   docker run --rm \
     -v $(pwd)/cerbos-policies:/policies:ro \
     ghcr.io/cerbos/cerbos:latest \
     compile --tests=/policies/tests /policies
   ```
4. No application restart required!

## Debugging

### Enable Debug Logging

```yaml
# .cerbos.yaml
server:
  logLevel: DEBUG
```

### View Decision Logs

```bash
docker logs sportsmanager-cerbos | grep "decision"
```

### Audit Log

Audit logs are written to `/tmp/cerbos/audit.log` inside the container:

```bash
docker exec sportsmanager-cerbos cat /tmp/cerbos/audit.log
```

## Resources

- [Cerbos Documentation](https://docs.cerbos.dev)
- [Policy Language Reference](https://docs.cerbos.dev/cerbos/latest/policies)
- [Testing Guide](https://docs.cerbos.dev/cerbos/latest/policies/testing)
