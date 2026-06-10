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
