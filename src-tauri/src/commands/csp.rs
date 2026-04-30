use std::sync::Mutex;
use tauri::AppHandle;

static CUSTOM_ORIGINS: Mutex<Vec<String>> = Mutex::new(Vec::new());

const DEFAULT_ORIGINS: &[&str] = &[
    "https://api.openai.com",
    "https://api.anthropic.com",
    "https://api.groq.com",
];

pub fn build_connect_src() -> String {
    let mut origins: Vec<String> = DEFAULT_ORIGINS.iter().map(|s| s.to_string()).collect();
    if let Ok(custom) = CUSTOM_ORIGINS.lock() {
        for origin in custom.iter() {
            if !origins.contains(origin) {
                origins.push(origin.clone());
            }
        }
    }
    origins.join(" ")
}

pub fn build_csp() -> String {
    format!(
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src {}",
        build_connect_src()
    )
}

pub fn update_webview_csp(app: &AppHandle) {
    let csp = build_csp();
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!(
            "document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]')?.remove(); \
             const m = document.createElement('meta'); \
             m.httpEquiv = 'Content-Security-Policy'; \
             m.content = '{}'; \
             document.head.prepend(m);",
            csp.replace('\'', "\\'")
        ));
    }
}

#[tauri::command]
pub fn add_csp_origin(origin: String) -> String {
    if let Ok(mut custom) = CUSTOM_ORIGINS.lock() {
        if !custom.contains(&origin) {
            custom.push(origin);
        }
    }
    build_connect_src()
}

#[tauri::command]
pub fn get_csp_origins() -> Vec<String> {
    let mut origins: Vec<String> = DEFAULT_ORIGINS.iter().map(|s| s.to_string()).collect();
    if let Ok(custom) = CUSTOM_ORIGINS.lock() {
        for origin in custom.iter() {
            if !origins.contains(origin) {
                origins.push(origin.clone());
            }
        }
    }
    origins
}

#[tauri::command]
pub fn remove_csp_origin(origin: String) -> String {
    if let Ok(mut custom) = CUSTOM_ORIGINS.lock() {
        custom.retain(|o| o != &origin);
    }
    build_connect_src()
}
