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

            // C1: Setup system tray
            commands::tray::setup_tray(app.handle())?;

            // C2: Create pet window
            commands::window::create_pet_window(app.handle());

            // C6: Register global shortcut
            #[cfg(desktop)]
            {
                use tauri::Emitter;
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState};
                let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP);
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, _shortcut, event: ShortcutEvent| {
                            if event.state == ShortcutState::Pressed {
                                let _ = commands::window::show_pet_window(app.clone());
                                let _ = app.emit("shortcut:chat-focus", ());
                            }
                        })
                        .build(),
                )?;
                app.global_shortcut().register(shortcut)?;
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::ai::test_ai_connection,
            commands::desktop::get_desktop_bounds,
            commands::csp::add_csp_origin,
            commands::csp::get_csp_origins,
            commands::csp::remove_csp_origin,
            commands::keychain::save_api_key,
            commands::keychain::get_api_key,
            commands::keychain::delete_api_key,
            commands::screenshot::capture_screen_region,
            commands::window::show_pet_window,
            commands::window::hide_pet_window,
            commands::window::show_settings_cmd,
            commands::window::close_settings_window,
            commands::window::exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
