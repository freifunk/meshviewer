import { describe, expect, it, vi } from "vitest";

vi.mock("snabbdom", () => ({
  h: (...args: any[]) => ({ args }),
}));

vi.mock("leaflet", () => ({}));

vi.mock("../utils/language.js", () => ({
  _: {
    t: (key: string) => key,
  },
}));

vi.stubGlobal("document", {
  createElement: () => ({ textContent: "", appendChild: () => {} }),
});

import { GenericNodeFilter } from "./genericnode.js";
import { Node } from "../utils/node.js";

function nodeWithModel(model: string | null) {
  return { node_id: "000000000000", model } as unknown as Node;
}

describe("GenericNodeFilter", () => {
  it("matches spelling variants of the same hardware model", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null as any);

    expect(filter.run(nodeWithModel("ZyXEL WSM20"))).toBe(true);
    expect(filter.run(nodeWithModel("Zyxel WSM20"))).toBe(true);
  });

  it("matches models padded with whitespace, so filter links survive a reload", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "FUJITSU D2963-A1", null as any);

    expect(filter.run(nodeWithModel("FUJITSU      D2963-A1     "))).toBe(true);
  });

  it("still separates genuinely different values", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null as any);

    expect(filter.run(nodeWithModel("ZyXEL NWA50AX"))).toBe(false);
  });

  it("never matches a missing attribute, and keeps it when negated", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null as any);

    expect(filter.run(nodeWithModel(null))).toBe(false);

    filter.setNegate(true);
    expect(filter.run(nodeWithModel(null))).toBe(true);
    expect(filter.run(nodeWithModel("ZyXEL WSM20"))).toBe(false);
  });

  it("gives spelling variants the same key, so they toggle the same filter", () => {
    const upper = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null as any);
    const lower = GenericNodeFilter("node.hardware", ["model"], "Zyxel WSM20", null as any);
    const other = GenericNodeFilter("node.hardware", ["model"], "ZyXEL NWA50AX", null as any);

    expect(upper.getKey?.()).toBeDefined();
    expect(upper.getKey?.()).toBe(lower.getKey?.());
    expect(upper.getKey?.()).not.toBe(other.getKey?.());
  });

  it("applies the node value modifier before comparing", () => {
    const filter = GenericNodeFilter("node.status", ["is_online"], "Online", (d: any) => (d ? "online" : "offline"));

    expect(filter.run({ is_online: true } as unknown as Node)).toBe(true);
    expect(filter.run({ is_online: false } as unknown as Node)).toBe(false);
  });
});
