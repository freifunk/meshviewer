import moment from "moment";
import { describe, expect, it, vi } from "vitest";

vi.mock("snabbdom", () => ({
  h: (...args: any[]) => ({ args }),
}));

vi.mock("leaflet", () => ({}));

vi.mock("./language.js", () => ({
  _: {
    t: (key: string, params?: { branch?: string }) => (params?.branch ? `${key}:${params.branch}` : key),
  },
}));

import { h } from "snabbdom";
import nodef from "./node.js";

describe("node utils with sparse nodes", () => {
  it("returns undefined for missing optional node attributes instead of crashing", () => {
    const sparseNode = {
      node_id: "sparse.a77",
      hostname: "Pollux",
      firstseen: moment.utc("2026-05-04T18:00:00Z").local(),
      lastseen: moment.utc("2026-05-06T22:00:00Z").local(),
      is_online: false,
      location: {
        latitude: 52.5061,
        longitude: 13.3958,
      },
      neighbours: [],
      is_gateway: false,
    } as any;

    expect(nodef.showFirmware(sparseNode)).toBeUndefined();
    expect(nodef.showUptime(sparseNode)).toBeUndefined();
    expect(nodef.showLoad(sparseNode)).toBeUndefined();
    expect(nodef.showRAM(sparseNode)).toBeUndefined();
    expect(nodef.showIPs(sparseNode)).toBeUndefined();
    expect(nodef.showAutoupdate(sparseNode)).toBeUndefined();
  });

  it("renders IPv4 unbracketed, IPv6 bracketed, and fe80 as unlinked text", () => {
    const node = { addresses: ["10.200.7.237", "2001:db8::1", "fe80::1"] } as any;

    const td = nodef.showIPs(node) as any;

    expect(td.args[1]).toEqual([
      h("a", { props: { href: "http://10.200.7.237/", target: "_blank" } }, "10.200.7.237"),
      h("br"),
      h("a", { props: { href: "http://[2001:db8::1]/", target: "_blank" } }, "2001:db8::1"),
      h("br"),
      "fe80::1",
    ]);
  });

  it("returns undefined for null optional node attributes from live data", () => {
    const nullNode = {
      node_id: "1450",
      hostname: "Sumo (1450)",
      firstseen: moment.utc("2026-03-28T23:42:11Z").local(),
      lastseen: moment.utc("2026-05-08T19:12:37Z").local(),
      is_online: true,
      location: {
        latitude: 51.0,
        longitude: 12.0,
      },
      neighbours: [],
      is_gateway: false,
      nproc: 1,
      uptime: null,
      loadavg: null,
      memory_usage: null,
    } as any;

    expect(nodef.showUptime(nullNode)).toBeUndefined();
    expect(nodef.showLoad(nullNode)).toBeUndefined();
    expect(nodef.showRAM(nullNode)).toBeUndefined();
  });
});
