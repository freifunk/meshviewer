import * as L from "leaflet";
import RBush from "rbush";

import * as helper from "../utils/helper";

export const ClientLayer = L.GridLayer.extend({
  mapRTree: function mapRTree(node) {
    return {
      minX: node.location.latitude,
      minY: node.location.longitude,
      maxX: node.location.latitude,
      maxY: node.location.longitude,
      node: node,
    };
  },
  setData: function (data) {
    var rtreeOnlineAll = new RBush(9);

    this.data = rtreeOnlineAll.load(data.nodes.online.filter(helper.hasLocation).map(this.mapRTree));

    // pre-calculate start angles
    this.data.all().forEach(function (positionedNode) {
      positionedNode.startAngle = (parseInt(positionedNode.node.node_id.substr(10, 2), 16) / 255) * 2 * Math.PI;
    });
    this.redraw();
  },
  createTile: function (tilePoint) {
    var tile = L.DomUtil.create("canvas", "leaflet-tile");

    var tileSize = this.options.tileSize;
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.data) {
      return tile;
    }

    var ctx = tile.getContext("2d");
    var size = tilePoint.multiplyBy(tileSize);
    var map = this._map;

    var margin = 50;
    var bbox = helper.getTileBBox(size, map, tileSize, margin);

    var nodes = this.data.search(bbox);

    if (nodes.length === 0) {
      return tile;
    }

    var startDistance = 10;

    nodes.forEach(function (node) {
      var point = map.project([node.node.location.latitude, node.node.location.longitude]);

      point.x -= size.x;
      point.y -= size.y;

      helper.positionClients(ctx, point, node.startAngle, node.node, startDistance);
    });

    return tile;
  },
});
