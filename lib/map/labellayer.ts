import L from "leaflet";
import moment from "moment";
import * as helper from "../utils/helper.js";
import RBush from "rbush";
import { Link, LinkScale, Node } from "../utils/node.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";
import { getLayerMaxZoom } from "../utils/mapUtils.js";

type LabelLocation = [CanvasTextAlign, CanvasTextBaseline, number];

const labelLocations: LabelLocation[] = [
  ["left", "middle", 0 / 8],
  ["center", "top", 6 / 8],
  ["right", "middle", 4 / 8],
  ["left", "top", 7 / 8],
  ["left", "ideographic", 1 / 8],
  ["right", "top", 5 / 8],
  ["center", "ideographic", 2 / 8],
  ["right", "ideographic", 3 / 8],
];
const nodeRadius = 4;

interface LabelTheme {
  fontFamily: string;
  color: string;
  shadow: string;
}

const defaultTheme: LabelTheme = { fontFamily: "sans-serif", color: "", shadow: "" };

function readTheme(): LabelTheme {
  const computedStyle = window.getComputedStyle(document.body);
  return {
    fontFamily: computedStyle.fontFamily,
    color: computedStyle.color,
    shadow: computedStyle.backgroundColor.replace(/rgb/i, "rgba").replace(/\)/i, ",0.7)"),
  };
}

function measureText(ctx: CanvasRenderingContext2D | null, font: string, text: string) {
  if (ctx?.measureText) {
    ctx.font = font;
    return ctx.measureText(text);
  }
  return { width: text.length * 7 };
}

export interface PreparedLabel {
  position: L.LatLng;
  label: string;
  /** Distance in pixels from the node marker to the label; direction is chosen during placement. */
  distance: number;
  fillStyle: string | null;
  height: number;
  font: string;
  stroke: boolean;
  width: number;
}

/** A label that has been assigned a collision-free anchor, pixel offset and minimum zoom. */
export interface PlacedLabel extends PreparedLabel {
  offset: [number, number];
  anchor: LabelLocation;
  minZoom: number;
}

export interface LabelRTreeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label: PlacedLabel;
}

export interface RectItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function mapRTree(element: PlacedLabel): LabelRTreeItem {
  return {
    minX: element.position.lat,
    minY: element.position.lng,
    maxX: element.position.lat,
    maxY: element.position.lng,
    label: element,
  };
}

function calcOffset(distance: number, loc: LabelLocation): [number, number] {
  return [distance * Math.cos(loc[2] * 2 * Math.PI), distance * Math.sin(loc[2] * 2 * Math.PI)];
}

function prepareLabel(
  measureCtx: CanvasRenderingContext2D | null,
  fontFamily: string,
  fillStyle: string | null,
  fontSize: number,
  distance: number,
  stroke: boolean,
) {
  return function (node: Node): PreparedLabel {
    let font = fontSize + "px " + fontFamily;
    return {
      position: L.latLng(node.location.latitude, node.location.longitude),
      label: node.hostname,
      distance: distance,
      fillStyle: fillStyle,
      height: fontSize * 1.2,
      font: font,
      stroke: stroke,
      width: measureText(measureCtx, font, node.hostname).width,
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
  let zoomSpan = maxZoom - minZoom;
  let margin = zoomSpan > 0 ? 1 + 1.41 * (1 - (z - minZoom) / zoomSpan) : 1;

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

interface LabelLayerGroups {
  online: L.FeatureGroup;
  offline: L.FeatureGroup;
  new: L.FeatureGroup;
  lost: L.FeatureGroup;
  lines: L.FeatureGroup;
}

export type LabelLayerOptions = L.GridLayerOptions & { minZoom?: number; maxZoom?: number };

export class LabelLayer extends L.GridLayer {
  declare options: LabelLayerOptions;
  private data?: LabelLayerData;
  private _onThemeChange: (() => void) | null = null;
  private _groups?: LabelLayerGroups;
  private _theme: LabelTheme;
  private _measureCtx: CanvasRenderingContext2D | null;
  private labels?: RBush<LabelRTreeItem>;
  private margin = 16;

  constructor(options?: LabelLayerOptions) {
    super(options);
    this._theme = defaultTheme;
    this._measureCtx = document.createElement("canvas").getContext("2d");
  }

  onAdd(map: L.Map) {
    super.onAdd(map);
    if (this.data) {
      this.prepareLabels();
    }
    this._onThemeChange = () => this.updateLayer();
    document.documentElement.addEventListener("themechange", this._onThemeChange);
    return this;
  }

  onRemove(map: L.Map) {
    if (this._onThemeChange) {
      document.documentElement.removeEventListener("themechange", this._onThemeChange);
      this._onThemeChange = null;
    }
    return super.onRemove(map);
  }

  setData(
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
    if (this._groups) {
      Object.values(this._groups).forEach((group) => {
        group.clearLayers();
        map.removeLayer(group);
      });
    }

    let lines = addLinksToMap(linkDict, linkScale, data.links);

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

    // Order determines stacking: lines below markers, online/new on top
    this._groups = {
      lines: L.featureGroup(lines).addTo(map),
      offline: L.featureGroup(markersOffline).addTo(map),
      lost: L.featureGroup(markersLost).addTo(map),
      online: L.featureGroup(markersOnline).addTo(map),
      new: L.featureGroup(markersNew).addTo(map),
    };

    this.data = {
      online: nodesOnline,
      offline: nodesOffline,
      new: nodesNew,
      lost: nodesLost,
    };
    this.updateLayer();
  }

  private updateLayer() {
    if (this._map) {
      this.prepareLabels();
    }
  }

  private prepareLabels() {
    let nodes = this.data;
    if (!nodes || !this._map) {
      return;
    }
    let config = window.config;
    let map = this._map;

    this._theme = readTheme();
    const label = (fillStyle: string | null, fontSize: number, distance: number, stroke: boolean) =>
      prepareLabel(this._measureCtx, this._theme.fontFamily, fillStyle, fontSize, distance, stroke);

    let labelsOnline = nodes.online.map(label(null, 11, 8, true));
    let labelsOffline = nodes.offline.map(label(config.icon?.offline?.color ?? null, 9, 5, false));
    let labelsNew = nodes.new.map(label(config.map?.labelNewColor ?? null, 11, 8, true));
    let labelsLost = nodes.lost.map(label(config.icon?.lost?.color ?? null, 11, 8, true));

    let prepared: PreparedLabel[] = [...labelsNew, ...labelsLost, ...labelsOnline, ...labelsOffline];

    let minZoom = this.options.minZoom ?? 0;
    let maxZoom = getLayerMaxZoom(this, map);

    let trees: RBush<RectItem>[] = [];

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
      trees[z]!.load(prepared.map(nodeToRect(z)));
    }

    let labels = prepared
      .map(function (label: PreparedLabel): PlacedLabel | undefined {
        let best = labelLocations
          .map(function (loc) {
            let offset = calcOffset(label.distance, loc);
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

        if (best === undefined) {
          return undefined;
        }

        let placed: PlacedLabel = {
          ...label,
          offset: calcOffset(label.distance, best.loc),
          minZoom: best.z,
          anchor: best.loc,
        };

        for (let i = maxZoom; i >= best.z; i--) {
          let point = map.project(placed.position, i);
          let rect = labelRect(point, placed.offset, placed.anchor, placed, minZoom, maxZoom, i);
          trees[i]!.insert(rect);
        }

        return placed;
      })
      .filter(function (label): label is PlacedLabel {
        return label !== undefined;
      });

    this.margin = 16;

    if (labels.length > 0) {
      this.margin += labels
        .map(function (label: PlacedLabel) {
          return label.width;
        })
        .sort((a, b) => b - a)[0]!;
    }

    this.labels = new RBush<LabelRTreeItem>(9);
    this.labels.load(labels.map(mapRTree));

    this.redraw();
  }

  protected createTile(tilePoint: L.Coords) {
    let tile = L.DomUtil.create("canvas", "leaflet-tile") as HTMLCanvasElement;

    let tileSize = this.getTileSize().x;
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.labels || !this._map) {
      return tile;
    }

    let size = tilePoint.multiplyBy(tileSize);
    let map = this._map;
    let theme = this._theme;

    function projectNodes(d: LabelRTreeItem) {
      let point = map.project(d.label.position);

      point.x -= size.x;
      point.y -= size.y;

      return { p: point, label: d.label };
    }

    let bbox = helper.getTileBBox(size, map, tileSize, this.margin);
    let labels = this.labels.search(bbox).map(projectNodes);
    let ctx = tile.getContext("2d")!;

    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.shadow;
    ctx.miterLimit = 2;

    function drawLabel(labelPoint: { p: L.Point; label: PlacedLabel }) {
      ctx.font = labelPoint.label.font;
      ctx.textAlign = labelPoint.label.anchor[0];
      ctx.textBaseline = labelPoint.label.anchor[1];
      ctx.fillStyle = labelPoint.label.fillStyle ?? theme.color;

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
        return tilePoint.z >= label.label.minZoom;
      })
      .forEach(drawLabel);

    return tile;
  }
}
