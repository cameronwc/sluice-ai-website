import { defineConfig } from "vite";

// GitHub Pages project sites are served from /<repo>/.
// Override with BASE_PATH env (e.g. "/" for a custom domain or user page).
const base = process.env.BASE_PATH ?? "/sluice-ai-website/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: false,
  },
});
