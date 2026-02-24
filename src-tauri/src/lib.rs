mod chezmoi;

use chezmoi::{
    chezmoi_add, chezmoi_apply, chezmoi_cat, chezmoi_data, chezmoi_diff, chezmoi_diff_git,
    chezmoi_diff_git_cached, chezmoi_doctor, chezmoi_file_states, chezmoi_forget, chezmoi_git,
    chezmoi_managed, chezmoi_source_path,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            chezmoi_file_states,
            chezmoi_diff,
            chezmoi_diff_git,
            chezmoi_diff_git_cached,
            chezmoi_apply,
            chezmoi_add,
            chezmoi_forget,
            chezmoi_source_path,
            chezmoi_managed,
            chezmoi_git,
            chezmoi_data,
            chezmoi_doctor,
            chezmoi_cat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
