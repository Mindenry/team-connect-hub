import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/uploads": { target: "http://localhost:3000", changeOrigin: true },
      "/rtc": { target: "http://localhost:7880", changeOrigin: true, ws: true },
      "/twirp": { target: "http://localhost:7880", changeOrigin: true },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build for production
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production", // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Code splitting for better caching
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
          ],
          "utils-vendor": ["date-fns", "zod", "class-variance-authority", "clsx"],
          "charts-vendor": ["recharts"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Warn if chunk exceeds 1MB
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
}));
