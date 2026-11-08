use std::{
    fs::{self, File},
    io::{Read, Write},
    path::Path,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceOption {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub gender: String,
    pub language: String,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceGenerateRequest {
    pub project_id: String,
    pub scene_id: Option<String>,
    pub text: String,
    pub provider: String, // "gemini" or "native"
    pub model: Option<String>,
    pub voice_name: String,
    pub pace: Option<f32>, // 0.5 to 2.0
    pub style_prompt: Option<String>,
    pub billing_confirmed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedAudioResult {
    pub id: String,
    pub project_id: String,
    pub scene_id: Option<String>,
    pub original_name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub provider: String,
    pub voice_name: String,
    pub duration_seconds: f64,
    pub size_bytes: u64,
    pub checksum: String,
    pub waveform: Vec<f32>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceCostEstimate {
    pub character_count: usize,
    pub estimated_seconds: f64,
    pub estimated_cost: String,
    pub requires_billing_confirmation: bool,
}

pub fn get_available_voices() -> Vec<VoiceOption> {
    vec![
        // Gemini Prebuilt Voices
        VoiceOption {
            id: "Kore".into(),
            name: "Kore (Gemini)".into(),
            provider: "gemini".into(),
            gender: "Female".into(),
            language: "Multilingual (English, Urdu, etc.)".into(),
            description: "Warm, clear, balanced, natural pacing for educational and lifestyle videos.".into(),
        },
        VoiceOption {
            id: "Puck".into(),
            name: "Puck (Gemini)".into(),
            provider: "gemini".into(),
            gender: "Male".into(),
            language: "Multilingual (English, Urdu, etc.)".into(),
            description: "Energetic, dynamic, upbeat voice ideal for YouTube Shorts and hooks.".into(),
        },
        VoiceOption {
            id: "Fenrir".into(),
            name: "Fenrir (Gemini)".into(),
            provider: "gemini".into(),
            gender: "Male".into(),
            language: "Multilingual (English, Urdu, etc.)".into(),
            description: "Deep, authoritative, cinematic voice for documentaries and serious topics.".into(),
        },
        VoiceOption {
            id: "Aoede".into(),
            name: "Aoede (Gemini)".into(),
            provider: "gemini".into(),
            gender: "Female".into(),
            language: "Multilingual (English, Urdu, etc.)".into(),
            description: "Gentle, expressive, conversational tone for tutorials and storyboards.".into(),
        },
        VoiceOption {
            id: "Charon".into(),
            name: "Charon (Gemini)".into(),
            provider: "gemini".into(),
            gender: "Male".into(),
            language: "Multilingual (English, Urdu, etc.)".into(),
            description: "Calm, measured, classic storyteller tone for deep dives.".into(),
        },
        // Native Windows System Voices
        VoiceOption {
            id: "Microsoft David Desktop".into(),
            name: "David (Windows Native)".into(),
            provider: "native".into(),
            gender: "Male".into(),
            language: "English (US)".into(),
            description: "Standard offline Windows system narrator. Zero latency and zero API cost.".into(),
        },
        VoiceOption {
            id: "Microsoft Zira Desktop".into(),
            name: "Zira (Windows Native)".into(),
            provider: "native".into(),
            gender: "Female".into(),
            language: "English (US)".into(),
            description: "Clear offline Windows system narrator. Zero latency and zero API cost.".into(),
        },
    ]
}

pub fn estimate_voice_cost(character_count: usize, provider: &str) -> VoiceCostEstimate {
    let words = character_count as f64 / 5.0;
    // Typical speech pace is ~150 words per minute (2.5 words per sec)
    let estimated_seconds = (words / 2.5).max(1.0);

    let (cost_str, req_billing) = if provider == "gemini" {
        // Gemini audio generation estimate: ~$0.00004 per input char / audio token equivalent
        let cost = (character_count as f64) * 0.00004;
        (format!("${:.4} USD", cost), true)
    } else {
        ("$0.00 (Local Offline)".into(), false)
    };

    VoiceCostEstimate {
        character_count,
        estimated_seconds: (estimated_seconds * 10.0).round() / 10.0,
        estimated_cost: cost_str,
        requires_billing_confirmation: req_billing,
    }
}

pub fn pcm_to_wav(pcm_data: &[u8], sample_rate: u32, channels: u16, bits_per_sample: u16) -> Vec<u8> {
    let mut wav = Vec::with_capacity(44 + pcm_data.len());
    let byte_rate = sample_rate * u32::from(channels) * u32::from(bits_per_sample) / 8;
    let block_align = channels * bits_per_sample / 8;
    let data_len = pcm_data.len() as u32;

    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&(36 + data_len).to_le_bytes());
    wav.extend_from_slice(b"WAVE");

    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&16u32.to_le_bytes()); // subchunk1 size
    wav.extend_from_slice(&1u16.to_le_bytes());  // PCM format = 1
    wav.extend_from_slice(&channels.to_le_bytes());
    wav.extend_from_slice(&sample_rate.to_le_bytes());
    wav.extend_from_slice(&byte_rate.to_le_bytes());
    wav.extend_from_slice(&block_align.to_le_bytes());
    wav.extend_from_slice(&bits_per_sample.to_le_bytes());

    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_len.to_le_bytes());
    wav.extend_from_slice(pcm_data);

    wav
}

pub fn parse_wav_duration_and_waveform(wav_bytes: &[u8]) -> (f64, Vec<f32>) {
    if wav_bytes.len() < 44 || &wav_bytes[0..4] != b"RIFF" || &wav_bytes[8..12] != b"WAVE" {
        return (0.0, Vec::new());
    }

    // Find the 'fmt ' chunk
    let mut i = 12;
    let mut byte_rate = 0u32;
    let mut bits_per_sample = 16u16;
    let mut data_offset = 0;
    let mut data_len = 0;

    while i + 8 <= wav_bytes.len() {
        let chunk_id = &wav_bytes[i..i + 4];
        let chunk_size = u32::from_le_bytes([
            wav_bytes[i + 4],
            wav_bytes[i + 5],
            wav_bytes[i + 6],
            wav_bytes[i + 7],
        ]) as usize;

        if chunk_id == b"fmt " && i + 8 + chunk_size <= wav_bytes.len() {
            if chunk_size >= 16 {
                byte_rate = u32::from_le_bytes([
                    wav_bytes[i + 16],
                    wav_bytes[i + 17],
                    wav_bytes[i + 18],
                    wav_bytes[i + 19],
                ]);
                bits_per_sample = u16::from_le_bytes([wav_bytes[i + 22], wav_bytes[i + 23]]);
            }
        } else if chunk_id == b"data" {
            data_offset = i + 8;
            data_len = chunk_size.min(wav_bytes.len().saturating_sub(data_offset));
            break;
        }

        i += 8 + chunk_size;
    }

    let duration = if byte_rate > 0 && data_len > 0 {
        data_len as f64 / byte_rate as f64
    } else {
        0.0
    };

    // Calculate normalized waveform (64 sample buckets)
    let mut waveform = Vec::with_capacity(64);
    if data_len > 0 && bits_per_sample == 16 && data_offset + data_len <= wav_bytes.len() {
        let pcm = &wav_bytes[data_offset..data_offset + data_len];
        let total_samples = pcm.len() / 2;
        if total_samples > 0 {
            let bucket_size = (total_samples / 64).max(1);
            let mut current_sample = 0;

            for _ in 0..64 {
                let mut max_val = 0.0f32;
                let end = (current_sample + bucket_size).min(total_samples);
                for s in current_sample..end {
                    let idx = s * 2;
                    if idx + 1 < pcm.len() {
                        let sample = i16::from_le_bytes([pcm[idx], pcm[idx + 1]]) as f32;
                        let abs = (sample.abs() / 32768.0).min(1.0);
                        if abs > max_val {
                            max_val = abs;
                        }
                    }
                }
                waveform.push((max_val * 100.0).round() / 100.0);
                current_sample = end;
                if current_sample >= total_samples {
                    break;
                }
            }
        }
    }

    while waveform.len() < 64 {
        waveform.push(0.05);
    }

    (duration, waveform)
}

pub fn synthesize_native_windows_tts(
    text: &str,
    voice_name: &str,
    pace: f32,
    dest_path: &Path,
) -> Result<(), String> {
    let dest_str = dest_path
        .to_str()
        .ok_or_else(|| "Invalid destination path.".to_string())?
        .replace("'", "''");

    let clean_text = text.replace("'", "''").replace("`", "");
    let rate = ((pace - 1.0) * 10.0).clamp(-10.0, 10.0) as i32;
    let clean_voice = voice_name.replace("'", "''");

    let script = format!(
        "Add-Type -AssemblyName System.Speech; \
         $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; \
         $s.SetOutputToWaveFile('{dest}'); \
         $s.Rate = {rate}; \
         try {{ $s.SelectVoice('{voice}') }} catch {{ }}; \
         $s.Speak('{text}'); \
         $s.Dispose();",
        dest = dest_str,
        rate = rate,
        voice = clean_voice,
        text = clean_text,
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to run speech synthesis command: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Speech synthesis failed: {}", err_msg.trim()));
    }

    if !dest_path.exists() || fs::metadata(dest_path).map(|m| m.len()).unwrap_or(0) == 0 {
        return Err("Speech synthesis produced an empty or missing audio file.".to_string());
    }

    Ok(())
}

pub async fn synthesize_gemini_tts(
    text: &str,
    voice_name: &str,
    model: &str,
    credential: &str,
    dest_path: &Path,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|_| "Could not initialize the Gemini network client.".to_string())?;

    let endpoint = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        model
    );

    let body = json!({
        "contents": [{
            "parts": [{ "text": text }]
        }],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name
                    }
                }
            }
        }
    });

    let response = client
        .post(&endpoint)
        .header("x-goog-api-key", credential)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Gemini voice synthesis timed out. Try again.".to_string()
            } else {
                "Gemini voice synthesis network request failed. Check connection.".to_string()
            }
        })?;

    let status = response.status();
    if status.as_u16() == 429 {
        return Err("Gemini API rate limit reached. Wait before retrying.".into());
    }
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err("Gemini rejected the credential or model audio access.".into());
    }
    if !status.is_success() {
        return Err(format!("Gemini request failed with HTTP {}.", status.as_u16()));
    }

    let payload: Value = response
        .json()
        .await
        .map_err(|_| "Gemini returned an unreadable response.".to_string())?;

    let part = payload
        .get("candidates")
        .and_then(Value::as_array)
        .and_then(|items| items.first())
        .and_then(|candidate| candidate.get("content"))
        .and_then(|content| content.get("parts"))
        .and_then(Value::as_array)
        .and_then(|parts| parts.first())
        .ok_or_else(|| "Gemini response contained no audio candidates.".to_string())?;

    let inline = part
        .get("inlineData")
        .ok_or_else(|| "Gemini response did not contain inline audio data.".to_string())?;

    let base64_data = inline
        .get("data")
        .and_then(Value::as_str)
        .ok_or_else(|| "Missing audio base64 payload.".to_string())?;

    let raw_bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|_| "Failed to decode Gemini audio base64 payload.".to_string())?;

    // If audio is already a WAV container, save directly. Otherwise wrap 24kHz 16-bit mono PCM.
    let wav_bytes = if raw_bytes.len() > 4 && &raw_bytes[0..4] == b"RIFF" {
        raw_bytes
    } else {
        pcm_to_wav(&raw_bytes, 24000, 1, 16)
    };

    let mut file = File::create(dest_path).map_err(|e| format!("Failed to create audio file: {}", e))?;
    file.write_all(&wav_bytes)
        .map_err(|e| format!("Failed writing audio file: {}", e))?;

    Ok(())
}

fn compute_file_sha256(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| format!("Read error: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn generate_uuid() -> String {
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let pid = std::process::id();
    let random_part = (time ^ ((pid as u128) << 32)) ^ 0x9e3779b97f4a7c15;
    let b = random_part.to_be_bytes();
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-4{:01x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        b[0], b[1], b[2], b[3], b[4], b[5], b[6] & 0x0f, b[7], (b[8] & 0x3f) | 0x80, b[9], b[10], b[11], b[12], b[13], b[14], b[15]
    )
}

fn iso_now() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400;

    let mut year = 1970;
    let mut d = days;
    loop {
        let leap = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) { 1 } else { 0 };
        let days_in_year = 365 + leap;
        if d >= days_in_year {
            d -= days_in_year;
            year += 1;
        } else {
            let leap_b = leap == 1;
            let m_days = [
                31, if leap_b { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
            ];
            let mut month = 1;
            for &md in &m_days {
                if d >= md {
                    d -= md;
                    month += 1;
                } else {
                    break;
                }
            }
            return format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, d + 1, h, m, s);
        }
    }
}

pub fn validate_voice_request(request: &VoiceGenerateRequest) -> Result<(), String> {
    if request.project_id.trim().is_empty() {
        return Err("Project ID is required for voice generation.".into());
    }
    if request.text.trim().is_empty() || request.text.chars().count() > 20_000 {
        return Err("Narration text is empty or exceeds the 20,000 character limit.".into());
    }
    if request.provider == "gemini" {
        if !request.billing_confirmed {
            return Err("Explicit billing authorization is required for Gemini voice generation.".into());
        }
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| "gemini-3.8-flash".into());

        let catalog = crate::native::get_gemini_model_catalog();
        if let Some(info) = catalog.iter().find(|m| m.id == model) {
            if !info.supports_tts {
                return Err(format!(
                    "The Gemini model '{}' does not support voice/audio generation. Select a model with TTS capability (e.g. Gemini 3.8 Flash).",
                    model
                ));
            }
        } else {
            return Err(format!(
                "The Gemini model '{}' is not supported or has been deprecated. Choose a supported model from the catalog.",
                model
            ));
        }
    }
    Ok(())
}

#[tauri::command]
pub fn voice_get_available_voices() -> Vec<VoiceOption> {
    get_available_voices()
}

#[tauri::command]
pub fn voice_estimate_cost(character_count: usize, provider: String) -> VoiceCostEstimate {
    estimate_voice_cost(character_count, &provider)
}

#[tauri::command]
pub async fn voice_generate_audio(
    app: tauri::AppHandle,
    request: VoiceGenerateRequest,
) -> Result<GeneratedAudioResult, String> {
    validate_voice_request(&request)?;

    let storage_root = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let audio_dir = storage_root
        .join("projects")
        .join(&request.project_id)
        .join("audio");

    fs::create_dir_all(&audio_dir)
        .map_err(|e| format!("Failed creating project audio directory: {}", e))?;

    let clip_id = generate_uuid();
    let scene_tag = request
        .scene_id
        .as_deref()
        .unwrap_or("full")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect::<String>();

    let filename = format!("voice_{}_{}.wav", scene_tag, &clip_id[..8]);
    let dest_path = audio_dir.join(&filename);

    if request.provider == "gemini" {
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| "gemini-3.8-flash".into());

        // Load credential from Windows Credential Manager
        let entry = keyring::Entry::new("com.aiyoutubestudio.provider", "gemini")
            .map_err(|_| "Windows Credential Manager is unavailable.".to_string())?;
        let credential = entry
            .get_password()
            .map_err(|_| "Gemini API key is not configured in Windows Credential Manager.".to_string())?;

        let prompt_text = if let Some(style) = &request.style_prompt {
            if !style.trim().is_empty() {
                format!("Say this clearly with a {} tone: {}", style.trim(), request.text)
            } else {
                request.text.clone()
            }
        } else {
            request.text.clone()
        };

        synthesize_gemini_tts(&prompt_text, &request.voice_name, &model, &credential, &dest_path).await?;
    } else {
        // Native Windows SAPI speech synthesis
        let pace = request.pace.unwrap_or(1.0);
        synthesize_native_windows_tts(&request.text, &request.voice_name, pace, &dest_path)?;
    }

    let metadata = fs::metadata(&dest_path)
        .map_err(|e| format!("Could not read generated audio metadata: {}", e))?;
    let size_bytes = metadata.len();

    let mut wav_bytes = Vec::new();
    let mut file = File::open(&dest_path).map_err(|e| format!("Failed opening audio file: {}", e))?;
    file.read_to_end(&mut wav_bytes)
        .map_err(|e| format!("Failed reading audio file: {}", e))?;
    drop(file);

    let (duration_seconds, waveform) = parse_wav_duration_and_waveform(&wav_bytes);
    let checksum = compute_file_sha256(&dest_path)?;

    let relative_path = format!("projects/{}/audio/{}", request.project_id, filename);

    Ok(GeneratedAudioResult {
        id: clip_id,
        project_id: request.project_id,
        scene_id: request.scene_id,
        original_name: filename,
        relative_path,
        absolute_path: dest_path.to_string_lossy().to_string(),
        provider: request.provider,
        voice_name: request.voice_name,
        duration_seconds,
        size_bytes,
        checksum,
        waveform,
        status: "draft".into(),
        created_at: iso_now(),
    })
}

#[tauri::command]
pub fn voice_delete_audio_file(app: tauri::AppHandle, relative_path: String) -> Result<(), String> {
    let storage_root = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_path = storage_root.join(&relative_path);

    if let (Ok(canonical_root), Ok(canonical_target)) = (storage_root.canonicalize(), full_path.canonicalize()) {
        if !canonical_target.starts_with(canonical_root) {
            return Err("Cannot delete files outside application storage root.".into());
        }
    }

    if full_path.exists() {
        fs::remove_file(full_path).map_err(|e| format!("Failed deleting audio file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn voice_get_audio_data_url(app: tauri::AppHandle, relative_path: String) -> Result<String, String> {
    let storage_root = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_path = storage_root.join(&relative_path);

    if let (Ok(canonical_root), Ok(canonical_target)) = (storage_root.canonicalize(), full_path.canonicalize()) {
        if !canonical_target.starts_with(canonical_root) {
            return Err("Cannot access files outside application storage root.".into());
        }
    }

    if !full_path.exists() {
        return Err("Audio file not found on disk.".into());
    }

    let mut file = File::open(&full_path).map_err(|e| format!("Failed opening audio file: {}", e))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| format!("Failed reading audio file: {}", e))?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:audio/wav;base64,{}", encoded))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provides_voices_with_metadata() {
        let voices = get_available_voices();
        assert!(voices.len() >= 5);
        assert!(voices.iter().any(|v| v.id == "Kore" && v.provider == "gemini"));
        assert!(voices.iter().any(|v| v.id == "Microsoft David Desktop" && v.provider == "native"));
    }

    #[test]
    fn estimates_voice_cost_correctly() {
        let est_gemini = estimate_voice_cost(1000, "gemini");
        assert!(est_gemini.requires_billing_confirmation);
        assert!(est_gemini.estimated_cost.contains('$'));

        let est_native = estimate_voice_cost(1000, "native");
        assert!(!est_native.requires_billing_confirmation);
        assert!(est_native.estimated_cost.contains("$0.00"));
    }

    #[test]
    fn wraps_pcm_data_into_valid_wav_header() {
        let dummy_pcm = vec![0u8; 48000]; // 1 second of 24kHz 16-bit mono
        let wav = pcm_to_wav(&dummy_pcm, 24000, 1, 16);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        assert_eq!(&wav[36..40], b"data");

        let (duration, waveform) = parse_wav_duration_and_waveform(&wav);
        assert!((duration - 1.0).abs() < 0.05);
        assert_eq!(waveform.len(), 64);
    }

    #[test]
    fn synthesizes_real_native_sapi_audio_file() {
        let temp_dir = std::env::temp_dir().join(format!("ai_yt_voice_test_{}", generate_uuid()));
        fs::create_dir_all(&temp_dir).unwrap();
        let wav_path = temp_dir.join("test_speech.wav");

        let res = synthesize_native_windows_tts(
            "Testing speech synthesis in AI YouTube Studio.",
            "Microsoft David Desktop",
            1.0,
            &wav_path,
        );

        assert!(res.is_ok(), "Speech synthesis should succeed: {:?}", res);
        assert!(wav_path.exists());
        let meta = fs::metadata(&wav_path).unwrap();
        assert!(meta.len() > 1000);

        let mut bytes = Vec::new();
        File::open(&wav_path).unwrap().read_to_end(&mut bytes).unwrap();
        let (duration, waveform) = parse_wav_duration_and_waveform(&bytes);
        assert!(duration > 0.5);
        assert_eq!(waveform.len(), 64);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn validates_voice_request_parameters_and_capabilities() {
        let valid_gemini = VoiceGenerateRequest {
            project_id: "test-proj-1".into(),
            scene_id: Some("scene-1".into()),
            text: "Hello world from voice studio".into(),
            provider: "gemini".into(),
            model: Some("gemini-3.8-flash".into()),
            voice_name: "Kore".into(),
            pace: Some(1.0),
            style_prompt: None,
            billing_confirmed: true,
        };
        assert!(validate_voice_request(&valid_gemini).is_ok());

        let mut dedicated_tts = valid_gemini.clone();
        dedicated_tts.model = Some("gemini-3.8-flash-tts".into());
        assert!(validate_voice_request(&dedicated_tts).is_ok());

        // Billing confirmation gate check
        let mut unconfirmed = valid_gemini.clone();
        unconfirmed.billing_confirmed = false;
        let err = validate_voice_request(&unconfirmed);
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("billing authorization is required"));

        // Model without TTS capability check
        let mut non_tts_model = valid_gemini.clone();
        non_tts_model.model = Some("gemini-4-argon".into());
        let err = validate_voice_request(&non_tts_model);
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("does not support voice/audio"));

        // Deprecated model check
        let mut deprecated = valid_gemini.clone();
        deprecated.model = Some("gemini-1.5-flash".into());
        let err = validate_voice_request(&deprecated);
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("deprecated"));

        // Native Windows SAPI requires no billing confirmation
        let valid_native = VoiceGenerateRequest {
            project_id: "test-proj-1".into(),
            scene_id: None,
            text: "Offline native test speech".into(),
            provider: "native".into(),
            model: None,
            voice_name: "Microsoft David Desktop".into(),
            pace: Some(1.0),
            style_prompt: None,
            billing_confirmed: false,
        };
        assert!(validate_voice_request(&valid_native).is_ok());

        // Empty text check
        let mut empty_text = valid_native.clone();
        empty_text.text = "   ".into();
        assert!(validate_voice_request(&empty_text).is_err());
    }
}
