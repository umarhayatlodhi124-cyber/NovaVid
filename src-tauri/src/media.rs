use std::{
    fs::{self, File},
    io::{BufReader, Read},
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;

pub const MAX_IMAGE_BYTES: u64 = 25 * 1024 * 1024;
pub const MAX_VIDEO_BYTES: u64 = 250 * 1024 * 1024;
pub const MAX_AUDIO_BYTES: u64 = 60 * 1024 * 1024;
pub const MAX_DOCUMENT_BYTES: u64 = 15 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Image,
    Video,
    Audio,
    Document,
}

impl MediaType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Video => "video",
            Self::Audio => "audio",
            Self::Document => "document",
        }
    }

    pub fn max_size_bytes(&self) -> u64 {
        match self {
            Self::Image => MAX_IMAGE_BYTES,
            Self::Video => MAX_VIDEO_BYTES,
            Self::Audio => MAX_AUDIO_BYTES,
            Self::Document => MAX_DOCUMENT_BYTES,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedMediaAsset {
    pub id: String,
    pub project_id: String,
    pub original_name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub media_type: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<f64>,
    pub checksum: String,
    pub missing: bool,
    pub tags: Vec<String>,
    pub imported_at: String,
}

pub fn infer_media_type_and_mime(extension: &str) -> Result<(MediaType, &'static str), String> {
    match extension.to_lowercase().as_str() {
        "png" => Ok((MediaType::Image, "image/png")),
        "jpg" | "jpeg" => Ok((MediaType::Image, "image/jpeg")),
        "webp" => Ok((MediaType::Image, "image/webp")),
        "mp4" => Ok((MediaType::Video, "video/mp4")),
        "webm" => Ok((MediaType::Video, "video/webm")),
        "mp3" => Ok((MediaType::Audio, "audio/mpeg")),
        "wav" => Ok((MediaType::Audio, "audio/wav")),
        "pdf" => Ok((MediaType::Document, "application/pdf")),
        "txt" => Ok((MediaType::Document, "text/plain")),
        "mov" => Err("MOV uploads are not accepted in the current media pipeline.".to_string()),
        other => Err(format!(
            "Unsupported file format '.{}'. Use supported image, video, audio, or document formats.",
            other
        )),
    }
}

pub fn compute_sha256(path: &Path) -> Result<String, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file for checksum: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];

    loop {
        let count = reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed reading file for checksum: {}", e))?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

pub fn extract_image_dimensions(path: &Path, mime_type: &str) -> (Option<u32>, Option<u32>) {
    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return (None, None),
    };

    let mut header = [0u8; 32];
    let bytes_read = match file.read(&mut header) {
        Ok(n) => n,
        Err(_) => return (None, None),
    };

    if mime_type == "image/png" && bytes_read >= 24 {
        // PNG header check \x89PNG\r\n\x1a\n
        if &header[0..8] == b"\x89PNG\r\n\x1a\n" {
            let width = u32::from_be_bytes([header[16], header[17], header[18], header[19]]);
            let height = u32::from_be_bytes([header[20], header[21], header[22], header[23]]);
            return (Some(width), Some(height));
        }
    } else if mime_type == "image/jpeg" && bytes_read >= 2 {
        if header[0] == 0xFF && header[1] == 0xD8 {
            // Read through JPEG segments to locate SOF0 (0xFF, 0xC0) or SOF2 (0xFF, 0xC2)
            let mut buffer = Vec::new();
            if file.read_to_end(&mut buffer).is_ok() {
                let mut full = Vec::with_capacity(bytes_read + buffer.len());
                full.extend_from_slice(&header[..bytes_read]);
                full.extend_from_slice(&buffer);

                let mut i = 2;
                while i + 8 < full.len() {
                    if full[i] != 0xFF {
                        i += 1;
                        continue;
                    }
                    let marker = full[i + 1];
                    // SOF0 (baseline), SOF1 (extended sequential), SOF2 (progressive)
                    if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
                        let height = u32::from(u16::from_be_bytes([full[i + 5], full[i + 6]]));
                        let width = u32::from(u16::from_be_bytes([full[i + 7], full[i + 8]]));
                        return (Some(width), Some(height));
                    }
                    if marker == 0xD9 || marker == 0xDA {
                        // End of image or start of scan
                        break;
                    }
                    if i + 3 < full.len() {
                        let length = u16::from_be_bytes([full[i + 2], full[i + 3]]) as usize;
                        if length < 2 {
                            break;
                        }
                        i += 2 + length;
                    } else {
                        break;
                    }
                }
            }
        }
    }

    (None, None)
}

fn sanitize_file_name(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

pub fn get_app_storage_root(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

pub fn copy_media_file_to_project(
    storage_root: &Path,
    project_id: &str,
    source_path_str: &str,
) -> Result<ImportedMediaAsset, String> {
    let source_path = Path::new(source_path_str);
    if !source_path.exists() {
        return Err(format!("File does not exist: {}", source_path_str));
    }
    if !source_path.is_file() {
        return Err(format!("Path is not a regular file: {}", source_path_str));
    }

    let file_name = source_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid file name.".to_string())?;

    let extension = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let (media_type, mime_type) = infer_media_type_and_mime(extension)?;

    let metadata = fs::metadata(source_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size_bytes = metadata.len();

    if size_bytes > media_type.max_size_bytes() {
        return Err(format!(
            "File '{}' ({} bytes) exceeds the {} MB limit for {} assets.",
            file_name,
            size_bytes,
            media_type.max_size_bytes() / (1024 * 1024),
            media_type.as_str()
        ));
    }

    let checksum = compute_sha256(source_path)?;

    // Destination directory: <storage_root>/projects/<project_id>/media/
    let project_media_dir = storage_root
        .join("projects")
        .join(project_id)
        .join("media");
    fs::create_dir_all(&project_media_dir)
        .map_err(|e| format!("Failed to create project media directory: {}", e))?;

    let clean_name = sanitize_file_name(file_name);
    let target_dest = project_media_dir.join(&clean_name);

    // If destination already exists:
    // Check if identical checksum -> reuse existing file safely
    // Else -> disambiguate with short checksum prefix
    let final_dest = if target_dest.exists() {
        let existing_checksum = compute_sha256(&target_dest).unwrap_or_default();
        if existing_checksum == checksum {
            target_dest
        } else {
            let disambiguated = format!("{}_{}", &checksum[..8], clean_name);
            project_media_dir.join(disambiguated)
        }
    } else {
        target_dest
    };

    if !final_dest.exists() {
        fs::copy(source_path, &final_dest)
            .map_err(|e| format!("Failed to copy file to project media directory: {}", e))?;
    }

    let (width, height) = if media_type == MediaType::Image {
        extract_image_dimensions(&final_dest, mime_type)
    } else {
        (None, None)
    };

    let relative_path = format!(
        "projects/{}/media/{}",
        project_id,
        final_dest.file_name().unwrap().to_str().unwrap()
    );

    let now = chrono_now();

    Ok(ImportedMediaAsset {
        id: generate_uuid_v4(),
        project_id: project_id.to_string(),
        original_name: file_name.to_string(),
        relative_path,
        absolute_path: final_dest.to_string_lossy().to_string(),
        media_type: media_type.as_str().to_string(),
        mime_type: mime_type.to_string(),
        size_bytes,
        width,
        height,
        duration_seconds: None,
        checksum,
        missing: false,
        tags: Vec::new(),
        imported_at: now,
    })
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    // Format basic ISO 8601 UTC string without pulling in extra dependencies
    // Alternatively format timestamp
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400;

    // Approximate UTC date calculation
    let mut year = 1970;
    let mut d = days;
    loop {
        let leap = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) { 1 } else { 0 };
        let days_in_year = 365 + leap;
        if d >= days_in_year {
            d -= days_in_year;
            year += 1;
        } else {
            let leap_bool = leap == 1;
            let month_days = [
                31,
                if leap_bool { 29 } else { 28 },
                31, 30, 31, 30, 31, 31, 30, 31, 30, 31
            ];
            let mut month = 1;
            for &md in &month_days {
                if d >= md {
                    d -= md;
                    month += 1;
                } else {
                    break;
                }
            }
            let day = d + 1;
            return format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
                year, month, day, h, m, s
            );
        }
    }
}

fn generate_uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let pid = std::process::id();
    let random_part = (time ^ ((pid as u128) << 32)) ^ 0x9e3779b97f4a7c15;
    let bytes = random_part.to_be_bytes();
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-4{:01x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6] & 0x0f, bytes[7],
        (bytes[8] & 0x3f) | 0x80, bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

#[tauri::command]
pub async fn media_import_files(
    app: tauri::AppHandle,
    project_id: String,
    file_paths: Vec<String>,
) -> Result<Vec<ImportedMediaAsset>, String> {
    if project_id.trim().is_empty() {
        return Err("A valid project identifier is required.".to_string());
    }
    if file_paths.is_empty() {
        return Ok(Vec::new());
    }

    let storage_root = get_app_storage_root(&app)?;
    let mut assets = Vec::with_capacity(file_paths.len());

    for path in file_paths {
        let asset = copy_media_file_to_project(&storage_root, &project_id, &path)?;
        assets.push(asset);
    }

    Ok(assets)
}

#[tauri::command]
pub fn media_verify_assets(
    app: tauri::AppHandle,
    relative_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    let storage_root = get_app_storage_root(&app)?;
    let mut missing = Vec::new();

    for rel in relative_paths {
        let full = storage_root.join(&rel);
        if !full.exists() {
            missing.push(rel);
        }
    }

    Ok(missing)
}

#[tauri::command]
pub fn media_delete_asset_file(
    app: tauri::AppHandle,
    relative_path: String,
) -> Result<(), String> {
    let storage_root = get_app_storage_root(&app)?;
    let full = storage_root.join(&relative_path);

    // Ensure the path stays within storage root for safety
    if let (Ok(canonical_root), Ok(canonical_target)) = (storage_root.canonicalize(), full.canonicalize()) {
        if !canonical_target.starts_with(canonical_root) {
            return Err("Cannot delete files outside the app storage root.".to_string());
        }
    }

    if full.exists() {
        fs::remove_file(full).map_err(|e| format!("Failed to delete media file: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn validates_media_types_and_size_limits() {
        assert_eq!(infer_media_type_and_mime("png").unwrap().0, MediaType::Image);
        assert_eq!(infer_media_type_and_mime("mp4").unwrap().0, MediaType::Video);
        assert_eq!(infer_media_type_and_mime("mp3").unwrap().0, MediaType::Audio);
        assert_eq!(infer_media_type_and_mime("pdf").unwrap().0, MediaType::Document);
        assert!(infer_media_type_and_mime("mov").is_err());
        assert!(infer_media_type_and_mime("exe").is_err());
    }

    #[test]
    fn copies_file_and_extracts_metadata_and_checksum() {
        let temp_dir = std::env::temp_dir().join(format!("ai_yt_test_{}", generate_uuid_v4()));
        let source_dir = temp_dir.join("sources");
        let storage_root = temp_dir.join("storage");
        fs::create_dir_all(&source_dir).unwrap();

        // Create a fake 1x1 PNG file
        let sample_png_path = source_dir.join("test_sample.png");
        let png_bytes = [
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR header
            0x00, 0x00, 0x07, 0x80, // width: 1920
            0x00, 0x00, 0x04, 0x38, // height: 1080
            0x08, 0x06, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
        ];
        let mut file = File::create(&sample_png_path).unwrap();
        file.write_all(&png_bytes).unwrap();
        drop(file);

        let asset = copy_media_file_to_project(
            &storage_root,
            "project-123",
            sample_png_path.to_str().unwrap(),
        )
        .expect("Import should succeed");

        assert_eq!(asset.project_id, "project-123");
        assert_eq!(asset.media_type, "image");
        assert_eq!(asset.mime_type, "image/png");
        assert_eq!(asset.width, Some(1920));
        assert_eq!(asset.height, Some(1080));
        assert!(!asset.checksum.is_empty());
        assert!(!asset.missing);
        assert!(Path::new(&asset.absolute_path).exists());

        // Duplicate handling test:
        let duplicate_asset = copy_media_file_to_project(
            &storage_root,
            "project-123",
            sample_png_path.to_str().unwrap(),
        )
        .expect("Duplicate import should succeed cleanly");
        assert_eq!(duplicate_asset.checksum, asset.checksum);
        assert_eq!(duplicate_asset.relative_path, asset.relative_path);

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
