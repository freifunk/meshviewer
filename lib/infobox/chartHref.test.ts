import { describe, expect, it } from "vitest";
import { buildChartHref } from "./chartHref.js";
import { Chart } from "../config_default.js";

function chart(overrides: Partial<Chart> = {}): Chart {
  return {
    name: "Traffic",
    datasourceUid: "abc123xyz",
    datasourceType: "influxdb",
    query: 'SELECT mean("rx") FROM "traffic" WHERE "node" = \'$node\'',
    ...overrides,
  };
}

describe("buildChartHref", () => {
  it("returns undefined without href", () => {
    expect(buildChartHref(chart(), { node: "1004" })).toBeUndefined();
    expect(buildChartHref(chart({ href: "" }), { node: "1004" })).toBeUndefined();
  });

  it("replaces node placeholders and the time range", () => {
    expect(
      buildChartHref(
        chart({
          href: "https://grafana.example.com/d/abc/traffic?var-node=$node&from=$from&to=$to",
          from: "now-2d",
          to: "now-5m",
        }),
        { node: "node.a03" },
      ),
    ).toBe("https://grafana.example.com/d/abc/traffic?var-node=node.a03&from=now-2d&to=now-5m");
  });

  it("falls back to the default time range", () => {
    expect(buildChartHref(chart({ href: "/d/abc?from=$from&to=$to" }), {})).toBe("/d/abc?from=now-7d&to=now-1m");
  });

  it("replaces source and target placeholders", () => {
    expect(
      buildChartHref(chart({ href: "/d/abc?var-source=$source&var-target=$target" }), {
        source: "1004",
        target: "1005",
      }),
    ).toBe("/d/abc?var-source=1004&var-target=1005");
  });

  it("URL-encodes placeholder values", () => {
    expect(buildChartHref(chart({ href: "/d/abc?var-node=$node" }), { node: "a b/c?d" })).toBe(
      "/d/abc?var-node=a%20b%2Fc%3Fd",
    );
  });

  it("only replaces complete placeholder names", () => {
    expect(buildChartHref(chart({ href: "/d/abc?var-topic=$topic&var-node=$node_id&to=$to" }), { node: "1004" })).toBe(
      "/d/abc?var-topic=$topic&var-node=$node_id&to=now-1m",
    );
  });

  it("leaves placeholders without a value untouched", () => {
    expect(buildChartHref(chart({ href: "/d/abc?var-source=$source&var-node=$node" }), { node: "1004" })).toBe(
      "/d/abc?var-source=$source&var-node=1004",
    );
  });
});
