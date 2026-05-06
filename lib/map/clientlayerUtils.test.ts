import { describe, expect, it } from "vitest";
import { nodeIdToStartAngle } from "./clientlayerUtils.js";

describe("nodeIdToStartAngle", () => {
  it("returns stable but different angles for numeric and dotted node ids", () => {
    const numericFirst = nodeIdToStartAngle("1004");
    const numericSecond = nodeIdToStartAngle("1004");
    const dotted = nodeIdToStartAngle("node.a03");

    expect(numericFirst).toBe(numericSecond);
    expect(numericFirst).not.toBe(dotted);
    expect(numericFirst).toBeGreaterThanOrEqual(0);
    expect(numericFirst).toBeLessThan(2 * Math.PI);
    expect(dotted).toBeGreaterThanOrEqual(0);
    expect(dotted).toBeLessThan(2 * Math.PI);
  });

  it("keeps legacy hex node ids stable and distinct", () => {
    const legacyAFirst = nodeIdToStartAngle("021122334401");
    const legacyASecond = nodeIdToStartAngle("021122334401");
    const legacyB = nodeIdToStartAngle("021122334402");

    expect(legacyAFirst).toBe(legacyASecond);
    expect(legacyAFirst).not.toBe(legacyB);
    expect(legacyAFirst).toBeGreaterThanOrEqual(0);
    expect(legacyAFirst).toBeLessThan(2 * Math.PI);
    expect(legacyB).toBeGreaterThanOrEqual(0);
    expect(legacyB).toBeLessThan(2 * Math.PI);
  });
});
