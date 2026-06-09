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

export default defineConfig({
  plugins: [react(), stackeditFallback],
  server: { host: "0.0.0.0", port: 5173 },
  // Production preview (used by the Docker image to serve the built app).
  preview: { host: "0.0.0.0", port: 5173, allowedHosts: true },
});
