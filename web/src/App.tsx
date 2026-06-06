import { useState } from "react";

import { useCapture, useItem } from "./api/hooks";
import { useAuth } from "./auth";
import { CheckpointModal } from "./components/CheckpointModal";
import { CompileModal } from "./components/CompileModal";
import { Header } from "./components/Header";
import { SessionOverlay } from "./components/SessionOverlay";
import { Sidebar } from "./components/Sidebar";
import { AuthView } from "./views/AuthView";
import { DomainView } from "./views/DomainView";
import { ReadyView } from "./views/ReadyView";
import { ReservoirView } from "./views/ReservoirView";
import { TodayView } from "./views/TodayView";
import type { Tab } from "./types";

export function App() {
  const { user, loading } = useAuth();
  const capture = useCapture();

  const [tab, setTab] = useState<Tab>("today");
  const [domain, setDomain] = useState("DDWS");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [compileId, setCompileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkpointOpen, setCheckpointOpen] = useState(false);

  const { data: sessionItem } = useItem(sessionId);

  if (loading) {
    return (
      <div className="authwrap">
        <div className="loading">starting checkpoint…</div>
      </div>
    );
  }
  if (!user) return <AuthView />;

  function nav(t: Tab, d?: string) {
    setTab(t);
    if (d) setDomain(d);
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeSession() {
    setSessionId(null);
    setCheckpointOpen(false);
  }

  return (
    <>
      <div className="app">
        <Header
          onCapture={(text) => {
            capture.mutate(text);
            setTab("reservoir");
          }}
        />
        <div className="body">
          <Sidebar tab={tab} domain={domain} onNav={nav} />
          <main>
            {tab === "today" && <TodayView onStart={setSessionId} onEdit={setCompileId} />}
            {tab === "ready" && <ReadyView onEdit={setCompileId} />}
            {tab === "reservoir" && <ReservoirView onNav={nav} />}
            {tab === "domain" && (
              <DomainView
                domain={domain}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                onCompile={setCompileId}
              />
            )}
          </main>
        </div>
      </div>

      {compileId && <CompileModal id={compileId} onClose={() => setCompileId(null)} />}

      {sessionId && sessionItem && !checkpointOpen && (
        <SessionOverlay
          item={sessionItem}
          onAbandon={() => setSessionId(null)}
          onCheckpoint={() => setCheckpointOpen(true)}
        />
      )}

      {sessionId && checkpointOpen && (
        <CheckpointModal
          id={sessionId}
          onBack={() => setCheckpointOpen(false)}
          onSaved={() => {
            closeSession();
            setTab("today");
          }}
        />
      )}
    </>
  );
}
