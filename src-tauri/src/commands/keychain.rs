use keyring::Entry;

const SERVICE_NAME: &str = "com.deskcat.app";

#[tauri::command]
pub fn save_api_key(keyring_ref: String, key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &keyring_ref).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_api_key(keyring_ref: String) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &keyring_ref).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_api_key(keyring_ref: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &keyring_ref).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}
