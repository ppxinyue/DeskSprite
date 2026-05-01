use keyring::Entry;

const SERVICE_NAME: &str = "com.desksprite.app";

#[tauri::command]
pub async fn test_ai_connection(config_id: i64) -> Result<serde_json::Value, String> {
    // This will be fully implemented when ai_service is built.
    // For now, return a placeholder response.
    let _ = config_id;
    Ok(serde_json::json!({
        "success": false,
        "message": "Not implemented yet",
        "latency_ms": 0
    }))
}
