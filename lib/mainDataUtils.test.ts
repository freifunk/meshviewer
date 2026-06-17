import { describe, expect, it } from "vitest";
import { resolveValidLinks } from "./mainDataUtils.js";

describe("resolveValidLinks", () => {
  it("keeps only links with resolvable source and target nodes", () => {
    const nodeA = { node_id: "1004", hostname: "Vega" };
    const nodeB = { node_id: "1005", hostname: "Rigel" };
    const links = [
      { type: "wifi24", source: "1004", target: "1005" },
      { type: "wifi24", source: "1004", target: "missing.a99" },
    ];

    const validLinks = resolveValidLinks(links, {
      [nodeA.node_id]: nodeA,
      [nodeB.node_id]: nodeB,
    });

    expect(validLinks).toHaveLength(1);
    const [first] = validLinks;
    expect(first?.source).toBe(nodeA);
    expect(first?.target).toBe(nodeB);
  });
});
