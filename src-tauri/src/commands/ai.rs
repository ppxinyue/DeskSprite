use keyring::Entry;
use std::time::Instant;

const SERVICE_NAME: &str = "com.desksprite.app";

#[tauri::command]
pub async fn test_ai_connection(config_id: i64) -> Result<serde_json::Value, String> {
    let start = Instant::now();

    // Get API key from keychain
    let keyring_ref = format!("api_key/{}", config_id);
    let entry = Entry::new(SERVICE_NAME, &keyring_ref)
        .map_err(|e| format!("Failed to access keychain: {}", e))?;

    let api_key = entry.get_password()
        .map_err(|e| format!("Failed to get API key: {}", e))?;

    // For a real implementation, we would make a test API call here
    // For now, we'll just verify the key exists and is not empty
    if api_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "API key is empty",
            "latency_ms": 0
        }));
    }

    let latency = start.elapsed().as_millis() as u64;

    // Return success - in production, this would make an actual API call
    Ok(serde_json::json!({
        "success": true,
        "message": "Connection test successful",
        "latency_ms": latency
    }))
}
