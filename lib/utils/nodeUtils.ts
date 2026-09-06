import { Node } from "./node.js";

export const hasLocation = function hasLocation(data: Node | {}) {
  return (
    "location" in data &&
    Boolean(data.location) &&
    typeof data.location.latitude === "number" &&
    typeof data.location.longitude === "number" &&
    Math.abs(data.location.latitude) < 90 &&
    Math.abs(data.location.longitude) < 180
  );
};

export const hasUplink = function hasUplink(data: Node | {}) {
  if (!("neighbours" in data) || !Array.isArray(data.neighbours)) {
    return false;
  }
  return data.neighbours.some(function (l) {
    return l.link.type === "vpn";
  });
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
