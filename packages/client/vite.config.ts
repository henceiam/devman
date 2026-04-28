import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "../..");
  const rootEnv = loadEnv(mode, rootDir, "");
  return {
    envDir: rootDir,
    plugins: [react(), tailwindcss()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
    server: {
      port: parseInt(rootEnv.CLIENT_PORT || "5173", 10),
      proxy: {
        "/api": {
          target: `http://localhost:${rootEnv.SERVER_PORT || "3001"}`,
          changeOrigin: true,
        },
      },
    },
  };
});
