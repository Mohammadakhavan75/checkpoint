import { useState } from "react";

import { useCapture, useCompile, useItem, useSetDaily, useUpdateItem } from "./api/hooks";
import { useAuth } from "./auth";
import { CheckpointLoader } from "./components/CheckpointLoader";
import { CheckpointModal } from "./components/CheckpointModal";
import { CompileModal } from "./components/CompileModal";
import { FirstCheckpointReveal } from "./components/FirstCheckpointReveal";
import { Header } from "./components/Header";
import { MobileDrawer } from "./components/MobileDrawer";
import { SessionOverlay } from "./components/SessionOverlay";
import { Sidebar } from "./components/Sidebar";
import { VersionBadge } from "./components/VersionBadge";
import { WhatsNew } from "./components/WhatsNewModal";
import { AuthView } from "./views/AuthView";
import { DomainView } from "./views/DomainView";
import { ReadyView } from "./views/ReadyView";
import { ReservoirView } from "./views/ReservoirView";
import { TodayView } from "./views/TodayView";
import { TrashView } from "./views/TrashView";
import type { Checkpoint, Tab } from "./types";

export function App() {
  const { user, loading } = useAuth();
  const capture = useCapture();
  const compile = useCompile();
  const setDaily = useSetDaily();
  const updateItem = useUpdateItem();

  const [tab, setTab] = useState<Tab>("today");
  const [domain, setDomain] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [navOpen, setNavOpen] = useState(false);
  const [booting, setBooting] = useState(true);

  const [compileId, setCompileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  // The session was born from the tutorial bridge (or the empty-TODAY capture):
  // its closing checkpoint form is trimmed to the three required fields.
  const [firstRunSession, setFirstRunSession] = useState(false);
  const [reveal, setReveal] = useState<{ title: string; checkpoint: Checkpoint } | null>(null);

  const { data: sessionItem } = useItem(sessionId);

  // Boot loader plays the full reveal once (booting) and also covers the auth
  // check (loading); whichever finishes last hands off to the app.
  if (loading || booting) {
    return <CheckpointLoader onDone={() => setBooting(false)} />;
  }
  if (!user)
    return (
      <>
        <AuthView />
        <VersionBadge />
      </>
    );

  function nav(t: Tab, d?: string) {
    setTab(t);
    if (d) setDomain(d);
    setNavOpen(false);
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
    setFirstRunSession(false);
  }

  function openSession(id: string) {
    setFirstRunSession(false);
    setSessionId(id);
  }

  // Fast path: skip the compile form. For an uncompiled item, quick-classify it
  // as known|bounded ("just do it" → mode Do, compiled, active), then jump
  // straight into a work session.
  async function fastExecute(id: string, alreadyCompiled: boolean) {
    if (!alreadyCompiled) {
      await compile.mutateAsync({ id, payload: { procedure: "known", scope: "bounded" } });
    }
    openSession(id);
  }

  // Tutorial bridge: capture the user's answer, auto-compile it (known|bounded),
  // put it on TODAY, retire the tutorial item, and swap the session onto it.
  // No reservoir/domain/compile form in the path.
  async function bridgeCapture(text: string, tutorialId?: string) {
    const captured = await capture.mutateAsync({ text });
    await compile.mutateAsync({
      id: captured.id,
      payload: { procedure: "known", scope: "bounded" },
    });
    await setDaily.mutateAsync({ id: captured.id, daily: true });
    if (tutorialId) {
      await updateItem.mutateAsync({
        id: tutorialId,
        payload: { state: "done", daily: false },
      });
    }
    setFirstRunSession(true);
    setSessionId(captured.id);
  }

  return (
    <>
      <div className="app">
        <Header
          onMenuToggle={() => setNavOpen((v) => !v)}
          onCapture={(text, captureDomain) => {
            capture.mutate({ text, domain: captureDomain });
            if (captureDomain) nav("domain", captureDomain);
            else setTab("reservoir");
          }}
        />
        <div className="body">
          <MobileDrawer open={navOpen} onClose={() => setNavOpen(false)}>
            <Sidebar tab={tab} domain={domain} onNav={nav} />
          </MobileDrawer>
          <main>
            {tab === "today" && (
              <TodayView
                onStart={openSession}
                onEdit={setCompileId}
                onBridgeCapture={bridgeCapture}
              />
            )}
            {tab === "ready" && <ReadyView onEdit={setCompileId} />}
            {tab === "reservoir" && <ReservoirView onNav={nav} />}
            {tab === "trash" && <TrashView />}
            {tab === "domain" && (
              <DomainView
                domain={domain}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                onCompile={setCompileId}
                onFastExecute={fastExecute}
              />
            )}
            {/* In the scroll flow, so the version sits at the bottom of the
                page instead of floating over the cards. */}
            <VersionBadge variant="inline" />
          </main>
        </div>
      </div>

      <WhatsNew user={user} />

      {compileId && <CompileModal id={compileId} onClose={() => setCompileId(null)} />}

      {sessionId && sessionItem && !checkpointOpen && (
        <SessionOverlay
          item={sessionItem}
          onAbandon={() => setSessionId(null)}
          onCheckpoint={() => setCheckpointOpen(true)}
          onBridge={(text) => bridgeCapture(text, sessionItem.id)}
        />
      )}

      {sessionId && checkpointOpen && (
        <CheckpointModal
          id={sessionId}
          trimmed={firstRunSession}
          onBack={() => setCheckpointOpen(false)}
          onSaved={(cp) => {
            const title = sessionItem?.title ?? "";
            closeSession();
            setTab("today");
            if (cp.first_user_checkpoint) setReveal({ title, checkpoint: cp });
          }}
        />
      )}

      {reveal && (
        <FirstCheckpointReveal
          title={reveal.title}
          checkpoint={reveal.checkpoint}
          onClose={() => setReveal(null)}
        />
      )}
    </>
  );
}
