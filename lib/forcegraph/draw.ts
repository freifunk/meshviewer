import * as helper from "../utils/helper";
import { ZoomTransform } from "d3-zoom";
import { Link, Node } from "../utils/node";

type Highlight = { type: string; id: string } | null;

export interface MapNode extends Point {
  o: Node;
}

export interface MapLink extends Point {
  o: Link;
  source: MapNode;
  target: MapNode;
  color: string;
  color_to: string;
}

const self = {
  drawNode: undefined,
  drawLink: undefined,
  setCTX: undefined,
  setHighlight: undefined,
  setTransform: undefined,
  setMaxArea: undefined,
};

let ctx: CanvasRenderingContext2D; // Canvas context
let width: number;
let height: number;
let transform: ZoomTransform;
let highlight: Highlight;

let NODE_RADIUS = 15;
let LINE_RADIUS = 12;

function drawDetailNode(node: MapNode) {
  if (transform.k > 1 && node.o.is_online) {
    let config = window.config;
    helper.positionClients(ctx, node, Math.PI, node.o, 15);
    ctx.beginPath();
    let name = node.o.node_id;
    if (node.o) {
      name = node.o.hostname;
    }
    ctx.textAlign = "center";
    ctx.fillStyle = config.forceGraph.labelColor;
    ctx.fillText(name, node.x, node.y + 20);
  }
}

function drawHighlightNode(node: MapNode) {
  if (highlight && highlight.type === "node" && node.o.node_id === highlight.id) {
    let config = window.config;
    ctx.arc(node.x, node.y, NODE_RADIUS * 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = config.forceGraph.highlightColor;
    ctx.fill();
    ctx.beginPath();
  }
}

function drawHighlightLink(link: MapLink, to: number[]) {
  if (highlight && highlight.type === "link" && link.o.id === highlight.id) {
    let config = window.config;
    ctx.lineTo(to[0], to[1]);
    ctx.strokeStyle = config.forceGraph.highlightColor;
    ctx.lineWidth = LINE_RADIUS * 2;
    ctx.lineCap = "round";
    ctx.stroke();
    to = [link.source.x, link.source.y];
  }
  return to;
}

self.drawNode = function drawNode(node: MapNode) {
  if (
    node.x < transform.invertX(0) ||
    node.y < transform.invertY(0) ||
    transform.invertX(width) < node.x ||
    transform.invertY(height) < node.y
  ) {
    return;
  }
  ctx.beginPath();

  drawHighlightNode(node);

  let config = window.config;
  if (node.o.is_online) {
    ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
    if (node.o.is_gateway) {
      ctx.rect(node.x - 9, node.y - 9, 18, 18);
    }
    ctx.fillStyle = config.forceGraph.nodeColor;
  } else {
    ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = config.forceGraph.nodeOfflineColor;
  }

  ctx.fill();

  drawDetailNode(node);
};

self.drawLink = function drawLink(link: MapLink) {
  let zero = transform.invert([0, 0]);
  let area = transform.invert([width, height]);
  if (
    (link.source.x < zero[0] && link.target.x < zero[0]) ||
    (link.source.y < zero[1] && link.target.y < zero[1]) ||
    (link.source.x > area[0] && link.target.x > area[0]) ||
    (link.source.y > area[1] && link.target.y > area[1])
  ) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(link.source.x, link.source.y);
  let to = [link.target.x, link.target.y];

  to = drawHighlightLink(link, to);

  let grd = ctx.createLinearGradient(link.source.x, link.source.y, link.target.x, link.target.y);
  grd.addColorStop(0.45, link.color);
  grd.addColorStop(0.55, link.color_to);

  ctx.lineTo(to[0], to[1]);
  ctx.strokeStyle = grd;
  if (link.o.type.indexOf("vpn") === 0) {
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1.5;
  } else {
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2.5;
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
};

self.setCTX = function setCTX(newValue: CanvasRenderingContext2D) {
  ctx = newValue;
};

self.setHighlight = function setHighlight(newValue: Highlight) {
  highlight = newValue;
};

self.setTransform = function setTransform(newValue: ZoomTransform) {
  transform = newValue;
};

self.setMaxArea = function setMaxArea(newWidth: number, newHeight: number) {
  width = newWidth;
  height = newHeight;
};

export default self;
