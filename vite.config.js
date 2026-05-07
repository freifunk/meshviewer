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
  },
  plugins: [
    command === "serve" && mode === "fixtures" ? devFixturesPlugin() : null,
    process.env.VITE_PREVIEW === "1"
      ? null
      : new VitePWA({
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}"],
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
