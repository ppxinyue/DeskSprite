use base64::{Engine, engine::general_purpose::STANDARD};

#[tauri::command]
pub async fn capture_screen_region(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        capture_macos(x, y, width, height)
    }

    #[cfg(target_os = "windows")]
    {
        capture_windows(x, y, width, height)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (x, y, width, height);
        Err("Unsupported platform".to_string())
    }
}

#[cfg(target_os = "macos")]
fn capture_macos(x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    use xcap::Monitor;
    use image::{ImageFormat, GenericImageView};

    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitor found")?;

    let full_image = monitor.capture_image().map_err(|e| e.to_string())?;

    let img_x = x.min(full_image.width().saturating_sub(1));
    let img_y = y.min(full_image.height().saturating_sub(1));
    let img_w = width.min(full_image.width() - img_x);
    let img_h = height.min(full_image.height() - img_y);

    let sub_image = full_image.view(img_x, img_y, img_w, img_h);
    let cropped = sub_image.to_image();

    let mut buf = Vec::new();
    cropped
        .write_to(&mut std::io::Cursor::new(&mut buf), ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(STANDARD.encode(&buf))
}

#[cfg(target_os = "windows")]
fn capture_windows(x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    use screenshots::Screen;

    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.first().ok_or("No screen found")?;

    let image = screen
        .capture_area(x as i32, y as i32, width, height)
        .map_err(|e| e.to_string())?;

    let mut buf = Vec::new();
    image
        .write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(STANDARD.encode(&buf))
}
