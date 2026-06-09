import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveRelativeFixtureTimes } from "./fixture-times.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const fixtureRoot = resolve(repoRoot, "dev-fixtures");
const buildRoot = resolve(repoRoot, "build");

const meshviewerSource = readFileSync(resolve(fixtureRoot, "meshviewer.json"), "utf8");
const resolved = resolveRelativeFixtureTimes(JSON.parse(meshviewerSource));
writeFileSync(resolve(buildRoot, "meshviewer.json"), JSON.stringify(resolved, null, 2));

const configSource = readFileSync(resolve(fixtureRoot, "config.json"), "utf8");
const config = JSON.parse(configSource);
// lib/main.ts appends "meshviewer.json" to each dataPath entry, so entries are
// directory prefixes. Point at the sibling fixture we just wrote.
config.dataPath = ["./"];
writeFileSync(resolve(buildRoot, "config.json"), JSON.stringify(config, null, 2));

for (const fixture of ["grafana-node.json", "grafana-link.json", "grafana-global.json"]) {
  copyFileSync(resolve(fixtureRoot, fixture), resolve(buildRoot, fixture));
}

writeFileSync(resolve(buildRoot, "PREVIEW.txt"), `Built for PR preview at ${new Date().toISOString()}\n`);
