import * as d3Drag from "d3-drag";
import * as d3Ease from "d3-ease";
import * as d3Force from "d3-force";
import * as d3Interpolate from "d3-interpolate";
import * as d3Selection from "d3-selection";
import * as d3Timer from "d3-timer";
import * as d3Zoom from "d3-zoom";

import math from "./utils/math.js";
import draw, { MapLink, MapNode } from "./forcegraph/draw.js";
import { Sidebar } from "./sidebar.js";
import { ClientPointEvent } from "d3-selection";
import { ObjectsLinksAndNodes } from "./datadistributor.js";
import { Link, Node, NodeId } from "./utils/node.js";

export const ForceGraph = function (linkScale: (t: any) => any, sidebar: ReturnType<typeof Sidebar>) {
  const self: {
    setData: (data: ObjectsLinksAndNodes) => void;
    resetView: () => void;
    gotoNode: (nodeData: Node, nodeDict: { [k: NodeId]: Node }) => void;
    gotoLink: (linkData: Link[]) => void;
    gotoLocation: () => void;
    destroy: () => void;
    render: (d: HTMLElement) => void;
  } = {
    setData: () => {},
    resetView: () => {},
    gotoNode: (_a, _b) => {},
    gotoLink: () => {},
    gotoLocation: () => {},
    destroy: () => {},
    render: () => {},
  };
  let el: HTMLElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let force: d3Force.Simulation<d3Force.SimulationNodeDatum, undefined> | null;
  let forceLink: d3Force.Force<d3Force.SimulationNodeDatum, undefined> & { links?: (links: any) => any };

  let transform = d3Zoom.zoomIdentity;
  let intNodes: MapNode[] = [];
  let dictNodes: Record<string, MapNode> = {};
  let intLinks: MapLink[] = [];
  let movetoTimer: ReturnType<typeof setTimeout>;
  let initial = 1.8;

  let NODE_RADIUS_DRAG = 10;
  let NODE_RADIUS_SELECT = 15;
  let LINK_RADIUS_SELECT = 12;
  let ZOOM_ANIMATE_DURATION = 350;

  let ZOOM_MIN = 1 / 8;
  let ZOOM_MAX = 3;

  let FORCE_ALPHA = 0.01;

  draw.setTransform(transform);

  function resizeCanvas() {
    canvas.width = el.offsetWidth;
    canvas.height = el.offsetHeight;
    draw.setMaxArea(canvas.width, canvas.height);
  }

  function transformPosition(p: { k: number; x: number; y: number }) {
    // @ts-expect-error d3 zoom transform mutation
    transform.x = p.x;
    // @ts-expect-error d3 zoom transform mutation
    transform.y = p.y;
    // @ts-expect-error d3 zoom transform mutation
    transform.k = p.k;
  }

  function moveTo(callback: () => number[], forceMove?: boolean) {
    clearTimeout(movetoTimer);
    if (!forceMove && force && force.alpha() > 0.3) {
      movetoTimer = setTimeout(function timerOfMoveTo() {
        moveTo(callback);
      }, 300);
      return;
    }
    const result = callback();
    const x = result[0];
    const y = result[1];
    const k = result[2];
    const end = {
      k: k,
      x: (canvas.width + sidebar.getWidth()) / 2 - x * k,
      y: canvas.height / 2 - y * k,
    };

    const start = { x: transform.x, y: transform.y, k: transform.k };

    const interpolate = d3Interpolate.interpolateObject(start, end);

    const timer = d3Timer.timer(function (t) {
      if (t >= ZOOM_ANIMATE_DURATION) {
        timer.stop();
        return;
      }

      const v = interpolate(d3Ease.easeQuadInOut(t / ZOOM_ANIMATE_DURATION));
      transformPosition(v);
      window.requestAnimationFrame(redraw);
    });
  }

  function onClick(event: Event & ClientPointEvent) {
    if (event.defaultPrevented) {
      return;
    }

    const click = transform.invert([event.clientX, event.clientY]);
    const point = { x: click[0], y: click[1] };
    const node = force?.find(point.x, point.y, NODE_RADIUS_SELECT);
    const router = window.router;

    if (node !== undefined) {
      // @ts-expect-error d3 simulation node has o
      router.fullUrl({ node: node.o.node_id });
      return;
    }

    let closedLink: MapLink | undefined;
    let radius = LINK_RADIUS_SELECT;
    intLinks.forEach(function (link: MapLink) {
      const distance = math.distanceLink(point, link.source, link.target);
      if (distance < radius) {
        closedLink = link;
        radius = distance;
      }
    });

    if (closedLink !== undefined) {
      router.fullUrl({ link: closedLink.o.id });
    }
  }

  function redraw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    intLinks.forEach((l) => draw.drawLink(l));
    intNodes.forEach((n) => draw.drawNode(n));

    ctx.restore();
  }

  el = document.createElement("div");
  el.classList.add("graph");

  forceLink = d3Force
    .forceLink()
    .distance(function (node) {
      // @ts-expect-error d3 node
      if (node.o.type.indexOf("vpn") === 0) {
        return 0;
      }
      return 75;
    })
    .strength(function (node) {
      // @ts-expect-error d3 node
      if (node.o.type.indexOf("vpn") === 0) {
        return 0.02;
      }
      // @ts-expect-error d3 node
      return Math.max(0.5, node.o.source_tq);
    });

  const zoom = d3Zoom
    .zoom()
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .on("zoom", function (event) {
      transform = event.transform;
      draw.setTransform(transform);
      redraw();
    });

  force = d3Force
    .forceSimulation()
    .force("link", forceLink)
    .force("charge", d3Force.forceManyBody())
    .force("x", d3Force.forceX().strength(0.02))
    .force("y", d3Force.forceY().strength(0.02))
    .force("collide", d3Force.forceCollide())
    .on("tick", redraw)
    .alphaDecay(0.025);

  const drag = d3Drag
    .drag()
    .subject(function (event) {
      const e = transform.invert([event.x, event.y]);
      const node = force?.find(e[0], e[1], NODE_RADIUS_DRAG);

      if (node !== undefined) {
        node.x = event.x;
        node.y = event.y;
        return node;
      }
      return undefined;
    })
    .on("start", function (event) {
      if (!event.active && force) {
        force.alphaTarget(FORCE_ALPHA).restart();
      }
      event.subject.fx = transform.invertX(event.subject.x);
      event.subject.fy = transform.invertY(event.subject.y);
    })
    .on("drag", function (event) {
      event.subject.fx = transform.invertX(event.x);
      event.subject.fy = transform.invertY(event.y);
    })
    .on("end", function (event) {
      if (!event.active && force) {
        force.alphaTarget(0);
      }
      event.subject.fx = null;
      event.subject.fy = null;
    });

  const canvasEl = d3Selection.select(el).append("canvas").on("click", onClick);
  canvasEl.call(drag as unknown as (selection: typeof canvasEl) => void);
  canvasEl.call(zoom as unknown as (selection: typeof canvasEl) => void);
  canvas = canvasEl.node()!;

  ctx = canvas.getContext("2d")!;
  draw.setCTX(ctx);

  window.addEventListener("resize", function () {
    resizeCanvas();
    redraw();
  });

  self.setData = function setData(data: ObjectsLinksAndNodes) {
    const nd = data.nodeDict ?? {};

    intNodes = data.nodes.all.map(function (nodeData) {
      let node = dictNodes[nodeData.node_id];
      if (!node) {
        node = {} as MapNode;
        dictNodes[nodeData.node_id] = node;
      }

      node.o = nodeData;

      return node;
    });

    intLinks = data.links
      .filter(function (link) {
        return nd[link.source.node_id].is_online && nd[link.target.node_id].is_online;
      })
      .map(function (link) {
        return {
          o: link,
          source: dictNodes[link.source.node_id],
          target: dictNodes[link.target.node_id],
          color: linkScale(link.source_tq),
          color_to: linkScale(link.target_tq),
          x: 0,
          y: 0,
        };
      });

    force!.nodes(intNodes);
    forceLink.links!(intLinks);

    force!.alpha(initial).velocityDecay(0.15).restart();
    if (initial === 1.8) {
      initial = 0.5;
    }

    resizeCanvas();
  };

  self.resetView = function resetView() {
    moveTo(function calcToReset() {
      const config = window.config;
      draw.setHighlight(null);
      return [0, 0, (ZOOM_MIN + config.forceGraph.zoomModifier) / 2];
    }, true);
  };

  self.gotoNode = function gotoNode(nodeData: Node, _nodeDict: { [k: NodeId]: Node }) {
    moveTo(function calcToNode() {
      draw.setHighlight({ type: "node", id: nodeData.node_id });
      const node = dictNodes[nodeData.node_id];
      if (node) {
        return [node.x!, node.y!, (ZOOM_MAX + 1) / 2];
      }
      const config = window.config;
      draw.setHighlight(null);
      return [0, 0, (ZOOM_MIN + config.forceGraph.zoomModifier) / 2];
    });
  };

  self.gotoLink = function gotoLink(linkData: Link[]) {
    moveTo(function calcToLink() {
      draw.setHighlight({ type: "link", id: linkData[0].id });
      const link = intLinks.find(function (link) {
        return link.o.id === linkData[0].id;
      });
      if (link) {
        return [(link.source.x! + link.target.x!) / 2, (link.source.y! + link.target.y!) / 2, ZOOM_MAX / 2 + ZOOM_MIN];
      }
      const config = window.config;
      draw.setHighlight(null);
      return [0, 0, (ZOOM_MIN + config.forceGraph.zoomModifier) / 2];
    });
  };

  self.gotoLocation = function gotoLocation() {
    // ignore
  };

  self.destroy = function destroy() {
    force?.stop();
    canvas.parentNode?.removeChild(canvas);
    force = null;

    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  };

  self.render = function render(d: HTMLElement) {
    d.appendChild(el);
    resizeCanvas();
  };

  return self;
};
