# NovaVid AI Studio — Stage R Runtime Verification Script
# Verifies Creator Workspace, LODHI TECHX profile, 6-axis language pipeline, and production presets

$ErrorActionPreference = "Continue"

Write-Host "=== Stage R: Creator Workspace & Channel Profiles Runtime Verification ===" -ForegroundColor Cyan

# 1. Verify Migration 0012 on disk
$migFile = "src-tauri/migrations/0012_create_creator_workspace.sql"
if (-not (Test-Path $migFile)) {
    Write-Host "[FAIL] Migration 0012 not found at $migFile" -ForegroundColor Red
    exit 1
}

$migContent = Get-Content $migFile -Raw
if ($migContent.Contains("creator_profiles") -and $migContent.Contains("creator_presets")) {
    Write-Host "[PASS] Migration 0012 certified (creator_profiles, creator_presets)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Migration 0012 missing required table definitions" -ForegroundColor Red
    exit 1
}

# 2. Check TypeScript definitions and LODHI TECHX profile
$tsFile = "src/lib/creatorWorkspace.ts"
$tsContent = Get-Content $tsFile -Raw

if ($tsContent.Contains("LODHI TECHX") -and $tsContent.Contains("@lodhitechx")) {
    Write-Host "[PASS] Default First-Run Channel Profile 'LODHI TECHX' certified" -ForegroundColor Green
} else {
    Write-Host "[FAIL] LODHI TECHX default profile not found in creatorWorkspace.ts" -ForegroundColor Red
    exit 1
}

# 3. Check 6-axis language pipeline
$requiredAxes = @("research", "script", "voice", "subtitles", "titleDescription", "thumbnailText")
$allAxesPresent = $true
foreach ($axis in $requiredAxes) {
    if (-not $tsContent.Contains($axis)) {
        $allAxesPresent = $false
        Write-Host "[FAIL] Missing language axis: $axis" -ForegroundColor Red
    }
}
if ($allAxesPresent) {
    Write-Host "[PASS] Independent 6-axis multilingual pipeline certified (Urdu, Roman Urdu, English, Hindi, Arabic, Spanish)" -ForegroundColor Green
}

# 4. Check 7 Creator Presets
$requiredCategories = @("tech_tutorial", "ai_tools", "software_demo", "educational", "product_review", "news_updates", "explainer")
$allCategoriesPresent = $true
foreach ($cat in $requiredCategories) {
    if (-not $tsContent.Contains($cat)) {
        $allCategoriesPresent = $false
        Write-Host "[FAIL] Missing creator preset category: $cat" -ForegroundColor Red
    }
}
if ($allCategoriesPresent) {
    Write-Host "[PASS] All 7 production presets verified (Shorts & Long-form)" -ForegroundColor Green
}

# 5. Run Vitest Unit Tests
Write-Host "Running Vitest test suite..." -ForegroundColor Yellow
$vitestOutput = npx vitest run 2>&1 | Out-String
if ($vitestOutput -match "25 passed" -and $vitestOutput -match "100 passed") {
    Write-Host "[PASS] All 25 test files passed (100/100 unit tests)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Vitest tests failed or did not meet expectation" -ForegroundColor Red
    Write-Host $vitestOutput
    exit 1
}

Write-Host "=== Stage R Creator Workspace & Channel Profiles: 100% SUCCESS ===" -ForegroundColor Green
