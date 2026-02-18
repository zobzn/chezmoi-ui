import { useState, useEffect } from "react";
import { useChezmoi } from "../hooks/useChezmoi";

export function DataView() {
  const { data } = useChezmoi();
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const out = await data();
      try {
        const parsed = JSON.parse(out.stdout);
        setOutput(JSON.stringify(parsed, null, 2));
      } catch {
        setOutput(out.stdout || out.stderr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Template data</h2>
        <button className="btn-ghost" onClick={load}>↻</button>
      </div>
      {loading && <div className="dim loading">Loading...</div>}
      <pre className="output-text">{output}</pre>
    </div>
  );
}
