import { describe, expect, it, vi } from "vitest";
import { HostnameFilter } from "./hostname.js";
import { Node } from "../utils/node.js";

describe("HostnameFilter", () => {
  const nodeA: Node = { hostname: "ffm-main-router" } as any;
  const nodeB: Node = { hostname: "ffm-backup-switch" } as any;

  it("matches hostnames using case-insensitive substring search", () => {
    const mockInput = {
      type: "",
      placeholder: "",
      value: "",
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
    };
    const mockContainer = {
      classList: {
        add: vi.fn(),
      },
      appendChild: vi.fn(),
    };
    const mockDoc = {
      createElement: vi.fn().mockReturnValue(mockInput),
    };
    vi.stubGlobal("document", mockDoc);

    const filter = HostnameFilter();
    filter.render(mockContainer as any);

    mockInput.value = "ROUTER";
    expect(filter.run(nodeA)).toBe(true);
    expect(filter.run(nodeB)).toBe(false);

    mockInput.value = "ffm";
    expect(filter.run(nodeA)).toBe(true);
    expect(filter.run(nodeB)).toBe(true);

    mockInput.value = "nonexistent";
    expect(filter.run(nodeA)).toBe(false);
    expect(filter.run(nodeB)).toBe(false);

    vi.unstubAllGlobals();
  });

  it("debounces refresh callback on input event", async () => {
    vi.useFakeTimers();
    let inputListener: () => void = () => {};
    const mockInput = {
      type: "",
      placeholder: "",
      value: "test",
      setAttribute: vi.fn(),
      addEventListener: vi.fn().mockImplementation((event, listener) => {
        if (event === "input") {
          inputListener = listener;
        }
      }),
    };
    const mockContainer = {
      classList: {
        add: vi.fn(),
      },
      appendChild: vi.fn(),
    };
    const mockDoc = {
      createElement: vi.fn().mockReturnValue(mockInput),
    };
    vi.stubGlobal("document", mockDoc);

    const filter = HostnameFilter();
    const refreshSpy = vi.fn();

    filter.setRefresh(refreshSpy);
    filter.render(mockContainer as any);

    // Simulate input events
    inputListener();
    inputListener();

    expect(refreshSpy).not.toHaveBeenCalled();

    // Fast-forward past 250ms debounce
    vi.advanceTimersByTime(300);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledWith(true);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
