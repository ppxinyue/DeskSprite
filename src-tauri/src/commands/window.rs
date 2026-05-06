use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, AppHandle, Runtime};

pub fn create_pet_window<R: Runtime>(app: &AppHandle<R>) {
    let (w, h) = if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        (size.width as f64, size.height as f64)
    } else {
        (1920.0, 1080.0)
    };

    let _ = WebviewWindowBuilder::new(app, "pet", WebviewUrl::App("index.html".into()))
        .title("DeskSprite Pet")
        .inner_size(w, h)
        .position(0.0, 0.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .build();
}

pub fn show_settings_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("DeskSprite Settings")
        .inner_size(800.0, 600.0)
        .decorations(true)
        .always_on_top(false)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn show_pet_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("pet") {
        let _ = w.show();
        let _ = w.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn hide_pet_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("pet") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn show_settings_cmd(app: AppHandle) -> Result<(), String> {
    show_settings_window(&app)
}

#[tauri::command]
pub fn close_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}
