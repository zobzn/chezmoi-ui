use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

/// Full state of one managed file
#[derive(Debug, Serialize, Deserialize)]
pub struct FileState {
    /// Path relative to home, e.g. ".bashrc"
    pub path: String,
    /// chezmoi status: " " | "A" | "D" | "M" | "R"
    /// ' ' means no diff between ~ and source dir
    pub local_change: String,
    /// git status of the source file: " " | "?" | "M" | "A" | "D"
    /// '?' = untracked, 'M' = modified unstaged, 'A' = staged, ' ' = clean
    pub git_index: String, // staged (index)
    pub git_worktree: String, // unstaged (worktree)
    /// commits ahead of remote (not pushed)
    pub commits_ahead: u32,
    /// commits behind remote (not pulled)
    pub commits_behind: u32,
}

fn run_chezmoi(args: &[&str]) -> Result<CommandOutput, String> {
    let output = Command::new("chezmoi")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run chezmoi: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

fn run_chezmoi_git(args: &[&str]) -> Result<CommandOutput, String> {
    let mut full = vec!["git", "--"];
    full.extend_from_slice(args);
    run_chezmoi(&full)
}

/// Get source directory path
fn source_dir() -> Result<String, String> {
    let out = run_chezmoi(&["source-path"])?;
    Ok(out.stdout.trim().to_string())
}

#[tauri::command]
pub fn chezmoi_file_states() -> Result<Vec<FileState>, String> {
    // 1. chezmoi managed — all tracked paths (relative to ~)
    let managed_out = run_chezmoi(&["managed", "--include=files"])?;
    let managed: Vec<String> = managed_out
        .stdout
        .lines()
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect();

    if managed.is_empty() {
        return Ok(vec![]);
    }

    // 2. chezmoi status — local changes (~ vs source dir)
    let status_out = run_chezmoi(&["status"])?;
    // map: path -> (source_state, target_state)
    let mut local_changes: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for line in status_out.stdout.lines().filter(|l| !l.is_empty()) {
        let chars: Vec<char> = line.chars().collect();
        if chars.len() >= 3 {
            let source_state = chars[0].to_string();
            let path = line[3..].to_string();
            local_changes.insert(path, source_state);
        }
    }

    // 3. git status --porcelain in source dir
    let git_status_out = run_chezmoi_git(&["status", "--porcelain"])?;
    // map: source_filename -> (index_char, worktree_char)
    let mut git_states: std::collections::HashMap<String, (String, String)> =
        std::collections::HashMap::new();
    for line in git_status_out.stdout.lines().filter(|l| !l.is_empty()) {
        let chars: Vec<char> = line.chars().collect();
        if chars.len() >= 3 {
            let index = chars[0].to_string();
            let worktree = chars[1].to_string();
            let filename = line[3..].to_string();
            // filename is the source name (e.g. "dot_bashrc"), extract base
            let base = filename.rsplit('/').next().unwrap_or(&filename).to_string();
            git_states.insert(base, (index.clone(), worktree.clone()));
            // also store full path key
            git_states.insert(filename.clone(), (index, worktree));
        }
    }

    // 4. git rev-list ahead/behind
    let (commits_ahead, commits_behind) = {
        let rev_out =
            run_chezmoi_git(&["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]);
        match rev_out {
            Ok(o) if o.success => {
                let parts: Vec<&str> = o.stdout.split_whitespace().collect();
                let ahead = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0u32);
                let behind = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0u32);
                (ahead, behind)
            }
            _ => (0u32, 0u32),
        }
    };

    // 5. Get source dir to map ~ paths to source filenames
    let src_dir = source_dir().unwrap_or_default();

    // Build result
    let states: Vec<FileState> = managed
        .into_iter()
        .map(|path| {
            let local_change = local_changes
                .get(&path)
                .cloned()
                .unwrap_or_else(|| " ".to_string());

            // Try to find git state by converting ~ path to source filename
            // chezmoi managed returns paths like ".bashrc", ".config/nvim/init.lua"
            // source files are like "dot_bashrc", ".chezmoiignore", etc.
            // We try a few heuristics
            let source_name = path_to_source_name(&path);
            let (git_index, git_worktree) = git_states
                .get(&source_name)
                .or_else(|| {
                    // try basename only
                    let base = source_name.rsplit('/').next().unwrap_or(&source_name);
                    git_states.get(base)
                })
                .cloned()
                .unwrap_or_else(|| (" ".to_string(), " ".to_string()));

            let _ = src_dir.as_str(); // used for future extension

            FileState {
                path,
                local_change,
                git_index,
                git_worktree,
                commits_ahead,
                commits_behind,
            }
        })
        .collect();

    Ok(states)
}

/// Expand a relative path (e.g. ".bashrc") to an absolute ~/path for chezmoi commands.
/// If already absolute, return as-is.
fn expand_home(path: &str) -> String {
    if path.starts_with('/') || path.starts_with("~/") {
        return path.to_string();
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| "~".to_string());
    format!("{}/{}", home, path)
}

/// Heuristic: convert target path (relative to ~) to likely source filename
/// e.g. ".bashrc" -> "dot_bashrc", ".config/nvim/init.lua" -> "dot_config/nvim/init.lua"
fn path_to_source_name(path: &str) -> String {
    let parts: Vec<&str> = path.splitn(2, '/').collect();
    let first = parts[0];
    let converted = if let Some(stripped) = first.strip_prefix('.') {
        format!("dot_{}", stripped)
    } else {
        first.to_string()
    };
    if parts.len() > 1 {
        format!("{}/{}", converted, parts[1])
    } else {
        converted
    }
}

#[tauri::command]
pub fn chezmoi_diff(path: Option<String>) -> Result<CommandOutput, String> {
    let mut args = vec!["diff"];
    let path_owned;
    if let Some(ref p) = path {
        path_owned = expand_home(p);
        args.push(&path_owned);
    }
    run_chezmoi(&args)
}

#[tauri::command]
pub fn chezmoi_diff_git(source_path: String) -> Result<CommandOutput, String> {
    run_chezmoi_git(&["diff", &source_path])
}

#[tauri::command]
pub fn chezmoi_apply(path: Option<String>) -> Result<CommandOutput, String> {
    let mut args = vec!["apply", "--force"];
    let path_owned;
    if let Some(ref p) = path {
        path_owned = expand_home(p);
        args.push(&path_owned);
    }
    run_chezmoi(&args)
}

#[tauri::command]
pub fn chezmoi_add(path: String) -> Result<CommandOutput, String> {
    run_chezmoi(&["add", &expand_home(&path)])
}

#[tauri::command]
pub fn chezmoi_forget(path: String) -> Result<CommandOutput, String> {
    run_chezmoi(&["forget", "--force", &expand_home(&path)])
}

#[tauri::command]
pub fn chezmoi_source_path(path: Option<String>) -> Result<CommandOutput, String> {
    let mut args = vec!["source-path"];
    let path_owned;
    if let Some(ref p) = path {
        path_owned = expand_home(p);
        args.push(&path_owned);
    }
    run_chezmoi(&args)
}

#[tauri::command]
pub fn chezmoi_managed() -> Result<CommandOutput, String> {
    run_chezmoi(&["managed"])
}

#[tauri::command]
pub fn chezmoi_git(args: Vec<String>) -> Result<CommandOutput, String> {
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_chezmoi_git(&args_refs)
}

#[tauri::command]
pub fn chezmoi_data() -> Result<CommandOutput, String> {
    run_chezmoi(&["data", "--format=json"])
}

#[tauri::command]
pub fn chezmoi_doctor() -> Result<CommandOutput, String> {
    run_chezmoi(&["doctor"])
}

#[tauri::command]
pub fn chezmoi_cat(path: String) -> Result<CommandOutput, String> {
    run_chezmoi(&["cat", &expand_home(&path)])
}
