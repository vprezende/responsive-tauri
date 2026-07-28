#![cfg_attr(
  all(
		not(debug_assertions), 
		target_os = "windows"
	),
  windows_subsystem = "windows"
)]

use tauri::{WebviewUrl, WebviewWindowBuilder, Manager};

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
			.initialization_script_for_all_frames(init_script)
			.build()?;

			app.get_webview_window("main")
				.ok_or("window not found")?
				.set_size(
					tauri::Size::Physical(
						tauri::PhysicalSize::new(1024, 768)
					)
				)?;

			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}