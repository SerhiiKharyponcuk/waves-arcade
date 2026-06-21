import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser-engine";
          if (id.includes("node_modules/react") || id.includes("node_modules/zustand") || id.includes("node_modules/i18next")) return "ui-vendor";
          return undefined;
        }
      }
    }
  }
});
