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

    let mut reader = BufReader::with_capacity(8192, file);
    let mut result = Vec::with_capacity(line_count);
    let mut current_line = 0;

    // Skip lines more efficiently by not allocating strings for skipped lines
    let mut buffer = String::new();
    while current_line < start_line {
        buffer.clear();
        match reader.read_line(&mut buffer) {
            Ok(0) => return Ok(String::new()), // EOF before reaching start_line
            Ok(_) => current_line += 1,
            Err(e) => return Err(format!("Failed to skip line: {}", e)),
        }
    }

    // Now read the lines we actually want
    for _ in 0..line_count {
        buffer.clear();
        match reader.read_line(&mut buffer) {
            Ok(0) => break, // EOF
            Ok(_) => {
                // Remove trailing newline if present
                if buffer.ends_with('\n') {
                    buffer.pop();
                    if buffer.ends_with('\r') {
                        buffer.pop();
                    }
                }
                result.push(buffer.clone());
            }
            Err(e) => return Err(format!("Failed to read line: {}", e)),
        }
    }

    Ok(result.join("\n"))
}

#[tauri::command]
fn open_file_in_editor(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        std::process::Command::new("cmd")
            .args(["/C", "start", "", &file_path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
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
            read_gcode_lines,
            open_file_in_editor
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
