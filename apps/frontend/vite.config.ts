import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: mode === "production"
      ? {
          phaser: "phaser/dist/phaser-arcade-physics.js"
        }
      : undefined
  },
  build: {
    sourcemap: mode !== "production",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser-core";
          if (id.includes("/src/game/engine/") || id.includes("/src/components/game/GameCanvas.tsx")) return "game-runtime";
          if (id.includes("node_modules/react") || id.includes("node_modules/zustand") || id.includes("node_modules/i18next")) return "ui-vendor";
          return undefined;
        }
      }
    }
  }
}));
