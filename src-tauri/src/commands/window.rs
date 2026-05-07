use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

#[cfg(target_os = "macos")]
use objc2_app_kit::{NSPopUpMenuWindowLevel, NSWindow, NSWindowCollectionBehavior};
#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "macos")]
use std::sync::Arc;
#[cfg(target_os = "macos")]
use std::time::Duration;

fn centered_percent<R: Runtime>(app: &AppHandle<R>, percent: f64) -> (f64, f64, f64, f64) {
    centered_size_percent(app, percent, percent)
}

fn centered_size_percent<R: Runtime>(
    app: &AppHandle<R>,
    width_percent: f64,
    height_percent: f64,
) -> (f64, f64, f64, f64) {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor();
        let work = monitor.work_area();
        let w = work.size.width as f64 / scale * width_percent;
        let h = work.size.height as f64 / scale * height_percent;
        let x = work.position.x as f64 / scale + (work.size.width as f64 / scale - w) / 2.0;
        let y = work.position.y as f64 / scale + (work.size.height as f64 / scale - h) / 2.0;
        (x, y, w, h)
    } else {
        (160.0, 120.0, 1040.0, 760.0)
    }
}

#[cfg(target_os = "macos")]
fn pin_pet_above_fullscreen<R: Runtime>(window: &tauri::WebviewWindow<R>) {
    let Ok(raw_window) = window.ns_window() else {
        return;
    };
    if raw_window.is_null() {
        return;
    }

    // NSScreenSaverWindowLevel (1000) - above fullscreen apps and screen savers
    const NSSCREENSAVER_WINDOW_LEVEL: isize = 1000;

    unsafe {
        let ns_window = &*(raw_window.cast::<NSWindow>());
        let behavior = ns_window.collectionBehavior()
            | NSWindowCollectionBehavior::CanJoinAllSpaces      // Join all Spaces
            | NSWindowCollectionBehavior::Stationary           // Don't auto-move
            | NSWindowCollectionBehavior::FullScreenAuxiliary   // Join fullscreen Spaces
            | NSWindowCollectionBehavior::IgnoresCycle;         // Skip Cmd+Tab cycling
        ns_window.setCollectionBehavior(behavior);
        ns_window.setLevel(NSSCREENSAVER_WINDOW_LEVEL);
        ns_window.setHidesOnDeactivate(false);  // Stay visible when switching apps
        let _: () = msg_send![ns_window, orderFrontRegardless];  // Force to front
    }
}

#[cfg(target_os = "macos")]
use objc2::msg_send;

#[cfg(not(target_os = "macos"))]
fn pin_pet_above_fullscreen<R: Runtime>(_window: &tauri::WebviewWindow<R>) {}

#[cfg(target_os = "macos")]
fn unpin_pet_from_fullscreen<R: Runtime>(window: &tauri::WebviewWindow<R>) {
    let Ok(raw_window) = window.ns_window() else {
        return;
    };
    if raw_window.is_null() {
        return;
    }

    unsafe {
        let ns_window = &*(raw_window.cast::<NSWindow>());
        // Reset to normal window level (0)
        ns_window.setLevel(0);
        // Reset collection behavior to default
        let behavior = ns_window.collectionBehavior()
            & !NSWindowCollectionBehavior::CanJoinAllSpaces
            & !NSWindowCollectionBehavior::FullScreenAuxiliary
            & !NSWindowCollectionBehavior::Stationary
            & !NSWindowCollectionBehavior::IgnoresCycle;
        ns_window.setCollectionBehavior(behavior);
    }
}

#[cfg(not(target_os = "macos"))]
fn unpin_pet_from_fullscreen<R: Runtime>(_window: &tauri::WebviewWindow<R>) {}

#[cfg(not(target_os = "macos"))]
fn pin_pet_above_fullscreen<R: Runtime>(_window: &tauri::WebviewWindow<R>) {}

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
        .shadow(false)
        .accept_first_mouse(true)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .skip_taskbar(true)
        .resizable(false)
        .build();

    if let Ok(w) = window {
        let _ = w.show();
        let _ = w.set_always_on_top(true);
        let _ = w.set_visible_on_all_workspaces(true);
        pin_pet_above_fullscreen(&w);
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
    let (x, y, w, h) = centered_size_percent(app, 0.62, 0.7);
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_size(LogicalSize::new(w, h));
        let _ = window.set_position(LogicalPosition::new(x, y));
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("")
        .inner_size(w, h)
        .position(x, y)
        .decorations(true)
        .always_on_top(false)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn show_chat_window(app: AppHandle) -> Result<(), String> {
    let (x, y, w, h) = centered_percent(&app, 0.8);
    if let Some(window) = app.get_webview_window("chat") {
        let _ = window.set_size(LogicalSize::new(w, h));
        let _ = window.set_position(LogicalPosition::new(x, y));
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "chat", WebviewUrl::App("index.html".into()))
        .title("")
        .inner_size(w, h)
        .position(x, y)
        .decorations(true)
        .always_on_top(false)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn show_compact_chat_window(
    app: AppHandle,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("compact-chat") {
        let _ = window.set_size(LogicalSize::new(w, h));
        let _ = window.set_position(LogicalPosition::new(x, y));
        let _ = window.show();
        let _ = window.set_always_on_top(true);
        let _ = window.set_visible_on_all_workspaces(true);
        pin_pet_above_fullscreen(&window);
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(&app, "compact-chat", WebviewUrl::App("index.html".into()))
        .title("")
        .inner_size(w, h)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .accept_first_mouse(true)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .skip_taskbar(true)
        .resizable(false)
        .build()
        .map_err(|e| e.to_string())?;
    let _ = window.set_always_on_top(true);
    let _ = window.set_visible_on_all_workspaces(true);
    pin_pet_above_fullscreen(&window);

    Ok(())
}

#[tauri::command]
pub fn position_compact_chat_window(
    app: AppHandle,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("compact-chat") {
        let _ = window.set_size(LogicalSize::new(w, h));
        let _ = window.set_position(LogicalPosition::new(x, y));
    }
    Ok(())
}

#[tauri::command]
pub fn hide_compact_chat_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("compact-chat") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn focus_compact_chat_input(app: AppHandle) -> Result<(), String> {
    app.emit_to("compact-chat", "focus-input", ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_pet_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("pet") {
        let _ = w.show();
        let _ = w.set_always_on_top(true);
        let _ = w.set_visible_on_all_workspaces(true);
        pin_pet_above_fullscreen(&w);
        let _ = w.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn hide_pet_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("pet") {
        unpin_pet_from_fullscreen(&w);
        let _ = w.hide();
    }
    if let Some(w) = app.get_webview_window("compact-chat") {
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

// Global flag to control the topmost guard thread
#[cfg(target_os = "macos")]
static TOPMOST_GUARD_RUNNING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn pin_pet_above_fullscreen_cmd(window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(w) = window.get_webview_window("pet") {
            pin_pet_above_fullscreen(&w);
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;  // Suppress unused warning
    }
    Ok(())
}

#[tauri::command]
pub fn unpin_pet_from_fullscreen_cmd(window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(w) = window.get_webview_window("pet") {
            unpin_pet_from_fullscreen(&w);
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;  // Suppress unused warning
    }
    Ok(())
}

#[tauri::command]
pub fn start_topmost_guard(window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::thread;

        if TOPMOST_GUARD_RUNNING.load(Ordering::SeqCst) {
            return Ok(());  // Already running
        }

        TOPMOST_GUARD_RUNNING.store(true, Ordering::SeqCst);

        // Clone the app_handle before moving into the thread
        let app_handle = window.app_handle().clone();
        thread::spawn(move || {
            loop {
                // Sleep for 2 seconds
                thread::sleep(Duration::from_millis(2000));

                // Check if we should stop
                if !TOPMOST_GUARD_RUNNING.load(Ordering::SeqCst) {
                    break;
                }

                // Re-assert window level if pet window is visible
                if let Some(w) = app_handle.get_webview_window("pet") {
                    if w.is_visible().unwrap_or(false) {
                        if let Ok(raw_window) = w.ns_window() {
                            if !raw_window.is_null() {
                                unsafe {
                                    let ns_window = &*(raw_window.cast::<NSWindow>());
                                    // Just call orderFrontRegardless to keep it on top
                                    let _: () = msg_send![ns_window, orderFrontRegardless];
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;  // Suppress unused warning
        // TODO: Implement for Windows/Linux
    }
    Ok(())
}

#[tauri::command]
pub fn stop_topmost_guard() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        TOPMOST_GUARD_RUNNING.store(false, Ordering::SeqCst);
    }
    #[cfg(not(target_os = "macos"))]
    {
        // TODO: Implement for Windows/Linux
    }
    Ok(())
}
