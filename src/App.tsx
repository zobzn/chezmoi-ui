import { useState } from "react";
import { Tab } from "./types";
import { StatusView } from "./components/StatusView";
import { DoctorView } from "./components/DoctorView";
import "./App.css";

const TABS: { id: Tab; label: string }[] = [
  { id: "status", label: "Files" },
  { id: "doctor", label: "Doctor" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("status");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">chezmoi</div>
        <nav>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        {tab === "status" && <StatusView />}
        {tab === "doctor" && <DoctorView />}
      </main>
    </div>
  );
}
