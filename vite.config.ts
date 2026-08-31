import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/v1": {
        target: process.env.VITE_MINIJAM_NODE_RPC_URL || "http://127.0.0.1:9944",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
