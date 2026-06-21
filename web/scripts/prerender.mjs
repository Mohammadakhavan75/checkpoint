// Post-build prerender: bake crawler-visible HTML into the public pages so
// `/`, `/privacy`, and `/terms` explain the app without requiring JavaScript.
//
// The app is a client-rendered SPA — the raw HTML it serves is an empty
// `<div id="root"></div>`. Crawlers (and Google's OAuth homepage verification)
// fetch that HTML, run no JS, and see nothing. This script renders the real
// LandingView / LegalView React components to static markup and injects it into
// the built HTML. React still mounts and takes over for real users
// (createRoot replaces the container's contents), so this is pure progressive
// enhancement: same content, now visible to no-JS clients too.
//
// Runs after `vite build` (see package.json). The preview server maps
// /privacy -> privacy.html and /terms -> terms.html (see vite.config.ts).
import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");
const indexPath = resolve(dist, "index.html");

if (!existsSync(indexPath)) {
  console.error(`[prerender] ${indexPath} not found — run \`vite build\` first.`);
  process.exit(1);
}

// 1. Transpile + bundle the TSX entry to a throwaway CommonJS module. CJS
//    (loaded via require) keeps react-dom/server's `require("stream")` working
//    natively — an ESM bundle wraps those Node builtins in a shim that throws.
const tmp = resolve(dist, ".prerender-entry.cjs");
await build({
  entryPoints: [resolve(here, "prerender-entry.tsx")],
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  outfile: tmp,
  logLevel: "warning",
});

// 2. Render the components to static HTML.
const require = createRequire(import.meta.url);
const { renderPages } = require(tmp);
const pages = renderPages();
rmSync(tmp, { force: true });

// 3. Inject each page's markup + metadata into the built HTML shell (which
//    carries the hashed <script>/<link> asset tags so React still boots).
const shell = readFileSync(indexPath, "utf8");

const DESCRIPTION =
  "Checkpoint is a life-continuity tool: it saves a receipt of where you " +
  "stopped — what changed, why it mattered, and the next move — so you can " +
  "resume interrupted work in seconds instead of rebuilding context from memory.";

function compose(markup, { title, description }) {
  let html = shell;
  if (title) html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  const desc = description ?? DESCRIPTION;
  const metaTag = `<meta name="description" content="${desc}" />`;
  // The source tag is multi-line, so match across newlines up to its "/>".
  if (/<meta\s+name="description"[\s\S]*?\/>/.test(html)) {
    html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/, metaTag);
  } else {
    html = html.replace("</title>", `</title>\n    ${metaTag}`);
  }
  // The shell ships an empty root; fill it with the prerendered markup.
  return html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
}

writeFileSync(
  indexPath,
  compose(pages.home, { title: "Checkpoint — resume work without rebuilding context" }),
);
writeFileSync(
  resolve(dist, "privacy.html"),
  compose(pages.privacy, {
    title: "Privacy Policy · Checkpoint",
    description:
      "How Checkpoint handles your data: bcrypt-hashed passwords, optional " +
      "Google sign-in, an optional read-only Google Calendar mirror with tokens " +
      "encrypted at rest, no ads, no tracking.",
  }),
);
writeFileSync(
  resolve(dist, "terms.html"),
  compose(pages.terms, { title: "Terms of Service · Checkpoint" }),
);

console.log("[prerender] wrote index.html, privacy.html, terms.html with static content");
