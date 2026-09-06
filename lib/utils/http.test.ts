import { describe, expect, it, vi } from "vitest";
import { get, getJSON } from "./http.js";

describe("http helper methods", () => {
  it("get() fetches text successfully", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "sample response text",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as any);

    const result = await get("https://example.com/test.txt");
    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/test.txt");
    expect(result).toBe("sample response text");

    fetchSpy.mockRestore();
  });

  it("get() throws on non-ok HTTP status", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as any);

    await expect(get("https://example.com/404")).rejects.toThrow("Not Found");
    fetchSpy.mockRestore();
  });

  it("getJSON() fetches and parses JSON successfully", async () => {
    const mockData = { version: "1.0", nodes: [1, 2, 3] };
    const mockResponse = {
      ok: true,
      json: async () => mockData,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as any);

    const result = await getJSON<{ version: string }>("https://example.com/data.json");
    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/data.json");
    expect(result).toEqual(mockData);

    fetchSpy.mockRestore();
  });

  it("getJSON() throws on non-ok HTTP status", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as any);

    await expect(getJSON("https://example.com/500")).rejects.toThrow("Internal Server Error");
    fetchSpy.mockRestore();
  });
});
