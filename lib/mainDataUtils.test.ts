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

  it("does not resolve ids to inherited object properties", () => {
    const nodeA = { node_id: "1004", hostname: "Vega" };
    const links = [
      { type: "wifi24", source: "1004", target: "constructor" },
      { type: "wifi24", source: "toString", target: "1004" },
    ];

    expect(resolveValidLinks(links, { [nodeA.node_id]: nodeA })).toHaveLength(0);
  });
});
