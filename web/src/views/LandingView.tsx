import { CURRENT_VERSION } from "../changelog";

// Public marketing/landing page shown at "/" to signed-out visitors (see
// App.tsx). It exists to explain what Checkpoint is and does before asking
// anyone to sign in — the homepage a reviewer or first-time visitor lands on.
// Navigation to the auth screen and legal pages uses plain <a href> (a full
// reload re-reads the path), matching the legal pages.

const CONTACT = "mohammad.akhavan75@gmail.com";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Capture",
    body: "Drop a task, idea, or note in a single line. No structure, no forms — just get it out of your head.",
  },
  {
    title: "Compile",
    body: "Classify it — known or unknown, bounded or unbounded — and Checkpoint tells you how to run it: just do it, scout it first, or break it into phases.",
  },
  {
    title: "Work a session",
    body: "Start a focused block with a clear intent. The rule: finish the session cleanly — not the whole task.",
  },
  {
    title: "Checkpoint",
    body: "Before you stop, write the receipt: what changed, what's blocking you, the next action, and exactly where to resume.",
  },
  {
    title: "Resume",
    body: "Next time you open the app, a resume card greets you with where you were and what's next — so you're working in seconds, not reconstructing context.",
  },
];

const FEATURES: { title: string; body: React.ReactNode }[] = [
  {
    title: "Checkpoints",
    body: "The receipt of where you stopped. An append-only history you can trust — never silently rewritten.",
  },
  {
    title: "Today & Ready",
    body: "Deadlines and start times surface the right work on the right day, automatically, alongside the tasks you pull in by hand.",
  },
  {
    title: "Google Calendar",
    body: "Optionally connect a read-only mirror so your events sit next to your tasks. Checkpoint never writes to your calendar.",
  },
  {
    title: "Domains",
    body: "Organize work into your own areas — without rigid projects or heavyweight setup.",
  },
  {
    title: "Notes & snapshots",
    body: "Attach Markdown notes and context to a task. They persist with it across every session.",
  },
  {
    title: "Private by design",
    body: (
      <>
        No ads, no trackers, no analytics. Your data is yours — read the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </>
    ),
  },
];

export function LandingView() {
  return (
    <div className="landingwrap">
      <header className="landing-top">
        <a className="brand" href="/">
          CHECK<b>//</b>POINT
        </a>
        <nav className="landing-topnav">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a className="signin" href="/login">
            Sign in
          </a>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-eyebrow">// life-continuity tool</div>
          <h1 className="landing-h1">Pick up exactly where you left off.</h1>
          <p className="landing-lede">
            Checkpoint saves a receipt of where you stopped — what changed, why it mattered,
            and the next move — so resuming interrupted work takes seconds instead of an hour
            spent rebuilding context from memory.
          </p>
          <div className="landing-cta">
            <a className="lbtn primary" href="/login">
              Get started →
            </a>
            <a className="lbtn" href="/login">
              Sign in
            </a>
          </div>
        </section>

        <section className="landing-section">
          <h2>The problem</h2>
          <p className="section-lede">
            Every interruption taxes you twice — once when you stop, and again when you come
            back and have to reconstruct where you were. Notes apps hold information; they
            don't hold your <i>place</i>. Checkpoint is built entirely around that moment of
            return.
          </p>
        </section>

        <section className="landing-section">
          <h2>How it works</h2>
          <p className="section-lede">
            One short loop, repeated. It keeps your momentum on disk instead of in your head.
          </p>
          <ol className="landing-steps">
            {STEPS.map((s, i) => (
              <li className="landing-step" key={s.title}>
                <div className="step-n">{i + 1}</div>
                <div className="step-b">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section">
          <h2>What's inside</h2>
          <div className="landing-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <h3>
                  <span className="fdot" />
                  {f.title}
                </h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-close">
          <h2>Stop losing your place.</h2>
          <div className="landing-cta">
            <a className="lbtn primary" href="/login">
              Create your account →
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <span>CHECKPOINT · v{CURRENT_VERSION}</span>
        <span className="sep">·</span>
        <a href="/privacy">Privacy</a>
        <span className="sep">·</span>
        <a href="/terms">Terms</a>
        <span className="sep">·</span>
        <a href={`mailto:${CONTACT}`}>Contact</a>
      </footer>
    </div>
  );
}
