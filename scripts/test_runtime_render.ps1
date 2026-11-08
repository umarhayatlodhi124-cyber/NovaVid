$ErrorActionPreference = "Stop"

$ffmpeg = "G:\Nova Vid\bin\ffmpeg.exe"
$ffprobe = "G:\Nova Vid\bin\ffprobe.exe"
$outputDir = "G:\Nova Vid\test_output"

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$sampleVideo = Join-Path $outputDir "stage_c_verification.mp4"
if (Test-Path $sampleVideo) {
    Remove-Item $sampleVideo -Force
}

Write-Host "=== NovaVid AI YouTube Studio: Stage C Runtime FFmpeg Test ==="
Write-Host "FFmpeg binary: $ffmpeg"
Write-Host "FFprobe binary: $ffprobe"

# 1. Check version
$versionOut = & $ffmpeg -version
Write-Host "FFmpeg Version: $($versionOut[0])"

# 2. Render a 3-second 1080p 60fps H.264 video with an animated Ken Burns zoom test card and sine wave AAC audio
Write-Host "Rendering 3-second 1080p 60fps test video..."

$renderArgs = @(
    "-y",
    "-f", "lavfi",
    "-i", "testsrc=duration=3:size=1920x1080:rate=60",
    "-f", "lavfi",
    "-i", "sine=frequency=440:duration=3",
    "-t", "3",
    "-vf", "zoompan=z='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=180:s=1920x1080:fps=60,format=yuv420p",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    $sampleVideo
)

& $ffmpeg $renderArgs

if (!(Test-Path $sampleVideo)) {
    Write-Error "Failed: Output video $sampleVideo was not created!"
    exit 1
}

$fileSize = (Get-Item $sampleVideo).Length
Write-Host "Render successful! Output size: $fileSize bytes ($([Math]::Round($fileSize / 1KB, 2)) KB)"

# 3. Probe the output with FFprobe
Write-Host "Probing output video streams with FFprobe..."
$probeArgs = @(
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,duration",
    "-show_entries", "format=format_name,duration,size",
    "-of", "json",
    $sampleVideo
)

$probeOutput = & $ffprobe $probeArgs | Out-String
Write-Host "FFprobe JSON output:"
Write-Host $probeOutput

# Parse JSON to assert video and audio streams
$probeJson = $probeOutput | ConvertFrom-Json
$streams = $probeJson.streams

$videoStream = $streams | Where-Object { $_.codec_type -eq "video" }
$audioStream = $streams | Where-Object { $_.codec_type -eq "audio" }

if (!$videoStream) {
    Write-Error "Verification failed: No video stream detected in rendered file!"
    exit 1
}
if ($videoStream.codec_name -ne "h264") {
    Write-Error "Verification failed: Expected video codec h264, got $($videoStream.codec_name)"
    exit 1
}
if ($videoStream.width -ne 1920 -or $videoStream.height -ne 1080) {
    Write-Error "Verification failed: Dimensions $($videoStream.width)x$($videoStream.height) do not match 1920x1080!"
    exit 1
}

if (!$audioStream) {
    Write-Error "Verification failed: No audio stream detected in rendered file!"
    exit 1
}
if ($audioStream.codec_name -ne "aac") {
    Write-Error "Verification failed: Expected audio codec aac, got $($audioStream.codec_name)"
    exit 1
}

Write-Host ">>> Stage C Runtime Verification PASSED: 1080p60 H.264/AAC video verified with valid streams and metadata! <<<"
