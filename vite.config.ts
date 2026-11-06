import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the app from /AstraFocusNexus/. HashRouter keeps deep links
// working there without a 404.html redirect hack.
// Same base in dev, preview and build so local URLs match production.
export default defineConfig(() => ({
  base: "/AstraFocusNexus/",
  plugins: [react()],
  build: {
    outDir: "build",
    sourcemap: true,
    target: "es2020",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
