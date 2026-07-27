#![cfg_attr(
  all(
		not(debug_assertions), 
		target_os = "windows"
	),
  windows_subsystem = "windows"
)]

use tauri::{WebviewUrl, WebviewWindowBuilder};

fn main() {
	tauri::Builder::default()
		.setup(|app| {
			
			let css = include_str!(
				"theme/webview.css"
			);
			
			let js = include_str!(
				"theme/webview.js"
			);
			
			let init_script = js.replace(
				"__INJECT_CSS__", 
				css
			);

			WebviewWindowBuilder::new(
				app, 
				"main", 
				WebviewUrl::App("index.html".into())
			)
			.title("Responsive Simulator")
			.inner_size(1024.0, 768.0)
			.initialization_script_for_all_frames(init_script)
			.build()?;
			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}