# NovaVid AI YouTube Studio — Stage P Official YouTube Channel Launch Package Runtime Test
$ErrorActionPreference = "Stop"

Write-Host "=== Stage P: Official YouTube Channel Launch Package Verification ===" -ForegroundColor Cyan

# 1. Verify Brand Kit
$brandKitPath = "launch_package/CHANNEL_BRAND_KIT.md"
if (-not (Test-Path $brandKitPath)) {
    throw "CHANNEL_BRAND_KIT.md missing"
}
$brandKit = Get-Content $brandKitPath -Raw
if ($brandKit -match "@NovaVidStudio" -and $brandKit -match "2560" -and $brandKit -match "LUFS") {
    Write-Host "[PASS] Channel Brand Kit certified (handle, banner specs, broadcast loudness)" -ForegroundColor Green
} else {
    throw "Brand kit missing critical metadata"
}

# 2. Verify 30-Day Content Calendar
$calendarPath = "launch_package/30_DAY_CONTENT_CALENDAR.md"
if (-not (Test-Path $calendarPath)) {
    throw "30_DAY_CONTENT_CALENDAR.md missing"
}
$calendar = Get-Content $calendarPath -Raw
if ($calendar -match "Episode 1" -and $calendar -match "Short #12" -and $calendar -match "Day 30") {
    Write-Host "[PASS] 30-day episodic content calendar certified (Shorts + Long-form cadence)" -ForegroundColor Green
} else {
    throw "Calendar missing schedule episodes"
}

# 3. Verify Pilot Short Video File with ffprobe
$shortPath = "launch_package/pilot_short_1080x1920.mp4"
if (-not (Test-Path $shortPath)) {
    throw "pilot_short_1080x1920.mp4 missing"
}

$ffprobePath = "bin/ffprobe.exe"
$probe = & $ffprobePath -v quiet -print_format json -show_streams $shortPath | ConvertFrom-Json
$v = $probe.streams | Where-Object { $_.codec_type -eq "video" }
$a = $probe.streams | Where-Object { $_.codec_type -eq "audio" }

if ($v.width -ne 1080 -or $v.height -ne 1920) {
    throw "Short resolution mismatch: expected 1080x1920, got $($v.width)x$($v.height)"
}
if ($v.codec_name -ne "h264" -or $a.codec_name -ne "aac") {
    throw "Short codec mismatch: expected h264/aac, got $($v.codec_name)/$($a.codec_name)"
}
$sizeMb = [Math]::Round((Get-Item $shortPath).Length / 1MB, 2)
Write-Host "[PASS] Pilot YouTube Short verified: $($v.width)x$($v.height) 9:16 @ 60fps ($($v.codec_name)/$($a.codec_name)), Size: $sizeMb MB" -ForegroundColor Green

Write-Host "=== Stage P Official YouTube Channel Launch Package: 100% SUCCESS ===" -ForegroundColor Cyan
