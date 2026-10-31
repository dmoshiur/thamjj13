import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "motion", "framer-motion"],
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
          "vendor-charts": ["recharts"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
  server: {
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== "true",
    watch:
      process.env.DISABLE_HMR === "true"
        ? null
        : {
            ignored: ["**/*.db", "**/*.db-wal", "**/*.db-shm"],
          },
  },
});
