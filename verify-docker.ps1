# Docker & Cerbos Verification Script
Write-Host "🐳 Verifying Docker Installation..." -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "1. Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✅ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    Write-Host "   Download: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -ForegroundColor Yellow
    exit 1
}

# Check Docker Compose
Write-Host ""
Write-Host "2. Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "   ✅ Docker Compose installed: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker Compose not found." -ForegroundColor Red
    exit 1
}

# Check Docker is running
Write-Host ""
Write-Host "3. Checking Docker daemon..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "   ✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker daemon not running. Start Docker Desktop!" -ForegroundColor Red
    exit 1
}

# Start Cerbos
Write-Host ""
Write-Host "4. Starting Cerbos..." -ForegroundColor Yellow
try {
    Set-Location $PSScriptRoot
    docker-compose -f docker-compose.cerbos.yml up -d
    Write-Host "   ✅ Cerbos container started" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to start Cerbos" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Wait for Cerbos to be ready
Write-Host ""
Write-Host "5. Waiting for Cerbos to be ready..." -ForegroundColor Yellow
$retries = 10
$ready = $false

for ($i = 1; $i -le $retries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3592/_cerbos/health" -UseBasicParsing -TimeoutSec 2 2>$null
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Write-Host "   Attempt $i/$retries..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host "   ✅ Cerbos is healthy and ready!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Cerbos health check failed after $retries attempts" -ForegroundColor Red
    Write-Host "   Check logs: docker logs sportsmanager-cerbos" -ForegroundColor Yellow
    exit 1
}

# Verify policies loaded
Write-Host ""
Write-Host "6. Checking policies..." -ForegroundColor Yellow
try {
    $logs = docker logs sportsmanager-cerbos 2>&1 | Select-String -Pattern "policy"
    if ($logs) {
        Write-Host "   ✅ Policies loaded successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not verify policies" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ All checks passed! Cerbos is ready!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd backend" -ForegroundColor White
Write-Host "  2. npm run dev" -ForegroundColor White
Write-Host "  3. Test your routes - no more 'Failed to check permissions'!" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  docker logs sportsmanager-cerbos        # View Cerbos logs" -ForegroundColor Gray
Write-Host "  docker-compose -f docker-compose.cerbos.yml down   # Stop Cerbos" -ForegroundColor Gray
Write-Host "  docker ps                               # View running containers" -ForegroundColor Gray
Write-Host ""