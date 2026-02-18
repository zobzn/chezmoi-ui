import { useState, useEffect, useRef, useCallback } from "react";
import { useChezmoi } from "../hooks/useChezmoi";
import { FileState } from "../types";
import { html as diff2html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

// ── tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const TOOLTIP_WIDTH = 220;
  const GAP = 6;
  const MARGIN = 8; // min distance from window edge

  const reposition = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const winW = window.innerWidth;

    // center above the anchor
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    // clamp so it doesn't go off-screen
    if (left < MARGIN) left = MARGIN;
    if (left + TOOLTIP_WIDTH > winW - MARGIN) left = winW - TOOLTIP_WIDTH - MARGIN;

    const top = rect.top - GAP; // tooltip bottom sits here (we use bottom via transform)

    setStyle({
      position: "fixed",
      width: TOOLTIP_WIDTH,
      left,
      bottom: window.innerHeight - top,
      transform: "none",
    });
  }, []);

  const show = () => {
    timer.current = setTimeout(() => {
      reposition();
      setVisible(true);
    }, 400);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  return (
    <span ref={wrapRef} className="tooltip-wrap" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && <span ref={tooltipRef} className="tooltip" style={style}>{text}</span>}
    </span>
  );
}

// ── badge helpers ────────────────────────────────────────────────────────────

function LocalBadge({ ch }: { ch: string }) {
  if (ch === " ") return null;
  const label = ch === "A" ? "new" : ch === "D" ? "deleted" : ch === "M" ? "modified" : ch === "R" ? "renamed" : ch;
  return <span className="badge badge-local">● {label}</span>;
}

function GitBadge({ index, worktree }: { index: string; worktree: string }) {
  const badges: React.ReactNode[] = [];
  if (index !== " ") {
    const label = index === "A" ? "staged:new" : index === "M" ? "staged:mod" : index === "D" ? "staged:del" : `staged:${index}`;
    badges.push(<span key="idx" className="badge badge-staged">~ {label}</span>);
  }
  if (worktree !== " " && worktree !== "?") {
    const label = worktree === "M" ? "unstaged" : worktree === "D" ? "unstaged:del" : `unstaged:${worktree}`;
    badges.push(<span key="wt" className="badge badge-unstaged">~ {label}</span>);
  }
  return <>{badges}</>;
}

function SyncBadges({ ahead, behind }: { ahead: number; behind: number }) {
  return <>
    {ahead > 0 && <span className="badge badge-ahead">↑ {ahead} ahead</span>}
    {behind > 0 && <span className="badge badge-behind">↓ {behind} behind</span>}
  </>;
}

function isClean(f: FileState) {
  return (
    f.local_change === " " &&
    f.git_index === " " &&
    f.git_worktree === " " &&
    f.commits_ahead === 0 &&
    f.commits_behind === 0
  );
}

// ── diff viewer ──────────────────────────────────────────────────────────────

type DiffAction = { label: string; className: string; onClick: () => void };

function DiffViewer({
  title,
  content,
  actions,
  onClose,
}: {
  title: string;
  content: string;
  actions: DiffAction[];
  onClose: () => void;
}) {
  const [side, setSide] = useState(true);

  const htmlContent = diff2html(content, {
    drawFileList: false,
    matching: "none",
    outputFormat: side ? "side-by-side" : "line-by-line",
  });

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <button className="btn-ghost" onClick={onClose}>← Back</button>
        <span className="diff-title dim">{title}</span>
        <div className="diff-mode-toggle">
          <button className={`btn-sm ${side ? "btn-sm-active" : ""}`} onClick={() => setSide(true)}>side by side</button>
          <button className={`btn-sm ${!side ? "btn-sm-active" : ""}`} onClick={() => setSide(false)}>unified</button>
        </div>
        <div className="diff-actions">
          {actions.map((a) => (
            <button key={a.label} className={a.className} onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      </div>
      <div
        className="diff-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

// ── commit dialog ─────────────────────────────────────────────────────────────

function CommitDialog({
  onCommit,
  onCancel,
}: {
  onCommit: (msg: string) => void;
  onCancel: () => void;
}) {
  const [msg, setMsg] = useState("");
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-title">Commit message</div>
        <input
          className="input"
          autoFocus
          placeholder="update dotfiles"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && msg.trim()) onCommit(msg.trim());
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!msg.trim()}
            onClick={() => onCommit(msg.trim())}
          >
            Commit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── file row ──────────────────────────────────────────────────────────────────

function FileRow({
  file,
  onDiffLocal,
  onDiffGit,
}: {
  file: FileState;
  onDiffLocal: () => void;
  onDiffGit: () => void;
}) {
  const hasLocal = file.local_change !== " ";
  const hasUnstaged = file.git_worktree !== " " && file.git_worktree !== "?";
  const clean = isClean(file);

  return (
    <div className={`file-row ${clean ? "file-row-clean" : ""}`}>
      <span className="file-path">{file.path}</span>

      <div className="file-badges">
        <LocalBadge ch={file.local_change} />
        <GitBadge index={file.git_index} worktree={file.git_worktree} />
        <SyncBadges ahead={file.commits_ahead} behind={file.commits_behind} />
      </div>

      <div className="row-actions">
        {hasLocal && (
          <Tooltip text={`What changed in ~/${file.path}`}>
            <button className="btn-sm" onClick={onDiffLocal}>changes</button>
          </Tooltip>
        )}
        {hasUnstaged && (
          <Tooltip text={`Uncommitted changes to ~/${file.path} in dotfiles repo`}>
            <button className="btn-sm" onClick={onDiffGit}>git changes</button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ── main view ─────────────────────────────────────────────────────────────────

type DiffMode =
  | { kind: "local"; path: string }
  | { kind: "git"; sourceName: string; path: string };

export function StatusView() {
  const { fileStates, diff, diffGit, apply, add, forget, git, sourcePath } = useChezmoi();
  const [files, setFiles] = useState<FileState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const [diffMode, setDiffMode] = useState<DiffMode | null>(null);
  const [diffContent, setDiffContent] = useState<string>("");

  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [filter, setFilter] = useState<"all" | "modified" | "clean">("modified");
  const [addPath, setAddPath] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setFiles(await fileStates());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const notify = (text: string, ok = true) => setNotice({ text, ok });

  const handleDiffLocal = async (path: string) => {
    const out = await diff(path);
    setDiffContent(out.stdout || out.stderr || "(no diff)");
    setDiffMode({ kind: "local", path });
  };

  const handleDiffGit = async (path: string) => {
    const srcOut = await sourcePath(path);
    const src = srcOut.stdout.trim();
    const out = await diffGit(src);
    setDiffContent(out.stdout || out.stderr || "(no diff)");
    setDiffMode({ kind: "git", sourceName: src, path });
  };

  const handleAdd = async (path: string) => {
    const out = await add(path);
    notify(out.success ? `Added ${path}` : out.stderr, out.success);
    load();
  };

  const handleApply = async (path?: string) => {
    const out = await apply(path);
    notify(out.success ? "Applied" : out.stderr, out.success);
    setDiffMode(null);
    load();
  };

  const handleStage = async (path: string) => {
    const srcOut = await sourcePath(path);
    const src = srcOut.stdout.trim();
    const out = await git(["add", src]);
    notify(out.success ? `Staged ${path}` : out.stderr, out.success);
    load();
  };

  const handleCommit = async (msg: string) => {
    setShowCommitDialog(false);
    const out = await git(["commit", "-m", msg]);
    notify(out.success ? "Committed" : out.stderr, out.success);
    load();
  };

  const handlePush = async () => {
    const out = await git(["push"]);
    notify(out.success ? "Pushed" : out.stderr, out.success);
    load();
  };

  const handlePull = async () => {
    const out = await git(["pull"]);
    notify(out.success ? "Pulled" : out.stderr, out.success);
    load();
  };

  const handleAddNew = async () => {
    const p = addPath.trim();
    if (!p) return;
    const out = await add(p);
    notify(out.success ? `Added ${p}` : out.stderr, out.success);
    setAddPath("");
    load();
  };

  const handleForget = async (path: string) => {
    const out = await forget(path);
    notify(out.success ? `Removed ${path} from chezmoi` : out.stderr, out.success);
    load();
  };

  if (diffMode) {
    const file = files.find((f) => f.path === diffMode.path);
    const actions: DiffAction[] = [];

    if (diffMode.kind === "local") {
      actions.push({
        label: "save",
        className: "btn-secondary btn-green",
        onClick: () => handleAdd(diffMode.path),
      });
      actions.push({
        label: "restore",
        className: "btn-secondary btn-orange",
        onClick: () => handleApply(diffMode.path),
      });
    }

    if (diffMode.kind === "git") {
      if (file && file.git_worktree !== " " && file.git_worktree !== "?") {
        actions.push({
          label: "mark",
          className: "btn-secondary btn-blue",
          onClick: () => handleStage(diffMode.path),
        });
      }
    }

    if (file && file.git_index !== " ") {
      actions.push({
        label: "commit",
        className: "btn-secondary btn-blue",
        onClick: () => setShowCommitDialog(true),
      });
    }

    if (file && file.commits_ahead > 0) {
      actions.push({
        label: "sync →",
        className: "btn-secondary btn-blue",
        onClick: handlePush,
      });
    }

    if (file && file.commits_behind > 0) {
      actions.push({
        label: "← sync",
        className: "btn-secondary btn-orange",
        onClick: handlePull,
      });
    }

    if (file && isClean(file)) {
      actions.push({
        label: "untrack",
        className: "btn-secondary btn-danger",
        onClick: () => handleForget(diffMode.path),
      });
    }

    return (
      <>
        <DiffViewer
          title={diffMode.path}
          content={diffContent}
          actions={actions}
          onClose={() => setDiffMode(null)}
        />
        {showCommitDialog && (
          <CommitDialog
            onCommit={handleCommit}
            onCancel={() => setShowCommitDialog(false)}
          />
        )}
      </>
    );
  }

  const anyAhead = files.some((f) => f.commits_ahead > 0);
  const anyBehind = files.some((f) => f.commits_behind > 0);
  const anyStaged = files.some((f) => f.git_index !== " ");
  const counts = {
    all: files.length,
    modified: files.filter((f) => !isClean(f)).length,
    clean: files.filter(isClean).length,
  };
  const visibleFiles = filter === "all" ? files
    : filter === "modified" ? files.filter((f) => !isClean(f))
    : files.filter(isClean);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Files</h2>
        <div className="filter-tabs">
          {(["all", "modified", "clean"] as const).map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f} <span className="filter-count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="actions">
          {anyStaged && (
            <button className="btn-secondary" onClick={() => setShowCommitDialog(true)}>
              Commit
            </button>
          )}
          {anyAhead && <button className="btn-secondary" onClick={handlePush}>Sync →</button>}
          {anyBehind && <button className="btn-secondary" onClick={handlePull}>← Sync</button>}
          <button className="btn-ghost" onClick={load}>↻</button>
        </div>
      </div>

      <div className="add-row">
        <input
          className="input input-mono"
          placeholder="Add file to chezmoi (e.g. ~/.bashrc)"
          value={addPath}
          onChange={(e) => setAddPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
        />
        <button className="btn-primary" onClick={handleAddNew}>Add</button>
      </div>

      {notice && (
        <div className={`notice ${notice.ok ? "notice-ok" : "notice-err"}`}>
          {notice.text}
          <button className="notice-close" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}

      {loading && <div className="dim loading">Loading...</div>}
      {error && <div className="notice notice-err">{error}</div>}
      {!loading && !error && files.length === 0 && (
        <div className="empty">No managed files found.</div>
      )}

      {visibleFiles.map((f) => (
        <FileRow
          key={f.path}
          file={f}
          onDiffLocal={() => handleDiffLocal(f.path)}
          onDiffGit={() => handleDiffGit(f.path)}
        />
      ))}

      {showCommitDialog && (
        <CommitDialog
          onCommit={handleCommit}
          onCancel={() => setShowCommitDialog(false)}
        />
      )}
    </div>
  );
}
