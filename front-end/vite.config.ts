import * as path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { API_BASE, ASSET_PATH_PREFIX, BACKEND_HOST, BACKEND_PORT, FRONTEND_PORT } from "../shared/src/index";

/**
 * Resolve the back-end proxy target.
 *
 * The kube-play dev pod runs front-end and back-end in the same network
 * namespace, so the front-end reaches the back-end at `localhost:$BACKEND_PORT`
 * — the default. `VITE_BACKEND_HOST` remains an escape hatch for non-pod
 * setups (e.g. the two servers running as separate host processes).
 */
const backendHost = process.env["VITE_BACKEND_HOST"] ?? BACKEND_HOST;
const proxyTarget = `http://${backendHost}:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: path.resolve(__dirname, "../public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: FRONTEND_PORT,
    host: true, // Listen on all interfaces (publishes the pod's dev port)
    strictPort: true,
    proxy: {
      // Forward /api/* unchanged so dev paths match prod (cloudflared) paths;
      // the back-end serves the /api prefix itself.
      [API_BASE]: {
        target: proxyTarget,
        changeOrigin: true,
      },
      // Content images (article social images, embeds) live on the back-end too.
      [ASSET_PATH_PREFIX]: {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
