import { describe, expect, it } from "vitest";
import { hasOwn } from "./object.js";

describe("object utilities", () => {
  it("hasOwn ignores inherited properties", () => {
    expect(hasOwn({ a: 1 }, "a")).toBe(true);
    expect(hasOwn({ a: 1 }, "constructor")).toBe(false);
    expect(hasOwn(Object.create(null) as object, "toString")).toBe(false);
  });
});
