import L from "leaflet";
import { Geo } from "../config_default.js";
import { escape } from "../utils/escape.js";

export type GeoErrorHandler = (message: string, err: unknown) => void;

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

function reportError(message: string, err: unknown, onError?: GeoErrorHandler) {
  console.error(message, err);
  if (onError) {
    onError(message, err);
  }
}

export function loadGeoLayer(
  geo: Geo,
  addToMap: (layer: L.GeoJSON) => void,
  fetchFn: typeof fetch = fetch,
  onError?: GeoErrorHandler,
): Promise<L.GeoJSON | void> {
  const options = getGeoOptions(geo.option);

  if (geo.url) {
    const url = geo.url;
    return fetchFn(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const layer = L.geoJSON(data, options);
        addToMap(layer);
        return layer;
      })
      .catch((err) => {
        reportError(`Failed to load GeoJSON from ${url}:`, err, onError);
      });
  } else if (geo.json && typeof geo.json === "object") {
    try {
      const layer = L.geoJSON(geo.json, options);
      addToMap(layer);
      return Promise.resolve(layer);
    } catch (err) {
      reportError("Failed to parse inline GeoJSON:", err, onError);
      return Promise.resolve();
    }
  }
  return Promise.resolve();
}

export function loadGeoLayers(
  geoList: Geo[],
  addToMap: (layer: L.GeoJSON) => void,
  fetchFn: typeof fetch = fetch,
  onError?: GeoErrorHandler,
): Promise<(L.GeoJSON | void)[]> {
  if (!Array.isArray(geoList)) {
    return Promise.resolve([]);
  }
  return Promise.all(
    geoList.filter((geo): geo is Geo => Boolean(geo)).map((geo) => loadGeoLayer(geo, addToMap, fetchFn, onError)),
  );
}
