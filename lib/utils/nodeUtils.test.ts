import { describe, expect, it } from "vitest";
import { hasLocation, hasUplink, subtract } from "./nodeUtils.js";
import { Node } from "./node.js";

describe("nodeUtils", () => {
  it("hasLocation validates latitude and longitude coordinates", () => {
    expect(hasLocation({ location: { latitude: 50.1, longitude: 8.6 } } as any)).toBe(true);
    expect(hasLocation({ location: { latitude: 95.0, longitude: 8.6 } } as any)).toBe(false);
    expect(hasLocation({ location: { latitude: 50.1, longitude: 190.0 } } as any)).toBe(false);
    expect(hasLocation({})).toBe(false);
  });

  it("hasUplink detects vpn links in neighbours", () => {
    const nodeWithVpn: Partial<Node> = {
      neighbours: [
        {
          node: {} as any,
          link: { type: "vpn" } as any,
        },
      ],
    };
    const nodeWithoutVpn: Partial<Node> = {
      neighbours: [
        {
          node: {} as any,
          link: { type: "other24" } as any,
        },
      ],
    };

    expect(hasUplink(nodeWithVpn as Node)).toBe(true);
    expect(hasUplink(nodeWithoutVpn as Node)).toBe(false);
    expect(hasUplink({})).toBe(false);
  });

  it("subtract removes nodes present in second array by node_id", () => {
    const listA = [{ node_id: "node1" }, { node_id: "node2" }, { node_id: "node3" }] as Node[];
    const listB = [{ node_id: "node2" }] as Node[];

    const result = subtract(listA, listB);
    expect(result.map((n) => n.node_id)).toEqual(["node1", "node3"]);
  });
});
