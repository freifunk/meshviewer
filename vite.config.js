import { resolve } from "path";
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@fonts": resolve(__dirname, "assets/fonts"),
    },
  },
  build: {
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        offline: resolve(__dirname, "offline.html"),
      },
    },
  },
  plugins: [
    new VitePWA({
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}"],
      },
      manifest: {
        name: "Meshviewer",
        short_name: "Meshviewer",
        description:
          "Meshviewer is an online visualization app to represent nodes and links on a map for Freifunk open mesh network.",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
    checker({
      // Run TypeScript checks
      typescript: true,
    }),
  ],
});
