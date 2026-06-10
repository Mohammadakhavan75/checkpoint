import { CURRENT_VERSION } from "../changelog";

// Current release, pinned bottom-center. Reads the top changelog entry so the
// badge, the What's New popup, and the git tag all describe the same version.
export function VersionBadge() {
  return <div className="version-badge">v{CURRENT_VERSION}</div>;
}
