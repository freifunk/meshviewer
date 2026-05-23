import "@maplibre/maplibre-gl-leaflet";
import * as L from "leaflet";

// @maplibre/maplibre-gl-leaflet is a UMD package that adds `L.maplibreGL` to
// leaflet via a runtime side effect. Under vite v8's rolldown bundler,
// `import * as L from "leaflet"` is compiled to a namespace whose property
// getters are set up at snapshot time. The maplibre side effect runs *after*
// that snapshot, so the new `maplibreGL` property is not reachable through
// the namespace (`L.maplibreGL` is undefined and the runtime throws
// "L.maplibreGL is not a function"). The snapshot's `default` slot is a
// direct value reference to the live module-exports object that the side
// effect actually mutates, so we go through it.
const liveL = (L as unknown as { default: typeof L & { maplibreGL: typeof L.maplibreGL } }).default;

export function maplibreGL(options: Parameters<typeof L.maplibreGL>[0]): L.MaplibreGL {
  return liveL.maplibreGL(options);
}
