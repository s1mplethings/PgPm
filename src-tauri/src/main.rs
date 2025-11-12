#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{open_data_dir, read_json, write_json_atomic, AppDirs};
use std::path::PathBuf;
use tauri::Manager;

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
  app.path()
    .app_data_dir()
    .unwrap_or(std::env::current_dir().unwrap())
    .join("pm-app")
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let data_dir = app_data_dir(app.handle());
      app.manage(AppDirs { data_dir });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![read_json, write_json_atomic, open_data_dir])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
