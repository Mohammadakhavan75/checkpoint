// Server-render entry for the public pages. Bundled by scripts/prerender.mjs
// (esbuild) and executed in Node after `vite build` to bake real, crawler-
// visible HTML into the served files. Only presentational components that touch
// no browser APIs are rendered here (LandingView, LegalView).
import { renderToStaticMarkup } from "react-dom/server";

import { LandingView } from "../src/views/LandingView";
import { LegalView } from "../src/views/LegalView";

export function renderPages(): { home: string; privacy: string; terms: string } {
  return {
    home: renderToStaticMarkup(<LandingView />),
    privacy: renderToStaticMarkup(<LegalView page="privacy" />),
    terms: renderToStaticMarkup(<LegalView page="terms" />),
  };
}
