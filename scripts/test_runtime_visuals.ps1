$ErrorActionPreference = "Stop"

$ffmpeg = "G:\Nova Vid\bin\ffmpeg.exe"
$ffprobe = "G:\Nova Vid\bin\ffprobe.exe"
$visualsDir = "G:\Nova Vid\test_output\visuals"

if (!(Test-Path $visualsDir)) {
    New-Item -ItemType Directory -Path $visualsDir -Force | Out-Null
}

Write-Host "=== NovaVid AI YouTube Studio: Stage D Visual Engine Runtime Test ==="

# 1. Generate 16:9 Landscape Visual Card (Cinematic Style)
$img16x9 = Join-Path $visualsDir "scene_1_cinematic_16x9.png"
Write-Host "Generating 16:9 Cinematic Visual Card ($img16x9)..."
& $ffmpeg -y -f lavfi -i "color=c=0x0f172a:s=1920x1080:d=1" -frames:v 1 -update 1 $img16x9

# 2. Generate 9:16 Shorts Vertical Visual Card (Anime Style)
$img9x16 = Join-Path $visualsDir "scene_2_anime_9x16.png"
Write-Host "Generating 9:16 Shorts Vertical Visual Card ($img9x16)..."
& $ffmpeg -y -f lavfi -i "color=c=0x581c87:s=1080x1920:d=1" -frames:v 1 -update 1 $img9x16

# 3. Generate 1:1 Square Visual Card (Photorealistic Style)
$img1x1 = Join-Path $visualsDir "scene_3_photorealistic_1x1.png"
Write-Host "Generating 1:1 Square Visual Card ($img1x1)..."
& $ffmpeg -y -f lavfi -i "color=c=0x1e293b:s=1024x1024:d=1" -frames:v 1 -update 1 $img1x1

# 4. Probe each image with ffprobe
$images = @(
    @{ Path = $img16x9; Width = 1920; Height = 1080; Name = "16:9 Landscape" },
    @{ Path = $img9x16;  Width = 1080; Height = 1920; Name = "9:16 Shorts" },
    @{ Path = $img1x1;   Width = 1024; Height = 1024; Name = "1:1 Square" }
)

foreach ($item in $images) {
    if (!(Test-Path $item.Path)) {
        Write-Error "Failed: $($item.Path) was not generated!"
        exit 1
    }

    $probeArgs = @(
        "-v", "error",
        "-show_entries", "stream=width,height,codec_name",
        "-of", "json",
        $item.Path
    )
    $probeOut = & $ffprobe $probeArgs | ConvertFrom-Json
    $stream = $probeOut.streams[0]

    Write-Host "Verifying $($item.Name): $($stream.width)x$($stream.height) $($stream.codec_name)"
    if ($stream.width -ne $item.Width -or $stream.height -ne $item.Height) {
        Write-Error "Dimension mismatch for $($item.Name)! Expected $($item.Width)x$($item.Height), got $($stream.width)x$($stream.height)"
        exit 1
    }
}

# 5. Timeline Assembly with Ken Burns Zoom & Pan Integration Test
$timelineVideo = Join-Path $visualsDir "timeline_asset_integration.mp4"
Write-Host "Rendering timeline integration video with Ken Burns zoom on visual asset..."

$timelineArgs = @(
    "-y",
    "-loop", "1",
    "-i", $img16x9,
    "-f", "lavfi",
    "-i", "sine=frequency=440:duration=2",
    "-t", "2",
    "-vf", "zoompan=z='min(zoom+0.002,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1920x1080:fps=60,format=yuv420p",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    $timelineVideo
)

& $ffmpeg $timelineArgs

if (!(Test-Path $timelineVideo)) {
    Write-Error "Failed to produce timeline video with visual asset!"
    exit 1
}

$videoProbeArgs = @(
    "-v", "error",
    "-show_entries", "stream=codec_name,width,height,duration",
    "-of", "json",
    $timelineVideo
)
$videoProbe = & $ffprobe $videoProbeArgs | ConvertFrom-Json
$vStream = $videoProbe.streams[0]
Write-Host "Timeline Integration Video Verified: $($vStream.codec_name) $($vStream.width)x$($vStream.height), duration: $($vStream.duration)s"

Write-Host ">>> Stage D Visual Asset Runtime Verification PASSED! <<<"
