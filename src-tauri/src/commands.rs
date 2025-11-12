use serde_json::Value;
use std::{
  fs,
  io::{Read, Write},
  path::PathBuf,
};
use tauri::State;

#[derive(Clone)]
pub struct AppDirs {
  pub data_dir: PathBuf,
}

fn ensure_dir(p: &PathBuf) -> Result<(), String> {
  fs::create_dir_all(p).map_err(|e| e.to_string())
}

fn join(dirs: &AppDirs, rel: &str) -> PathBuf {
  dirs.data_dir.join(rel)
}

#[tauri::command]
pub fn read_json(dirs: State<AppDirs>, rel_path: String) -> Result<Value, String> {
  let path = join(&dirs, rel_path.as_str());
  ensure_dir(&dirs.data_dir)?;
  if !path.exists() {
    let scaffold = if rel_path.ends_with("tasks.json") {
      serde_json::json!({ "version": 1, "tasks": [] })
    } else if rel_path.ends_with("settings.json") {
      serde_json::json!({
        "version": 1,
        "mode": "rule",
        "hard_limits": { "wip_per_owner": 1, "due_within_hours_priority": 24 },
        "weights": { "priority": 0.45, "urgency": 0.35, "capacity_fit": 0.10, "budget_headroom": 0.10 },
        "penalties": { "blocked": 2.0, "over_budget": 1.0 },
        "focus_mode_on_accept": true,
        "columns": ["Now","Next","Later","Blocked","Done"]
      })
    } else {
      serde_json::json!([])
    };
    return Ok(scaffold);
  }
  let mut buf = String::new();
  fs::File::open(&path)
    .map_err(|e| e.to_string())?
    .read_to_string(&mut buf)
    .map_err(|e| e.to_string())?;
  serde_json::from_str(&buf).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_json_atomic(dirs: State<AppDirs>, rel_path: String, data: Value) -> Result<(), String> {
  let path = join(&dirs, rel_path.as_str());
  let tmp = path.with_extension("tmp");
  let parent = path.parent().ok_or("invalid path")?;
  ensure_dir(&parent.to_path_buf())?;
  let bytes = serde_json::to_vec_pretty(&data).map_err(|e| e.to_string())?;
  {
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
  }
  if path.exists() {
    let bak_dir = join(&dirs, "backups");
    ensure_dir(&bak_dir)?;
    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
      let bak = bak_dir.join(format!("{ts}-{name}"));
      let _ = fs::copy(&path, bak);
    }
  }
  fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_data_dir(dirs: State<AppDirs>) -> Result<(), String> {
  ensure_dir(&dirs.data_dir)?;
  open::that(&dirs.data_dir).map_err(|e| e.to_string())
}
