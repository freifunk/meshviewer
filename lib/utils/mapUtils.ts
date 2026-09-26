import { Map } from "leaflet";
import { Node } from "./node.js";

/**
 * Zoom ceiling used when neither the grid layer nor any base layer declares a maxZoom.
 * Matches the Leaflet default tile pyramid depth; only reached when the config is incomplete.
 */
export const DEFAULT_MAX_ZOOM = 18;

/**
 * Effective maxZoom for a grid layer: its own option first, then the map's, which Leaflet
 * derives from the active base layer (so satellite stacks deeper than 18 are honoured).
 */
export const getLayerMaxZoom = function getLayerMaxZoom(layer: { options: { maxZoom?: number } }, map: Map) {
  const maxZoom = layer.options.maxZoom ?? map.getMaxZoom();
  return Number.isFinite(maxZoom) ? maxZoom : DEFAULT_MAX_ZOOM;
};

export const getTileBBox = function getTileBBox(size: Point, map: Map, tileSize: number, margin: number) {
  let tl = map.unproject([size.x - margin, size.y - margin]);
  let br = map.unproject([size.x + margin + tileSize, size.y + margin + tileSize]);

  return { minX: br.lat, minY: tl.lng, maxX: tl.lat, maxY: br.lng };
};

export const positionClients = function positionClients(
  ctx: CanvasRenderingContext2D,
  point: Point,
  startAngle: number,
  node: Node,
  startDistance: number,
) {
  if (node.clients === 0) {
    return;
  }

  let radius = 3;
  let a = 1.2;
  let mode = 0;
  let config = window.config;

  ctx.beginPath();
  ctx.fillStyle = config.client.wifi24;

  for (let orbit = 0, i = 0; i < node.clients; orbit++) {
    let distance = startDistance + orbit * 2 * radius * a;
    let n = Math.floor((Math.PI * distance) / (a * radius));
    let delta = node.clients - i;

    for (let j = 0; j < Math.min(delta, n); i++, j++) {
      if (mode !== 1 && i >= node.clients_wifi24 + node.clients_wifi5) {
        mode = 1;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = config.client.wifi5;
      } else if (mode === 0 && i >= node.clients_wifi24) {
        mode = 2;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = config.client.other;
      }
      let angle = ((2 * Math.PI) / n) * j;
      let x = point.x + distance * Math.cos(angle + startAngle);
      let y = point.y + distance * Math.sin(angle + startAngle);

      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
  }
  ctx.fill();
};
