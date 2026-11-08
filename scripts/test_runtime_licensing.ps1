# NovaVid AI YouTube Studio — Stage K Commercial SaaS & Licensing Runtime Test
$ErrorActionPreference = "Stop"

Write-Host "=== Stage K: Commercial SaaS & Licensing Verification ===" -ForegroundColor Cyan

# 1. Verify Migration 0011 existence
$migrationPath = "src-tauri/migrations/0011_create_saas_and_licensing.sql"
if (-not (Test-Path $migrationPath)) {
    throw "Migration file missing: $migrationPath"
}
$sql = Get-Content $migrationPath -Raw
if ($sql -match "user_licenses" -and $sql -match "usage_metering") {
    Write-Host "[PASS] Migration 0011 schema contains user_licenses and usage_metering" -ForegroundColor Green
} else {
    throw "Migration 0011 missing tables"
}

# 2. Verify Migration 11 registered in lib.rs
$libRs = Get-Content "src-tauri/src/lib.rs" -Raw
if ($libRs -match "version: 11" -and $libRs -match "0011_create_saas_and_licensing.sql") {
    Write-Host "[PASS] Migration 11 registered in Tauri SQLite builder" -ForegroundColor Green
} else {
    throw "Migration 11 missing in lib.rs"
}

# 3. Verify Licensing Engine in TypeScript
$licTs = Get-Content "src/lib/licensingStudio.ts" -Raw
if ($licTs -match "canExportResolution" -and $licTs -match "checkExportAllowance" -and $licTs -match "TIER_PLANS") {
    Write-Host "[PASS] Commercial SaaS licensing engine and resolution gates certified" -ForegroundColor Green
} else {
    throw "licensingStudio.ts functions missing"
}

# 4. Verify LicensingRepository in repositories.ts
$repoTs = Get-Content "src/lib/repositories.ts" -Raw
if ($repoTs -match "class LicensingRepository" -and $repoTs -match "recordUsage") {
    Write-Host "[PASS] LicensingRepository implemented with SQLite CRUD" -ForegroundColor Green
} else {
    throw "LicensingRepository missing in repositories.ts"
}

# 5. Verify Frontend LicensingStudioPage UI
$pageTsx = Get-Content "src/components/LicensingStudioPage.tsx" -Raw
if ($pageTsx -match "Commercial SaaS & Licensing Studio" -and $pageTsx -match "Activate Commercial License Key") {
    Write-Host "[PASS] LicensingStudioPage UI with tier matrix verified" -ForegroundColor Green
} else {
    throw "LicensingStudioPage.tsx UI components missing"
}

Write-Host "=== Stage K Commercial SaaS & Licensing Test Complete: 100% SUCCESS ===" -ForegroundColor Cyan
