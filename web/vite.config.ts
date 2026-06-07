import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "stackedit-fallback",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url) {
            const urlPath = req.url.split('?')[0].split('#')[0];
            if (urlPath === '/stackedit/app') {
              req.url = req.url.replace('/stackedit/app', '/stackedit/app/index.html');
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
