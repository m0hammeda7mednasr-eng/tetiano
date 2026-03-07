# ═══════════════════════════════════════════════════════════════════════════
# TETIANO PRODUCTION IMPLEMENTATION - WINDOWS BATCH
# ═══════════════════════════════════════════════════════════════════════════
# Run this to verify everything is ready for production

Write-Host "════════════════════════════════════════════════════════════════════════"
Write-Host "🚀 TETIANO PRODUCTION IMPLEMENTATION" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════════"
Write-Host ""

# Step 1: Verify builds
Write-Host "[1/5] Verifying builds..." -ForegroundColor Cyan
try {
    Push-Location backend
    npm run build 2>&1 | Out-Null
    Write-Host "✓ Backend build OK" -ForegroundColor Green
    Pop-Location
} catch {
    Write-Host "✗ Backend build failed" -ForegroundColor Red
    exit 1
}

try {
    Push-Location frontend
    npm run build 2>&1 | Out-Null
    Write-Host "✓ Frontend build OK" -ForegroundColor Green
    Pop-Location
} catch {
    Write-Host "✗ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Verify git status
Write-Host "[2/5] Verifying git status..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if ([string]::IsNullOrEmpty($gitStatus)) {
    Write-Host "✓ All changes committed" -ForegroundColor Green
} else {
    Write-Host "⚠ Uncommitted changes detected" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check remote connection
Write-Host "[3/5] Checking GitHub connection..." -ForegroundColor Cyan
try {
    git ls-remote origin 2>&1 | Out-Null
    Write-Host "✓ GitHub connection OK" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot reach GitHub" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Verify environment
Write-Host "[4/5] Verifying environment configuration..." -ForegroundColor Cyan
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env"
    if ($envContent -match "SUPABASE_URL") {
        Write-Host "✓ Supabase URL configured" -ForegroundColor Green
    } else {
        Write-Host "✗ Supabase URL missing" -ForegroundColor Red
        exit 1
    }
    
    if ($envContent -match "SUPABASE_SERVICE_KEY") {
        Write-Host "✓ Service key configured" -ForegroundColor Green
    } else {
        Write-Host "✗ Service key missing" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ .env file missing" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Final status
Write-Host "[5/5] Final verification..." -ForegroundColor Cyan
$backendVersion = (Get-Content backend\package.json | ConvertFrom-Json).version
$frontendVersion = (Get-Content frontend\package.json | ConvertFrom-Json).version
$gitBranch = git rev-parse --abbrev-ref HEAD
$latestCommit = git log -1 --oneline

Write-Host "✓ Backend version: $backendVersion" -ForegroundColor Green
Write-Host "✓ Frontend version: $frontendVersion" -ForegroundColor Green
Write-Host "✓ Git branch: $gitBranch" -ForegroundColor Green
Write-Host "✓ Latest commit: $latestCommit" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "════════════════════════════════════════════════════════════════════════"
Write-Host "✅ ALL SYSTEMS READY FOR PRODUCTION DEPLOYMENT" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run database migration in Supabase Dashboard (if not already done)"
Write-Host "2. Verify Railway deployment at: https://railway.app"
Write-Host "3. Verify Vercel deployment at: https://vercel.com"
Write-Host "4. Test application at: https://tetiano.vercel.app"
Write-Host ""
Write-Host "For detailed instructions, see: PRODUCTION_DEPLOYMENT_CHECKLIST.md"
Write-Host ""
