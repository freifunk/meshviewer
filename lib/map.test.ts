import { expect, it } from "vitest";
import source from "./map.ts?raw";

// Only a production bundle snapshots leaflet's exports, so neither this suite
// nor tsc can observe the resulting "L.maplibreGL is not a function" directly.
it("map.ts imports leaflet's live exports", () => {
  expect(source).not.toMatch(/import \* as \w+ from "leaflet"/);
});
