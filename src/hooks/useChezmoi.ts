import { invoke } from "@tauri-apps/api/core";
import { FileState, CommandOutput } from "../types";

export function useChezmoi() {
  const fileStates = () => invoke<FileState[]>("chezmoi_file_states");
  const diff = (path?: string) => invoke<CommandOutput>("chezmoi_diff", { path });
  const diffGit = (sourcePath: string) => invoke<CommandOutput>("chezmoi_diff_git", { sourcePath });
  const diffGitCached = (sourcePath: string) => invoke<CommandOutput>("chezmoi_diff_git_cached", { sourcePath });
  const apply = (path?: string) => invoke<CommandOutput>("chezmoi_apply", { path });
  const add = (path: string) => invoke<CommandOutput>("chezmoi_add", { path });
  const forget = (path: string) => invoke<CommandOutput>("chezmoi_forget", { path });
  const managed = () => invoke<CommandOutput>("chezmoi_managed");
  const git = (args: string[]) => invoke<CommandOutput>("chezmoi_git", { args });
  const data = () => invoke<CommandOutput>("chezmoi_data");
  const doctor = () => invoke<CommandOutput>("chezmoi_doctor");
  const sourcePath = (path?: string) => invoke<CommandOutput>("chezmoi_source_path", { path });
  const cat = (path: string) => invoke<CommandOutput>("chezmoi_cat", { path });

  return { fileStates, diff, diffGit, diffGitCached, apply, add, forget, managed, git, data, doctor, sourcePath, cat };
}
