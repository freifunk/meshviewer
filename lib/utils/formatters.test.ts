import { describe, expect, it } from "vitest";
import moment from "moment";
import { dictGet, limit, listReplace, one, showDistance, showTq, sortByKey, sum } from "./formatters.js";

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
  });

  it("listReplace replaces all keys in template", () => {
    const template = "Hello {USER}, welcome to {SITE}!";
    const result = listReplace(template, {
      "\\{USER\\}": "Alice",
      "\\{SITE\\}": "Meshviewer",
    });
    expect(result).toBe("Hello Alice, welcome to Meshviewer!");
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
