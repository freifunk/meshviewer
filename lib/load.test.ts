import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config as defaultConfig } from "./config_default.js";
import { load } from "./load.js";
import { main } from "./main.js";

vi.mock("./main.js", () => ({ main: vi.fn() }));

describe("load", () => {
  let loader: { innerHTML: string };

  beforeEach(() => {
    loader = { innerHTML: "" };
    vi.stubGlobal("document", { querySelector: () => loader });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(main).mockClear();
  });

  it("shows an offline error when fetching config.json fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await load();

    expect(loader.innerHTML).toContain("No connection available.");
    expect(main).not.toHaveBeenCalled();
  });

  it("shows the HTTP status when config.json is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404, statusText: "Not Found" })));

    await load();

    expect(loader.innerHTML).toContain("config.json can not be loaded:<br>Not Found");
    expect(main).not.toHaveBeenCalled();
  });

  it("shows a parse error when config.json is not valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{ not json", { status: 200 })));

    await load();

    expect(loader.innerHTML).toContain("config.json is not valid JSON");
    expect(main).not.toHaveBeenCalled();
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
