import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// StackEdit is vendored under public/stackedit and loaded in an iframe at
// /stackedit/app — rewrite that to its index.html. Needed in both the dev
// server and the production preview server (the latter serves the build).
const stackeditFallback = {
  name: "stackedit-fallback",
  configureServer(server: { middlewares: { use: (fn: any) => void } }) {
    server.middlewares.use((req: any, _res: any, next: any) => {
      if (req.url) {
        const urlPath = req.url.split("?")[0].split("#")[0];
        if (urlPath === "/stackedit/app") {
          req.url = req.url.replace("/stackedit/app", "/stackedit/app/index.html");
        }
      }
      next();
    });
  },
  configurePreviewServer(server: { middlewares: { use: (fn: any) => void } }) {
    server.middlewares.use((req: any, _res: any, next: any) => {
      if (req.url) {
        const urlPath = req.url.split("?")[0].split("#")[0];
        if (urlPath === "/stackedit/app") {
          req.url = req.url.replace("/stackedit/app", "/stackedit/app/index.html");
        }
      }
      next();
    });
  },
};

// Clients that loaded the app while it was served by the Vite dev server have
// its module URLs (/src/*.tsx, /@vite/client, /node_modules/.vite/deps/*)
// cached as fresh and keep booting the old app from disk cache. The SPA
// fallback would answer those URLs with index.html, which browsers block as a
// module (text/html MIME) — a dead page. Serve a real JS module instead that
// forces one reload; the reload revalidates index.html and picks up the
// current build.
const legacyDevUrlSelfHeal = {
  name: "legacy-dev-url-self-heal",
  configurePreviewServer(server: { middlewares: { use: (fn: any) => void } }) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const urlPath = (req.url ?? "").split("?")[0].split("#")[0];
      const isLegacyDevUrl =
        urlPath.startsWith("/src/") ||
        urlPath.startsWith("/@vite/") ||
        urlPath.startsWith("/@react-refresh") ||
        urlPath.startsWith("/node_modules/");
      if (!isLegacyDevUrl) return next();
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(
        'if(!sessionStorage.getItem("ckpt-stale-reload")){' +
          'sessionStorage.setItem("ckpt-stale-reload","1");' +
          "location.reload();}",
      );
    });
  },
};

// Default 5173; PORT lets a launcher assign a free port (the Docker image
// pins the port explicitly via --port, so production is unaffected).
const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  plugins: [react(), stackeditFallback, legacyDevUrlSelfHeal],
  server: { host: "0.0.0.0", port },
  // Production preview (used by the Docker image to serve the built app).
  preview: { host: "0.0.0.0", port, allowedHosts: true },
});
