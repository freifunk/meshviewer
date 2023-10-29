import * as L from "leaflet";
import RBush from "rbush";
import * as helper from "../utils/helper";
import { Node } from "../utils/node";
import { ObjectsLinksAndNodes } from "../datadistributor";
import { Coords } from "leaflet";

export const ClientLayer = L.GridLayer.extend({
  mapRTree: function mapRTree(node: Node) {
    return {
      minX: node.location.latitude,
      minY: node.location.longitude,
      maxX: node.location.latitude,
      maxY: node.location.longitude,
      node: node,
    };
  },
  setData: function (data: ObjectsLinksAndNodes) {
    let rtreeOnlineAll = new RBush(9);

    this.data = rtreeOnlineAll.load(data.nodes.online.filter(helper.hasLocation).map(this.mapRTree));

    // pre-calculate start angles
    this.data.all().forEach(function (positionedNode: { startAngle: number; node: Node }) {
      positionedNode.startAngle = (parseInt(positionedNode.node.node_id.substr(10, 2), 16) / 255) * 2 * Math.PI;
    });
    this.redraw();
  },
  createTile: function (tilePoint: Coords) {
    let tile: HTMLElement & {
      width?: number;
      height?: number;
      getContext?: (type: string) => CanvasRenderingContext2D;
    } = L.DomUtil.create("canvas", "leaflet-tile");

    let tileSize = this.options.tileSize;
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.data) {
      return tile;
    }

    let ctx = tile.getContext("2d");
    let size = tilePoint.multiplyBy(tileSize);
    let map = this._map;

    let margin = 50;
    let bbox = helper.getTileBBox(size, map, tileSize, margin);

    let nodes = this.data.search(bbox);

    if (nodes.length === 0) {
      return tile;
    }

    let startDistance = 10;

    nodes.forEach(function (node: { node: Node; startAngle: number }) {
      let point = map.project([node.node.location.latitude, node.node.location.longitude]);

      point.x -= size.x;
      point.y -= size.y;

      helper.positionClients(ctx, point, node.startAngle, node.node, startDistance);
    });

    return tile;
  },
});
