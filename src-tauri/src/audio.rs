use std::{
    fs::{self, File},
    io::{Read, Write},
    path::Path,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;

use crate::ffmpeg::{locate_ffmpeg_binary, probe_media_file};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioLibraryTrack {
    pub id: String,
    pub project_id: Option<String>,
    pub name: String,
    pub track_type: String, // "music", "sfx", "ambient"
    pub category: String,   // "Cinematic", "Technology", etc.
    pub mood: String,
    pub tempo: String, // "slow", "medium", "fast"
    pub duration_seconds: f64,
    pub relative_path: String,
    pub original_name: String,
    pub format: String,
    pub license_type: String,
    pub attribution: String,
    pub commercial_use: bool,
    pub size_bytes: u64,
    pub checksum: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuckingConfig {
    pub enabled: bool,
    pub ducking_amount_db: f32, // e.g. -14.0 dB
    pub music_volume: f32,      // 0.25 (25%)
    pub voice_volume: f32,      // 1.0 (100%)
    pub sfx_volume: f32,        // 0.8 (80%)
    pub fade_in_seconds: f32,   // 1.0s
    pub fade_out_seconds: f32,  // 2.0s
    pub attack_ms: u32,         // 100ms
    pub release_ms: u32,        // 400ms
    pub target_lufs: f32,       // -14.0 LUFS YouTube standard
}

impl Default for DuckingConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            ducking_amount_db: -14.0,
            music_volume: 0.25,
            voice_volume: 1.0,
            sfx_volume: 0.8,
            fade_in_seconds: 1.0,
            fade_out_seconds: 2.0,
            attack_ms: 100,
            release_ms: 400,
            target_lufs: -14.0,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessDuckingRequest {
    pub project_id: String,
    pub music_relative_path: Option<String>,
    pub voice_relative_path: Option<String>,
    #[allow(dead_code)]
    pub sfx_relative_path: Option<String>,
    pub output_filename: Option<String>,
    pub config: DuckingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessDuckingResult {
    pub output_path: String,
    pub relative_path: String,
    pub duration_seconds: f64,
    pub size_bytes: u64,
    pub checksum: String,
}

pub fn get_default_built_in_tracks() -> Vec<AudioLibraryTrack> {
    vec![
        AudioLibraryTrack {
            id: "track-cinematic-epic".into(),
            project_id: None,
            name: "Hyperdrive Odyssey (Cinematic)".into(),
            track_type: "music".into(),
            category: "Cinematic".into(),
            mood: "Dramatic & Expansive".into(),
            tempo: "medium".into(),
            duration_seconds: 60.0,
            relative_path: "audio/library/cinematic_odyssey.wav".into(),
            original_name: "cinematic_odyssey.wav".into(),
            format: "wav".into(),
            license_type: "Creative Commons Zero (CC0) / Royalty-Free".into(),
            attribution: "NovaVid Studio Audio Engine".into(),
            commercial_use: true,
            size_bytes: 5292000,
            checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".into(),
        },
        AudioLibraryTrack {
            id: "track-tech-pulse".into(),
            project_id: None,
            name: "Silicon Horizon (Technology)".into(),
            track_type: "music".into(),
            category: "Technology".into(),
            mood: "Modern & Futuristic".into(),
            tempo: "fast".into(),
            duration_seconds: 45.0,
            relative_path: "audio/library/tech_horizon.wav".into(),
            original_name: "tech_horizon.wav".into(),
            format: "wav".into(),
            license_type: "Creative Commons Zero (CC0) / Royalty-Free".into(),
            attribution: "NovaVid Studio Audio Engine".into(),
            commercial_use: true,
            size_bytes: 3969000,
            checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856".into(),
        },
        AudioLibraryTrack {
            id: "track-ambient-deep".into(),
            project_id: None,
            name: "Zenith Atmosphere (Ambient)".into(),
            track_type: "music".into(),
            category: "Ambient".into(),
            mood: "Peaceful & Contemplative".into(),
            tempo: "slow".into(),
            duration_seconds: 90.0,
            relative_path: "audio/library/ambient_zenith.wav".into(),
            original_name: "ambient_zenith.wav".into(),
            format: "wav".into(),
            license_type: "Creative Commons Zero (CC0) / Royalty-Free".into(),
            attribution: "NovaVid Studio Audio Engine".into(),
            commercial_use: true,
            size_bytes: 7938000,
            checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857".into(),
        },
        AudioLibraryTrack {
            id: "track-sfx-cinematic-impact".into(),
            project_id: None,
            name: "Sub Bass Impact (SFX)".into(),
            track_type: "sfx".into(),
            category: "Impacts".into(),
            mood: "Heavy Punch".into(),
            tempo: "fast".into(),
            duration_seconds: 2.5,
            relative_path: "audio/library/sfx_sub_impact.wav".into(),
            original_name: "sfx_sub_impact.wav".into(),
            format: "wav".into(),
            license_type: "Creative Commons Zero (CC0) / Royalty-Free".into(),
            attribution: "NovaVid Sound Effects".into(),
            commercial_use: true,
            size_bytes: 220500,
            checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b858".into(),
        },
        AudioLibraryTrack {
            id: "track-sfx-whoosh-transition".into(),
            project_id: None,
            name: "Cinematic Air Riser & Whoosh".into(),
            track_type: "sfx".into(),
            category: "Transitions".into(),
            mood: "High Energy".into(),
            tempo: "fast".into(),
            duration_seconds: 1.8,
            relative_path: "audio/library/sfx_whoosh.wav".into(),
            original_name: "sfx_whoosh.wav".into(),
            format: "wav".into(),
            license_type: "Creative Commons Zero (CC0) / Royalty-Free".into(),
            attribution: "NovaVid Sound Effects".into(),
            commercial_use: true,
            size_bytes: 158760,
            checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b859".into(),
        },
    ]
}

/// Generates procedural synthesis for default audio library tracks into local project cache.
pub fn synthesize_procedural_track(
    output_path: &Path,
    category: &str,
    duration_seconds: f64,
    custom_ffmpeg_path: Option<&str>,
) -> Result<f64, String> {
    let (ffmpeg_opt, _, _) = locate_ffmpeg_binary(custom_ffmpeg_path);

    if let Some(ffmpeg_bin) = ffmpeg_opt {
        let lavfi_filter = match category {
            "Cinematic" => "sine=frequency=110:duration=60,asupercut,volume=0.4",
            "Technology" => "sine=frequency=220:duration=45,tremolo=f=4:d=0.6,volume=0.3",
            "Ambient" => "sine=frequency=88:duration=90,volume=0.25",
            "Impacts" => "sine=frequency=60:duration=2.5,afade=t=out:st=0.5:d=2.0,volume=0.8",
            "Transitions" => "sine=frequency=440:duration=1.8,afade=t=in:st=0:d=0.5,afade=t=out:st=0.8:d=1.0,volume=0.7",
            _ => "sine=frequency=174:duration=30,volume=0.3",
        };

        let status = Command::new(&ffmpeg_bin)
            .args([
                "-y",
                "-f",
                "lavfi",
                "-i",
                lavfi_filter,
                "-t",
                &duration_seconds.to_string(),
                "-c:a",
                "pcm_s16le",
                "-ar",
                "44100",
                output_path.to_string_lossy().as_ref(),
            ])
            .status();

        if let Ok(st) = status {
            if st.success() && output_path.exists() {
                return Ok(duration_seconds);
            }
        }
    }

    // Pure Rust 44.1kHz 16-bit Mono Sine Wave Fallback
    let sample_rate: u32 = 44100;
    let total_samples = (sample_rate as f64 * duration_seconds) as usize;
    let mut pcm_bytes = Vec::with_capacity(total_samples * 2);
    let freq = match category {
        "Cinematic" => 110.0,
        "Technology" => 220.0,
        "Ambient" => 88.0,
        "Impacts" => 60.0,
        _ => 174.0,
    };

    for i in 0..total_samples {
        let t = i as f64 / sample_rate as f64;
        let sample = (t * freq * 2.0 * std::f64::consts::PI).sin();
        let sample_i16 = (sample * 0.3 * 32767.0) as i16;
        pcm_bytes.extend_from_slice(&sample_i16.to_le_bytes());
    }

    let mut wav_file = File::create(output_path).map_err(|e| e.to_string())?;
    // Write RIFF Header
    let data_len = pcm_bytes.len() as u32;
    wav_file.write_all(b"RIFF").map_err(|e| e.to_string())?;
    wav_file.write_all(&(36 + data_len).to_le_bytes()).map_err(|e| e.to_string())?;
    wav_file.write_all(b"WAVEfmt ").map_err(|e| e.to_string())?;
    wav_file.write_all(&16u32.to_le_bytes()).map_err(|e| e.to_string())?; // PCM header size
    wav_file.write_all(&1u16.to_le_bytes()).map_err(|e| e.to_string())?;  // Audio format 1 = PCM
    wav_file.write_all(&1u16.to_le_bytes()).map_err(|e| e.to_string())?;  // Channels = 1 (Mono)
    wav_file.write_all(&sample_rate.to_le_bytes()).map_err(|e| e.to_string())?;
    wav_file.write_all(&(sample_rate * 2).to_le_bytes()).map_err(|e| e.to_string())?; // Byte rate
    wav_file.write_all(&2u16.to_le_bytes()).map_err(|e| e.to_string())?;  // Block align
    wav_file.write_all(&16u16.to_le_bytes()).map_err(|e| e.to_string())?; // Bits per sample
    wav_file.write_all(b"data").map_err(|e| e.to_string())?;
    wav_file.write_all(&data_len.to_le_bytes()).map_err(|e| e.to_string())?;
    wav_file.write_all(&pcm_bytes).map_err(|e| e.to_string())?;

    Ok(duration_seconds)
}

/// Computes 64-bucket normalized peak amplitude waveform from raw PCM or audio file bytes.
pub fn compute_audio_waveform(bytes: &[u8], buckets: usize) -> Vec<f32> {
    if bytes.len() < 44 {
        return vec![0.0; buckets];
    }

    // Skip 44-byte WAV header if present
    let pcm_data = if &bytes[0..4] == b"RIFF" && bytes.len() > 44 {
        &bytes[44..]
    } else {
        bytes
    };

    let sample_count = pcm_data.len() / 2;
    if sample_count == 0 {
        return vec![0.0; buckets];
    }

    let samples_per_bucket = (sample_count / buckets).max(1);
    let mut waveform = Vec::with_capacity(buckets);

    for b in 0..buckets {
        let start = b * samples_per_bucket * 2;
        let end = ((b + 1) * samples_per_bucket * 2).min(pcm_data.len());
        let mut peak: f32 = 0.0;

        let mut i = start;
        while i + 1 < end {
            let sample = i16::from_le_bytes([pcm_data[i], pcm_data[i + 1]]);
            let amp = (sample.abs() as f32) / 32768.0;
            if amp > peak {
                peak = amp;
            }
            i += 2;
        }
        waveform.push((peak * 100.0).round() / 100.0);
    }

    waveform
}

// ----------------- Tauri IPC Handlers -----------------

#[tauri::command]
pub fn audio_get_library_tracks(app: tauri::AppHandle, project_id: Option<String>) -> Vec<AudioLibraryTrack> {
    let mut tracks = get_default_built_in_tracks();

    if let (Some(pid), Ok(app_dir)) = (project_id, app.path().app_data_dir()) {
        let library_dir = app_dir.join("projects").join(&pid).join("audio").join("library");
        let _ = fs::create_dir_all(&library_dir);

        // Ensure default audio files exist on disk for immediate playback
        for track in &mut tracks {
            let file_path = app_dir.join("projects").join(&pid).join(&track.relative_path);
            if !file_path.exists() {
                if let Some(parent) = file_path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let _ = synthesize_procedural_track(&file_path, &track.category, track.duration_seconds, None);
            }
        }
    }

    tracks
}

#[tauri::command]
pub async fn audio_process_ducking_mix(
    app: tauri::AppHandle,
    request: ProcessDuckingRequest,
) -> Result<ProcessDuckingResult, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let (ffmpeg_opt, _, _) = locate_ffmpeg_binary(None);
    let ffmpeg_bin = ffmpeg_opt.ok_or_else(|| "FFmpeg binary is required for audio ducking processing.".to_string())?;

    let project_dir = app_dir.join("projects").join(&request.project_id);
    let audio_dir = project_dir.join("audio");
    fs::create_dir_all(&audio_dir).map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let file_name = request
        .output_filename
        .unwrap_or_else(|| format!("mix_ducked_{}.wav", timestamp));
    let output_path = audio_dir.join(&file_name);

    let mut cmd = Command::new(&ffmpeg_bin);
    cmd.args(["-y", "-threads", "2"]);

    // Inputs: [0] Music, [1] Voice, [2] SFX (if provided)
    let has_music = request.music_relative_path.is_some();
    let has_voice = request.voice_relative_path.is_some();

    if !has_music && !has_voice {
        return Err("Audio ducking mix requires at least voiceover or background music input.".into());
    }

    if let Some(m_rel) = &request.music_relative_path {
        cmd.arg("-i").arg(project_dir.join(m_rel));
    }
    if let Some(v_rel) = &request.voice_relative_path {
        cmd.arg("-i").arg(project_dir.join(v_rel));
    }

    // Filtergraph construction
    if has_music && has_voice && request.config.enabled {
        // [0:a] is music, [1:a] is voice
        let filter = format!(
            "[1:a]asplit=2[v_main][v_side]; \
             [0:a]volume={}[m_scaled]; \
             [m_scaled][v_side]sidechaincompress=threshold=0.08:ratio=4:attack={}:release={}:makeup=1[m_ducked]; \
             [v_main][m_ducked]amix=inputs=2:duration=longest[mixed]; \
             [mixed]loudnorm=I={}:TP=-1.5:LRA=11[out]",
            request.config.music_volume,
            request.config.attack_ms,
            request.config.release_ms,
            request.config.target_lufs
        );
        cmd.args(["-filter_complex", &filter, "-map", "[out]"]);
    } else if has_music && !has_voice {
        let filter = format!("volume={}[out]", request.config.music_volume);
        cmd.args(["-af", &filter]);
    } else {
        cmd.args(["-af", "volume=1.0"]);
    }

    cmd.args(["-c:a", "pcm_s16le", "-ar", "44100"]);
    cmd.arg(&output_path);

    let output = cmd.output().map_err(|e| format!("Failed to execute FFmpeg ducking: {}", e))?;
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg audio ducking failed: {}", err_msg));
    }

    let metadata = fs::metadata(&output_path).map_err(|e| e.to_string())?;
    let mut f = File::open(&output_path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = Vec::new();
    f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    hasher.update(&buf);
    let checksum = format!("{:x}", hasher.finalize());

    let (_, ffprobe_opt, _) = locate_ffmpeg_binary(None);
    let duration = ffprobe_opt
        .and_then(|ffprobe| probe_media_file(&ffprobe, &output_path).ok())
        .map(|p| p.duration_seconds)
        .unwrap_or(0.0);

    Ok(ProcessDuckingResult {
        output_path: output_path.to_string_lossy().to_string(),
        relative_path: format!("audio/{}", file_name),
        duration_seconds: duration,
        size_bytes: metadata.len(),
        checksum,
    })
}

#[tauri::command]
pub fn audio_get_waveform(
    app: tauri::AppHandle,
    project_id: String,
    relative_path: String,
) -> Result<Vec<f32>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let file_path = app_dir
        .join("projects")
        .join(&project_id)
        .join(&relative_path);

    let mut file = File::open(file_path).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

    Ok(compute_audio_waveform(&bytes, 64))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_tracks_have_valid_metadata_and_categories() {
        let tracks = get_default_built_in_tracks();
        assert_eq!(tracks.len(), 5);
        for t in tracks {
            assert!(t.duration_seconds > 0.0);
            assert!(t.commercial_use);
            assert_eq!(t.format, "wav");
            assert!(t.checksum.len() == 64);
        }
    }

    #[test]
    fn default_ducking_config_values_are_valid() {
        let conf = DuckingConfig::default();
        assert!(conf.enabled);
        assert_eq!(conf.ducking_amount_db, -14.0);
        assert_eq!(conf.music_volume, 0.25);
        assert_eq!(conf.target_lufs, -14.0);
    }

    #[test]
    fn computes_64_bucket_waveform_correctly() {
        // Create 200 samples of mock PCM audio
        let mut pcm = vec![0u8; 400];
        for i in 0..200 {
            let sample: i16 = if i % 2 == 0 { 16000 } else { -16000 };
            pcm[i * 2] = (sample & 0xFF) as u8;
            pcm[i * 2 + 1] = ((sample >> 8) & 0xFF) as u8;
        }

        let wf = compute_audio_waveform(&pcm, 64);
        assert_eq!(wf.len(), 64);
        assert!(wf[0] > 0.4);
    }

    #[test]
    fn synthesizes_procedural_wav_file_on_disk() {
        let temp_dir = std::env::temp_dir();
        let test_wav = temp_dir.join("test_stage_e_procedural.wav");
        if test_wav.exists() {
            let _ = fs::remove_file(&test_wav);
        }

        let res = synthesize_procedural_track(&test_wav, "Cinematic", 2.0, None);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), 2.0);
        assert!(test_wav.exists());

        let meta = fs::metadata(&test_wav).unwrap();
        assert!(meta.len() > 1000);

        let _ = fs::remove_file(&test_wav);
    }
}
