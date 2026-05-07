use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::{Duration, Instant};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestAiConnectionRequest {
    provider: String,
    base_url: String,
    model: String,
    api_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatCompletionRequest {
    provider: String,
    base_url: String,
    model: String,
    api_key: String,
    messages: Vec<ChatMessagePayload>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessagePayload {
    role: String,
    content: String,
    image_data_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeAudioRequest {
    base_url: String,
    model: String,
    api_key: String,
    audio_base64: String,
    mime_type: String,
    file_name: Option<String>,
    language: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeSpeechRequest {
    base_url: String,
    model: String,
    api_key: String,
    input: String,
    voice: Option<String>,
    format: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeSpeechResponse {
    data_url: String,
    mime_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestAiConnectionResponse {
    success: bool,
    message: String,
    latency: u128,
}

#[tauri::command]
pub async fn test_ai_connection(
    request: TestAiConnectionRequest,
) -> Result<TestAiConnectionResponse, String> {
    let api_key = normalize_api_key(&request.api_key);
    if api_key.is_empty() {
        return Ok(TestAiConnectionResponse {
            success: false,
            message: "API Key 为空。".to_string(),
            latency: 0,
        });
    }

    let base_url = request.base_url.trim().trim_end_matches('/');
    if !(base_url.starts_with("https://") || base_url.starts_with("http://")) {
        return Ok(TestAiConnectionResponse {
            success: false,
            message: "Base URL 必须以 http:// 或 https:// 开头。".to_string(),
            latency: 0,
        });
    }

    let started = Instant::now();
    let provider = request.provider.to_lowercase();
    let is_anthropic = provider == "anthropic";
    let endpoint = if is_anthropic {
        format!("{}/messages", base_url)
    } else {
        format!("{}/chat/completions", base_url)
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let mut builder = client
        .post(&endpoint)
        .header(reqwest::header::CONTENT_TYPE, "application/json");

    let body = if is_anthropic {
        builder = builder
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01");
        json!({
            "model": request.model,
            "max_tokens": 1,
            "messages": [{ "role": "user", "content": "ping" }]
        })
    } else {
        builder = builder.bearer_auth(&api_key);
        json!({
            "model": request.model,
            "max_tokens": 1,
            "stream": false,
            "messages": [{ "role": "user", "content": "ping" }]
        })
    };

    let response = match builder.json(&body).send().await {
        Ok(response) => response,
        Err(e) => {
            return Ok(TestAiConnectionResponse {
                success: false,
                message: format!(
                    "网络请求失败：{}；目标 {}；{}",
                    e,
                    endpoint,
                    token_diagnostic(&api_key)
                ),
                latency: started.elapsed().as_millis(),
            });
        }
    };

    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    let latency = started.elapsed().as_millis();

    if !status.is_success() {
        return Ok(TestAiConnectionResponse {
            success: false,
            message: format!(
                "HTTP {}: {}；已连接到 {}；{}",
                status.as_u16(),
                extract_api_error_message(&text)
                    .unwrap_or_else(|| status.canonical_reason().unwrap_or("请求失败").to_string()),
                endpoint,
                token_diagnostic(&api_key)
            ),
            latency,
        });
    }

    Ok(TestAiConnectionResponse {
        success: true,
        message: "测试通过".to_string(),
        latency,
    })
}

#[tauri::command]
pub async fn chat_completion(request: ChatCompletionRequest) -> Result<String, String> {
    let api_key = normalize_api_key(&request.api_key);
    if api_key.is_empty() {
        return Err("API Key 为空。".to_string());
    }

    let base_url = request.base_url.trim().trim_end_matches('/');
    if !(base_url.starts_with("https://") || base_url.starts_with("http://")) {
        return Err("Base URL 必须以 http:// 或 https:// 开头。".to_string());
    }

    let provider = request.provider.to_lowercase();
    let is_anthropic = provider == "anthropic";
    let endpoint = if is_anthropic {
        format!("{}/messages", base_url)
    } else {
        format!("{}/chat/completions", base_url)
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let mut builder = client
        .post(endpoint)
        .header(reqwest::header::CONTENT_TYPE, "application/json");

    let body = if is_anthropic {
        builder = builder
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01");
        build_anthropic_chat_body(&request.model, &request.messages)
    } else {
        builder = builder.bearer_auth(&api_key);
        build_openai_chat_body(&request.model, &request.messages)
    };

    let response = builder
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败：{}", e))?;

    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!(
            "HTTP {}: {}",
            status.as_u16(),
            extract_api_error_message(&text)
                .unwrap_or_else(|| status.canonical_reason().unwrap_or("请求失败").to_string())
        ));
    }

    parse_chat_response(&text, is_anthropic).ok_or_else(|| "模型返回内容为空。".to_string())
}

#[tauri::command]
pub async fn transcribe_audio(request: TranscribeAudioRequest) -> Result<String, String> {
    let api_key = normalize_api_key(&request.api_key);
    if api_key.is_empty() {
        return Err("API Key 为空。".to_string());
    }

    let base_url = normalize_base_url(&request.base_url)?;
    let endpoint = format!("{}/audio/transcriptions", base_url);
    let audio_bytes = base64_to_bytes(&request.audio_base64)?;
    if audio_bytes.is_empty() {
        return Err("录音内容为空。".to_string());
    }

    let file_name = request
        .file_name
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| audio_file_name(&request.mime_type).to_string());
    let file_part = reqwest::multipart::Part::bytes(audio_bytes)
        .file_name(file_name)
        .mime_str(&request.mime_type)
        .map_err(|e| format!("音频格式无效：{}", e))?;
    let mut form = reqwest::multipart::Form::new()
        .text("model", request.model)
        .part("file", file_part);
    if let Some(language) = request.language.filter(|value| !value.trim().is_empty()) {
        form = form.text("language", normalize_language_code(&language));
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .post(&endpoint)
        .bearer_auth(&api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("语音识别请求失败：{}", e))?;

    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!(
            "HTTP {}: {}",
            status.as_u16(),
            extract_api_error_message(&text).unwrap_or_else(|| status
                .canonical_reason()
                .unwrap_or("语音识别失败")
                .to_string())
        ));
    }

    parse_transcription_response(&text).ok_or_else(|| "语音识别返回内容为空。".to_string())
}

#[tauri::command]
pub async fn synthesize_speech(
    request: SynthesizeSpeechRequest,
) -> Result<SynthesizeSpeechResponse, String> {
    let api_key = normalize_api_key(&request.api_key);
    if api_key.is_empty() {
        return Err("API Key 为空。".to_string());
    }

    let base_url = normalize_base_url(&request.base_url)?;
    let endpoint = format!("{}/audio/speech", base_url);
    let format = request.format.unwrap_or_else(|| "mp3".to_string());
    let mime_type = audio_response_mime(&format);
    let body = json!({
        "model": request.model,
        "input": request.input,
        "voice": request.voice.unwrap_or_else(|| "alloy".to_string()),
        "response_format": format,
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .post(&endpoint)
        .bearer_auth(&api_key)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("语音合成请求失败：{}", e))?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(format!(
            "HTTP {}: {}",
            status.as_u16(),
            extract_api_error_message(&text).unwrap_or_else(|| status
                .canonical_reason()
                .unwrap_or("语音合成失败")
                .to_string())
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取语音合成结果失败：{}", e))?;
    Ok(SynthesizeSpeechResponse {
        data_url: format!("data:{};base64,{}", mime_type, STANDARD.encode(bytes)),
        mime_type: mime_type.to_string(),
    })
}

fn build_openai_chat_body(model: &str, messages: &[ChatMessagePayload]) -> serde_json::Value {
    let messages = messages
        .iter()
        .map(|message| {
            if let Some(image_data_url) = message.image_data_url.as_ref() {
                json!({
                    "role": &message.role,
                    "content": [
                        { "type": "text", "text": if message.content.is_empty() { "请分析这张图片。" } else { &message.content } },
                        { "type": "image_url", "image_url": { "url": image_data_url } }
                    ]
                })
            } else {
                json!({
                    "role": &message.role,
                    "content": &message.content
                })
            }
        })
        .collect::<Vec<_>>();

    json!({
        "model": model,
        "stream": false,
        "messages": messages
    })
}

fn build_anthropic_chat_body(model: &str, messages: &[ChatMessagePayload]) -> serde_json::Value {
    let system = messages
        .iter()
        .find(|message| message.role == "system")
        .map(|message| message.content.as_str())
        .unwrap_or("");

    let messages = messages
        .iter()
        .filter(|message| message.role != "system")
        .map(|message| {
            if let Some(image_data_url) = message.image_data_url.as_ref() {
                let (mime_type, data) = split_data_url(image_data_url);
                json!({
                    "role": &message.role,
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": data
                            }
                        },
                        { "type": "text", "text": if message.content.is_empty() { "请分析这张图片。" } else { &message.content } }
                    ]
                })
            } else {
                json!({
                    "role": &message.role,
                    "content": &message.content
                })
            }
        })
        .collect::<Vec<_>>();

    json!({
        "model": model,
        "system": system,
        "messages": messages,
        "max_tokens": 2048
    })
}

fn split_data_url(data_url: &str) -> (&str, &str) {
    if let Some((header, data)) = data_url.split_once(',') {
        let mime_type = header
            .strip_prefix("data:")
            .and_then(|value| value.split_once(';').map(|(mime, _)| mime))
            .unwrap_or("image/png");
        (mime_type, data)
    } else {
        ("image/png", data_url)
    }
}

fn normalize_base_url(value: &str) -> Result<String, String> {
    let base_url = value.trim().trim_end_matches('/');
    if !(base_url.starts_with("https://") || base_url.starts_with("http://")) {
        return Err("Base URL 必须以 http:// 或 https:// 开头。".to_string());
    }
    Ok(base_url.to_string())
}

fn base64_to_bytes(value: &str) -> Result<Vec<u8>, String> {
    let data = value
        .split_once(',')
        .map(|(_, data)| data)
        .unwrap_or(value)
        .trim();
    STANDARD
        .decode(data)
        .map_err(|e| format!("音频数据解码失败：{}", e))
}

fn audio_file_name(mime_type: &str) -> &'static str {
    match mime_type {
        "audio/mp4" | "audio/mp4a-latm" => "recording.m4a",
        "audio/mpeg" | "audio/mp3" => "recording.mp3",
        "audio/wav" | "audio/wave" => "recording.wav",
        "audio/ogg" => "recording.ogg",
        _ => "recording.webm",
    }
}

fn normalize_language_code(language: &str) -> String {
    language
        .split(['-', '_'])
        .next()
        .unwrap_or(language)
        .to_lowercase()
}

fn audio_response_mime(format: &str) -> &'static str {
    match format {
        "opus" => "audio/ogg",
        "aac" => "audio/aac",
        "flac" => "audio/flac",
        "wav" => "audio/wav",
        "pcm" => "audio/wav",
        _ => "audio/mpeg",
    }
}

fn parse_chat_response(text: &str, is_anthropic: bool) -> Option<String> {
    let data: serde_json::Value = serde_json::from_str(text).ok()?;
    if is_anthropic {
        let text = data
            .get("content")?
            .as_array()?
            .iter()
            .filter_map(|item| item.get("text").and_then(|value| value.as_str()))
            .collect::<Vec<_>>()
            .join("");
        return if text.is_empty() { None } else { Some(text) };
    }

    let content = data
        .get("choices")?
        .get(0)?
        .get("message")?
        .get("content")?;
    if let Some(text) = content.as_str() {
        return Some(text.to_string());
    }
    if let Some(items) = content.as_array() {
        let text = items
            .iter()
            .filter_map(|item| item.get("text").and_then(|value| value.as_str()))
            .collect::<Vec<_>>()
            .join("");
        if !text.is_empty() {
            return Some(text);
        }
    }
    None
}

fn parse_transcription_response(text: &str) -> Option<String> {
    let data: serde_json::Value = serde_json::from_str(text).ok()?;
    data.get("text")
        .and_then(|value| value.as_str())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn normalize_api_key(value: &str) -> String {
    let mut key = value
        .trim()
        .trim_matches(['"', '\'', '`'])
        .trim()
        .to_string();
    if key.len() >= 7 && key[..7].eq_ignore_ascii_case("bearer ") {
        key = key[7..].trim().to_string();
    }
    key = key
        .trim_matches(['"', '\'', '`'])
        .replace(['\u{200B}', '\u{200C}', '\u{200D}', '\u{FEFF}'], "");
    key.split_whitespace().collect::<String>()
}

fn token_diagnostic(api_key: &str) -> String {
    let tail = api_key
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<String>();
    format!(
        "Key {} 位，尾号 ...{}，指纹 {:08x}",
        api_key.chars().count(),
        tail,
        fnv1a32(api_key.as_bytes())
    )
}

fn fnv1a32(bytes: &[u8]) -> u32 {
    let mut hash = 0x811c9dc5_u32;
    for byte in bytes {
        hash ^= u32::from(*byte);
        hash = hash.wrapping_mul(0x01000193);
    }
    hash
}

fn extract_api_error_message(text: &str) -> Option<String> {
    if text.trim().is_empty() {
        return None;
    }

    let data: serde_json::Value = serde_json::from_str(text).ok()?;
    if let Some(error) = data.get("error") {
        if let Some(message) = error.as_str() {
            return Some(message.to_string());
        }
        if let Some(message) = error.get("message").and_then(|value| value.as_str()) {
            return Some(message.to_string());
        }
    }
    for key in ["message", "detail", "errmsg"] {
        if let Some(message) = data.get(key).and_then(|value| value.as_str()) {
            return Some(message.to_string());
        }
    }
    Some(text.chars().take(800).collect())
}
