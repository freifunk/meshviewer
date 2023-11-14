import * as L from "leaflet";
import moment from "moment";

import * as helper from "../utils/helper";
import RBush from "rbush";

var groupOnline;
var groupOffline;
var groupNew;
var groupLost;
var groupLines;

var labelLocations = [
  ["left", "middle", 0 / 8],
  ["center", "top", 6 / 8],
  ["right", "middle", 4 / 8],
  ["left", "top", 7 / 8],
  ["left", "ideographic", 1 / 8],
  ["right", "top", 5 / 8],
  ["center", "ideographic", 2 / 8],
  ["right", "ideographic", 3 / 8],
];
var labelShadow;
var bodyStyle = { fontFamily: "sans-serif" };
var nodeRadius = 4;

var cFont = document.createElement("canvas").getContext("2d");

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
    var font = fontSize + "px " + bodyStyle.fontFamily;
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
  var margin = 1 + 1.41 * (1 - (z - minZoom) / (maxZoom - minZoom));

  var width = label.width * margin;
  var height = label.height * margin;

  var dx = {
    left: 0,
    right: -width,
    center: -width / 2,
  };

  var dy = {
    top: 0,
    ideographic: -height,
    middle: -height / 2,
  };

  var x = point.x + offset[0] + dx[anchor[0]];
  var y = point.y + offset[1] + dy[anchor[1]];

  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

function mkMarker(dict, iconFunc) {
  return function (node) {
    var marker = L.circleMarker([node.location.latitude, node.location.longitude], iconFunc(node));

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
    var opts = {
      color: linkScale((link.source_tq + link.target_tq) / 2),
      weight: 4,
      opacity: 0.5,
      dashArray: "none",
    };

    var line = L.polyline(link.latlngs, opts);

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
    var iconOnline = getIcon("online");
    var iconOffline = getIcon("offline");
    var iconLost = getIcon("lost");
    var iconAlert = getIcon("alert");
    var iconNew = getIcon("new");
    var iconOnlineUplink = Object.assign({}, iconOnline, config.icon["online.uplink"]);
    var iconNewUplink = Object.assign({}, iconNew, config.icon["new.uplink"]);

    // Check if init or data is already set
    if (groupLines) {
      groupOffline.clearLayers();
      groupOnline.clearLayers();
      groupNew.clearLayers();
      groupLost.clearLayers();
      groupLines.clearLayers();
    }

    var lines = addLinksToMap(linkDict, linkScale, data.links);
    groupLines = L.featureGroup(lines).addTo(map);

    var nodesOnline = helper.subtract(data.nodes.online, data.nodes.new).filter(helper.hasLocation);
    var nodesOffline = helper.subtract(data.nodes.offline, data.nodes.lost).filter(helper.hasLocation);
    var nodesNew = data.nodes.new.filter(helper.hasLocation);
    var nodesLost = data.nodes.lost.filter(helper.hasLocation);

    var markersOnline = nodesOnline.map(
      mkMarker(nodeDict, function (node) {
        if (helper.hasUplink(node)) {
          return iconOnlineUplink;
        }
        return iconOnline;
      }),
    );

    var markersOffline = nodesOffline.map(
      mkMarker(nodeDict, function () {
        return iconOffline;
      }),
    );

    var markersNew = nodesNew.map(
      mkMarker(nodeDict, function (node) {
        if (helper.hasUplink(node)) {
          return iconNewUplink;
        }
        return iconNew;
      }),
    );

    var markersLost = nodesLost.map(
      mkMarker(nodeDict, function (node) {
        var age = moment(data.now).diff(node.lastseen, "days", true);
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
    var nodes = this.data;

    // label:
    // - position (WGS84 coords)
    // - offset (2D vector in pixels)
    // - anchor (tuple, textAlignment, textBaseline)
    // - minZoom (inclusive)
    // - label (string)
    // - color (string)

    var labelsOnline = nodes.online.map(prepareLabel(null, 11, 8, true));
    var labelsOffline = nodes.offline.map(prepareLabel(config.icon.offline.color, 9, 5, false));
    var labelsNew = nodes.new.map(prepareLabel(config.map.labelNewColor, 11, 8, true));
    var labelsLost = nodes.lost.map(prepareLabel(config.icon.lost.color, 11, 8, true));

    var labels = [].concat(labelsNew).concat(labelsLost).concat(labelsOnline).concat(labelsOffline);

    var minZoom = this.options.minZoom;
    var maxZoom = this.options.maxZoom;

    var trees = [];

    var map = this._map;

    function nodeToRect(z) {
      return function (element) {
        var point = map.project(element.position, z);
        return {
          minX: point.x - nodeRadius,
          minY: point.y - nodeRadius,
          maxX: point.x + nodeRadius,
          maxY: point.y + nodeRadius,
        };
      };
    }

    for (var z = minZoom; z <= maxZoom; z++) {
      trees[z] = new RBush(9);
      trees[z].load(labels.map(nodeToRect(z)));
    }

    labels = labels
      .map(function (label) {
        var best = labelLocations
          .map(function (loc) {
            var offset = calcOffset(label.offset, loc);
            var i;

            for (i = maxZoom; i >= minZoom; i--) {
              var point = map.project(label.position, i);
              var rect = labelRect(point, offset, loc, label, minZoom, maxZoom, i);
              var candidates = trees[i].search(rect);

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

          for (var i = maxZoom; i >= best.z; i--) {
            var point = map.project(label.position, i);
            var rect = labelRect(point, label.offset, best.loc, label, minZoom, maxZoom, i);
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
    var tile = L.DomUtil.create("canvas", "leaflet-tile");

    var tileSize = this.options.tileSize;
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.labels) {
      return tile;
    }

    var size = tilePoint.multiplyBy(tileSize);
    var map = this._map;
    bodyStyle = window.getComputedStyle(document.querySelector("body"));
    labelShadow = bodyStyle.backgroundColor.replace(/rgb/i, "rgba").replace(/\)/i, ",0.7)");

    function projectNodes(d) {
      var point = map.project(d.label.position);

      point.x -= size.x;
      point.y -= size.y;

      return { p: point, label: d.label };
    }

    var bbox = helper.getTileBBox(size, map, tileSize, this.margin);
    var labels = this.labels.search(bbox).map(projectNodes);
    var ctx = tile.getContext("2d");

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
