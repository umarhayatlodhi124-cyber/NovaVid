# NovaVid AI YouTube Studio — Stage N Windows Distribution Verification Test
$ErrorActionPreference = "Stop"

Write-Host "=== Stage N: Final Windows Distribution Packages Verification ===" -ForegroundColor Cyan

# 1. Verify Tauri Config Bundle
$tauriConf = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
if ($tauriConf.bundle.active -ne $true -or $tauriConf.productName -ne "AI YouTube Studio") {
    throw "Invalid Tauri bundle configuration"
}
Write-Host "[PASS] tauri.conf.json bundle configuration active ($($tauriConf.productName) v$($tauriConf.version))" -ForegroundColor Green

# 2. Verify WiX MSI Package
$msiPath = "src-tauri/target/release/bundle/msi/AI YouTube Studio_0.1.0_x64_en-US.msi"
if (-not (Test-Path $msiPath)) {
    throw "MSI package not found: $msiPath"
}
$msiItem = Get-Item $msiPath
$msiHash = (Get-FileHash -Path $msiPath -Algorithm SHA256).Hash
$msiMb = [Math]::Round($msiItem.Length / 1MB, 2)
Write-Host "[PASS] WiX MSI Package verified: $msiMb MB" -ForegroundColor Green
Write-Host "       MSI SHA-256: $msiHash" -ForegroundColor DarkGray

# 3. Verify NSIS Setup Executable
$nsisPath = "src-tauri/target/release/bundle/nsis/AI YouTube Studio_0.1.0_x64-setup.exe"
if (-not (Test-Path $nsisPath)) {
    throw "NSIS package not found: $nsisPath"
}
$nsisItem = Get-Item $nsisPath
$nsisHash = (Get-FileHash -Path $nsisPath -Algorithm SHA256).Hash
$nsisMb = [Math]::Round($nsisItem.Length / 1MB, 2)
Write-Host "[PASS] NSIS Setup Executable verified: $nsisMb MB" -ForegroundColor Green
Write-Host "       NSIS SHA-256: $nsisHash" -ForegroundColor DarkGray

# 4. Verify Built Frontend Dist
if (-not (Test-Path "dist/index.html")) {
    throw "dist/index.html missing"
}
Write-Host "[PASS] Embedded frontend assets certified for Windows release packaging" -ForegroundColor Green

Write-Host "=== Stage N Windows Distribution Test Complete: 100% SUCCESS ===" -ForegroundColor Cyan
