import { describe, expect, it, vi } from "vitest";
import { GenericNodeFilter } from "./genericnode.js";
import { Node } from "../utils/node.js";

describe("GenericNodeFilter", () => {
  const sampleNode: Node = {
    node_id: "test1",
    hostname: "Node-1",
    model: "TP-Link Archer C7 v2",
    system: {
      site_code: "ffm",
    },
  } as any;

  function nodeWithModel(model: string | null) {
    return { node_id: "000000000000", model } as unknown as Node;
  }

  it("matches direct property value", () => {
    const filter = GenericNodeFilter("model", ["model"], "TP-Link Archer C7 v2", (v) => v as string);
    expect(filter.run(sampleNode)).toBe(true);

    const filterMismatch = GenericNodeFilter("model", ["model"], "Ubiquiti", (v) => v as string);
    expect(filterMismatch.run(sampleNode)).toBe(false);
  });

  it("matches nested property value", () => {
    const filter = GenericNodeFilter("site", ["system", "site_code"], "ffm", (v) => v as string);
    expect(filter.run(sampleNode)).toBe(true);
  });

  it("matches spelling variants of the same hardware model", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null);

    expect(filter.run(nodeWithModel("ZyXEL WSM20"))).toBe(true);
    expect(filter.run(nodeWithModel("Zyxel WSM20"))).toBe(true);
  });

  it("matches models padded with whitespace, so filter links survive a reload", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "FUJITSU D2963-A1", null);

    expect(filter.run(nodeWithModel("FUJITSU      D2963-A1     "))).toBe(true);
  });

  it("still separates genuinely different values", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null);

    expect(filter.run(nodeWithModel("ZyXEL NWA50AX"))).toBe(false);
  });

  it("never matches a missing attribute, and keeps it when negated", () => {
    const filter = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null);

    expect(filter.run(nodeWithModel(null))).toBe(false);

    filter.setNegate(true);
    expect(filter.run(nodeWithModel(null))).toBe(true);
    expect(filter.run(nodeWithModel("ZyXEL WSM20"))).toBe(false);
  });

  it("gives spelling variants the same key, so they toggle the same filter", () => {
    const upper = GenericNodeFilter("node.hardware", ["model"], "ZyXEL WSM20", null);
    const lower = GenericNodeFilter("node.hardware", ["model"], "Zyxel WSM20", null);
    const other = GenericNodeFilter("node.hardware", ["model"], "ZyXEL NWA50AX", null);

    expect(upper.getKey?.()).toBeDefined();
    expect(upper.getKey?.()).toBe(lower.getKey?.());
    expect(upper.getKey?.()).not.toBe(other.getKey?.());
  });

  it("supports nodeValueModifier transformation", () => {
    const modifier = (val: string): string | null => (val ? (val.split(" ")[0] ?? null) : null);
    const filter = GenericNodeFilter("brand", ["model"], "TP-Link", modifier);

    expect(filter.run(sampleNode)).toBe(true);
  });

  it("inverts match condition when negate is true", () => {
    const filter = GenericNodeFilter("site", ["system", "site_code"], "ffm", (v) => v);
    expect(filter.getNegate()).toBe(false);
    expect(filter.run(sampleNode)).toBe(true);

    filter.setNegate(true);
    expect(filter.getNegate()).toBe(true);
    expect(filter.run(sampleNode)).toBe(false);
  });

  it("provides metadata getters", () => {
    const filter = GenericNodeFilter("Site Code", ["system", "site_code"], "ffm", (v) => v as string);
    expect(filter.getName()).toBe("Site Code");
    expect(filter.getValue()).toBe("ffm");
    expect(filter.getKey?.()).toBe("ffmSite Code");
  });

  it("renders DOM elements and toggles negate on click", () => {
    const mockElement = () => ({
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      appendChild: vi.fn(),
      textContent: "",
      onclick: null as any,
    });

    const mockDoc = {
      createElement: vi.fn().mockImplementation(mockElement),
    };
    vi.stubGlobal("document", mockDoc);

    const filter = GenericNodeFilter("model", ["model"], "TP-Link Archer C7 v2", (v) => v as string);
    const container = mockElement();
    const refreshSpy = vi.fn();

    filter.setRefresh(refreshSpy);
    filter.render(container as any);

    expect(mockDoc.createElement).toHaveBeenCalledWith("label");
    expect(mockDoc.createElement).toHaveBeenCalledWith("strong");
    expect(container.appendChild).toHaveBeenCalled();

    const labelInstance = mockDoc.createElement.mock.results[0]!.value;
    expect(labelInstance.onclick).toBeDefined();

    labelInstance.onclick();
    expect(filter.getNegate()).toBe(true);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    labelInstance.onclick();
    expect(filter.getNegate()).toBe(false);
    expect(refreshSpy).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});
