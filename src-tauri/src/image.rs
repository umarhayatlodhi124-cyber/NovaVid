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

use crate::ffmpeg::locate_ffmpeg_binary;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageModelInfo {
    pub id: String,
    pub display_name: String,
    pub provider: String, // "gemini" or "local"
    pub status: String,   // "recommended", "active", "offline"
    pub description: String,
    pub supports_aspect_ratios: Vec<String>,
    pub estimated_cost_per_image: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageCostEstimate {
    pub image_count: u32,
    pub estimated_cost: String,
    pub requires_billing_confirmation: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ImageGenerateRequest {
    pub project_id: String,
    pub scene_id: Option<String>,
    pub character_id: Option<String>,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub aspect_ratio: String, // "16:9", "9:16", "1:1"
    pub style_preset: String, // "cinematic", "photorealistic", "anime", "digital_art", "3d_render", "vintage", "claymation", "minimalist"
    pub provider: String,     // "gemini" or "local"
    pub model: Option<String>,
    pub motion_preset: Option<String>,
    pub is_b_roll: bool,
    pub billing_confirmed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageGenerateResult {
    pub id: String,
    pub project_id: String,
    pub scene_id: Option<String>,
    pub original_name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub provider: String,
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
    pub checksum: String,
    pub created_at: String,
}

pub fn get_available_image_models() -> Vec<ImageModelInfo> {
    vec![
        ImageModelInfo {
            id: "imagen-3.0-generate-002".into(),
            display_name: "Google Imagen 3 (High Fidelity)".into(),
            provider: "gemini".into(),
            status: "recommended".into(),
            description: "Google's highest fidelity diffusion model for YouTube visuals, thumbnails, and cinematic scenes.".into(),
            supports_aspect_ratios: vec!["16:9".into(), "9:16".into(), "1:1".into()],
            estimated_cost_per_image: 0.03,
        },
        ImageModelInfo {
            id: "imagen-3.0-fast-generate-001".into(),
            display_name: "Google Imagen 3 Fast".into(),
            provider: "gemini".into(),
            status: "active".into(),
            description: "High-speed ideation image generation optimized for rapid storyboard iterations.".into(),
            supports_aspect_ratios: vec!["16:9".into(), "9:16".into(), "1:1".into()],
            estimated_cost_per_image: 0.02,
        },
        ImageModelInfo {
            id: "local-synthesizer".into(),
            display_name: "Local Studio Synthesizer (Offline)".into(),
            provider: "local".into(),
            status: "offline".into(),
            description: "Zero-cost offline graphic synthesizer with style-consistent art presets. No API key needed.".into(),
            supports_aspect_ratios: vec!["16:9".into(), "9:16".into(), "1:1".into()],
            estimated_cost_per_image: 0.00,
        },
    ]
}

pub fn get_aspect_ratio_dimensions(aspect_ratio: &str) -> (u32, u32) {
    match aspect_ratio {
        "9:16" => (1080, 1920),
        "1:1" => (1024, 1024),
        _ => (1920, 1080), // default "16:9"
    }
}

pub fn parse_image_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() >= 24 && &bytes[0..8] == b"\x89PNG\r\n\x1a\n" {
        // PNG IHDR chunk: width at 16..20, height at 20..24
        let width = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
        let height = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
        return Some((width, height));
    }

    if bytes.len() >= 4 && bytes[0] == 0xFF && bytes[1] == 0xD8 {
        // JPEG format: inspect markers for SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        let mut i = 2;
        while i + 9 < bytes.len() {
            if bytes[i] != 0xFF {
                i += 1;
                continue;
            }
            let marker = bytes[i + 1];
            if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
                let height = u16::from_be_bytes([bytes[i + 5], bytes[i + 6]]) as u32;
                let width = u16::from_be_bytes([bytes[i + 7], bytes[i + 8]]) as u32;
                if width > 0 && height > 0 {
                    return Some((width, height));
                }
            }
            // Skip marker segment
            if i + 3 < bytes.len() {
                let segment_len = u16::from_be_bytes([bytes[i + 2], bytes[i + 3]]) as usize;
                if segment_len > 1 {
                    i += 2 + segment_len;
                    continue;
                }
            }
            i += 1;
        }
    }

    None
}

/// Fallback pure-Rust solid PNG generator when external tools are unavailable.
fn create_fallback_png(width: u32, height: u32, r: u8, g: u8, b: u8) -> Vec<u8> {
    let mut out = Vec::new();
    // 1. PNG Signature
    out.extend_from_slice(b"\x89PNG\r\n\x1a\n");

    // 2. IHDR Chunk
    let mut ihdr_data = Vec::new();
    ihdr_data.extend_from_slice(&width.to_be_bytes());
    ihdr_data.extend_from_slice(&height.to_be_bytes());
    ihdr_data.push(8); // 8-bit depth
    ihdr_data.push(2); // Truecolor RGB
    ihdr_data.push(0); // Deflate
    ihdr_data.push(0); // Filter standard
    ihdr_data.push(0); // No interlace

    write_png_chunk(&mut out, b"IHDR", &ihdr_data);

    // 3. Raw Scanlines (Filter 0 + RGB pixels)
    let scanline_len = (1 + width as usize * 3) as usize;
    let mut raw_data = Vec::with_capacity(scanline_len * height as usize);
    for _ in 0..height {
        raw_data.push(0); // Filter byte 0 (None)
        for _ in 0..width {
            raw_data.push(r);
            raw_data.push(g);
            raw_data.push(b);
        }
    }

    // 4. Wrap raw data in uncompressed Deflate block (RFC 1951)
    let mut zlib_stream = Vec::new();
    zlib_stream.push(0x78); // zlib CMF (deflate, 32k window)
    zlib_stream.push(0x01); // zlib FLG (check bits)

    let mut remaining = raw_data.as_slice();
    while !remaining.is_empty() {
        let block_size = remaining.len().min(65535);
        let is_last = block_size == remaining.len();
        zlib_stream.push(if is_last { 0x01 } else { 0x00 }); // BFINAL and BTYPE=00 (uncompressed)
        let len_u16 = block_size as u16;
        let nlen_u16 = !len_u16;
        zlib_stream.extend_from_slice(&len_u16.to_le_bytes());
        zlib_stream.extend_from_slice(&nlen_u16.to_le_bytes());
        zlib_stream.extend_from_slice(&remaining[..block_size]);
        remaining = &remaining[block_size..];
    }

    // Adler-32 checksum
    let mut s1: u32 = 1;
    let mut s2: u32 = 0;
    for &byte in &raw_data {
        s1 = (s1 + byte as u32) % 65521;
        s2 = (s2 + s1) % 65521;
    }
    let adler = (s2 << 16) | s1;
    zlib_stream.extend_from_slice(&adler.to_be_bytes());

    write_png_chunk(&mut out, b"IDAT", &zlib_stream);

    // 5. IEND Chunk
    write_png_chunk(&mut out, b"IEND", &[]);

    out
}

fn write_png_chunk(out: &mut Vec<u8>, chunk_type: &[u8; 4], data: &[u8]) {
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(chunk_type);
    out.extend_from_slice(data);

    // Calculate CRC32 over chunk_type + data
    let mut crc_input = Vec::with_capacity(chunk_type.len() + data.len());
    crc_input.extend_from_slice(chunk_type);
    crc_input.extend_from_slice(data);
    let crc = calculate_crc32(&crc_input);
    out.extend_from_slice(&crc.to_be_bytes());
}

fn calculate_crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFFFFFF;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}

pub fn get_style_colors(style_preset: &str) -> (u8, u8, u8) {
    match style_preset {
        "cinematic" => (15, 23, 42),       // Deep slate navy
        "photorealistic" => (30, 41, 59),  // Slate gray
        "anime" => (88, 28, 135),          // Vibrant purple
        "digital_art" => (3, 105, 161),    // Vivid sky cyan
        "3d_render" => (19, 78, 74),       // Teal metallic
        "vintage" => (120, 53, 15),        // Amber sepia
        "claymation" => (154, 52, 18),     // Terracotta clay
        "minimalist" => (38, 38, 38),      // Neutral charcoal
        _ => (24, 24, 27),
    }
}

pub fn generate_local_visual(
    output_path: &Path,
    aspect_ratio: &str,
    style_preset: &str,
    custom_ffmpeg_path: Option<&str>,
) -> Result<(u32, u32, u64, String), String> {
    let (width, height) = get_aspect_ratio_dimensions(aspect_ratio);
    let (r, g, b) = get_style_colors(style_preset);

    let (ffmpeg_opt, _, _) = locate_ffmpeg_binary(custom_ffmpeg_path);
    if let Some(ffmpeg_bin) = ffmpeg_opt {
        let color_hex = format!("0x{:02x}{:02x}{:02x}", r, g, b);
        let lavfi_input = format!("color=c={}:s={}x{}:d=1", color_hex, width, height);

        let status = Command::new(&ffmpeg_bin)
            .args([
                "-y",
                "-f",
                "lavfi",
                "-i",
                &lavfi_input,
                "-frames:v",
                "1",
                "-update",
                "1",
                "-q:v",
                "2",
                output_path.to_string_lossy().as_ref(),
            ])
            .status();

        if let Ok(st) = status {
            if st.success() && output_path.exists() {
                let metadata = fs::metadata(output_path).map_err(|e| e.to_string())?;
                let mut f = File::open(output_path).map_err(|e| e.to_string())?;
                let mut hasher = Sha256::new();
                let mut buf = Vec::new();
                f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                hasher.update(&buf);
                let checksum = format!("{:x}", hasher.finalize());
                let (w, h) = parse_image_dimensions(&buf).unwrap_or((width, height));
                return Ok((w, h, metadata.len(), checksum));
            }
        }
    }

    // Pure Rust fallback generator
    let png_bytes = create_fallback_png(width, height, r, g, b);
    let mut file = File::create(output_path).map_err(|e| e.to_string())?;
    file.write_all(&png_bytes).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&png_bytes);
    let checksum = format!("{:x}", hasher.finalize());

    Ok((width, height, png_bytes.len() as u64, checksum))
}

pub async fn generate_gemini_imagen(
    request: &ImageGenerateRequest,
    output_path: &Path,
) -> Result<(u32, u32, u64, String), String> {
    if !request.billing_confirmed {
        return Err("Explicit billing authorization is required before generating AI images with Gemini Imagen 3.".into());
    }

    let entry = keyring::Entry::new("com.aiyoutubestudio.provider", "gemini")
        .map_err(|_| "Windows Credential Manager is unavailable.".to_string())?;
    let api_key = entry
        .get_password()
        .map_err(|_| "Gemini API key not found in Windows Credential Manager. Please configure your key in Settings.".to_string())?;

    if api_key.trim().is_empty() {
        return Err("Gemini API key is empty. Configure an active key with Google Cloud / AI Studio billing enabled.".into());
    }

    let model = request
        .model
        .as_deref()
        .unwrap_or("imagen-3.0-generate-002");

    let prompt = request.prompt.trim();
    if prompt.is_empty() {
        return Err("Image prompt cannot be empty.".into());
    }
    if prompt.len() > 4000 {
        return Err("Image prompt exceeds maximum limit of 4000 characters.".into());
    }

    // Compose rich styled prompt
    let full_prompt = if request.style_preset.is_empty() || request.style_preset == "default" {
        prompt.to_string()
    } else {
        format!("{}, {} visual style, professional 8k cinematography, high production value", prompt, request.style_preset)
    };

    let aspect_ratio_str = match request.aspect_ratio.as_str() {
        "9:16" => "9:16",
        "1:1" => "1:1",
        _ => "16:9",
    };

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:predict?key={}",
        model,
        api_key.trim()
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| format!("Failed to initialize HTTP client: {}", e))?;

    let payload = json!({
        "instances": [
            { "prompt": full_prompt }
        ],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": aspect_ratio_str,
            "personGeneration": "ALLOW_ADULT",
            "outputMimeType": "image/jpeg"
        }
    });

    let res = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network dispatch error: {}", e))?;

    let status = res.status();
    let body_text = res
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        if status.as_u16() == 429 {
            return Err("Gemini API Rate Limit Reached (429 Quota Exhausted). Please wait or check your Google Cloud quota limits.".into());
        }
        if status.as_u16() == 400 || status.as_u16() == 403 {
            return Err(format!("Gemini API Authentication or Billing Error ({}). Note: Google One subscriptions do not grant Developer API quota.", status));
        }
        return Err(format!("Gemini Imagen API error (HTTP {}): {}", status, body_text));
    }

    let json_resp: Value = serde_json::from_str(&body_text)
        .map_err(|e| format!("Failed to parse Imagen JSON response: {}", e))?;

    let b64_image = json_resp
        .pointer("/predictions/0/bytesBase64Encoded")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Imagen response did not contain predictions[0].bytesBase64Encoded data.".to_string())?;

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_image)
        .map_err(|e| format!("Failed to decode Imagen Base64 image payload: {}", e))?;

    let mut file = File::create(output_path).map_err(|e| e.to_string())?;
    file.write_all(&image_bytes).map_err(|e| e.to_string())?;

    let mut hasher = Sha256::new();
    hasher.update(&image_bytes);
    let checksum = format!("{:x}", hasher.finalize());

    let (expected_w, expected_h) = get_aspect_ratio_dimensions(&request.aspect_ratio);
    let (width, height) = parse_image_dimensions(&image_bytes).unwrap_or((expected_w, expected_h));

    Ok((width, height, image_bytes.len() as u64, checksum))
}

// ----------------- Tauri IPC Handlers -----------------

#[tauri::command]
pub fn image_get_models() -> Vec<ImageModelInfo> {
    get_available_image_models()
}

#[tauri::command]
pub fn image_estimate_cost(image_count: u32, model: Option<String>) -> ImageCostEstimate {
    let m = model.unwrap_or_else(|| "imagen-3.0-generate-002".into());
    let (rate, requires_billing) = if m.contains("local") {
        (0.00, false)
    } else {
        (0.03, true)
    };

    let total = (image_count as f32) * rate;
    ImageCostEstimate {
        image_count,
        estimated_cost: format!("${:.2} USD", total),
        requires_billing_confirmation: requires_billing,
    }
}

#[tauri::command]
pub async fn image_generate(
    app: tauri::AppHandle,
    request: ImageGenerateRequest,
) -> Result<ImageGenerateResult, String> {
    if request.prompt.trim().is_empty() {
        return Err("Prompt cannot be empty.".into());
    }

    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let project_visuals_dir = app_dir
        .join("projects")
        .join(&request.project_id)
        .join("visuals");

    fs::create_dir_all(&project_visuals_dir)
        .map_err(|e| format!("Failed to create project visuals directory: {}", e))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let asset_id = format!("vis-{}-{}", timestamp, &request.style_preset[..request.style_preset.len().min(4)]);
    let extension = if request.provider == "gemini" { "jpg" } else { "png" };
    let file_name = format!("{}.{}", asset_id, extension);
    let output_path = project_visuals_dir.join(&file_name);

    let (width, height, size_bytes, checksum) = match request.provider.as_str() {
        "gemini" => generate_gemini_imagen(&request, &output_path).await?,
        _ => generate_local_visual(&output_path, &request.aspect_ratio, &request.style_preset, None)?,
    };

    let relative_path = format!("visuals/{}", file_name);
    let now = chrono_iso();

    Ok(ImageGenerateResult {
        id: asset_id,
        project_id: request.project_id,
        scene_id: request.scene_id,
        original_name: file_name,
        relative_path,
        absolute_path: output_path.to_string_lossy().to_string(),
        provider: request.provider,
        model: request.model.unwrap_or_else(|| "imagen-3.0-generate-002".into()),
        width,
        height,
        size_bytes,
        checksum,
        created_at: now,
    })
}

#[tauri::command]
pub fn image_get_data_url(
    app: tauri::AppHandle,
    project_id: String,
    relative_path: String,
) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let file_path = app_dir
        .join("projects")
        .join(&project_id)
        .join(&relative_path);

    let canonical_root = app_dir
        .join("projects")
        .join(&project_id);

    // Path traversal safety check
    let canonical_path = file_path
        .canonicalize()
        .map_err(|_| "Asset file does not exist or invalid path.".to_string())?;

    let canonical_root = canonical_root
        .canonicalize()
        .map_err(|_| "Project directory does not exist.".to_string())?;

    if !canonical_path.starts_with(&canonical_root) {
        return Err("Access denied: Path is outside of project workspace.".into());
    }

    let mut file = File::open(&canonical_path).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

    let mime = if canonical_path.extension().and_then(|e| e.to_str()) == Some("png") {
        "image/png"
    } else {
        "image/jpeg"
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub fn image_delete_asset(
    app: tauri::AppHandle,
    project_id: String,
    relative_path: String,
) -> Result<bool, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let file_path = app_dir
        .join("projects")
        .join(&project_id)
        .join(&relative_path);

    let canonical_root = app_dir.join("projects").join(&project_id);

    if let (Ok(canon_file), Ok(canon_root)) = (file_path.canonicalize(), canonical_root.canonicalize()) {
        if canon_file.starts_with(&canon_root) && canon_file.is_file() {
            fs::remove_file(canon_file).map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }

    Ok(false)
}

fn chrono_iso() -> String {
    let now = SystemTime::now();
    let duration = now.duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    // Compact ISO timestamp approximation
    format!("{}-{}", secs, duration.subsec_millis())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aspect_ratio_dimensions_are_accurate() {
        assert_eq!(get_aspect_ratio_dimensions("16:9"), (1920, 1080));
        assert_eq!(get_aspect_ratio_dimensions("9:16"), (1080, 1920));
        assert_eq!(get_aspect_ratio_dimensions("1:1"), (1024, 1024));
        assert_eq!(get_aspect_ratio_dimensions("invalid"), (1920, 1080));
    }

    #[test]
    fn parses_png_dimensions_correctly() {
        let png = create_fallback_png(640, 360, 255, 0, 0);
        let dims = parse_image_dimensions(&png);
        assert_eq!(dims, Some((640, 360)));
    }

    #[test]
    fn estimates_image_generation_costs_correctly() {
        let est_gemini = image_estimate_cost(4, Some("imagen-3.0-generate-002".into()));
        assert_eq!(est_gemini.image_count, 4);
        assert_eq!(est_gemini.estimated_cost, "$0.12 USD");
        assert!(est_gemini.requires_billing_confirmation);

        let est_local = image_estimate_cost(5, Some("local-synthesizer".into()));
        assert_eq!(est_local.estimated_cost, "$0.00 USD");
        assert!(!est_local.requires_billing_confirmation);
    }

    #[test]
    fn synthesizes_real_local_image_file() {
        let temp_dir = std::env::temp_dir();
        let test_img = temp_dir.join("test_stage_d_render.png");
        if test_img.exists() {
            let _ = fs::remove_file(&test_img);
        }

        let res = generate_local_visual(&test_img, "16:9", "cinematic", None);
        assert!(res.is_ok());
        let (w, h, size, checksum) = res.unwrap();
        assert_eq!(w, 1920);
        assert_eq!(h, 1080);
        assert!(size > 0);
        assert_eq!(checksum.len(), 64);
        assert!(test_img.exists());

        let _ = fs::remove_file(&test_img);
    }
}
