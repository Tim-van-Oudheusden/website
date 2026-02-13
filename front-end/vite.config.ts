import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "path";
import { API_BASE, BACKEND_HOST, BACKEND_PORT, FRONTEND_PORT } from "../shared/src/index";

/**
 * Resolve the back-end proxy target.
 *
 * On the host machine both dev servers share `localhost`, so the default
 * `BACKEND_HOST` ("localhost") works fine. Inside Docker the front-end
 * container's `localhost` is itself — the back-end lives in a separate
 * container reachable by the Docker service name.
 *
 * Set `VITE_BACKEND_HOST` in docker-compose to override (e.g. "back-end").
 */
const backendHost = process.env["VITE_BACKEND_HOST"] ?? BACKEND_HOST;
const proxyTarget = `http://${backendHost}:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: path.resolve(__dirname, "../public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      shared: path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: FRONTEND_PORT,
    host: true, // Listen on all interfaces (needed for Docker)
    strictPort: true,
    proxy: {
      [API_BASE]: {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(new RegExp(`^${API_BASE}`), ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
