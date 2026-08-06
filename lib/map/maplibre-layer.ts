import * as L from "leaflet";

type MaplibreGLFactory = typeof L.maplibreGL;
type LiveL = typeof L & { maplibreGL: MaplibreGLFactory };

// maplibre-gl is ~1MB minified — keep it out of the main bundle by loading it
// dynamically on demand. Vector layers are the only consumer.
let cached: Promise<MaplibreGLFactory> | undefined;

export function loadMaplibreGL(): Promise<MaplibreGLFactory> {
  if (!cached) {
    // The package is a UMD that adds `L.maplibreGL` to leaflet via a side
    // effect. Under vite's rolldown bundler, `import * as L from "leaflet"`
    // gives us a namespace whose getters are set up at snapshot time, so the
    // newly-attached `maplibreGL` is not visible through `L.maplibreGL`. The
    // snapshot's `default` slot is a direct value reference to the live
    // module-exports object that the side effect actually mutates, so we go
    // through it.
    cached = import("@maplibre/maplibre-gl-leaflet").then(() => {
      const liveL = (L as unknown as { default: LiveL }).default;
      return liveL.maplibreGL.bind(liveL);
    });
  }
  return cached;
}
