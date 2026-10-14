import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // Production builds are served by GitHub Pages at /raas-mandal/; local dev stays at /.
  base: command === "build" ? "/raas-mandal/" : "/",
  server: { port: 5173 },
}));
