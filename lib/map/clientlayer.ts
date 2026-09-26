import * as L from "leaflet";
import RBush from "rbush";
import * as helper from "../utils/helper.js";
import { Node } from "../utils/node.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";
import { nodeIdToStartAngle } from "./clientlayerUtils.js";

interface ClientRTreeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  node: Node;
  startAngle: number;
}

function mapRTree(node: Node): ClientRTreeItem {
  return {
    minX: node.location.latitude,
    minY: node.location.longitude,
    maxX: node.location.latitude,
    maxY: node.location.longitude,
    node: node,
    // pre-calculate start angles
    startAngle: nodeIdToStartAngle(node.node_id),
  };
}

export class ClientLayer extends L.GridLayer {
  declare options: L.GridLayerOptions;
  private data?: RBush<ClientRTreeItem>;

  setData(data: ObjectsLinksAndNodes) {
    this.data = new RBush<ClientRTreeItem>(9);
    this.data.load(data.nodes.online.filter(helper.hasLocation).map(mapRTree));
    this.redraw();
  }

  protected createTile(tilePoint: L.Coords) {
    const tile = L.DomUtil.create("canvas", "leaflet-tile") as HTMLCanvasElement;

    const tileSize = this.getTileSize().x;
    tile.width = tileSize;
    tile.height = tileSize;

    if (!this.data || !this._map) {
      return tile;
    }

    const ctx = tile.getContext("2d")!;
    let size = tilePoint.multiplyBy(tileSize);
    let map = this._map;

    let margin = 50;
    let bbox = helper.getTileBBox(size, map, tileSize, margin);

    let nodes = this.data.search(bbox);

    if (nodes.length === 0) {
      return tile;
    }

    let startDistance = 10;

    nodes.forEach(function (node) {
      let point = map.project([node.node.location.latitude, node.node.location.longitude]);

      point.x -= size.x;
      point.y -= size.y;

      helper.positionClients(ctx, point, node.startAngle, node.node, startDistance);
    });

    return tile;
  }
}
