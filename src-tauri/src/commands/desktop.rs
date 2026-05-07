use serde::Serialize;

#[derive(Serialize)]
pub struct DesktopBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub dock_visible: bool,
    pub dock_rect: Option<DockRect>,
    pub fullscreen_active: bool,
}

#[derive(Serialize)]
pub struct DockRect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_desktop_bounds() -> DesktopBounds {
    #[cfg(target_os = "macos")]
    {
        get_desktop_bounds_macos()
    }

    #[cfg(target_os = "windows")]
    {
        get_desktop_bounds_windows()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        DesktopBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            dock_visible: false,
            dock_rect: None,
            fullscreen_active: false,
        }
    }
}

#[tauri::command]
pub fn can_start_speech_recognition() -> bool {
    #[cfg(not(target_os = "macos"))]
    {
        true
    }

    #[cfg(target_os = "macos")]
    {
        let Ok(exe) = std::env::current_exe() else {
            return false;
        };
        let Some(app_dir) = exe
            .ancestors()
            .find(|path| path.extension().and_then(|ext| ext.to_str()) == Some("app"))
        else {
            return false;
        };
        let plist_path = app_dir.join("Contents").join("Info.plist");
        let Ok(contents) = std::fs::read(plist_path) else {
            return false;
        };

        contains_bytes(&contents, b"NSMicrophoneUsageDescription")
            && contains_bytes(&contents, b"NSSpeechRecognitionUsageDescription")
    }
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http(s) URLs can be opened".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
        return Ok(());
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
    haystack
        .windows(needle.len())
        .any(|window| window == needle)
}

#[cfg(target_os = "macos")]
fn get_desktop_bounds_macos() -> DesktopBounds {
    use xcap::Monitor;

    let monitors = Monitor::all().unwrap_or_default();
    let monitor = monitors.first();
    let menu_height: u32 = 25;

    let (w, h) = match monitor {
        Some(m) => (m.width().unwrap_or(1920), m.height().unwrap_or(1080)),
        None => (1920, 1080),
    };

    let dock_visible = is_macos_dock_visible();
    let dock_height: u32 = if dock_visible { 70 } else { 0 };

    let dock_rect = if dock_visible {
        Some(DockRect {
            x: 0,
            y: (h as i32) - (dock_height as i32),
            width: w,
            height: dock_height,
        })
    } else {
        None
    };

    DesktopBounds {
        x: 0,
        y: menu_height as i32,
        width: w,
        height: h.saturating_sub(menu_height).saturating_sub(dock_height),
        dock_visible,
        dock_rect,
        fullscreen_active: false,
    }
}

#[cfg(target_os = "macos")]
fn is_macos_dock_visible() -> bool {
    use std::process::Command;
    let output = Command::new("defaults")
        .args(["read", "com.apple.dock", "autohide"])
        .output();
    match output {
        Ok(out) => {
            let s = String::from_utf8_lossy(&out.stdout);
            !s.trim().starts_with("1")
        }
        Err(_) => true,
    }
}

#[cfg(target_os = "windows")]
fn get_desktop_bounds_windows() -> DesktopBounds {
    // Use xcap for Windows as well
    use xcap::Monitor;

    let monitors = Monitor::all().unwrap_or_default();
    let monitor = monitors.first();

    let (w, h) = match monitor {
        Some(m) => (m.width().unwrap_or(1920), m.height().unwrap_or(1080)),
        None => (1920, 1080),
    };

    DesktopBounds {
        x: 0,
        y: 0,
        width: w,
        height: h,
        dock_visible: true,
        dock_rect: Some(DockRect {
            x: 0,
            y: (h as i32) - 40,
            width: w,
            height: 40,
        }),
        fullscreen_active: false,
    }
}
