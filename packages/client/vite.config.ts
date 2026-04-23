import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: parseInt(process.env.CLIENT_PORT || "5173", 10),
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.SERVER_PORT || "3001"}`,
        changeOrigin: true,
      },
    },
  },
});
