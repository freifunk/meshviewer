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

  it("brackets IPv6 but not IPv4 addresses in node web-interface links", () => {
    const node = { addresses: ["10.200.7.237", "2001:db8::1", "fe80::1"] } as any;

    const td = nodef.showIPs(node) as any;
    const parts: any[] = td.args[1];
    const anchors = parts.filter((p) => p && p.args && p.args[0] === "a");
    const hrefs = anchors.map((a) => a.args[1].props.href);
    const linkedIps = anchors.map((a) => a.args[2]);

    // IPv4: no brackets; IPv6: brackets; link-local (fe80::) not linked at all
    expect(hrefs).toContain("http://10.200.7.237/");
    expect(hrefs).toContain("http://[2001:db8::1]/");
    expect(linkedIps).not.toContain("fe80::1");
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
