import * as L from "leaflet";
import moment from "moment";

import * as helper from "../utils/helper";
import RBush from "rbush";

let groupOnline;
let groupOffline;
let groupNew;
let groupLost;
let groupLines;

let labelLocations = [
  ["left", "middle", 0 / 8],
  ["center", "top", 6 / 8],
  ["right", "middle", 4 / 8],
  ["left", "top", 7 / 8],
  ["left", "ideographic", 1 / 8],
  ["right", "top", 5 / 8],
  ["center", "ideographic", 2 / 8],
  ["right", "ideographic", 3 / 8],
];
let labelShadow;
let bodyStyle = { fontFamily: "sans-serif" };
let nodeRadius = 4;

let cFont = document.createElement("canvas").getContext("2d");

function measureText(font, text) {
  cFont.font = font;
  return cFont.measureText(text);
}

function mapRTree(element) {
  return {
    minX: element.position.lat,
    minY: element.position.lng,
    maxX: element.position.lat,
    maxY: element.position.lng,
    label: element,
  };
}

function prepareLabel(fillStyle, fontSize, offset, stroke) {
  return function (node) {
    let font = fontSize + "px " + bodyStyle.fontFamily;
    return {
      position: L.latLng(node.location.latitude, node.location.longitude),
      label: node.hostname,
      offset: offset,
      fillStyle: fillStyle,
      height: fontSize * 1.2,
      font: font,
      stroke: stroke,
      width: measureText(font, node.hostname).width,
    };
  };
}

function calcOffset(offset, loc) {
  return [offset * Math.cos(loc[2] * 2 * Math.PI), offset * Math.sin(loc[2] * 2 * Math.PI)];
}

function labelRect(point, offset, anchor, label, minZoom, maxZoom, z) {
  let margin = 1 + 1.41 * (1 - (z - minZoom) / (maxZoom - minZoom));

  let width = label.width * margin;
  let height = label.height * margin;

  let dx = {
    left: 0,
    right: -width,
    center: -width / 2,
  };

  let dy = {
    top: 0,
    ideographic: -height,
    middle: -height / 2,
  };

  let x = point.x + offset[0] + dx[anchor[0]];
  let y = point.y + offset[1] + dy[anchor[1]];

  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

function mkMarker(dict, iconFunc) {
  return function (node) {
    let marker = L.circleMarker([node.location.latitude, node.location.longitude], iconFunc(node));

    marker.resetStyle = function resetStyle() {
      marker.setStyle(iconFunc(node));
    };

    marker.on("click", function () {
      router.fullUrl({ node: node.node_id });
    });
    marker.bindTooltip(helper.escape(node.hostname));

    dict[node.node_id] = marker;

    return marker;
  };
}

function addLinksToMap(dict, linkScale, graph) {
  graph = graph.filter(function (link) {
    return "distance" in link && link.type.indexOf("vpn") !== 0;
  });

  return graph.map(function (link) {
    let opts = {
      color: linkScale((link.source_tq + link.target_tq) / 2),
      weight: 4,
      opacity: 0.5,
      dashArray: "none",
    };

    let line = L.polyline(link.latlngs, opts);

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
      router.fullUrl({ link: link.id });
    });

    dict[link.id] = line;

    return line;
  });
}

function getIcon(color) {
  let config = window.config;
  return Object.assign({}, config.icon.base, config.icon[color]);
}

export const LabelLayer = L.GridLayer.extend({
  onAdd: function (map) {
    L.GridLayer.prototype.onAdd.call(this, map);
    if (this.data) {
      this.prepareLabels();
    }
  },
  setData: function (data, map, nodeDict, linkDict, linkScale) {
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
      groupOffline.clearLayers();
      groupOnline.clearLayers();
      groupNew.clearLayers();
      groupLost.clearLayers();
      groupLines.clearLayers();
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
        return null;
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
  updateLayer: function () {
    if (this._map) {
      this.prepareLabels();
    }
  },
  prepareLabels: function () {
    let nodes = this.data;
    let config = window.config;

    // label:
    // - position (WGS84 coords)
    // - offset (2D vector in pixels)
    // - anchor (tuple, textAlignment, textBaseline)
    // - minZoom (inclusive)
    // - label (string)
    // - color (string)

    let labelsOnline = nodes.online.map(prepareLabel(null, 11, 8, true));
    let labelsOffline = nodes.offline.map(prepareLabel(config.icon.offline.color, 9, 5, false));
    let labelsNew = nodes.new.map(prepareLabel(config.map.labelNewColor, 11, 8, true));
    let labelsLost = nodes.lost.map(prepareLabel(config.icon.lost.color, 11, 8, true));

    let labels = [].concat(labelsNew).concat(labelsLost).concat(labelsOnline).concat(labelsOffline);

    let minZoom = this.options.minZoom;
    let maxZoom = this.options.maxZoom;

    let trees = [];

    let map = this._map;

    function nodeToRect(z) {
      return function (element) {
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
      trees[z] = new RBush(9);
      trees[z].load(labels.map(nodeToRect(z)));
    }

    labels = labels
      .map(function (label) {
        let best = labelLocations
          .map(function (loc) {
            let offset = calcOffset(label.offset, loc);
            let i;

            for (i = maxZoom; i >= minZoom; i--) {
              let point = map.project(label.position, i);
              let rect = labelRect(point, offset, loc, label, minZoom, maxZoom, i);
              let candidates = trees[i].search(rect);

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
          label.offset = calcOffset(label.offset, best.loc);
          label.minZoom = best.z;
          label.anchor = best.loc;

          for (let i = maxZoom; i >= best.z; i--) {
            let point = map.project(label.position, i);
            let rect = labelRect(point, label.offset, best.loc, label, minZoom, maxZoom, i);
            trees[i].insert(rect);
          }

          return label;
        }
        return undefined;
      })
      .filter(function (label) {
        return label !== undefined;
      });

    this.margin = 16;

    if (labels.length > 0) {
      this.margin += labels
        .map(function (label) {
          return label.width;
        })
        .sort()
        .reverse()[0];
    }

    this.labels = new RBush(9);
    this.labels.load(labels.map(mapRTree));

    this.redraw();
  },
  createTile: function (tilePoint) {
    let tile = L.DomUtil.create("canvas", "leaflet-tile");

    let tileSize = this.options.tileSize;
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.labels) {
      return tile;
    }

    let size = tilePoint.multiplyBy(tileSize);
    let map = this._map;
    bodyStyle = window.getComputedStyle(document.querySelector("body"));
    labelShadow = bodyStyle.backgroundColor.replace(/rgb/i, "rgba").replace(/\)/i, ",0.7)");

    function projectNodes(d) {
      let point = map.project(d.label.position);

      point.x -= size.x;
      point.y -= size.y;

      return { p: point, label: d.label };
    }

    let bbox = helper.getTileBBox(size, map, tileSize, this.margin);
    let labels = this.labels.search(bbox).map(projectNodes);
    let ctx = tile.getContext("2d");

    ctx.lineWidth = 5;
    ctx.strokeStyle = labelShadow;
    ctx.miterLimit = 2;

    function drawLabel(labelPoint) {
      ctx.font = labelPoint.label.font;
      ctx.textAlign = labelPoint.label.anchor[0];
      ctx.textBaseline = labelPoint.label.anchor[1];
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
        return tilePoint.z >= label.label.minZoom;
      })
      .forEach(drawLabel);

    return tile;
  },
});
