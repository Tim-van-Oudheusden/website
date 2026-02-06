import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      shared: path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 5173,
    host: true, // Listen on all interfaces (needed for Docker)
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
