import { useState, useEffect } from "react";
import { useChezmoi } from "../hooks/useChezmoi";

interface DoctorRow {
  result: string;
  check: string;
  message: string;
}

function parseDoctorOutput(output: string): DoctorRow[] {
  const lines = output.split("\n").filter(Boolean);
  const rows: DoctorRow[] = [];

  for (const line of lines) {
    // Skip header line
    if (line.startsWith("RESULT")) continue;
    // Each line: result (word), check (word), message (rest)
    const match = line.match(/^(\S+)\s+(\S+)\s+(.*)/);
    if (match) {
      rows.push({ result: match[1], check: match[2], message: match[3] });
    }
  }
  return rows;
}

function ResultBadge({ result }: { result: string }) {
  let cls = "doctor-badge";
  if (result === "ok") cls += " doctor-badge-ok";
  else if (result === "error" || result === "err") cls += " doctor-badge-err";
  else if (result === "warning" || result === "warn") cls += " doctor-badge-warn";
  else cls += " doctor-badge-info";
  return <span className={cls}>{result}</span>;
}

export function DoctorView() {
  const { doctor } = useChezmoi();
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [rawOutput, setRawOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const out = await doctor();
      const text = out.stdout || out.stderr;
      setRawOutput(text);
      setRows(parseDoctorOutput(text));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hasRows = rows.length > 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Doctor</h2>
        <button className="btn-ghost" onClick={load}>↻</button>
      </div>
      {loading && <div className="dim loading">Running...</div>}
      {!loading && hasRows && (
        <table className="doctor-table">
          <thead>
            <tr>
              <th>Result</th>
              <th>Check</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`doctor-row doctor-row-${row.result}`}>
                <td><ResultBadge result={row.result} /></td>
                <td className="doctor-check">{row.check}</td>
                <td className="doctor-message">{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && !hasRows && rawOutput && (
        <pre className="output-text">{rawOutput}</pre>
      )}
    </div>
  );
}
