import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";
import { resolveRelativeFixtureTimes } from "./scripts/fixture-times.mjs";

function devFixturesPlugin() {
  const fixtureRoot = resolve(__dirname, "dev-fixtures");
  const routes = {
    "/config.json": {
      filePath: resolve(fixtureRoot, "config.json"),
      contentType: "application/json; charset=utf-8",
    },
    "/fixtures/meshviewer.json": {
      filePath: resolve(fixtureRoot, "meshviewer.json"),
      contentType: "application/json; charset=utf-8",
      transform(body) {
        return JSON.stringify(resolveRelativeFixtureTimes(JSON.parse(body)), null, 2);
      },
    },
    "/grafana-node.json": {
      filePath: resolve(fixtureRoot, "grafana-node.json"),
      contentType: "application/json; charset=utf-8",
    },
    "/grafana-link.json": {
      filePath: resolve(fixtureRoot, "grafana-link.json"),
      contentType: "application/json; charset=utf-8",
    },
    "/grafana-global.json": {
      filePath: resolve(fixtureRoot, "grafana-global.json"),
      contentType: "application/json; charset=utf-8",
    },
  };

  return {
    name: "meshviewer-dev-fixtures",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const route = req.url?.split("?")[0];
        const fixture = routes[route];

        if (!fixture) {
          next();
          return;
        }

        try {
          const source = readFileSync(fixture.filePath, "utf8");
          const body = fixture.transform ? fixture.transform(source) : source;
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", fixture.contentType);
          res.end(body);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`Failed to load fixture ${fixture.filePath}: ${error.message}`);
        }
      });
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  base: "./",
  resolve: {
    alias: {
      "@fonts": resolve(__dirname, "assets/fonts"),
      "@icons": resolve(__dirname, "assets/icons/svg"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      input: {
        embed: resolve(__dirname, "embed/index.html"),
        index: resolve(__dirname, "index.html"),
        offline: resolve(__dirname, "offline.html"),
      },
    },
    // The main bundle sits comfortably under 500 kB. The only remaining
    // large chunk is the dynamically-imported maplibre-gl bundle (~1 MB,
    // only loaded on demand for vector layers), so raise the threshold
    // slightly above its size rather than nagging on every build.
    chunkSizeWarningLimit: 1100,
  },
  plugins: [
    command === "serve" && mode === "fixtures" ? devFixturesPlugin() : null,
    process.env.VITE_PREVIEW === "1"
      ? null
      : new VitePWA({
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}"],
            // The maplibre-gl chunk (~1 MB) is only fetched when a vector
            // map layer is configured. Don't waste bandwidth precaching it
            // on every install — the service worker can still serve it
            // from runtime cache when it is actually requested.
            globIgnores: ["**/leaflet-maplibre-gl-*.js"],
            navigateFallbackDenylist: [new RegExp(".*\.json")],
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
  ].filter(Boolean),
}));
