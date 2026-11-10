// Builds the static frontend (src/client) into dist/client, served by Workers Static Assets.
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/client",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
