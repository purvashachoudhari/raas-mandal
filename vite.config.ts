import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works on GitHub Pages under any repo path.
  base: "./",
  server: { port: 5173 },
});
