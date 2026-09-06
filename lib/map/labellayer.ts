import L from "leaflet";
import moment from "moment";
import * as helper from "../utils/helper.js";
import RBush from "rbush";
import { Link, LinkScale, Node } from "../utils/node.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";

let groupOnline: L.FeatureGroup | undefined;
let groupOffline: L.FeatureGroup | undefined;
let groupNew: L.FeatureGroup | undefined;
let groupLost: L.FeatureGroup | undefined;
let groupLines: L.FeatureGroup | undefined;

type LabelLocation = [string, CanvasTextBaseline, number];

let labelLocations: LabelLocation[] = [
  ["left", "middle", 0 / 8],
  ["center", "top", 6 / 8],
  ["right", "middle", 4 / 8],
  ["left", "top", 7 / 8],
  ["left", "ideographic", 1 / 8],
  ["right", "top", 5 / 8],
  ["center", "ideographic", 2 / 8],
  ["right", "ideographic", 3 / 8],
];
let labelShadow: string;
let bodyStyle = { fontFamily: "sans-serif", backgroundColor: "", color: "" };
let nodeRadius = 4;

let cFont = document.createElement("canvas").getContext("2d");

function measureText(font: string, text: string) {
  if (cFont?.measureText) {
    cFont.font = font;
    return cFont.measureText(text);
  }
  return { width: text.length * 7 };
}

export interface PreparedLabel {
  position: L.LatLng;
  label: string;
  offset: [number, number];
  fillStyle: string | null;
  height: number;
  font: string;
  stroke: boolean;
  width: number;
  minZoom?: number;
  anchor?: LabelLocation;
}

export interface LabelRTreeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label: PreparedLabel;
}

export interface RectItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function mapRTree(element: PreparedLabel): LabelRTreeItem {
  return {
    minX: element.position.lat,
    minY: element.position.lng,
    maxX: element.position.lat,
    maxY: element.position.lng,
    label: element,
  };
}

function calcOffset(offset: number, loc: LabelLocation): [number, number] {
  return [offset * Math.cos(loc[2] * 2 * Math.PI), offset * Math.sin(loc[2] * 2 * Math.PI)];
}

function prepareLabel(fillStyle: string | null, fontSize: number, offset: number, stroke: boolean) {
  return function (node: Node): PreparedLabel {
    let font = fontSize + "px " + bodyStyle.fontFamily;
    return {
      position: L.latLng(node.location.latitude, node.location.longitude),
      label: node.hostname,
      offset: calcOffset(offset, labelLocations[0]!),
      fillStyle: fillStyle,
      height: fontSize * 1.2,
      font: font,
      stroke: stroke,
      width: measureText(font, node.hostname).width,
    };
  };
}

function labelRect(
  point: L.Point,
  offset: [number, number],
  anchor: LabelLocation,
  label: PreparedLabel,
  minZoom: number,
  maxZoom: number,
  z: number,
): RectItem {
  let margin = 1 + 1.41 * (1 - (z - minZoom) / (maxZoom - minZoom));

  let width = label.width * margin;
  let height = label.height * margin;

  let dx: Record<string, number> = {
    left: 0,
    right: -width,
    center: -width / 2,
  };

  let dy: Record<string, number> = {
    top: 0,
    ideographic: -height,
    middle: -height / 2,
  };

  let x = point.x + offset[0] + (dx[anchor[0]] ?? 0);
  let y = point.y + offset[1] + (dy[anchor[1]] ?? 0);

  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

export type StyledMarker = L.CircleMarker & { resetStyle?: () => void };
export type StyledPolyline = L.Polyline & { resetStyle?: () => void };

function mkMarker(dict: Record<string, StyledMarker>, iconFunc: (node: Node) => L.PathOptions) {
  return function (node: Node) {
    let marker = L.circleMarker([node.location.latitude, node.location.longitude], iconFunc(node)) as StyledMarker;

    marker.resetStyle = function resetStyle() {
      marker.setStyle(iconFunc(node));
    };

    marker.on("click", function () {
      window.router?.fullUrl({ node: node.node_id });
    });
    marker.bindTooltip(helper.escape(node.hostname));

    dict[node.node_id] = marker;

    return marker;
  };
}

function addLinksToMap(dict: Record<string, StyledPolyline>, linkScale: LinkScale, graph: Link[]) {
  let config = window.config;
  const filtered = graph.filter(function (link) {
    return "distance" in link && link.type.indexOf("vpn") !== 0;
  });

  return filtered.map(function (link) {
    let linkColor: string;
    if (link.type.indexOf("other") == 0 && link.source_tq >= 0.99 && link.target_tq >= 0.99) {
      linkColor = config.map.otherLinkColor;
    } else {
      linkColor = linkScale((link.source_tq + link.target_tq) / 2);
    }

    let opts: L.PolylineOptions = {
      color: linkColor,
      weight: 4,
      opacity: 0.5,
      dashArray: "none",
    };

    let line = L.polyline(link.latlngs ?? [], opts) as StyledPolyline;

    line.resetStyle = function resetStyle() {
      line.setStyle(opts);
    };

    line.bindTooltip(
      helper.escape(link.source.hostname + " – " + link.target.hostname) +
        "<br><strong>" +
        helper.showDistance(link) +
        " / " +
        helper.showTq(link.source_tq) +
        " - " +
        helper.showTq(link.target_tq) +
        "<br>" +
        link.type +
        "</strong>",
    );

    line.on("click", function () {
      window.router?.fullUrl({ link: link.id });
    });

    dict[link.id] = line;

    return line;
  });
}

function getIcon(color: string): L.PathOptions {
  let config = window.config;
  const colorOptions = (config.icon as Record<string, L.PathOptions>)[color] ?? {};
  return Object.assign({}, config.icon.base, colorOptions);
}

export interface LabelLayerData {
  online: Node[];
  offline: Node[];
  new: Node[];
  lost: Node[];
}
export interface LabelLayerInstance {
  data?: LabelLayerData;
  _map?: L.Map;
  _onThemeChange?: (() => void) | null;
  labels?: RBush<LabelRTreeItem>;
  margin?: number;
  options: L.GridLayerOptions & { minZoom?: number; maxZoom?: number };
  addTo(map: L.Map): this;
  redraw(): this;
  setZIndex(zIndex: number): this;
  prepareLabels(): void;
  updateLayer(): void;
  setData(
    data: ObjectsLinksAndNodes,
    map: L.Map,
    nodeDict: Record<string, StyledMarker>,
    linkDict: Record<string, StyledPolyline>,
    linkScale: LinkScale,
  ): void;
}

export const LabelLayer = L.GridLayer.extend({
  onAdd: function (this: LabelLayerInstance, map: L.Map) {
    L.GridLayer.prototype.onAdd.call(this, map);
    if (this.data) {
      this.prepareLabels();
    }
    this._onThemeChange = () => this.updateLayer();
    document.documentElement.addEventListener("themechange", this._onThemeChange);
  },
  onRemove: function (this: LabelLayerInstance, map: L.Map) {
    if (this._onThemeChange) {
      document.documentElement.removeEventListener("themechange", this._onThemeChange);
      this._onThemeChange = null;
    }
    L.GridLayer.prototype.onRemove.call(this, map);
  },
  setData: function (
    this: LabelLayerInstance,
    data: ObjectsLinksAndNodes,
    map: L.Map,
    nodeDict: Record<string, StyledMarker>,
    linkDict: Record<string, StyledPolyline>,
    linkScale: LinkScale,
  ) {
    let config = window.config;
    let iconOnline = getIcon("online");
    let iconOffline = getIcon("offline");
    let iconLost = getIcon("lost");
    let iconAlert = getIcon("alert");
    let iconNew = getIcon("new");
    let iconOnlineUplink = Object.assign({}, iconOnline, config.icon["online.uplink"]);
    let iconNewUplink = Object.assign({}, iconNew, config.icon["new.uplink"]);

    // Check if init or data is already set
    if (groupLines) {
      groupOffline?.clearLayers();
      groupOnline?.clearLayers();
      groupNew?.clearLayers();
      groupLost?.clearLayers();
      groupLines?.clearLayers();
    }

    let lines = addLinksToMap(linkDict, linkScale, data.links);
    groupLines = L.featureGroup(lines).addTo(map);

    let nodesOnline = helper.subtract(data.nodes.online, data.nodes.new).filter(helper.hasLocation);
    let nodesOffline = helper.subtract(data.nodes.offline, data.nodes.lost).filter(helper.hasLocation);
    let nodesNew = data.nodes.new.filter(helper.hasLocation);
    let nodesLost = data.nodes.lost.filter(helper.hasLocation);

    let markersOnline = nodesOnline.map(
      mkMarker(nodeDict, function (node) {
        if (helper.hasUplink(node)) {
          return iconOnlineUplink;
        }
        return iconOnline;
      }),
    );

    let markersOffline = nodesOffline.map(
      mkMarker(nodeDict, function () {
        return iconOffline;
      }),
    );

    let markersNew = nodesNew.map(
      mkMarker(nodeDict, function (node) {
        if (helper.hasUplink(node)) {
          return iconNewUplink;
        }
        return iconNew;
      }),
    );

    let markersLost = nodesLost.map(
      mkMarker(nodeDict, function (node) {
        let config = window.config;
        let age = moment(data.now).diff(node.lastseen, "days", true);
        if (age <= config.maxAgeAlert) {
          return iconAlert;
        }
        if (age <= config.maxAge) {
          return iconLost;
        }
        return {};
      }),
    );

    groupOffline = L.featureGroup(markersOffline).addTo(map);
    groupLost = L.featureGroup(markersLost).addTo(map);
    groupOnline = L.featureGroup(markersOnline).addTo(map);
    groupNew = L.featureGroup(markersNew).addTo(map);

    this.data = {
      online: nodesOnline,
      offline: nodesOffline,
      new: nodesNew,
      lost: nodesLost,
    };
    this.updateLayer();
  },
  updateLayer: function (this: LabelLayerInstance) {
    if (this._map) {
      this.prepareLabels();
    }
  },
  prepareLabels: function (this: LabelLayerInstance) {
    let nodes = this.data;
    if (!nodes || !this._map) {
      return;
    }
    let config = window.config;

    let labelsOnline = nodes.online.map(prepareLabel(null, 11, 8, true));
    let labelsOffline = nodes.offline.map(prepareLabel(config.icon?.offline?.color ?? null, 9, 5, false));
    let labelsNew = nodes.new.map(prepareLabel(config.map?.labelNewColor ?? null, 11, 8, true));
    let labelsLost = nodes.lost.map(prepareLabel(config.icon?.lost?.color ?? null, 11, 8, true));

    let labels: PreparedLabel[] = [...labelsNew, ...labelsLost, ...labelsOnline, ...labelsOffline];

    let minZoom = this.options.minZoom ?? 0;
    let maxZoom = this.options.maxZoom ?? 18;

    let trees: RBush<RectItem>[] = [];

    let map = this._map;

    function nodeToRect(z: number) {
      return function (element: PreparedLabel): RectItem {
        let point = map.project(element.position, z);
        return {
          minX: point.x - nodeRadius,
          minY: point.y - nodeRadius,
          maxX: point.x + nodeRadius,
          maxY: point.y + nodeRadius,
        };
      };
    }

    for (let z = minZoom; z <= maxZoom; z++) {
      trees[z] = new RBush<RectItem>(9);
      trees[z]!.load(labels.map(nodeToRect(z)));
    }

    labels = labels
      .map(function (label: PreparedLabel) {
        let best = labelLocations
          .map(function (loc) {
            let offset = calcOffset(label.offset[0], loc);
            let i: number;

            for (i = maxZoom; i >= minZoom; i--) {
              let point = map.project(label.position, i);
              let rect = labelRect(point, offset, loc, label, minZoom, maxZoom, i);
              let candidates = trees[i]!.search(rect);

              if (candidates.length > 0) {
                break;
              }
            }

            return { loc: loc, z: i + 1 };
          })
          .filter(function (loc) {
            return loc.z <= maxZoom;
          })
          .sort(function (a, b) {
            return a.z - b.z;
          })[0];

        if (best !== undefined) {
          label.offset = calcOffset(label.offset[0], best.loc);
          label.minZoom = best.z;
          label.anchor = best.loc;

          for (let i = maxZoom; i >= best.z; i--) {
            let point = map.project(label.position, i);
            let rect = labelRect(point, label.offset, best.loc, label, minZoom, maxZoom, i);
            trees[i]!.insert(rect);
          }

          return label;
        }
        return undefined;
      })
      .filter(function (label): label is PreparedLabel {
        return label !== undefined;
      });

    this.margin = 16;

    if (labels.length > 0) {
      this.margin += labels
        .map(function (label: PreparedLabel) {
          return label.width;
        })
        .sort((a, b) => b - a)[0]!;
    }

    this.labels = new RBush<LabelRTreeItem>(9);
    this.labels.load(labels.map(mapRTree));

    this.redraw();
  },
  createTile: function (this: LabelLayerInstance, tilePoint: L.Coords) {
    let tile = L.DomUtil.create("canvas", "leaflet-tile") as HTMLCanvasElement;

    let tileSize = Number(this.options.tileSize ?? 256);
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.labels || !this._map) {
      return tile;
    }

    let size = tilePoint.multiplyBy(tileSize);
    let map = this._map;
    const computedStyle = window.getComputedStyle(document.querySelector("body")!);
    bodyStyle = {
      fontFamily: computedStyle.fontFamily,
      backgroundColor: computedStyle.backgroundColor,
      color: computedStyle.color,
    };
    labelShadow = bodyStyle.backgroundColor.replace(/rgb/i, "rgba").replace(/\)/i, ",0.7)");

    function projectNodes(d: LabelRTreeItem) {
      let point = map.project(d.label.position);

      point.x -= size.x;
      point.y -= size.y;

      return { p: point, label: d.label };
    }

    let bbox = helper.getTileBBox(size, map, tileSize, this.margin ?? 16);
    let labels = this.labels.search(bbox).map(projectNodes);
    let ctx = tile.getContext("2d")!;

    ctx.lineWidth = 5;
    ctx.strokeStyle = labelShadow;
    ctx.miterLimit = 2;

    function drawLabel(labelPoint: { p: L.Point; label: PreparedLabel }) {
      ctx.font = labelPoint.label.font;
      ctx.textAlign = (labelPoint.label.anchor?.[0] as CanvasTextAlign) ?? "left";
      ctx.textBaseline = (labelPoint.label.anchor?.[1] as CanvasTextBaseline) ?? "middle";
      ctx.fillStyle = labelPoint.label.fillStyle === null ? bodyStyle.color : labelPoint.label.fillStyle;

      if (labelPoint.label.stroke) {
        ctx.strokeText(
          labelPoint.label.label,
          labelPoint.p.x + labelPoint.label.offset[0],
          labelPoint.p.y + labelPoint.label.offset[1],
        );
      }

      ctx.fillText(
        labelPoint.label.label,
        labelPoint.p.x + labelPoint.label.offset[0],
        labelPoint.p.y + labelPoint.label.offset[1],
      );
    }

    labels
      .filter(function (label) {
        return label.label.minZoom !== undefined && tilePoint.z >= label.label.minZoom;
      })
      .forEach(drawLabel);

    return tile;
  },
}) as unknown as { new (options?: L.GridLayerOptions & { minZoom?: number }): LabelLayerInstance };
