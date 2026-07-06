import { useEffect, useState } from "react";

import { getToken } from "./api/client";
import { useCapture, useCompile, useItem, useSetDaily, useUpdateItem } from "./api/hooks";
import { useAuth } from "./auth";
import { CalendarReauthBanner } from "./components/CalendarReauthBanner";
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
import { LandingView } from "./views/LandingView";
import { DomainView } from "./views/DomainView";
import { ReadyView } from "./views/ReadyView";
import { ResumableView } from "./views/ResumableView";
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
  // A reminder/nudge deep link (/?resume={id}) — captured on first render before
  // we normalize the address bar, so a tap ejects straight into that item's work.
  const [pendingResume] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get("resume");
    } catch {
      return null;
    }
  });

  const { data: sessionItem } = useItem(sessionId);

  // A signed-in user has no business sitting on a public path (e.g. /login after
  // authenticating). Normalize the address bar back to the app root, without a
  // reload, so a refresh or shared bookmark lands on the dashboard.
  useEffect(() => {
    if (user && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
  }, [user]);

  // Honour a reminder deep link once signed in: land on Today and open the
  // session for that item (cue → door → work, one continuous motion).
  useEffect(() => {
    if (user && pendingResume) {
      setTab("today");
      setFirstRunSession(false);
      setSessionId(pendingResume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  // The boot reveal is for entering the app, not the marketing site. Play it
  // only when there's a session to restore (a returning, signed-in user) or
  // when stepping into the auth flow (/login — i.e. they clicked sign in /
  // create account). A fresh visitor on the public homepage skips it and lands
  // on the landing page immediately.
  const wantsLoader = getToken() != null || path === "/login";

  // The loader covers the boot reveal (booting) and the auth check (loading);
  // whichever finishes last hands off.
  if (wantsLoader && (loading || booting)) {
    return <CheckpointLoader onDone={() => setBooting(false)} />;
  }
  if (!user) {
    // Public surface: the landing page explains the app at "/", and "/login"
    // is the auth screen. Anything else (a stale deep link) falls back to the
    // landing page rather than a bare login form.
    if (path === "/login")
      return (
        <>
          <AuthView />
          <VersionBadge />
        </>
      );
    return <LandingView />;
  }

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
        <CalendarReauthBanner />
        <Header
          onMenuToggle={() => setNavOpen((v) => !v)}
          // Capture never navigates — you stay where you are and the capture
          // bar flashes the destination (REDESIGN_V1 §WS-5). The sidebar count
          // bump (query invalidation) is the second confirmation.
          onCapture={async (text, captureDomain) => {
            await capture.mutateAsync({ text, domain: captureDomain });
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
            {tab === "resumable" && <ResumableView onStart={openSession} />}
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

      {/* The session stays mounted while the checkpoint form is open — the
          notes remain visible behind the receipt being written from them, and
          Back returns with the timer/vitals intact (REDESIGN_V1 §WS-4). */}
      {sessionId && sessionItem && (
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
