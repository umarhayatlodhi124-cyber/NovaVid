use std::{
    collections::HashMap,
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

#[derive(Default)]
pub struct RenderJobManager {
    // Maps job_id -> process ID
    running_pids: Mutex<HashMap<String, u32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FFmpegStatus {
    pub available: bool,
    pub ffmpeg_path: Option<String>,
    pub ffprobe_path: Option<String>,
    pub version: Option<String>,
    pub supports_h264: bool,
    pub supports_h265: bool,
    pub supports_aac: bool,
    pub search_locations: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct RenderSceneInput {
    pub scene_id: String,
    pub scene_number: u32,
    pub duration_seconds: f64,
    pub image_path: Option<String>,
    pub video_path: Option<String>,
    pub audio_path: Option<String>,
    pub subtitle_text: Option<String>,
    pub transition: Option<String>,
    pub ken_burns: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineRenderRequest {
    pub job_id: String,
    pub project_id: String,
    pub resolution: String,      // "1080p", "720p", "1440p", "4k"
    pub fps: u32,                // 24, 30, 60
    pub aspect_ratio: String,    // "16:9", "9:16", "1:1"
    pub video_codec: String,     // "libx264", "libx265"
    pub audio_codec: String,     // "aac"
    pub scenes: Vec<RenderSceneInput>,
    pub output_filename: Option<String>,
    pub resource_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderResult {
    pub job_id: String,
    pub project_id: String,
    pub status: String,
    pub progress: f32,
    pub output_path: String,
    pub duration_seconds: f64,
    pub file_size_bytes: u64,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbeResult {
    pub duration_seconds: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub format_name: String,
    pub size_bytes: u64,
}

pub fn locate_ffmpeg_binary(custom_path: Option<&str>) -> (Option<PathBuf>, Option<PathBuf>, Vec<String>) {
    let mut searched = Vec::new();

    // 1. Custom path if provided
    if let Some(cp) = custom_path {
        let p = PathBuf::from(cp);
        searched.push(p.to_string_lossy().to_string());
        if p.exists() {
            let probe = p.parent().map(|d| d.join("ffprobe.exe")).filter(|f| f.exists());
            return (Some(p), probe, searched);
        }
    }

    // 2. Project or App bin directory
    let candidate_dirs = [
        PathBuf::from(r"G:\Nova Vid\bin"),
        std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.join("bin"))).unwrap_or_default(),
        std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf)).unwrap_or_default(),
        std::env::var("LOCALAPPDATA").map(|l| PathBuf::from(l).join("ffmpeg").join("bin")).unwrap_or_default(),
        std::env::var("LOCALAPPDATA").map(|l| PathBuf::from(l).join("com.aiyoutubestudio.app").join("ffmpeg").join("bin")).unwrap_or_default(),
        PathBuf::from(r"C:\ffmpeg\bin"),
        PathBuf::from(r"C:\Program Files\ffmpeg\bin"),
    ];

    for dir in &candidate_dirs {
        if dir.as_os_str().is_empty() {
            continue;
        }
        let ffmpeg_exe = dir.join("ffmpeg.exe");
        let ffprobe_exe = dir.join("ffprobe.exe");
        searched.push(ffmpeg_exe.to_string_lossy().to_string());

        if ffmpeg_exe.exists() {
            let probe = if ffprobe_exe.exists() { Some(ffprobe_exe) } else { None };
            return (Some(ffmpeg_exe), probe, searched);
        }
    }

    // 3. System PATH check
    if let Ok(output) = Command::new("where.exe").arg("ffmpeg").output() {
        if output.status.success() {
            let lines = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = lines.lines().next() {
                let p = PathBuf::from(first_line.trim());
                if p.exists() {
                    let probe = p.parent().map(|d| d.join("ffprobe.exe")).filter(|f| f.exists());
                    searched.push(p.to_string_lossy().to_string());
                    return (Some(p), probe, searched);
                }
            }
        }
    }

    (None, None, searched)
}

pub fn get_ffmpeg_status(custom_path: Option<&str>) -> FFmpegStatus {
    let (ffmpeg_path, ffprobe_path, searched) = locate_ffmpeg_binary(custom_path);

    if let Some(ref path) = ffmpeg_path {
        let version_cmd = Command::new(path).arg("-version").output();
        let (version, supports_h264, supports_h265, supports_aac) = match version_cmd {
            Ok(out) if out.status.success() => {
                let text = String::from_utf8_lossy(&out.stdout);
                let first_line = text.lines().next().unwrap_or("ffmpeg").to_string();
                let encoders_cmd = Command::new(path).arg("-encoders").output();
                let encoders_text = encoders_cmd
                    .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                    .unwrap_or_default();

                let h264 = encoders_text.contains("libx264") || encoders_text.contains("h264");
                let h265 = encoders_text.contains("libx265") || encoders_text.contains("hevc");
                let aac = encoders_text.contains("aac");
                (Some(first_line), h264, h265, aac)
            }
            _ => (None, false, false, false),
        };

        FFmpegStatus {
            available: true,
            ffmpeg_path: Some(path.to_string_lossy().to_string()),
            ffprobe_path: ffprobe_path.map(|p| p.to_string_lossy().to_string()),
            version,
            supports_h264,
            supports_h265,
            supports_aac,
            search_locations: searched,
        }
    } else {
        FFmpegStatus {
            available: false,
            ffmpeg_path: None,
            ffprobe_path: None,
            version: None,
            supports_h264: false,
            supports_h265: false,
            supports_aac: false,
            search_locations: searched,
        }
    }
}

pub fn probe_media_file(ffprobe_path: &Path, media_path: &Path) -> Result<MediaProbeResult, String> {
    if !media_path.exists() {
        return Err(format!("Media file does not exist: {}", media_path.display()));
    }

    let output = Command::new(ffprobe_path)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration,size,format_name:stream=width,height",
            "-of",
            "json",
            media_path.to_str().unwrap_or_default(),
        ])
        .output()
        .map_err(|e| format!("Failed executing ffprobe: {}", e))?;

    if !output.status.success() {
        return Err(format!("ffprobe exited with error: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let parsed: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Invalid ffprobe JSON response: {}", e))?;

    let duration_seconds = parsed["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let size_bytes = parsed["format"]["size"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    let format_name = parsed["format"]["format_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let mut width = None;
    let mut height = None;

    if let Some(streams) = parsed["streams"].as_array() {
        for s in streams {
            if s["width"].is_number() && s["height"].is_number() {
                width = s["width"].as_u64().map(|w| w as u32);
                height = s["height"].as_u64().map(|h| h as u32);
                break;
            }
        }
    }

    Ok(MediaProbeResult {
        duration_seconds,
        width,
        height,
        format_name,
        size_bytes,
    })
}

#[tauri::command]
pub fn ffmpeg_check_status(custom_path: Option<String>) -> FFmpegStatus {
    get_ffmpeg_status(custom_path.as_deref())
}

#[tauri::command]
pub fn ffmpeg_probe_media(media_path: String, custom_probe_path: Option<String>) -> Result<MediaProbeResult, String> {
    let (_, ffprobe_opt, _) = locate_ffmpeg_binary(custom_probe_path.as_deref());
    let probe_path = ffprobe_opt.ok_or_else(|| "ffprobe is not available on this system.".to_string())?;
    probe_media_file(&probe_path, Path::new(&media_path))
}

#[tauri::command]
pub fn ffmpeg_cancel_render(job_id: String, manager: State<'_, RenderJobManager>) -> bool {
    let mut map = manager.running_pids.lock().unwrap();
    if let Some(pid) = map.remove(&job_id) {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .output();
        }
        true
    } else {
        false
    }
}

pub fn get_resolution_dimensions(resolution: &str, aspect_ratio: &str) -> (u32, u32) {
    let base_height = match resolution {
        "720p" => 720,
        "1080p" => 1080,
        "1440p" => 1440,
        "4k" => 2160,
        _ => 1080,
    };

    match aspect_ratio {
        "9:16" => {
            let width = (base_height as f64 * 9.0 / 16.0).round() as u32;
            let width_even = if width % 2 != 0 { width + 1 } else { width };
            (width_even, base_height)
        }
        "1:1" => (base_height, base_height),
        _ => {
            // 16:9
            let width = (base_height as f64 * 16.0 / 9.0).round() as u32;
            let width_even = if width % 2 != 0 { width + 1 } else { width };
            (width_even, base_height)
        }
    }
}

#[tauri::command]
pub async fn ffmpeg_render_timeline(
    app: AppHandle,
    request: TimelineRenderRequest,
    manager: State<'_, RenderJobManager>,
) -> Result<RenderResult, String> {
    if request.scenes.is_empty() {
        return Err("Cannot render timeline: No scenes provided.".into());
    }

    let (ffmpeg_opt, ffprobe_opt, _) = locate_ffmpeg_binary(None);
    let ffmpeg_path = ffmpeg_opt.ok_or_else(|| "FFmpeg binary is not available. Ensure FFmpeg is present in NovaVid bin or PATH.".to_string())?;

    let storage_root = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let exports_dir = storage_root.join("projects").join(&request.project_id).join("exports");
    fs::create_dir_all(&exports_dir).map_err(|e| format!("Failed creating exports folder: {}", e))?;

    let temp_dir = storage_root.join("projects").join(&request.project_id).join("temp_render").join(&request.job_id);
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed creating temp render folder: {}", e))?;

    let filename = request.output_filename.clone().unwrap_or_else(|| {
        let time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        format!("render_{}_{}.mp4", &request.job_id[..8], time)
    });

    let final_output_path = exports_dir.join(&filename);
    let (width, height) = get_resolution_dimensions(&request.resolution, &request.aspect_ratio);
    let fps = request.fps.clamp(24, 60);

    let total_duration: f64 = request.scenes.iter().map(|s| s.duration_seconds.max(1.0)).sum();

    // Resource-aware tuning for 8GB RAM systems
    let (threads_val, preset_val, bufsize_args): (&str, &str, Vec<&str>) = match request.resource_mode.as_deref() {
        Some("low_resource") => ("2", "ultrafast", vec!["-bufsize", "2M", "-maxrate", "4M"]),
        Some("performance") => ("8", "fast", vec!["-bufsize", "12M", "-maxrate", "16M"]),
        _ => ("4", "fast", vec!["-bufsize", "6M", "-maxrate", "8M"]),
    };

    // Render individual scene MP4s to temporary directory, then concatenate
    let mut scene_segment_paths = Vec::new();

    for (idx, scene) in request.scenes.iter().enumerate() {
        let scene_output = temp_dir.join(format!("scene_{:03}.mp4", idx));
        let duration = scene.duration_seconds.max(1.0);

        // Find visual input: image, video, or synthetic color canvas
        let mut cmd = Command::new(&ffmpeg_path);
        cmd.args(["-y", "-threads", threads_val]);

        let has_image = scene.image_path.as_ref().map(|p| Path::new(p).exists()).unwrap_or(false);
        let has_video = scene.video_path.as_ref().map(|p| Path::new(p).exists()).unwrap_or(false);
        let has_audio = scene.audio_path.as_ref().map(|p| Path::new(p).exists()).unwrap_or(false);

        if has_video {
            let vid = scene.video_path.as_ref().unwrap();
            cmd.args(["-t", &duration.to_string(), "-i", vid]);
        } else if has_image {
            let img = scene.image_path.as_ref().unwrap();
            cmd.args(["-loop", "1", "-t", &duration.to_string(), "-i", img]);
        } else {
            // Synthetic studio solid gradient/canvas
            let color = match scene.scene_number % 4 {
                0 => "0x1e1e2f",
                1 => "0x16213e",
                2 => "0x0f3460",
                _ => "0x1b1b2f",
            };
            let color_input = format!("color=c={}:s={}x{}:d={}:r={}", color, width, height, duration, fps);
            cmd.args(["-f", "lavfi", "-i", &color_input]);
        }

        // Add audio input if present, otherwise synthetic silent audio
        if has_audio {
            let aud = scene.audio_path.as_ref().unwrap();
            cmd.args(["-t", &duration.to_string(), "-i", aud]);
        } else {
            cmd.args(["-f", "lavfi", "-t", &duration.to_string(), "-i", "anullsrc=r=44100:cl=stereo"]);
        }

        // Video filter chain
        let filter = if scene.ken_burns && has_image {
            let total_frames = (fps as f64 * duration).round() as u32;
            format!(
                "scale={w}:{h}:force_original_aspect_ratio=increase,\
                 zoompan=z='min(zoom+0.0015,1.15)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h},\
                 format=yuv420p",
                w = width,
                h = height,
                frames = total_frames
            )
        } else {
            format!(
                "scale={w}:{h}:force_original_aspect_ratio=decrease,\
                 pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,\
                 format=yuv420p",
                w = width,
                h = height
            )
        };

        cmd.args([
            "-vf",
            &filter,
            "-c:v",
            &request.video_codec,
            "-preset",
            preset_val,
            "-crf",
            "20",
        ]);
        cmd.args(&bufsize_args);
        cmd.args([
            "-c:a",
            &request.audio_codec,
            "-b:a",
            "192k",
            "-r",
            &fps.to_string(),
            "-pix_fmt",
            "yuv420p",
            "-shortest",
            scene_output.to_str().unwrap(),
        ]);

        let output = cmd.output().map_err(|e| format!("FFmpeg failed rendering scene {}: {}", idx + 1, e))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg scene {} render error: {}", idx + 1, err.lines().last().unwrap_or("Unknown")));
        }

        scene_segment_paths.push(scene_output);
    }

    // Concatenate all scene segments into the final output video
    let concat_list_path = temp_dir.join("concat_list.txt");
    {
        let mut list_file = File::create(&concat_list_path).map_err(|e| format!("Failed creating concat list: {}", e))?;
        for seg in &scene_segment_paths {
            let escaped = seg.to_str().unwrap().replace("\\", "/");
            writeln!(list_file, "file '{}'", escaped).map_err(|e| format!("Error writing concat file: {}", e))?;
        }
    }

    let mut concat_cmd = Command::new(&ffmpeg_path);
    concat_cmd.args([
        "-y",
        "-threads",
        threads_val,
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat_list_path.to_str().unwrap(),
        "-c",
        "copy",
        final_output_path.to_str().unwrap(),
    ]);

    let mut child = concat_cmd.spawn().map_err(|e| format!("Failed spawning FFmpeg concatenation: {}", e))?;

    // Track PID for cancellation
    let pid = child.id();
    {
        let mut map = manager.running_pids.lock().unwrap();
        map.insert(request.job_id.clone(), pid);
    }

    let status = child.wait().map_err(|e| format!("Failed waiting on FFmpeg: {}", e))?;

    // Remove from active map
    {
        let mut map = manager.running_pids.lock().unwrap();
        map.remove(&request.job_id);
    }

    if !status.success() {
        return Err("FFmpeg concatenation failed to produce final video.".into());
    }

    // Clean up temporary files
    let _ = fs::remove_dir_all(&temp_dir);

    // Verify final file
    if !final_output_path.exists() {
        return Err("Exported MP4 file was not found on disk.".into());
    }

    let metadata = fs::metadata(&final_output_path).map_err(|e| format!("Could not read output metadata: {}", e))?;
    let file_size_bytes = metadata.len();

    let probed_duration = if let Some(probe_bin) = ffprobe_opt {
        probe_media_file(&probe_bin, &final_output_path).map(|r| r.duration_seconds).unwrap_or(total_duration)
    } else {
        total_duration
    };

    Ok(RenderResult {
        job_id: request.job_id,
        project_id: request.project_id,
        status: "completed".into(),
        progress: 100.0,
        output_path: final_output_path.to_string_lossy().to_string(),
        duration_seconds: probed_duration,
        file_size_bytes,
        error_message: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculates_dimensions_for_aspect_ratios() {
        let (w16_9, h16_9) = get_resolution_dimensions("1080p", "16:9");
        assert_eq!(w16_9, 1920);
        assert_eq!(h16_9, 1080);

        let (w9_16, h9_16) = get_resolution_dimensions("1080p", "9:16");
        assert_eq!(w9_16, 608); // Even width for shorts
        assert_eq!(h9_16, 1080);

        let (w1_1, h1_1) = get_resolution_dimensions("1080p", "1:1");
        assert_eq!(w1_1, 1080);
        assert_eq!(h1_1, 1080);

        let (w720, h720) = get_resolution_dimensions("720p", "16:9");
        assert_eq!(w720, 1280);
        assert_eq!(h720, 720);

        let (w4k, h4k) = get_resolution_dimensions("4k", "16:9");
        assert_eq!(w4k, 3840);
        assert_eq!(h4k, 2160);
    }

    #[test]
    fn provides_search_locations_in_ffmpeg_status() {
        let status = get_ffmpeg_status(None);
        assert!(!status.search_locations.is_empty());
        assert!(status.search_locations.iter().any(|loc| loc.contains("bin") || loc.contains("ffmpeg")));
    }

    #[test]
    fn deserializes_render_request_with_resource_mode() {
        let json = r#"{
            "jobId": "job-123",
            "projectId": "proj-456",
            "resolution": "1080p",
            "fps": 30,
            "aspectRatio": "16:9",
            "videoCodec": "libx264",
            "audioCodec": "aac",
            "scenes": [],
            "resourceMode": "low_resource"
        }"#;
        let req: TimelineRenderRequest = serde_json::from_str(json).expect("Failed to deserialize");
        assert_eq!(req.job_id, "job-123");
        assert_eq!(req.resource_mode.as_deref(), Some("low_resource"));
    }
}
