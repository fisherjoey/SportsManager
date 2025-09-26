# Cerbos Deployment Guide

## Quick Start

### 1. Start Cerbos (requires Docker)

```bash
# From project root
docker compose -f docker-compose.cerbos.yml up -d

# Check health
curl http://localhost:3592/_cerbos/health

# View logs
docker compose -f docker-compose.cerbos.yml logs -f cerbos
```

### 2. Verify Cerbos is Running

```bash
# Should return: {"status":"SERVING"}
curl http://localhost:3592/_cerbos/health

# Check version
curl http://localhost:3592/_cerbos/version
```

### 3. Stop Cerbos

```bash
docker compose -f docker-compose.cerbos.yml down
```

## Configuration

- **HTTP API:** `http://localhost:3592`
- **gRPC API:** `localhost:3593`
- **Policies:** `./cerbos/policies/` (auto-reloaded on change)
- **Config:** `./cerbos/config/config.yaml`
- **Audit Logs:** Stored in Docker volume `cerbos-data`

## Development Workflow

1. **Write/Update Policies:** Edit files in `./cerbos/policies/`
2. **Auto-Reload:** Cerbos watches for changes and reloads automatically
3. **Test Policies:** Use the Cerbos SDK or curl to test decisions

## Troubleshooting

### Cerbos won't start
```bash
# Check logs
docker compose -f docker-compose.cerbos.yml logs cerbos

# Check if port 3592 is already in use
netstat -an | findstr 3592  # Windows
lsof -i :3592               # Mac/Linux
```

### Policies not loading
```bash
# Verify policy directory is mounted
docker compose -f docker-compose.cerbos.yml exec cerbos ls -la /policies

# Check for syntax errors
docker compose -f docker-compose.cerbos.yml logs cerbos | grep -i error
```

### Connection refused from app
```bash
# Ensure Cerbos is healthy
curl http://localhost:3592/_cerbos/health

# Check .env has correct CERBOS_HOST
echo $CERBOS_HOST  # Should be: localhost:3592
```

## Alternative: Run Cerbos Binary (No Docker)

Download from: https://github.com/cerbos/cerbos/releases

```bash
# Download latest release
# Run directly
./cerbos server --config=./cerbos/config/config.yaml
```

## Next Steps

Once Cerbos is running, the application will automatically connect using the SDK.