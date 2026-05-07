use image::ImageFormat;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get the assets directory for a specific pet state
fn get_assets_dir(app_handle: &AppHandle, state: &str) -> Result<PathBuf, String> {
    let local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get local data dir: {}", e))?;

    let state_dir = local_data_dir.join("assets").join(state);
    fs::create_dir_all(&state_dir)
        .map_err(|e| format!("Failed to create directory {:?}: {}", state_dir, e))?;

    Ok(state_dir)
}

/// Import a pet image, converting it to PNG format
#[tauri::command]
pub async fn import_pet_image(
    app_handle: AppHandle,
    src_path: String,
    state: String,
) -> Result<String, String> {
    // Validate state
    if state != "idle" && state != "thinking" && state != "sleeping" {
        return Err(format!("Invalid state: {}", state));
    }

    // Read source image
    let src_path_buf = PathBuf::from(&src_path);
    let src_path_canonical = fs::canonicalize(&src_path_buf)
        .map_err(|e| format!("Failed to canonicalize source path: {}", e))?;

    // Try to detect format from extension first, fall back to guessing
    let _format = ImageFormat::from_path(&src_path_canonical)
        .unwrap_or(ImageFormat::Png);

    let img = image::open(&src_path_canonical)
        .map_err(|e| format!("Failed to open image: {}", e))?;

    // Get assets directory for this state
    let assets_dir = get_assets_dir(&app_handle, &state)?;

    // Generate filename: strip original extension and add .png
    let file_stem = src_path_buf
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let dest_filename = format!("{}.png", file_stem);

    // Handle duplicates by adding a number suffix
    let mut dest_path = assets_dir.join(&dest_filename);
    let mut counter = 1;
    while dest_path.exists() {
        dest_path = assets_dir.join(format!("{}_{}.png", file_stem, counter));
        counter += 1;
    }

    // Save as PNG
    img.save(&dest_path)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    // Return absolute path
    Ok(dest_path
        .to_str()
        .ok_or("Failed to convert path to string")?
        .to_string())
}

/// Delete a pet image file
#[tauri::command]
pub async fn delete_pet_image(
    app_handle: AppHandle,
    file_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    // Security check: ensure the file is in our assets directory
    let local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get local data dir: {}", e))?;
    let assets_base = local_data_dir.join("assets");

    if !path.starts_with(&assets_base) {
        return Err("File path is not in allowed assets directory".to_string());
    }

    fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(())
}

/// List all pet images for a specific state
#[tauri::command]
pub async fn list_pet_images(
    app_handle: AppHandle,
    state: String,
) -> Result<Vec<String>, String> {
    // Validate state
    if state != "idle" && state != "thinking" && state != "sleeping" {
        return Err(format!("Invalid state: {}", state));
    }

    let assets_dir = get_assets_dir(&app_handle, &state)?;

    let mut images = Vec::new();

    if let Ok(entries) = fs::read_dir(&assets_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("png") {
                if let Some(path_str) = path.to_str() {
                    images.push(path_str.to_string());
                }
            }
        }
    }

    // Sort for consistent ordering
    images.sort();

    Ok(images)
}
