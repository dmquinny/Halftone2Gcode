// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

// Global file handle for streaming G-code
struct GcodeFile {
    file: Mutex<Option<File>>,
    path: Mutex<Option<PathBuf>>,
}

#[tauri::command]
fn start_gcode_stream(file_path: String, state: State<GcodeFile>) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    // Create or truncate the file
    let file = File::create(&path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    *state.file.lock().unwrap() = Some(file);
    *state.path.lock().unwrap() = Some(path);

    Ok(())
}

#[tauri::command]
fn write_gcode_chunk(chunk: String, state: State<GcodeFile>) -> Result<(), String> {
    let mut file_guard = state.file.lock().unwrap();

    if let Some(file) = file_guard.as_mut() {
        file.write_all(chunk.as_bytes())
            .map_err(|e| format!("Failed to write chunk: {}", e))?;
        Ok(())
    } else {
        Err("No file stream opened".to_string())
    }
}

#[tauri::command]
fn finish_gcode_stream(state: State<GcodeFile>) -> Result<String, String> {
    let mut file_guard = state.file.lock().unwrap();
    let mut path_guard = state.path.lock().unwrap();

    if let Some(mut file) = file_guard.take() {
        file.flush()
            .map_err(|e| format!("Failed to flush file: {}", e))?;

        let path = path_guard.take().unwrap();
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("No file stream opened".to_string())
    }
}

#[tauri::command]
fn read_gcode_file(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn read_gcode_lines(file_path: String, start_line: usize, line_count: usize) -> Result<String, String> {
    use std::io::{BufRead, BufReader};

    let file = std::fs::File::open(&file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let reader = BufReader::new(file);
    let lines: Vec<String> = reader
        .lines()
        .skip(start_line)
        .take(line_count)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read lines: {}", e))?;

    Ok(lines.join("\n"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(GcodeFile {
            file: Mutex::new(None),
            path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_gcode_stream,
            write_gcode_chunk,
            finish_gcode_stream,
            read_gcode_file,
            read_gcode_lines
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
