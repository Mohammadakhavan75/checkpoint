// Release notes shown to returning users after an update. Ordered NEWEST FIRST;
// the top entry's version is the current app version. Add a new entry on top
// each release — the backend only stores which version a user last saw.
//
// Release process: add the entry here, mirror the version in web/package.json,
// then after merging tag the release commit:
//   git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z

export interface Release {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: "0.15.0",
    date: "2026-06-22",
    title: "Safer notes and stronger boundaries",
    notes: [
      "Snapshot notes now sanitize rendered Markdown, keeping embedded HTML and scriptable links from becoming browser code.",
      "The obsolete StackEdit bundle has been removed; the fast built-in note editor and Markdown help remain available.",
      "Item containers and phases now enforce account ownership at creation, lookup, and cascade boundaries.",
      "Production startup now requires explicit database and JWT secrets, and the web build toolchain has been upgraded past current public advisories.",
    ],
  },
  {
    version: "0.14.0",
    date: "2026-06-21",
    title: "A faster front door",
    notes: [
      "The home page, Privacy Policy, and Terms now load their content instantly — even for search engines and link previews — instead of waiting for the app to spin up.",
      "The boot animation is now reserved for signing in and returning to your workspace; a first-time visitor lands straight on the home page.",
    ],
  },
  {
    version: "0.13.0",
    date: "2026-06-21",
    title: "A front door for Checkpoint",
    notes: [
      "Checkpoint now has a real home page that explains what it's for — the capture → compile → session → checkpoint → resume loop — before you ever sign in.",
      "Signing in moved to its own page; the home page and account menu link to it, and you land back on your dashboard once you're in.",
    ],
  },
  {
    version: "0.12.0",
    date: "2026-06-21",
    title: "Privacy & Terms, in the open",
    notes: [
      "Checkpoint now has a Privacy Policy and Terms of Service, written to match how the app actually works — what's stored, how Google sign-in and the calendar mirror are handled, and how to delete your data.",
      "Both pages are public: read them straight from the sign-in screen or your account menu, no login needed.",
    ],
  },
  {
    version: "0.11.1",
    date: "2026-06-21",
    title: "Calendar, kept fresh",
    notes: [
      "Your calendar refreshes itself now — opening Today or Ready to GO quietly pulls in new and changed events in the background.",
      "Calendar events show as their own kind of row, with the time, the place, and a link straight to Google Calendar.",
      "If Google ever drops the connection, a banner up top lets you reconnect in one click.",
    ],
  },
  {
    version: "0.11.0",
    date: "2026-06-21",
    title: "Your calendar, in the loop",
    notes: [
      "Connect your Google Calendar from the account menu and your events show up in Today and Ready to GO, right next to your tasks.",
      "It's read-only — Checkpoint never changes anything on your calendar — and you can disconnect any time.",
      "An event you decide to work on is a first-class task: compile it, checkpoint it, and resume it like anything else.",
    ],
  },
  {
    version: "0.10.0",
    date: "2026-06-21",
    title: "Tasks have a clock now",
    notes: [
      "A task can now carry a deadline and a start / end time — set them in the Schedule section when you compile.",
      "Anything due today (or overdue) and anything starting today surfaces in Today on its own, right next to the tasks you pull in by hand.",
      "Tasks coming due in the next 7 days line up in Ready to GO, soonest first, so nothing sneaks up on you.",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-06-16",
    title: "Resume, everywhere",
    notes: [
      "Every task you've checkpointed now glows green and carries a one-click Resume button right where Start used to be — not just the single most-recent one.",
      "Closing a session now asks where the task should go: keep it on Today to pick up soon, or move it back to Ready to GO! to clear your list.",
      "The checkpoint receipt no longer asks for a separate “next action” — your resume point is the one thing that matters.",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-06-16",
    title: "The session became a workspace",
    notes: [
      "Your notes now live right on the session page — an always-open composer over a running log of everything you've captured this session, newest first, instead of hidden behind a button.",
      "The Pomodoro timer is now the session's heartbeat: a focus pulse plus live vitals — time focused, notes captured, and when you started.",
      "Closing to a checkpoint is now a calm exit in the top bar; the bright accent moved onto Capture, where the action is.",
      "On phones the timer collapses into a compact strip so the capture box and your notes aren't buried beneath it.",
    ],
  },
  {
    version: "0.8.1",
    date: "2026-06-16",
    title: "Phases, tidied",
    notes: [
      "Finished phases now drop to the bottom of a container's list, so the work still ahead of you stays on top — each phase keeps its original number.",
      "On phones, the full-screen task editor no longer tucks its title and close button under the status bar / notch.",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-06-14",
    title: "A net under delete",
    notes: [
      "Deleting a task now sends it to a new Trash instead of removing it outright — restore it any time in the next 30 days.",
      "Restore puts a task back exactly where it was; after 30 days the Trash clears itself, or you can empty it yourself.",
      "Delete and other confirmations are now styled in-app dialogs that match the rest of the app, not the browser's gray popup.",
    ],
  },
  {
    version: "0.7.1",
    date: "2026-06-13",
    title: "One row, one delete",
    notes: [
      "Whatever sits in the Today resume card no longer shows up a second time as a row below it.",
      "Deleting a task now lives inside its Edit form — a red Delete button next to Cancel and Compile, with a confirmation — instead of a stray ✕ on every row.",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-06-13",
    title: "Move the whole container",
    notes: [
      "A multi-phase task now travels as one piece: pull the whole container into Ready to GO and then Today, instead of shuttling each phase across on its own.",
      "On Today a container shows all its phases with the next one flagged — start any phase right from the card.",
      "Finishing every phase rolls the container up to done and clears it from Today automatically.",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-06-13",
    title: "Tidy up, stay put",
    notes: [
      "Delete a task right from Today, Ready to GO, and your domain backlog — with a quick confirm so nothing disappears by accident.",
      "Ready to GO can be filtered by category, so a long list narrows to just the domain you're working on.",
      "The capture bar snaps back to the reservoir after each entry — no more accidentally filing your next thought into the domain you just used.",
      "The compile pop-up no longer vanishes when you click outside it; your in-progress work stays put until you press Cancel or ✕.",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-06-11",
    title: "Done means done",
    notes: [
      "Closing a task as Done no longer asks for a next action or resume point — finished work has no next step, and the receipt says so.",
      "Scout is one idea now: setting an item's state to scout makes its mode match, and starting work on a Scout item begins reconnaissance instead of execution.",
      "Hover any mode chip (Do · Scout · Plan · Deep) to see what it means.",
      "Action buttons line up in clean columns, Deferred has its own calm color, and green is reserved for Done.",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-06-11",
    title: "Your first ten seconds",
    notes: [
      "New accounts now open on a resume card you can press right away — feel what the app does before learning a single term.",
      "Returning visits greet you with your latest checkpoint and a one-click resume, instead of a list to scan.",
      "The intro is a real, working session: answer one question and it hands off to your own work.",
      "Closing your first session shows you the receipt that will greet you next time — and the first checkpoint form is trimmed to the essentials.",
    ],
  },
  {
    version: "0.3.5",
    date: "2026-06-10",
    title: "Domain status filters",
    notes: [
      "Domains now have a status filter, with done tasks hidden by default.",
      "Domain task counters now ignore done tasks.",
    ],
  },
  {
    version: "0.3.4",
    date: "2026-06-10",
    title: "Passwords for Google accounts",
    notes: [
      "Signed up with Google? You can now set a password from the account menu and sign in either way.",
      "Trying to password-sign-in to a Google-only account now explains what to do instead of claiming the password is wrong.",
      "Registering an email that already exists now always says so — regardless of letter case, and with a pointer to Google when that's how the account signs in.",
    ],
  },
  {
    version: "0.3.3",
    date: "2026-06-10",
    title: "Google sign-in resilience",
    notes: [
      "When our server can't reach Google during sign-in you now see “temporarily unavailable — try again” instead of a misleading “Invalid Google credential”.",
      "Google sign-in is faster: Google's signing keys are now cached on the server instead of fetched on every login.",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-06-10",
    title: "Phones fit the screen again",
    notes: [
      "Fixed the page laying out wider than phone screens — content was getting cut off at the right edge.",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-06-10",
    title: "Polish & fixes",
    notes: [
      "The boot animation now plays everywhere — including desktops with Reduce Motion enabled.",
      "Fixed the browser tab icon.",
      "The app version is now shown at the bottom of the page.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-06-09",
    title: "Release notes",
    notes: [
      "Coming back after an update now shows you what changed.",
      "Missed several versions? You'll see every update, newest first.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-06-08",
    title: "Mobile, live sync & a new boot screen",
    notes: [
      "Full phone & tablet support — slide-in navigation and touch-friendly controls.",
      "Your changes now sync automatically across open tabs and devices.",
      "A new animated boot screen on load.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-05-31",
    title: "Checkpoint",
    notes: ["Capture, compile, and resume work without rebuilding context from memory."],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;

// Numeric semver-ish compare: -1 if a<b, 0 if equal, 1 if a>b.
export function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Releases newer than what the user last saw, up to the current version.
export function unseenReleases(lastSeen: string | null | undefined): Release[] {
  if (!lastSeen) return [];
  return CHANGELOG.filter(
    (r) =>
      cmpVersion(r.version, lastSeen) > 0 &&
      cmpVersion(r.version, CURRENT_VERSION) <= 0,
  );
}
