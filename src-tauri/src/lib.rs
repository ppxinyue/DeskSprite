mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::new().add_migrations(
            "sqlite:desksprite.db",
            vec![tauri_plugin_sql::Migration {
                version: 1,
                description: "create initial tables",
                sql: include_str!("../migrations/0001_initial.sql"),
                kind: tauri_plugin_sql::MigrationKind::Up,
            }],
        ).build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::csp::add_csp_origin,
            commands::csp::get_csp_origins,
            commands::csp::remove_csp_origin,
            commands::keychain::save_api_key,
            commands::keychain::get_api_key,
            commands::keychain::delete_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
