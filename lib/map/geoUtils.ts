import L from "leaflet";
import { Geo } from "../config_default.js";
import { escape } from "../utils/escape.js";

export function getGeoOptions(geoOption?: L.GeoJSONOptions): L.GeoJSONOptions {
  const defaultOptions: L.GeoJSONOptions = {
    onEachFeature: (feature, layer) => {
      if (feature?.properties && feature.properties.name != null && feature.properties.name !== "") {
        layer.bindTooltip(escape(String(feature.properties.name)));
      }
    },
  };
  return Object.assign({}, defaultOptions, geoOption);
}

export function loadGeoLayer(
  geo: Geo,
  addToMap: (layer: L.GeoJSON) => void,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<L.GeoJSON | void> {
  if (!geo) {
    return Promise.resolve();
  }
  const rawOption = geo.option ?? geo.options;
  const options = getGeoOptions(rawOption);
  const url = geo.url || (typeof geo.json === "string" ? geo.json : undefined);

  if (url) {
    const fetchPromise = signal ? fetchFn(url, { signal }) : fetchFn(url);
    return fetchPromise
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (signal?.aborted) {
          return;
        }
        const layer = L.geoJSON(data, options);
        addToMap(layer);
        return layer;
      })
      .catch((err) => {
        if (err?.name === "AbortError" || signal?.aborted) {
          return;
        }
        console.error(`Failed to load GeoJSON from ${url}:`, err);
      });
  } else if (geo.json && typeof geo.json === "object") {
    try {
      const layer = L.geoJSON(geo.json as any, options);
      addToMap(layer);
      return Promise.resolve(layer);
    } catch (err) {
      console.error("Failed to parse inline GeoJSON:", err);
      return Promise.resolve();
    }
  }
  return Promise.resolve();
}

export function loadGeoLayers(
  geoList: Geo[],
  addToMap: (layer: L.GeoJSON) => void,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<(L.GeoJSON | void)[]> {
  if (!Array.isArray(geoList)) {
    return Promise.resolve([]);
  }
  return Promise.all(
    geoList.filter((geo): geo is Geo => Boolean(geo)).map((geo) => loadGeoLayer(geo, addToMap, fetchFn, signal)),
  );
}
