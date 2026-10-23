import { describe, expect, it } from "vitest";
import moment from "moment";
import {
  dictGet,
  limit,
  linkMetric,
  listReplace,
  listReplaceUrl,
  one,
  showBiDiLinkMetric,
  showDistance,
  showLinkMetric,
  showThroughput,
  showTq,
  sortByKey,
  sum,
} from "./formatters.js";

describe("formatters utilities", () => {
  it("showDistance formats meters and handles NaN", () => {
    expect(showDistance({ distance: 125.4 })).toBe("125 m");
    expect(showDistance({ distance: NaN })).toBe("");
  });

  it("showTq formats percentage", () => {
    expect(showTq(0.954)).toBe("95%");
    expect(showTq(1)).toBe("100%");
    expect(showTq(0)).toBe("0%");
  });

  it("showThroughput formats kbps with SI-prefixed bit/s units", () => {
    expect(showThroughput(800)).toBe("800 kbit/s");
    expect(showThroughput(2400)).toBe("2.4 Mbit/s");
    expect(showThroughput(54000)).toBe("54 Mbit/s");
    expect(showThroughput(1.2e6)).toBe("1.2 Gbit/s");
    expect(showThroughput(2.5e13)).toBe("25000 Tbit/s");
    expect(showThroughput(NaN)).toBe("");
  });

  it("linkMetric passes tq through and lets it win over throughput", () => {
    expect(linkMetric(0.5, undefined)).toBe(0.5);
    expect(linkMetric(0.98, 1e3)).toBe(0.98);
    expect(linkMetric(0, 1.2e6)).toBe(1);
  });

  it("linkMetric maps throughput logarithmically between 1 Mbit/s and 1.2 Gbit/s", () => {
    expect(linkMetric(undefined, 1e3)).toBe(0);
    expect(linkMetric(undefined, Math.sqrt(1e3 * 1.2e6))).toBeCloseTo(0.5);
    expect(linkMetric(undefined, 1.2e6)).toBe(1);
  });

  it("linkMetric clamps throughput outside its range", () => {
    expect(linkMetric(undefined, 800)).toBe(0);
    expect(linkMetric(undefined, 1e7)).toBe(1);
  });

  it("linkMetric returns undefined without a positive metric", () => {
    expect(linkMetric(undefined, undefined)).toBeUndefined();
    expect(linkMetric(0, 0)).toBeUndefined();
  });

  it("showLinkMetric shows tq before throughput", () => {
    expect(showLinkMetric(0.98, undefined)).toBe("98%");
    expect(showLinkMetric(undefined, 54000)).toBe("54 Mbit/s");
    expect(showLinkMetric(0.98, 54000)).toBe("98%");
    expect(showLinkMetric(0, 0)).toBe("");
  });

  it("showBiDiLinkMetric drops the separator when a side has no metric", () => {
    expect(showBiDiLinkMetric(0.98, undefined, 0.5, undefined)).toBe("98% - 50%");
    expect(showBiDiLinkMetric(undefined, 300000, undefined, 8500)).toBe("300 Mbit/s - 8.5 Mbit/s");
    expect(showBiDiLinkMetric(undefined, undefined, undefined, 1e6)).toBe("1.0 Gbit/s");
    expect(showBiDiLinkMetric(undefined, 1e5, undefined, undefined)).toBe("100 Mbit/s");
    expect(showBiDiLinkMetric(undefined, undefined, undefined, undefined)).toBe("");
  });

  it("sum calculates total correctly", () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15);
    expect(sum([])).toBe(0);
  });

  it("one returns 1", () => {
    expect(one()).toBe(1);
  });

  it("dictGet retrieves nested keys safely", () => {
    const obj = {
      a: {
        b: {
          c: 42,
        },
      },
    };
    expect(dictGet(obj, ["a", "b", "c"])).toBe(42);
    expect(dictGet(obj, ["a", "nonexistent"])).toBeNull();
    expect(dictGet(obj, ["invalid", "path"])).toBeNull();

    const keys = ["a", "b", "c"];
    dictGet(obj, keys);
    expect(keys).toEqual(["a", "b", "c"]);
  });

  it("listReplace replaces all keys in template", () => {
    const template = "Hello {USER}, welcome to {SITE}!";
    const result = listReplace(template, {
      "\\{USER\\}": "Alice",
      "\\{SITE\\}": "Meshviewer",
    });
    expect(result).toBe("Hello Alice, welcome to Meshviewer!");
  });

  it("listReplace inserts replacement patterns like $& literally", () => {
    expect(listReplace("name={NAME}", { "\\{NAME\\}": "a$&b$'c" })).toBe("name=a$&b$'c");
  });

  it("listReplaceUrl encodes values so they cannot alter the URL", () => {
    const url = listReplaceUrl("https://stats.example/d?var-name={NAME}&from=now-7d", {
      "\\{NAME\\}": "x&var-name=other#",
    });
    expect(url).toBe("https://stats.example/d?var-name=x%26var-name%3Dother%23&from=now-7d");
    expect(listReplaceUrl("https://pics.example/{MODEL}.svg", { "\\{MODEL\\}": "../../evil" })).toBe(
      "https://pics.example/..%2F..%2Fevil.svg",
    );
  });

  it("sortByKey sorts objects descending by moment timestamp", () => {
    const items = [
      { id: 1, time: moment("2026-01-01") },
      { id: 2, time: moment("2026-06-01") },
      { id: 3, time: moment("2026-03-01") },
    ];
    const sorted = sortByKey("time", items);
    expect(sorted.map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it("limit filters items after given moment threshold", () => {
    const threshold = moment("2026-03-01");
    const items = [
      { id: 1, lastseen: moment("2026-01-01") },
      { id: 2, lastseen: moment("2026-04-01") },
    ];
    const filtered = limit("lastseen", threshold, items);
    expect(filtered.map((i) => i.id)).toEqual([2]);
  });
});
