// 墨笔 - Markdown Editor
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, RunEvent};

// 用于存储启动时打开的文件路径
struct AppState {
    opened_file: Arc<Mutex<Option<String>>>,
}

// 前端准备好后调用此命令获取打开的文件
#[tauri::command]
fn get_opened_file(state: tauri::State<AppState>) -> Option<String> {
    let mut file = state.opened_file.lock().unwrap();
    file.take() // 获取并清空
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        opened_file: Arc::new(Mutex::new(None)),
    };
    let opened_file = app_state.opened_file.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![get_opened_file])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app_handle, event| {
            match event {
                RunEvent::Opened { urls } => {
                    // macOS "打开方式" 触发此事件
                    for url in urls {
                        let url_str = url.to_string();
                        // 处理 file:// URL
                        if url_str.starts_with("file://") {
                            // 解码 URL 并移除 file:// 前缀
                            let file_path = url_str[7..].to_string();
                            // URL 解码
                            let file_path = urlencoding::decode(&file_path)
                                .map(|s| s.to_string())
                                .unwrap_or(file_path);

                            if file_path.ends_with(".md")
                                || file_path.ends_with(".markdown")
                                || file_path.ends_with(".txt")
                            {
                                // 存储到状态中
                                let mut state = opened_file.lock().unwrap();
                                *state = Some(file_path.clone());

                                // 如果窗口已经准备好，直接发送事件
                                if let Some(window) = app_handle.get_webview_window("main") {
                                    let _ = window.emit("open-file", file_path);
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        });
}
