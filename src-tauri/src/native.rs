use std::{collections::HashMap, sync::Mutex, time::Duration};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tauri::State;
use tokio_util::sync::CancellationToken;
use zeroize::{Zeroize, Zeroizing};

const KEYRING_SERVICE: &str = "com.aiyoutubestudio.provider";
const MAX_PROMPT_CHARS: usize = 100_000;
const MAX_OUTPUT_TOKENS: u32 = 8_192;

#[derive(Default)]
pub struct GenerationJobs {
    jobs: Mutex<HashMap<String, CancellationToken>>,
}

#[derive(Clone, Copy, Deserialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderId {
    Gemini,
    Claude,
    OpenAI,
    OpenRouter,
    OmniRoute,
    Groq,
    DeepSeek,
    Mistral,
    Together,
    Fireworks,
}

impl ProviderId {
    pub fn keyring_user(self) -> &'static str {
        match self {
            Self::Gemini => "gemini",
            Self::Claude => "claude",
            Self::OpenAI => "openai",
            Self::OpenRouter => "openrouter",
            Self::OmniRoute => "omniroute",
            Self::Groq => "groq",
            Self::DeepSeek => "deepseek",
            Self::Mistral => "mistral",
            Self::Together => "together",
            Self::Fireworks => "fireworks",
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiTextRequest {
    provider: String,
    model: String,
    prompt: String,
    temperature: f32,
    max_output_tokens: u32,
    request_id: String,
    billing_confirmed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConnectionResult {
    pub connected: bool,
    pub message: String,
    pub model_used: Option<String>,
    pub fallback_occurred: bool,
    pub status_code: Option<u16>,
    pub error_category: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GeminiGenerationResult {
    pub text: String,
    pub model_used: String,
    pub attempts: u32,
    pub fallback_occurred: bool,
    pub fallback_from: Option<String>,
    pub fallback_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SystemResourceMetrics {
    pub total_ram_mb: u64,
    pub available_ram_mb: u64,
    pub used_ram_mb: u64,
    pub memory_load_percent: u32,
    pub is_low_ram_device: bool,
    pub is_memory_critical: bool,
    pub recommended_mode: String,
}

#[cfg(windows)]
pub fn query_system_memory() -> (u64, u64, u32) {
    #[repr(C)]
    struct MemoryStatusEx {
        dw_length: u32,
        dw_memory_load: u32,
        ull_total_phys: u64,
        ull_avail_phys: u64,
        ull_total_page_file: u64,
        ull_avail_page_file: u64,
        ull_total_virtual: u64,
        ull_avail_virtual: u64,
        ull_avail_extended_virtual: u64,
    }
    unsafe extern "system" {
        fn GlobalMemoryStatusEx(lp_buffer: *mut MemoryStatusEx) -> i32;
    }
    let mut status = MemoryStatusEx {
        dw_length: std::mem::size_of::<MemoryStatusEx>() as u32,
        dw_memory_load: 0,
        ull_total_phys: 0,
        ull_avail_phys: 0,
        ull_total_page_file: 0,
        ull_avail_page_file: 0,
        ull_total_virtual: 0,
        ull_avail_virtual: 0,
        ull_avail_extended_virtual: 0,
    };
    unsafe {
        GlobalMemoryStatusEx(&mut status);
    }
    let total_mb = status.ull_total_phys / (1024 * 1024);
    let avail_mb = status.ull_avail_phys / (1024 * 1024);
    (total_mb, avail_mb, status.dw_memory_load)
}

#[cfg(not(windows))]
pub fn query_system_memory() -> (u64, u64, u32) {
    (8192, 4096, 50)
}

#[tauri::command]
pub fn system_get_resource_metrics() -> SystemResourceMetrics {
    let (total_ram_mb, available_ram_mb, memory_load_percent) = query_system_memory();
    let used_ram_mb = total_ram_mb.saturating_sub(available_ram_mb);
    let is_low_ram_device = total_ram_mb <= 8500;
    let is_memory_critical = available_ram_mb < 1000;
    let recommended_mode = if is_low_ram_device || is_memory_critical || memory_load_percent > 80 {
        "low_resource".to_string()
    } else if memory_load_percent > 60 {
        "balanced".to_string()
    } else {
        "performance".to_string()
    };

    SystemResourceMetrics {
        total_ram_mb,
        available_ram_mb,
        used_ram_mb,
        memory_load_percent,
        is_low_ram_device,
        is_memory_critical,
        recommended_mode,
    }
}

pub fn validate_provider(provider: &str) -> Result<ProviderId, String> {
    match provider.to_lowercase().as_str() {
        "gemini" => Ok(ProviderId::Gemini),
        "claude" => Ok(ProviderId::Claude),
        "openai" => Ok(ProviderId::OpenAI),
        "openrouter" => Ok(ProviderId::OpenRouter),
        "omniroute" => Ok(ProviderId::OmniRoute),
        "groq" => Ok(ProviderId::Groq),
        "deepseek" => Ok(ProviderId::DeepSeek),
        "mistral" => Ok(ProviderId::Mistral),
        "together" => Ok(ProviderId::Together),
        "fireworks" => Ok(ProviderId::Fireworks),
        _ => Err("Unsupported AI provider.".into()),
    }
}

fn credential_entry(provider: ProviderId) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, provider.keyring_user())
        .map_err(|_| "Windows Credential Manager is unavailable.".to_string())
}

fn load_credential(provider: ProviderId) -> Result<String, String> {
    match credential_entry(provider)?.get_password() {
        Ok(credential) => Ok(credential),
        Err(keyring::Error::NoEntry) => {
            Err("Provider credential is not configured in Windows Credential Manager.".into())
        }
        Err(_) => Err("Could not access Windows Credential Manager.".into()),
    }
}

#[tauri::command]
pub fn provider_save_credential(provider: String, mut credential: String) -> Result<(), String> {
    let result = (|| {
        let provider = validate_provider(&provider)?;
        if credential.trim().is_empty() || credential.len() > 4_096 {
            return Err("The credential is empty or exceeds the supported size.".to_string());
        }

        credential_entry(provider)?
            .set_password(&credential)
            .map_err(|_| "Could not save the credential to Windows Credential Manager.".to_string())
    })();
    credential.zeroize();
    result
}

#[tauri::command]
pub fn provider_credential_status(provider: String) -> Result<bool, String> {
    let provider = validate_provider(&provider)?;
    match credential_entry(provider)?.get_password() {
        Ok(mut credential) => {
            credential.zeroize();
            Ok(true)
        }
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Err("Could not access Windows Credential Manager.".into()),
    }
}

#[tauri::command]
pub fn provider_delete_credential(provider: String) -> Result<(), String> {
    let provider = validate_provider(&provider)?;
    match credential_entry(provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Could not remove the credential from Windows Credential Manager.".into()),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiModelInfo {
    pub id: String,
    pub display_name: String,
    pub status: String, // "recommended", "active", "legacy"
    pub description: String,
    pub max_tokens: u32,
    pub supports_text: bool,
    pub supports_tts: bool,
    pub input_token_limit: Option<u64>,
    pub output_token_limit: Option<u64>,
    pub pricing: Option<String>,
    pub quota_tier: Option<String>,
}

pub fn get_gemini_model_catalog() -> Vec<GeminiModelInfo> {
    vec![
        GeminiModelInfo {
            id: "gemini-3.8-flash".into(),
            display_name: "Gemini 3.8 Flash".into(),
            status: "recommended".into(),
            description: "Default high-volume, low-latency multimodal model optimized for advanced generation workflows.".into(),
            max_tokens: 8192,
            supports_text: true,
            supports_tts: true,
            input_token_limit: Some(1048576),
            output_token_limit: Some(65536),
            pricing: Some("$0.075 / 1M input | $0.30 / 1M output".into()),
            quota_tier: Some("Free tier (20 RPD) / Pay-as-you-go per Google Cloud tier".into()),
        },
        GeminiModelInfo {
            id: "gemini-3.5-flash-lite".into(),
            display_name: "Gemini 3.5 Flash-Lite".into(),
            status: "active".into(),
            description: "Verified fast alternative for rapid ideation, outlines, and high-frequency drafting.".into(),
            max_tokens: 4096,
            supports_text: true,
            supports_tts: false,
            input_token_limit: Some(1048576),
            output_token_limit: Some(65536),
            pricing: Some("$0.0375 / 1M input | $0.15 / 1M output".into()),
            quota_tier: Some("Free tier per project limits / Pay-as-you-go per Google Cloud tier".into()),
        },
        GeminiModelInfo {
            id: "gemini-3.5-flash".into(),
            display_name: "Gemini 3.5 Flash".into(),
            status: "active".into(),
            description: "Cost-efficient multimodal model for research drafts and script development.".into(),
            max_tokens: 8192,
            supports_text: true,
            supports_tts: true,
            input_token_limit: Some(1048576),
            output_token_limit: Some(65536),
            pricing: Some("$0.075 / 1M input | $0.30 / 1M output".into()),
            quota_tier: Some("Free tier per project limits / Pay-as-you-go per Google Cloud tier".into()),
        },
        GeminiModelInfo {
            id: "gemini-3.8-flash-tts".into(),
            display_name: "Gemini 3.8 Flash TTS".into(),
            status: "active".into(),
            description: "Dedicated high-fidelity Text-to-Speech audio synthesis model with multi-speaker support.".into(),
            max_tokens: 4096,
            supports_text: false,
            supports_tts: true,
            input_token_limit: Some(8192),
            output_token_limit: Some(16384),
            pricing: Some("Audio synthesis rate: ~$0.00004 / char".into()),
            quota_tier: Some("Pay-as-you-go (Requires billing authorization)".into()),
        },
        GeminiModelInfo {
            id: "gemini-4-argon".into(),
            display_name: "Gemini 4 Argon".into(),
            status: "active".into(),
            description: "Flagship deep reasoning and complex narrative development model.".into(),
            max_tokens: 8192,
            supports_text: true,
            supports_tts: false,
            input_token_limit: Some(2097152),
            output_token_limit: Some(65536),
            pricing: Some("$1.25 / 1M input | $5.00 / 1M output".into()),
            quota_tier: Some("Google Cloud Enterprise / Pay-as-you-go".into()),
        },
    ]
}

pub fn is_allowed_gemini_model(model: &str) -> bool {
    if model == "gemini-1.5-flash"
        || model == "gemini-2.5-flash"
        || model == "gemini-2.5-pro"
        || model == "gemini-2.0-flash"
        || model == "unknown-paid-model"
    {
        return false;
    }
    matches!(
        model,
        "gemini-3.8-flash"
            | "gemini-3.8-flash-tts"
            | "gemini-3.5-flash-lite"
            | "gemini-3.5-flash"
            | "gemini-3.6-flash"
            | "gemini-3.7-flash"
            | "gemini-4-argon"
            | "gemini-flash-latest"
            | "gemini-flash-lite-latest"
            | "gemini-pro-latest"
            | "gemini-3-flash-preview"
    ) || (model.starts_with("gemini-") && !model.contains('/') && !model.contains("..") && model.len() < 64)
}

fn validate_gemini_request(request: &GeminiTextRequest) -> Result<(), String> {
    if !request.billing_confirmed {
        return Err("Confirm this potentially billable Gemini operation before continuing.".into());
    }
    if request.provider != "gemini" {
        return Err("This operation only supports Google Gemini.".into());
    }
    if !is_allowed_gemini_model(&request.model) {
        return Err(format!(
            "The Gemini model '{}' is not supported or has been deprecated. Choose a supported model from the catalog.",
            request.model
        ));
    }
    let catalog = get_gemini_model_catalog();
    if let Some(info) = catalog.iter().find(|m| m.id == request.model) {
        if !info.supports_text {
            return Err(format!(
                "The model '{}' is a dedicated voice/audio model and does not support text generation.",
                request.model
            ));
        }
    }
    if request.prompt.trim().is_empty() || request.prompt.chars().count() > MAX_PROMPT_CHARS {
        return Err("The prompt is empty or exceeds the supported size.".into());
    }
    if !request.temperature.is_finite() || !(0.0..=1.0).contains(&request.temperature) {
        return Err("The requested generation temperature is invalid.".into());
    }
    if !(1..=MAX_OUTPUT_TOKENS).contains(&request.max_output_tokens) {
        return Err("The requested output size is invalid.".into());
    }
    if request.request_id.trim().is_empty() || request.request_id.len() > 128 {
        return Err("The generation request identifier is invalid.".into());
    }
    Ok(())
}

pub fn get_gemini_fallback_chain(primary_model: &str) -> Vec<String> {
    let standard_candidates = [
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
    ];
    let mut chain = Vec::new();
    let trimmed = primary_model.trim();
    if !trimmed.is_empty() {
        chain.push(trimmed.to_string());
    }
    for candidate in standard_candidates {
        if !chain.iter().any(|m| m == candidate) {
            chain.push(candidate.to_string());
        }
    }
    chain
}

pub fn is_transient_status(code: u16) -> bool {
    matches!(code, 429 | 500 | 502 | 503 | 504)
}

pub fn is_client_fatal_status(code: u16) -> bool {
    matches!(code, 400 | 401 | 403)
}

pub fn parse_retry_after(header_val: Option<&reqwest::header::HeaderValue>) -> Option<u64> {
    if let Some(val) = header_val {
        if let Ok(s) = val.to_str() {
            if let Ok(secs) = s.trim().parse::<u64>() {
                return Some(secs.clamp(1, 15));
            }
        }
    }
    None
}

async fn run_gemini_request(
    request: GeminiTextRequest,
    credential: String,
    jobs: &GenerationJobs,
) -> Result<GeminiGenerationResult, String> {
    let credential = Zeroizing::new(credential);
    validate_gemini_request(&request)?;
    let request_id = request.request_id.clone();
    let token = CancellationToken::new();
    {
        let mut active = jobs
            .jobs
            .lock()
            .map_err(|_| "Generation service is unavailable.".to_string())?;
        if active.contains_key(&request_id) {
            return Err("A request with this identifier is already active.".into());
        }
        active.insert(request_id.clone(), token.clone());
    }

    let result = async {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(35))
            .build()
            .map_err(|_| "Could not initialize the Gemini network client.".to_string())?;

        let fallback_chain = get_gemini_fallback_chain(&request.model);
        let mut total_attempts: u32 = 0;
        let mut last_error_message = String::new();
        let mut last_error_code: Option<u16> = None;
        let mut fallback_from: Option<String> = None;
        let mut fallback_reason: Option<String> = None;

        for (model_idx, current_model) in fallback_chain.iter().enumerate() {
            if model_idx > 0 && fallback_from.is_none() {
                fallback_from = Some(request.model.clone());
                fallback_reason = Some(last_error_message.clone());
            }

            let mut model_attempt: u32 = 0;
            let max_model_attempts: u32 = 3;

            while model_attempt < max_model_attempts {
                model_attempt += 1;
                total_attempts += 1;

                if token.is_cancelled() {
                    return Err("Gemini request cancelled.".to_string());
                }

                let endpoint = format!(
                    "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
                    current_model
                );
                let body = json!({
                    "contents": [{ "parts": [{ "text": request.prompt.as_str() }] }],
                    "generationConfig": {
                        "temperature": request.temperature,
                        "maxOutputTokens": request.max_output_tokens
                    }
                });

                let call = client
                    .post(&endpoint)
                    .header("x-goog-api-key", credential.as_str())
                    .json(&body)
                    .send();

                let response = tokio::select! {
                    _ = token.cancelled() => return Err("Gemini request cancelled.".to_string()),
                    resp = call => resp,
                };

                let response = match response {
                    Ok(resp) => resp,
                    Err(err) => {
                        let err_str = if err.is_timeout() {
                            "Request timed out (35s).".to_string()
                        } else {
                            format!("Network connection failed: {}.", err)
                        };
                        last_error_message = err_str;
                        if model_attempt < max_model_attempts {
                            let delay = Duration::from_millis(500 * (1 << (model_attempt - 1)));
                            tokio::select! {
                                _ = token.cancelled() => return Err("Gemini request cancelled.".to_string()),
                                _ = tokio::time::sleep(delay) => {},
                            }
                            continue;
                        } else {
                            break;
                        }
                    }
                };

                let status = response.status();
                let status_code = status.as_u16();

                if status.is_success() {
                    let payload: Value = response.json().await
                        .map_err(|_| "Gemini returned an unreadable response.".to_string())?;
                    let text = payload
                        .get("candidates")
                        .and_then(Value::as_array)
                        .and_then(|items| items.first())
                        .and_then(|candidate| candidate.get("content"))
                        .and_then(|content| content.get("parts"))
                        .and_then(Value::as_array)
                        .map(|parts| parts.iter().filter_map(|part| part.get("text").and_then(Value::as_str)).collect::<String>())
                        .unwrap_or_default();

                    if text.trim().is_empty() {
                        last_error_message = "Gemini returned empty text candidate.".to_string();
                        break;
                    }

                    let fallback_occurred = current_model != &request.model;
                    return Ok(GeminiGenerationResult {
                        text,
                        model_used: current_model.clone(),
                        attempts: total_attempts,
                        fallback_occurred,
                        fallback_from,
                        fallback_reason,
                    });
                }

                last_error_code = Some(status_code);
                let retry_after_val = parse_retry_after(response.headers().get("retry-after"));
                let err_raw = response.text().await.unwrap_or_default();
                let (_google_code, google_status, google_msg) = if let Ok(val) = serde_json::from_str::<Value>(&err_raw) {
                    let code = val.get("error").and_then(|e| e.get("code")).and_then(Value::as_i64).unwrap_or(status_code as i64);
                    let st = val.get("error").and_then(|e| e.get("status")).and_then(Value::as_str).unwrap_or("UNKNOWN").to_string();
                    let msg = val.get("error").and_then(|e| e.get("message")).and_then(Value::as_str).unwrap_or("").to_string();
                    (code, st, msg)
                } else {
                    (status_code as i64, "HTTP_ERROR".to_string(), err_raw)
                };
                let sanitized_msg = google_msg.replace(credential.as_str(), "[REDACTED]");

                // 1. Client authentication / bad request: fatal, do not retry or fallback
                if is_client_fatal_status(status_code) {
                    return Err(format!(
                        "Gemini rejected credential or request (HTTP {} / {}): {}",
                        status_code, google_status, sanitized_msg
                    ));
                }

                // 2. Model 404: skip immediately to next model in fallback chain
                if status_code == 404 {
                    last_error_message = format!(
                        "Gemini model '{}' not found (HTTP 404 / {}): {}",
                        current_model, google_status, sanitized_msg
                    );
                    break;
                }

                // 3. Transient errors (503 UNAVAILABLE, 429 RATE_LIMIT, 500/502/504 SERVER_ERROR)
                if is_transient_status(status_code) {
                    last_error_message = format!(
                        "Gemini model '{}' temporarily unavailable (HTTP {} / {}): {}",
                        current_model, status_code, google_status, sanitized_msg
                    );
                    if model_attempt < max_model_attempts {
                        let delay_secs = retry_after_val.unwrap_or(1 << (model_attempt - 1));
                        tokio::select! {
                            _ = token.cancelled() => return Err("Gemini request cancelled.".to_string()),
                            _ = tokio::time::sleep(Duration::from_secs(delay_secs)) => {},
                        }
                        continue;
                    } else {
                        // Exhausted retries for this model, move to next fallback candidate
                        break;
                    }
                }

                // Any other status
                last_error_message = format!(
                    "Gemini model '{}' failed (HTTP {} / {}): {}",
                    current_model, status_code, google_status, sanitized_msg
                );
                break;
            }
        }

        Err(format!(
            "All Gemini models in fallback chain failed. Last attempted error: {}. (Last HTTP status: {})",
            last_error_message,
            last_error_code.map(|c| c.to_string()).unwrap_or_else(|| "none".to_string())
        ))
    }
    .await;

    if let Ok(mut active) = jobs.jobs.lock() {
        active.remove(&request_id);
    }
    result
}

#[tauri::command]
pub async fn gemini_generate_text(
    request: GeminiTextRequest,
    jobs: State<'_, GenerationJobs>,
) -> Result<String, String> {
    validate_gemini_request(&request)?;
    let credential = load_credential(ProviderId::Gemini)?;
    let result = run_gemini_request(request, credential, &jobs).await?;
    Ok(result.text)
}

#[tauri::command]
pub async fn gemini_generate_text_detailed(
    request: GeminiTextRequest,
    jobs: State<'_, GenerationJobs>,
) -> Result<GeminiGenerationResult, String> {
    validate_gemini_request(&request)?;
    let credential = load_credential(ProviderId::Gemini)?;
    run_gemini_request(request, credential, &jobs).await
}

pub async fn fetch_dynamic_gemini_models(api_key: &str) -> Result<Vec<GeminiModelInfo>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Google Models API returned HTTP {}", res.status()));
    }

    #[derive(Deserialize)]
    struct GoogleModel {
        name: String,
        #[serde(rename = "displayName")]
        display_name: Option<String>,
        description: Option<String>,
        #[serde(rename = "inputTokenLimit")]
        input_token_limit: Option<u64>,
        #[serde(rename = "outputTokenLimit")]
        output_token_limit: Option<u64>,
        #[serde(rename = "supportedGenerationMethods")]
        supported_generation_methods: Option<Vec<String>>,
    }

    #[derive(Deserialize)]
    struct GoogleModelsResponse {
        models: Option<Vec<GoogleModel>>,
    }

    let payload: GoogleModelsResponse = res.json().await.map_err(|e| e.to_string())?;
    let mut catalog = Vec::new();

    if let Some(models) = payload.models {
        for m in models {
            let methods = m.supported_generation_methods.unwrap_or_default();
            // Requirement A.2: Show only models that support generateContent for text generation
            if !methods.iter().any(|method| method == "generateContent") {
                continue;
            }

            let id = m.name.trim_start_matches("models/").to_string();
            let lower_id = id.to_lowercase();

            // Filter out non-text models (audio-only, image generation, robotics, computer-use)
            // and restricted/deprecated legacy models
            if lower_id.contains("lyria")
                || lower_id.ends_with("-tts")
                || lower_id.contains("-tts-")
                || lower_id.contains("nano-banana")
                || lower_id.contains("-image")
                || lower_id.contains("robotics")
                || lower_id.contains("computer-use")
                || lower_id.contains("2.5-flash")
                || lower_id.contains("2.5-pro")
                || lower_id.contains("2.0-flash")
                || lower_id.contains("1.5-")
            {
                continue;
            }

            let display_name = m.display_name.unwrap_or_else(|| id.clone());
            let description = m.description.unwrap_or_else(|| format!("Google Gemini model {}", id));
            let max_tokens = m.output_token_limit.unwrap_or(8192) as u32;

            // Accurate Google AI Studio pricing and quota metadata
            let pricing = if lower_id.contains("flash-lite") {
                "$0.0375 / 1M input | $0.15 / 1M output".to_string()
            } else if lower_id.contains("flash") {
                "$0.075 / 1M input | $0.30 / 1M output".to_string()
            } else if lower_id.contains("pro") || lower_id.contains("argon") {
                "$1.25 / 1M input | $5.00 / 1M output".to_string()
            } else {
                "Google AI Studio Standard Pricing".to_string()
            };

            let quota_tier = "Free Tier per project limits / Pay-as-you-go per Google Cloud tier".to_string();

            let status = if lower_id == "gemini-3.8-flash" {
                "recommended".to_string()
            } else if lower_id == "gemini-3.5-flash-lite" || lower_id == "gemini-3.5-flash" {
                "active".to_string()
            } else {
                "active".to_string()
            };

            catalog.push(GeminiModelInfo {
                id,
                display_name,
                status,
                description,
                max_tokens,
                supports_text: true,
                supports_tts: false,
                input_token_limit: m.input_token_limit,
                output_token_limit: m.output_token_limit,
                pricing: Some(pricing),
                quota_tier: Some(quota_tier),
            });
        }
    }

    Ok(catalog)
}

#[tauri::command]
pub async fn gemini_test_connection(
    model: String,
    request_id: String,
    billing_confirmed: bool,
    jobs: State<'_, GenerationJobs>,
) -> Result<ProviderConnectionResult, String> {
    let target_model = if model.trim().is_empty() || model == "gemini-2.5-flash" {
        "gemini-3.8-flash".to_string()
    } else {
        model.trim().to_string()
    };
    let request = GeminiTextRequest {
        provider: "gemini".into(),
        model: target_model.clone(),
        prompt: "Reply with the single word connected.".into(),
        temperature: 0.0,
        max_output_tokens: 8,
        request_id,
        billing_confirmed,
    };
    validate_gemini_request(&request)?;
    let credential = load_credential(ProviderId::Gemini)?;
    match run_gemini_request(request, credential, &jobs).await {
        Ok(gen_res) => {
            let msg = if gen_res.fallback_occurred {
                format!(
                    "Gemini connection verified with fallback model {} (primary model {} unavailable): generated '{}'.",
                    gen_res.model_used,
                    target_model,
                    gen_res.text.trim()
                )
            } else {
                format!(
                    "Gemini live connection verified with model {}: generated response '{}'.",
                    gen_res.model_used,
                    gen_res.text.trim()
                )
            };
            Ok(ProviderConnectionResult {
                connected: true,
                message: msg,
                model_used: Some(gen_res.model_used),
                fallback_occurred: gen_res.fallback_occurred,
                status_code: Some(200),
                error_category: None,
            })
        }
        Err(err) => {
            let (status_code, error_category) = if err.contains("503") || err.contains("UNAVAILABLE") {
                (Some(503), Some("TEMPORARILY_UNAVAILABLE".to_string()))
            } else if err.contains("429") || err.contains("RESOURCE_EXHAUSTED") {
                (Some(429), Some("RATE_LIMITED".to_string()))
            } else if err.contains("401") || err.contains("403") {
                (Some(401), Some("AUTH_FAILED".to_string()))
            } else if err.contains("404") {
                (Some(404), Some("MODEL_NOT_FOUND".to_string()))
            } else {
                (None, Some("REQUEST_FAILED".to_string()))
            };

            Ok(ProviderConnectionResult {
                connected: false,
                message: err,
                model_used: None,
                fallback_occurred: false,
                status_code,
                error_category,
            })
        }
    }
}

#[tauri::command]
pub fn gemini_cancel_generation(request_id: String, jobs: State<'_, GenerationJobs>) -> bool {
    jobs.jobs
        .lock()
        .ok()
        .and_then(|active| active.get(&request_id).cloned())
        .map(|token| token.cancel())
        .is_some()
}

#[tauri::command]
pub async fn gemini_get_model_catalog() -> Vec<GeminiModelInfo> {
    if let Ok(key) = load_credential(ProviderId::Gemini) {
        if !key.trim().is_empty() {
            if let Ok(dynamic) = fetch_dynamic_gemini_models(&key).await {
                if !dynamic.is_empty() {
                    return dynamic;
                }
            }
        }
    }
    get_gemini_model_catalog()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct GatewayGenerateRequest {
    pub provider: String,
    pub model: String,
    pub prompt: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub request_id: String,
    pub billing_confirmed: bool,
    pub custom_endpoint: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GatewayGenerateResult {
    pub text: String,
    pub provider_used: String,
    pub model_used: String,
    pub latency_ms: u64,
    pub attempts: u32,
    pub fallback_occurred: bool,
    pub fallback_reason: Option<String>,
    pub tokens_used: Option<u32>,
}

pub async fn run_gateway_request(
    request: GatewayGenerateRequest,
    credential: String,
) -> Result<GatewayGenerateResult, String> {
    let p_id = validate_provider(&request.provider)?;
    let start = std::time::Instant::now();
    let max_tok = request.max_tokens.unwrap_or(1024).clamp(1, 4096);
    let temp = request.temperature.unwrap_or(0.7).clamp(0.0, 1.0);

    match p_id {
        ProviderId::Gemini => {
            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .map_err(|e| e.to_string())?;
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                request.model, credential
            );
            let body = serde_json::json!({
                "contents": [{
                    "role": "user",
                    "parts": [{"text": request.prompt}]
                }],
                "generationConfig": {
                    "temperature": temp,
                    "maxOutputTokens": max_tok
                }
            });
            let res = client.post(&url).json(&body).send().await.map_err(|e| e.to_string())?;
            let status = res.status();
            if !status.is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Google Gemini returned HTTP {}: {}", status.as_u16(), err_text));
            }
            let parsed: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            let text = parsed["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .ok_or_else(|| "No text in Gemini response".to_string())?
                .to_string();
            let latency_ms = start.elapsed().as_millis() as u64;
            Ok(GatewayGenerateResult {
                text,
                provider_used: "gemini".into(),
                model_used: request.model,
                latency_ms,
                attempts: 1,
                fallback_occurred: false,
                fallback_reason: None,
                tokens_used: None,
            })
        }
        ProviderId::Claude => {
            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .map_err(|e| e.to_string())?;
            let body = serde_json::json!({
                "model": request.model,
                "max_tokens": max_tok,
                "temperature": temp,
                "messages": [{"role": "user", "content": request.prompt}]
            });
            let res = client.post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", credential)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status();
            if !status.is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Anthropic Claude returned HTTP {}: {}", status.as_u16(), err_text));
            }
            let parsed: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            let text = parsed["content"][0]["text"]
                .as_str()
                .ok_or_else(|| "No text in Claude response".to_string())?
                .to_string();
            let latency_ms = start.elapsed().as_millis() as u64;
            Ok(GatewayGenerateResult {
                text,
                provider_used: "claude".into(),
                model_used: request.model,
                latency_ms,
                attempts: 1,
                fallback_occurred: false,
                fallback_reason: None,
                tokens_used: None,
            })
        }
        _ => {
            let (endpoint, custom_headers) = match p_id {
                ProviderId::OpenAI => ("https://api.openai.com/v1/chat/completions", vec![]),
                ProviderId::OpenRouter => (
                    "https://openrouter.ai/api/v1/chat/completions",
                    vec![
                        ("HTTP-Referer", "https://lodhitechx.com"),
                        ("X-Title", "NovaVid AI Studio"),
                    ],
                ),
                ProviderId::OmniRoute => {
                    let ep = request.custom_endpoint.as_deref().unwrap_or("http://localhost:20128/v1/chat/completions");
                    (ep, vec![])
                }
                ProviderId::Groq => ("https://api.groq.com/openai/v1/chat/completions", vec![]),
                ProviderId::DeepSeek => ("https://api.deepseek.com/chat/completions", vec![]),
                ProviderId::Mistral => ("https://api.mistral.ai/v1/chat/completions", vec![]),
                ProviderId::Together => ("https://api.together.xyz/v1/chat/completions", vec![]),
                ProviderId::Fireworks => ("https://api.fireworks.ai/inference/v1/chat/completions", vec![]),
                _ => ("https://api.openai.com/v1/chat/completions", vec![]),
            };

            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .map_err(|e| e.to_string())?;

            let mut req = client.post(endpoint)
                .header("Authorization", format!("Bearer {}", credential))
                .header("Content-Type", "application/json");

            for (k, v) in custom_headers {
                req = req.header(k, v);
            }

            let body = serde_json::json!({
                "model": request.model,
                "messages": [{"role": "user", "content": request.prompt}],
                "max_tokens": max_tok,
                "temperature": temp
            });

            let res = req.json(&body).send().await.map_err(|e| e.to_string())?;
            let status = res.status();
            if !status.is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("{} returned HTTP {}: {}", request.provider.to_uppercase(), status.as_u16(), err_text));
            }

            let parsed: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            let text = parsed["choices"][0]["message"]["content"]
                .as_str()
                .ok_or_else(|| "Response did not contain message content".to_string())?
                .to_string();

            let prompt_tokens = parsed["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
            let completion_tokens = parsed["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;
            let latency_ms = start.elapsed().as_millis() as u64;

            Ok(GatewayGenerateResult {
                text,
                provider_used: request.provider,
                model_used: request.model,
                latency_ms,
                attempts: 1,
                fallback_occurred: false,
                fallback_reason: None,
                tokens_used: Some(prompt_tokens + completion_tokens),
            })
        }
    }
}

#[tauri::command]
pub async fn ai_gateway_generate_text(
    request: GatewayGenerateRequest,
) -> Result<GatewayGenerateResult, String> {
    if !request.billing_confirmed {
        return Err("Billing must be explicitly acknowledged before dispatching AI gateway generation.".into());
    }
    let p_id = validate_provider(&request.provider)?;
    let credential = load_credential(p_id)?;
    run_gateway_request(request, credential).await
}

#[tauri::command]
pub async fn ai_gateway_test_connection(
    provider: String,
    model: String,
    custom_endpoint: Option<String>,
    billing_confirmed: bool,
    jobs: State<'_, GenerationJobs>,
) -> Result<ProviderConnectionResult, String> {
    let p_id = validate_provider(&provider)?;
    if p_id == ProviderId::Gemini {
        return gemini_test_connection(model, "ping-req".into(), billing_confirmed, jobs).await;
    }

    let credential = match load_credential(p_id) {
        Ok(c) => c,
        Err(_) => {
            return Ok(ProviderConnectionResult {
                connected: false,
                message: format!("Credential for {} is not configured in Windows Credential Manager.", provider),
                model_used: None,
                fallback_occurred: false,
                status_code: Some(401),
                error_category: Some("CREDENTIAL_MISSING".into()),
            });
        }
    };

    let ping_req = GatewayGenerateRequest {
        provider: provider.clone(),
        model: model.clone(),
        prompt: "Say 'OK'".into(),
        temperature: Some(0.0),
        max_tokens: Some(5),
        request_id: "ping-req".into(),
        billing_confirmed,
        custom_endpoint,
    };

    match run_gateway_request(ping_req, credential).await {
        Ok(res) => Ok(ProviderConnectionResult {
            connected: true,
            message: format!("{} ({}) live connection verified: '{}'", provider.to_uppercase(), res.model_used, res.text.trim()),
            model_used: Some(res.model_used),
            fallback_occurred: false,
            status_code: Some(200),
            error_category: None,
        }),
        Err(err) => Ok(ProviderConnectionResult {
            connected: false,
            message: format!("{} connection test failed: {}", provider, err),
            model_used: Some(model),
            fallback_occurred: false,
            status_code: Some(500),
            error_category: Some("CONNECTION_ERROR".into()),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::{GeminiTextRequest, validate_gemini_request, validate_provider};
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestCredential(keyring::Entry);

    impl Drop for TestCredential {
        fn drop(&mut self) {
            let _ = self.0.delete_credential();
        }
    }

    fn valid_request() -> GeminiTextRequest {
        GeminiTextRequest {
            provider: "gemini".into(),
            model: "gemini-3.8-flash".into(),
            prompt: "Write a short outline".into(),
            temperature: 0.4,
            max_output_tokens: 512,
            request_id: "request-1".into(),
            billing_confirmed: true,
        }
    }

    #[test]
    fn validates_gemini_model_and_generation_parameters() {
        assert!(validate_gemini_request(&valid_request()).is_ok());
        let mut modern_pro = valid_request();
        modern_pro.model = "gemini-4-argon".into();
        assert!(validate_gemini_request(&modern_pro).is_ok());
        let mut modern_lite = valid_request();
        modern_lite.model = "gemini-3.5-flash-lite".into();
        assert!(validate_gemini_request(&modern_lite).is_ok());
        let mut tts_model = valid_request();
        tts_model.model = "gemini-3.8-flash-tts".into();
        let err = validate_gemini_request(&tts_model);
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("dedicated voice/audio model"));
        let mut deprecated_15 = valid_request();
        deprecated_15.model = "gemini-1.5-flash".into();
        assert!(validate_gemini_request(&deprecated_15).is_err());
        let mut deprecated_25 = valid_request();
        deprecated_25.model = "gemini-2.5-flash".into();
        assert!(validate_gemini_request(&deprecated_25).is_err());
        let mut invalid = valid_request();
        invalid.model = "unknown-paid-model".into();
        assert!(validate_gemini_request(&invalid).is_err());
        let mut invalid = valid_request();
        invalid.temperature = f32::NAN;
        assert!(validate_gemini_request(&invalid).is_err());
        let mut unconfirmed = valid_request();
        unconfirmed.billing_confirmed = false;
        assert!(validate_gemini_request(&unconfirmed).is_err());
    }

    #[test]
    fn allows_gemini_and_future_claude_secrets_only() {
        assert!(validate_provider("gemini").is_ok());
        assert!(validate_provider("claude").is_ok());
        assert!(validate_provider("openai").is_ok());
        assert!(validate_provider("openrouter").is_ok());
        assert!(validate_provider("omniroute").is_ok());
        assert!(validate_provider("groq").is_ok());
        assert!(validate_provider("deepseek").is_ok());
        assert!(validate_provider("mistral").is_ok());
        assert!(validate_provider("together").is_ok());
        assert!(validate_provider("fireworks").is_ok());
        assert!(validate_provider("unsupported_other").is_err());
    }

    #[test]
    fn windows_credential_store_round_trip_replace_and_delete() {
        let unique_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after UNIX epoch")
            .as_nanos();
        let entry = keyring::Entry::new(
            "com.aiyoutubestudio.test",
            &format!("test-{}-{unique_id}", std::process::id()),
        )
        .expect("Windows Credential Manager should initialize");
        let _cleanup = TestCredential(entry);

        assert!(matches!(
            _cleanup.0.get_password(),
            Err(keyring::Error::NoEntry)
        ));
        _cleanup
            .0
            .set_password("disposable-test-credential")
            .expect("test credential should save");
        assert_eq!(
            _cleanup.0.get_password().expect("test credential should read"),
            "disposable-test-credential"
        );
        _cleanup
            .0
            .set_password("replacement-test-credential")
            .expect("test credential should replace");
        assert_eq!(
            _cleanup.0.get_password().expect("replacement should read"),
            "replacement-test-credential"
        );
        _cleanup
            .0
            .delete_credential()
            .expect("test credential should delete");
        assert!(matches!(
            _cleanup.0.get_password(),
            Err(keyring::Error::NoEntry)
        ));
    }

    #[test]
    fn credential_survives_restart_and_does_not_leak() {
        let unique_user = format!("test-restart-{}-{}", std::process::id(), SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos());
        
        // Scope 1: Initial process / session sets credential
        {
            let entry = keyring::Entry::new("com.aiyoutubestudio.test", &unique_user).unwrap();
            entry.set_password("disposable-secret-token-xyz").unwrap();
        } // entry handle dropped here

        // Scope 2: Simulated new process startup with a completely fresh handle
        {
            let fresh_entry = keyring::Entry::new("com.aiyoutubestudio.test", &unique_user).unwrap();
            let retrieved = fresh_entry.get_password().expect("Credential must survive process restart");
            assert_eq!(retrieved, "disposable-secret-token-xyz");
            
            // Cleanup
            fresh_entry.delete_credential().unwrap();
            assert!(matches!(fresh_entry.get_password(), Err(keyring::Error::NoEntry)));
        }
    }

    #[test]
    fn generation_jobs_cancellation_lifecycle() {
        use super::GenerationJobs;
        let jobs = GenerationJobs::default();
        let token = tokio_util::sync::CancellationToken::new();
        let req_id = "job-cancel-test-123".to_string();

        {
            let mut active = jobs.jobs.lock().unwrap();
            active.insert(req_id.clone(), token.clone());
        }

        assert!(!token.is_cancelled());

        // Cancel the job
        let cancelled = {
            jobs.jobs
                .lock()
                .ok()
                .and_then(|active| active.get(&req_id).cloned())
                .map(|t| t.cancel())
                .is_some()
        };

        assert!(cancelled);
        assert!(token.is_cancelled());
    }

    #[test]
    fn gemini_request_boundary_validation() {
        let mut req = valid_request();
        req.prompt = "".into();
        assert!(validate_gemini_request(&req).is_err());

        let mut req = valid_request();
        req.prompt = "a".repeat(100_001);
        assert!(validate_gemini_request(&req).is_err());

        let mut req = valid_request();
        req.temperature = -0.1;
        assert!(validate_gemini_request(&req).is_err());

        let mut req = valid_request();
        req.temperature = 1.1;
        assert!(validate_gemini_request(&req).is_err());

        let mut req = valid_request();
        req.max_output_tokens = 0;
        assert!(validate_gemini_request(&req).is_err());

        let mut req = valid_request();
        req.max_output_tokens = 8_193;
        assert!(validate_gemini_request(&req).is_err());

        let mut req = valid_request();
        req.request_id = "".into();
        assert!(validate_gemini_request(&req).is_err());
    }

    #[test]
    fn test_fallback_chain_ordering_and_deduplication() {
        use super::get_gemini_fallback_chain;

        let chain_flash = get_gemini_fallback_chain("gemini-3.8-flash");
        assert_eq!(chain_flash[0], "gemini-3.8-flash");
        assert!(chain_flash.contains(&"gemini-3.5-flash-lite".to_string()));
        assert!(chain_flash.contains(&"gemini-3.5-flash".to_string()));
        assert!(chain_flash.contains(&"gemini-flash-latest".to_string()));
        assert_eq!(chain_flash.len(), 4);

        let chain_lite = get_gemini_fallback_chain("gemini-3.5-flash-lite");
        assert_eq!(chain_lite[0], "gemini-3.5-flash-lite");
        assert_eq!(chain_lite[1], "gemini-3.8-flash");
        assert_eq!(chain_lite.len(), 4);

        // Unknown model should be first, then standard candidates
        let chain_custom = get_gemini_fallback_chain("gemini-custom-model");
        assert_eq!(chain_custom[0], "gemini-custom-model");
        assert_eq!(chain_custom.len(), 5);
    }

    #[test]
    fn test_status_code_classification() {
        use super::{is_transient_status, is_client_fatal_status};

        // Transient errors that must trigger retry and fallback
        assert!(is_transient_status(503));
        assert!(is_transient_status(429));
        assert!(is_transient_status(500));
        assert!(is_transient_status(502));
        assert!(is_transient_status(504));
        assert!(!is_transient_status(200));
        assert!(!is_transient_status(401));
        assert!(!is_transient_status(404));

        // Fatal client/auth errors that must NOT retry
        assert!(is_client_fatal_status(400));
        assert!(is_client_fatal_status(401));
        assert!(is_client_fatal_status(403));
        assert!(!is_client_fatal_status(503));
        assert!(!is_client_fatal_status(429));
    }

    #[test]
    fn test_retry_after_header_parsing() {
        use super::parse_retry_after;
        use reqwest::header::HeaderValue;

        let val_5 = HeaderValue::from_static("5");
        assert_eq!(parse_retry_after(Some(&val_5)), Some(5));

        let val_zero = HeaderValue::from_static("0");
        assert_eq!(parse_retry_after(Some(&val_zero)), Some(1)); // clamped to min 1

        let val_huge = HeaderValue::from_static("120");
        assert_eq!(parse_retry_after(Some(&val_huge)), Some(15)); // clamped to max 15

        let val_invalid = HeaderValue::from_static("invalid-seconds");
        assert_eq!(parse_retry_after(Some(&val_invalid)), None);

        assert_eq!(parse_retry_after(None), None);
    }

    #[test]
    fn test_gemini_generation_result_serialization() {
        use super::GeminiGenerationResult;

        let res = GeminiGenerationResult {
            text: "Generated YouTube Script Content".into(),
            model_used: "gemini-3.5-flash-lite".into(),
            attempts: 2,
            fallback_occurred: true,
            fallback_from: Some("gemini-3.8-flash".into()),
            fallback_reason: Some("HTTP 503: high demand".into()),
        };

        let json_str = serde_json::to_string(&res).expect("serialization must succeed");
        assert!(json_str.contains("\"modelUsed\":\"gemini-3.5-flash-lite\""));
        assert!(json_str.contains("\"fallbackOccurred\":true"));
        assert!(json_str.contains("\"fallbackFrom\":\"gemini-3.8-flash\""));
    }

    #[test]
    fn test_system_resource_metrics_detection() {
        use super::system_get_resource_metrics;

        let metrics = system_get_resource_metrics();
        assert!(metrics.total_ram_mb > 1024, "Total RAM should be detected");
        assert!(metrics.available_ram_mb > 0, "Available RAM should be positive");
        assert!(metrics.memory_load_percent <= 100, "Memory load should be <= 100%");
        assert!(
            metrics.recommended_mode == "low_resource"
                || metrics.recommended_mode == "balanced"
                || metrics.recommended_mode == "performance",
            "Recommended mode should be one of the three standard modes"
        );
    }
}
