import { useState } from "react";
import { useChezmoi } from "../hooks/useChezmoi";
import { CommandOutput } from "../types";

const QUICK_COMMANDS = [
  { label: "status", args: ["status"] },
  { label: "log --oneline -20", args: ["log", "--oneline", "-20"] },
  { label: "diff", args: ["diff"] },
  { label: "diff --cached", args: ["diff", "--cached"] },
  { label: "pull", args: ["pull"] },
  { label: "push", args: ["push"] },
  { label: "add -A", args: ["add", "-A"] },
];

export function GitView() {
  const { git } = useChezmoi();
  const [customArgs, setCustomArgs] = useState("");
  const [output, setOutput] = useState<CommandOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (args: string[]) => {
    setLoading(true);
    try {
      const out = await git(args);
      setOutput(out);
    } catch (e) {
      setOutput({ stdout: "", stderr: String(e), success: false });
    } finally {
      setLoading(false);
    }
  };

  const runCustom = () => {
    const args = customArgs.trim().split(/\s+/).filter(Boolean);
    if (args.length) run(args);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Git</h2>
      </div>

      <div className="quick-commands">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            className="btn-secondary btn-mono"
            onClick={() => run(cmd.args)}
          >
            git {cmd.label}
          </button>
        ))}
      </div>

      <div className="add-row">
        <span className="dim prefix">git</span>
        <input
          className="input input-mono"
          placeholder="commit -m 'update dotfiles'"
          value={customArgs}
          onChange={(e) => setCustomArgs(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runCustom()}
        />
        <button className="btn-primary" onClick={runCustom}>Run</button>
      </div>

      {loading && <div className="dim loading">Running...</div>}

      {output && (
        <div className="output-block">
          {output.stdout && <pre className="output-text">{output.stdout}</pre>}
          {output.stderr && (
            <pre className={`output-text ${output.success ? "dim" : "output-err"}`}>
              {output.stderr}
            </pre>
          )}
          {!output.stdout && !output.stderr && (
            <span className="dim">(no output)</span>
          )}
        </div>
      )}
    </div>
  );
}
