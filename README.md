# Chezmoi UI

Desktop GUI for [chezmoi](https://www.chezmoi.io/) — a dotfiles manager. Replaces the command line with a visual interface for managing, diffing, and syncing your dotfiles across machines.

Built with Tauri 2 + React + TypeScript.

## Features

**Files view**
- Lists all files managed by chezmoi with their current status
- Shows local changes (modified, new, deleted), git status (staged/unstaged), and sync state (commits ahead/behind remote)
- Filter by: all files, modified only, clean only

**Per-file actions**
- View diff between home directory and chezmoi source
- View git diff for uncommitted changes in the dotfiles repo
- Add / remove files from chezmoi tracking
- Restore file from source (`chezmoi apply`)
- Stage, commit, push, pull

**Diff viewer**
- Side-by-side and unified views via diff2html
- Quick action bar: save, restore, commit, push, pull, untrack

**Doctor view**
- Runs `chezmoi doctor` and shows results in a table
- Status badges: ok, warning, error

## Requirements

- [chezmoi](https://www.chezmoi.io/install/) installed and on `PATH`
- A chezmoi-managed dotfiles directory initialized (`chezmoi init`)

## Development

```bash
pnpm install
pnpm tauri dev
```

Build for production:

```bash
pnpm tauri build
```

## Stack

- **Frontend**: React 19, TypeScript, Vite, diff2html
- **Desktop**: Tauri 2 (Rust backend)
- **Backend**: Rust — wraps chezmoi CLI commands via Tauri IPC
