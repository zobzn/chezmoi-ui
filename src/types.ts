export interface FileState {
  path: string;
  /** chezmoi status: ' ' | 'A' | 'D' | 'M' | 'R' */
  local_change: string;
  /** git index (staged): ' ' | 'A' | 'M' | 'D' | '?' */
  git_index: string;
  /** git worktree (unstaged): ' ' | 'M' | 'D' | '?' */
  git_worktree: string;
  commits_ahead: number;
  commits_behind: number;
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
  success: boolean;
}

export type Tab = "status" | "doctor";
