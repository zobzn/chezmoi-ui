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

## Installation

### macOS — Homebrew (recommended)

chezmoi-ui requires the `chezmoi` CLI to be installed separately:

```bash
brew install chezmoi
brew install --cask zobzn/tap/chezmoi-ui
```

Or tap first:

```bash
brew install chezmoi
brew tap zobzn/tap
brew install --cask chezmoi-ui
```

### Other platforms

Download the latest release for your platform from the [Releases](https://github.com/zobzn/chezmoi-ui/releases) page.

### macOS: bypassing the "unidentified developer" warning

The app is not signed with an Apple Developer certificate, so macOS will block it on first launch. To fix:

**Option 1 — right-click:**
Right-click (or Control+click) the app → **Open** → click **Open** in the dialog.

**Option 2 — terminal:**
```bash
xattr -cr /Applications/chezmoi-ui.app
```

You only need to do this once.

## Requirements

- [chezmoi](https://www.chezmoi.io/install/) installed and on `PATH`
- A chezmoi-managed dotfiles directory initialized (`chezmoi init`)

## Releasing a new version

1. Make sure all changes are merged to `main`.

2. Edit `src-tauri/Cargo.toml` — bump the `version` field:
   ```toml
   version = "0.2.0"
   ```

3. Commit, tag, and push:
   ```bash
   git add src-tauri/Cargo.toml
   git commit -m "chore: bump version to 0.2.0"
   git tag v0.2.0
   git push origin main --tags
   ```

GitHub Actions will build binaries for all platforms and publish a GitHub Release automatically (~20 min).

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
