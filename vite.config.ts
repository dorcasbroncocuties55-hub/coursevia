import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Plugin to ensure _redirects is always in dist after build
const ensureRedirects = () => ({
  name: "ensure-redirects",
  closeBundle() {
    const indexHtml = fs.readFileSync("dist/index.html");
    
    // _redirects — for Netlify and Render static sites
    const redirectsContent = "/*    /index.html   200\n";
    fs.writeFileSync("dist/_redirects", redirectsContent);
    console.log("✓ _redirects written to dist");
    
    // 200.html — Render serves this for all unmatched routes
    fs.writeFileSync("dist/200.html", indexHtml);
    console.log("✓ 200.html written to dist");
    
    // 404.html — must be index.html so React Router handles the route
    fs.writeFileSync("dist/404.html", indexHtml);
    console.log("✓ 404.html written to dist");
    
    // Also copy netlify.toml if it exists
    if (fs.existsSync("netlify.toml")) {
      fs.copyFileSync("netlify.toml", "dist/netlify.toml");
      console.log("✓ netlify.toml copied to dist");
    }
  },
});

export default defineConfig({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), ensureRedirects()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["date-fns"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Content-hash filenames ensure browsers always load fresh files after deploy
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-ui";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});