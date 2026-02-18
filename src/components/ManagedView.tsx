import { useState, useEffect } from "react";
import { useChezmoi } from "../hooks/useChezmoi";

export function ManagedView() {
  const { managed, add, forget } = useChezmoi();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [addPath, setAddPath] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const out = await managed();
      setFiles(out.stdout.trim().split("\n").filter(Boolean));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleForget = async (path: string) => {
    const out = await forget(path);
    setMsg(out.success ? `Forgot ${path}` : out.stderr);
    load();
  };

  const handleAdd = async () => {
    if (!addPath.trim()) return;
    const out = await add(addPath.trim());
    setMsg(out.success ? `Added ${addPath}` : out.stderr);
    setAddPath("");
    load();
  };

  const visible = filter
    ? files.filter((f) => f.toLowerCase().includes(filter.toLowerCase()))
    : files;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Managed files <span className="dim">({files.length})</span></h2>
        <button className="btn-ghost" onClick={load}>↻</button>
      </div>

      {msg && (
        <div className="notice notice-ok">
          {msg}
          <button className="notice-close" onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <div className="add-row">
        <input
          className="input"
          placeholder="Path to add (e.g. ~/.bashrc)"
          value={addPath}
          onChange={(e) => setAddPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn-primary" onClick={handleAdd}>Add</button>
      </div>

      <input
        className="input search"
        placeholder="Filter files..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading && <div className="dim loading">Loading...</div>}

      <div className="file-list">
        {visible.map((f) => (
          <div key={f} className="file-row">
            <span className="file-path">{f}</span>
            <button className="btn-sm btn-sm-danger" onClick={() => handleForget(f)}>forget</button>
          </div>
        ))}
      </div>
    </div>
  );
}
