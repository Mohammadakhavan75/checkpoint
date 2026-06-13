import { CURRENT_VERSION } from "../changelog";

// Current release. Reads the top changelog entry so the badge, the What's New
// popup, and the git tag all describe the same version.
//
// "inline" sits in the document flow at the very bottom of the page (the app's
// scrolling content) so it never floats over a card; "fixed" pins it
// bottom-center for screens that don't scroll, like the auth view.
export function VersionBadge({ variant = "fixed" }: { variant?: "fixed" | "inline" }) {
  return (
    <div className={variant === "inline" ? "version-badge inline" : "version-badge"}>
      v{CURRENT_VERSION}
    </div>
  );
}
