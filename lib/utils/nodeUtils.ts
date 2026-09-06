import { Node } from "./node.js";

export const hasLocation = function hasLocation(data: Node | {}) {
  return "location" in data && Math.abs(data.location.latitude) < 90 && Math.abs(data.location.longitude) < 180;
};

export const hasUplink = function hasUplink(data: Node | {}) {
  if (!("neighbours" in data)) {
    return false;
  }
  let uplink = false;
  data.neighbours.forEach(function (l) {
    if (l.link.type === "vpn") {
      uplink = true;
    }
  });
  return uplink;
};

export const subtract = function subtract(a: Node[], b: Node[]) {
  const ids: Record<string, boolean> = {};

  b.forEach(function (d) {
    ids[d.node_id] = true;
  });

  return a.filter(function (d) {
    return !ids[d.node_id];
  });
};
