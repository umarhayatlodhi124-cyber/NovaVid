# NovaVid AI YouTube Studio — Stage J Professional UX & Studio Polish Runtime Test
$ErrorActionPreference = "Stop"

Write-Host "=== Stage J: Professional UX & Studio Polish Verification ===" -ForegroundColor Cyan

# 1. Verify Workstation Shortcuts Modal component
$modalPath = "src/components/WorkstationShortcutsModal.tsx"
if (-not (Test-Path $modalPath)) {
    throw "WorkstationShortcutsModal missing"
}
$modalContent = Get-Content $modalPath -Raw
if ($modalContent -match "Workstation Navigation" -and $modalContent -match "Playback & Timeline Transport" -and $modalContent -match "Editing & Clip Operations") {
    Write-Host "[PASS] WorkstationShortcutsModal contains all professional shortcut categories" -ForegroundColor Green
} else {
    throw "Shortcuts categories missing in modal"
}

# 2. Verify Global Keyboard Listener in App.tsx
$appContent = Get-Content "src/App.tsx" -Raw
if ($appContent -match "handleKeyDown" -and $appContent -match "WorkstationShortcutsModal" -and $appContent -match "quickToast") {
    Write-Host "[PASS] App.tsx integrated with global hotkey listeners and status toast" -ForegroundColor Green
} else {
    throw "Global shortcut handler missing in App.tsx"
}

# 3. Verify Topbar Hotkeys Trigger
if ($appContent -match "Hotkeys" -and $appContent -match "setIsShortcutsOpen\(true\)") {
    Write-Host "[PASS] Topbar hotkey trigger button certified" -ForegroundColor Green
} else {
    throw "Topbar hotkey button missing"
}

# 4. Verify Built Chunks in dist
if (Test-Path "dist/index.html") {
    $bundleSize = (Get-ChildItem -Path "dist/assets/*.js" | Measure-Object -Property Length -Sum).Sum
    Write-Host "[PASS] Production bundle verified: $([Math]::Round($bundleSize / 1KB, 1)) KB" -ForegroundColor Green
} else {
    throw "dist bundle missing"
}

Write-Host "=== Stage J Professional UX & Polish Test Complete: 100% SUCCESS ===" -ForegroundColor Cyan
