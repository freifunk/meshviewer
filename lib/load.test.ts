import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config as defaultConfig } from "./config_default.js";
import { load } from "./load.js";
import { main } from "./main.js";

vi.mock("./main.js", () => ({ main: vi.fn() }));

describe("load", () => {
  let children: (string | { tagName: string; textContent: string })[];
  // The loader content as text, with <br> as line breaks.
  const loaderText = () =>
    children.map((c) => (typeof c === "string" ? c : c.tagName === "br" ? "\n" : c.textContent)).join("");

  beforeEach(() => {
    children = [];
    vi.stubGlobal("document", {
      querySelector: () => ({ replaceChildren: (...nodes: typeof children) => (children = nodes) }),
      createElement: (tagName: string) => ({ tagName, textContent: "", setAttribute() {}, addEventListener() {} }),
    });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(main).mockClear();
  });

  it("shows an offline error when fetching config.json fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await load();

    expect(loaderText()).toContain("No connection available.");
    expect(main).not.toHaveBeenCalled();
  });

  it("shows the HTTP status when config.json is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404, statusText: "Not Found" })));

    await load();

    expect(loaderText()).toContain("config.json can not be loaded:\n404 Not Found");
    expect(main).not.toHaveBeenCalled();
  });

  it("shows the numeric status when statusText is empty (HTTP/2)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

    await load();

    expect(loaderText()).toContain("config.json can not be loaded:\n404\n");
    expect(main).not.toHaveBeenCalled();
  });

  it("shows a parse error when config.json is not valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{ not json", { status: 200 })));

    await load();

    expect(loaderText()).toContain("config.json is not valid JSON");
    expect(main).not.toHaveBeenCalled();
  });

  it("inserts the parse error as text", async () => {
    // e.g. a captive portal answering with an HTML page and status 200
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<img src=x onerror=alert(1)>", { status: 200 })));

    await load();

    const detail = children[2];
    expect(typeof detail).toBe("string");
    expect(detail).toContain("<img");
  });

  it("merges config.json onto the defaults and starts the app", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ siteName: "Test Mesh" }), { status: 200 })),
    );

    await load();

    expect(window.config.siteName).toBe("Test Mesh");
    expect(window.config.maxAge).toBe(defaultConfig.maxAge);
    expect(main).toHaveBeenCalledOnce();
  });
});
