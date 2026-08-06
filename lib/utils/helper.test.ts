import { describe, expect, it, vi } from "vitest";

vi.mock("snabbdom", () => ({
  h: (...args: any[]) => ({ args }),
}));

vi.mock("leaflet", () => ({}));

vi.mock("./language.js", () => ({
  _: {
    t: (key: string) => key,
  },
}));

import { mergeSpellingVariants } from "./helper.js";

describe("mergeSpellingVariants", () => {
  it("merges case variants and labels them with the most common spelling", () => {
    const merged = mergeSpellingVariants(
      new Map<unknown, number>([
        ["ZyXEL WSM20", 42],
        ["Zyxel WSM20", 12],
        ["TP-LINK Archer C7 v5", 1],
        ["TP-Link Archer C7 v5", 101],
      ]),
    );

    expect(merged).toEqual([
      ["TP-Link Archer C7 v5", 102],
      ["ZyXEL WSM20", 54],
    ]);
  });

  it("collapses padding whitespace in labels", () => {
    const merged = mergeSpellingVariants(new Map<unknown, number>([["FUJITSU      D2963-A1     ", 1]]));

    expect(merged).toEqual([["FUJITSU D2963-A1", 1]]);
  });

  it("labels a tie alphabetically rather than by input order", () => {
    const counts: [unknown, number][] = [
      ["Zyxel WSM20", 5],
      ["ZyXEL WSM20", 5],
    ];

    expect(mergeSpellingVariants(new Map(counts))).toEqual([["ZyXEL WSM20", 10]]);
    expect(mergeSpellingVariants(new Map(counts.reverse()))).toEqual([["ZyXEL WSM20", 10]]);
  });

  it("keeps genuinely different values apart", () => {
    const merged = mergeSpellingVariants(
      new Map<unknown, number>([
        ["ZyXEL WSM20", 42],
        ["ZyXEL NWA50AX", 3],
      ]),
    );

    expect(merged).toHaveLength(2);
  });
});
