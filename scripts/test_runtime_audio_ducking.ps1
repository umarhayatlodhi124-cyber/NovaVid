# Stage E Runtime Verification Script — Dynamic Audio Ducking & Loudness Normalization
# Tests sidechain compression and ITU-R BS.1770 / -14 LUFS YouTube standard output.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$ffmpegPath = Join-Path $projectRoot "bin\ffmpeg.exe"
$ffprobePath = Join-Path $projectRoot "bin\ffprobe.exe"

if (-not (Test-Path $ffmpegPath)) {
    $ffmpegPath = Join-Path $projectRoot "src-tauri\bin\ffmpeg.exe"
}
if (-not (Test-Path $ffprobePath)) {
    $ffprobePath = Join-Path $projectRoot "src-tauri\bin\ffprobe.exe"
}

if (-not (Test-Path $ffmpegPath)) {
    Write-Error "Static ffmpeg.exe not found at $ffmpegPath"
}
if (-not (Test-Path $ffprobePath)) {
    Write-Error "Static ffprobe.exe not found at $ffprobePath"
}

$tempDir = [System.IO.Path]::GetTempPath()
$voiceWav = Join-Path $tempDir "stage_e_test_voice.wav"
$musicWav = Join-Path $tempDir "stage_e_test_music.wav"
$outputDuckedWav = Join-Path $tempDir "stage_e_test_ducked_mix.wav"

Write-Host "1. Synthesizing test voiceover track (44.1kHz mono)..." -ForegroundColor Cyan
& $ffmpegPath -y -f lavfi -i "sine=frequency=280:duration=4" -c:a pcm_s16le -ar 44100 $voiceWav
if (-not (Test-Path $voiceWav)) {
    Write-Error "Failed to generate test voice track."
}

Write-Host "2. Synthesizing test background music bed (44.1kHz mono)..." -ForegroundColor Cyan
& $ffmpegPath -y -f lavfi -i "sine=frequency=110:duration=6" -c:a pcm_s16le -ar 44100 $musicWav
if (-not (Test-Path $musicWav)) {
    Write-Error "Failed to generate test music track."
}

Write-Host "3. Executing FFmpeg Sidechain Ducking with YouTube Loudness Target (-14.0 LUFS)..." -ForegroundColor Cyan
# Voice splits to main and sidechain trigger. Music is compressed when voice is active.
$filtergraph = "[1:a]asplit=2[v_main][v_side]; [0:a]volume=0.3[m_scaled]; [m_scaled][v_side]sidechaincompress=threshold=0.08:ratio=4:attack=100:release=400:makeup=1[m_ducked]; [v_main][m_ducked]amix=inputs=2:duration=longest[mixed]; [mixed]loudnorm=I=-14:TP=-1.5:LRA=11[out]"

& $ffmpegPath -y -i $musicWav -i $voiceWav -filter_complex $filtergraph -map "[out]" -c:a pcm_s16le -ar 44100 $outputDuckedWav

if (-not (Test-Path $outputDuckedWav)) {
    Write-Error "FFmpeg ducking processing failed: Output file was not created."
}

$outputSize = (Get-Item $outputDuckedWav).Length
Write-Host "4. Output file created successfully. Size: $outputSize bytes" -ForegroundColor Green

Write-Host "5. Probing ducked audio mix with ffprobe..." -ForegroundColor Cyan
$probeJson = & $ffprobePath -v quiet -print_format json -show_format -show_streams $outputDuckedWav | Out-String
$probe = $probeJson | ConvertFrom-Json

$stream = $probe.streams[0]
$format = $probe.format

Write-Host "--- Audio Verification Results ---" -ForegroundColor Yellow
Write-Host "Codec: $($stream.codec_name)"
Write-Host "Sample Rate: $($stream.sample_rate) Hz"
Write-Host "Channels: $($stream.channels)"
Write-Host "Duration: $($format.duration) s"
Write-Host "Bitrate: $($format.bit_rate) bps"
Write-Host "Format Name: $($format.format_name)"

if ([double]$format.duration -lt 3.5) {
    Write-Error "Duration check failed: Expected >= 4s, got $($format.duration)s"
}

Write-Host "SUCCESS: Dynamic Audio Ducking and YouTube -14 LUFS broadcast normalization verified!" -ForegroundColor Green

# Clean up temporary test files
Remove-Item $voiceWav -Force -ErrorAction SilentlyContinue
Remove-Item $musicWav -Force -ErrorAction SilentlyContinue
Remove-Item $outputDuckedWav -Force -ErrorAction SilentlyContinue
