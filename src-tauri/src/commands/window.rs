use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

pub fn create_pet_window<R: Runtime>(app: &AppHandle<R>) {
    let (x, y) = if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor();
        let work = monitor.work_area();
        (
            (work.position.x as f64 + work.size.width as f64 - 260.0 * scale) / scale,
            (work.position.y as f64 + work.size.height as f64 - 260.0 * scale) / scale,
        )
    } else {
        (100.0, 120.0)
    };

    let window = WebviewWindowBuilder::new(app, "pet", WebviewUrl::App("index.html".into()))
        .title("DeskSprite Pet")
        .inner_size(220.0, 220.0)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .accept_first_mouse(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .build();

    if let Ok(w) = window {
        let _ = w.show();
        let _ = w.set_always_on_top(true);
    }
}

#[tauri::command]
pub fn set_cursor_passthrough(app: AppHandle, passthrough: bool) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("pet") {
        w.set_ignore_cursor_events(passthrough)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn show_settings_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("DeskSprite Settings")
        .inner_size(1040.0, 760.0)
        .decorations(true)
        .always_on_top(false)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn show_chat_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("chat") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "chat", WebviewUrl::App("index.html".into()))
        .title("DeskSprite Chat")
        .inner_size(980.0, 720.0)
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
        let _ = w.set_always_on_top(true);
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
