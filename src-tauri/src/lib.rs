mod audio;
mod auth;
mod ffmpeg;
mod ffmpeg_setup;
mod image;
mod media;
mod native;
mod voice;
mod youtube;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_projects",
            sql: include_str!("../migrations/0001_create_projects.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "create_production_data",
            sql: include_str!("../migrations/0002_create_production_data.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "create_voice_and_subtitles",
            sql: include_str!("../migrations/0003_create_voice_and_subtitles.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 4,
            description: "create_timeline_and_render",
            sql: include_str!("../migrations/0004_create_timeline_and_render.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 5,
            description: "create_visual_studio",
            sql: include_str!("../migrations/0005_create_visual_studio.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 6,
            description: "create_audio_studio",
            sql: include_str!("../migrations/0006_create_audio_studio.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 7,
            description: "create_agent_workflows",
            sql: include_str!("../migrations/0007_create_agent_workflows.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 8,
            description: "create_seo_and_channel",
            sql: include_str!("../migrations/0008_create_seo_and_channel.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 9,
            description: "create_publishing_studio",
            sql: include_str!("../migrations/0009_create_publishing_studio.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 10,
            description: "create_analytics_studio",
            sql: include_str!("../migrations/0010_create_analytics_studio.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 11,
            description: "create_saas_and_licensing",
            sql: include_str!("../migrations/0011_create_saas_and_licensing.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 12,
            description: "create_creator_workspace",
            sql: include_str!("../migrations/0012_create_creator_workspace.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 13,
            description: "create_beta_feedback",
            sql: include_str!("../migrations/0013_create_beta_feedback.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 14,
            description: "script_version_model_telemetry",
            sql: include_str!("../migrations/0014_script_version_model_telemetry.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 15,
            description: "multi_ai_gateway_and_telemetry",
            sql: include_str!("../migrations/0015_multi_ai_gateway_and_telemetry.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .manage(native::GenerationJobs::default())
        .manage(ffmpeg::RenderJobManager::default())
        .manage(ffmpeg_setup::FFmpegSetupManager::default())
        .manage(youtube::PublishJobManager::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ai_youtube_studio.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            native::provider_save_credential,
            native::provider_credential_status,
            native::provider_delete_credential,
            native::gemini_generate_text,
            native::gemini_generate_text_detailed,
            native::gemini_test_connection,
            native::gemini_cancel_generation,
            native::gemini_get_model_catalog,
            native::system_get_resource_metrics,
            native::ai_gateway_generate_text,
            native::ai_gateway_test_connection,
            media::media_import_files,
            media::media_verify_assets,
            media::media_delete_asset_file,
            voice::voice_get_available_voices,
            voice::voice_estimate_cost,
            voice::voice_generate_audio,
            voice::voice_delete_audio_file,
            voice::voice_get_audio_data_url,
            ffmpeg::ffmpeg_check_status,
            ffmpeg::ffmpeg_probe_media,
            ffmpeg::ffmpeg_render_timeline,
            ffmpeg::ffmpeg_cancel_render,
            ffmpeg_setup::ffmpeg_get_setup_info,
            ffmpeg_setup::ffmpeg_start_download,
            ffmpeg_setup::ffmpeg_get_setup_progress,
            ffmpeg_setup::ffmpeg_cancel_setup,
            ffmpeg_setup::ffmpeg_import_local_binaries,
            image::image_get_models,
            image::image_estimate_cost,
            image::image_generate,
            image::image_get_data_url,
            image::image_delete_asset,
            audio::audio_get_library_tracks,
            audio::audio_process_ducking_mix,
            audio::audio_get_waveform,
            youtube::youtube_get_auth_url,
            youtube::youtube_get_auth_state,
            youtube::youtube_refresh_channel,
            youtube::youtube_get_credential_status,
            youtube::youtube_logout,
            youtube::youtube_save_token_data,
            youtube::youtube_save_client_config,
            youtube::youtube_get_client_config_command,
            youtube::youtube_test_refresh_token,
            youtube::youtube_test_auth_flow,
            youtube::youtube_listen_for_auth_code,
            youtube::youtube_get_job_status,
            youtube::youtube_cancel_upload,
            youtube::youtube_get_channels,
            youtube::youtube_start_upload,
            youtube::youtube_query_analytics,
            auth::google_oauth_loopback,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
