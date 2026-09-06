import { describe, expect, it, vi } from "vitest";

vi.mock("leaflet", () => {
  return {
    default: {
      geoJSON: vi.fn((data, options) => ({
        addTo: vi.fn(),
        data,
        options,
      })),
    },
  };
});

import L from "leaflet";
import { getGeoOptions, loadGeoLayer, loadGeoLayers } from "./geoUtils.js";
import { Geo } from "../config_default.js";

describe("geoUtils", () => {
  const sampleFeature = {
    type: "Feature" as const,
    properties: {
      name: "Test Area",
      stroke: "#555",
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [12.0, 49.0],
          [12.1, 49.0],
          [12.1, 49.1],
          [12.0, 49.0],
        ],
      ],
    },
  };

  describe("getGeoOptions", () => {
    it("provides default onEachFeature that binds tooltip if name is present", () => {
      const options = getGeoOptions();
      expect(options.onEachFeature).toBeDefined();

      const layer = {
        bindTooltip: vi.fn(),
      };
      options.onEachFeature!(sampleFeature, layer as any);
      expect(layer.bindTooltip).toHaveBeenCalledWith("Test Area");
    });

    it("escapes HTML in feature name to prevent XSS (including &)", () => {
      const options = getGeoOptions();
      const layer = {
        bindTooltip: vi.fn(),
      };
      const maliciousFeature = {
        ...sampleFeature,
        properties: { name: '<script>alert("xss")</script> & Test' },
      };
      options.onEachFeature!(maliciousFeature, layer as any);
      expect(layer.bindTooltip).toHaveBeenCalledWith("&lt;script&gt;alert(&#34;xss&#34;)&lt;/script&gt; &amp; Test");
    });

    it("handles numeric name such as 0", () => {
      const options = getGeoOptions();
      const layer = {
        bindTooltip: vi.fn(),
      };
      const numericFeature = {
        ...sampleFeature,
        properties: { name: 0 as any },
      };
      options.onEachFeature!(numericFeature, layer as any);
      expect(layer.bindTooltip).toHaveBeenCalledWith("0");
    });

    it("does not bind tooltip if name is missing or empty", () => {
      const options = getGeoOptions();
      const layer = {
        bindTooltip: vi.fn(),
      };
      options.onEachFeature!({ ...sampleFeature, properties: {} }, layer as any);
      expect(layer.bindTooltip).not.toHaveBeenCalled();

      options.onEachFeature!({ ...sampleFeature, properties: { name: "" } }, layer as any);
      expect(layer.bindTooltip).not.toHaveBeenCalled();
    });

    it("handles feature with null or missing properties", () => {
      const options = getGeoOptions();
      const layer = {
        bindTooltip: vi.fn(),
      };
      options.onEachFeature!({ ...sampleFeature, properties: null as any }, layer as any);
      expect(layer.bindTooltip).not.toHaveBeenCalled();
    });

    it("preserves custom user options", () => {
      const customOptions = {
        style: { color: "#ff0000" },
      };
      const options = getGeoOptions(customOptions);
      expect(options.style).toEqual({ color: "#ff0000" });
    });
  });

  describe("loadGeoLayer", () => {
    it("loads inline GeoJSON object directly", async () => {
      const addToMap = vi.fn();
      const geo: Geo = {
        json: sampleFeature,
        option: {
          style: { color: "#333" },
        },
      };

      const result = await loadGeoLayer(geo, addToMap);
      expect(L.geoJSON).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(addToMap).toHaveBeenCalledTimes(1);
    });

    it("supports options plural property", async () => {
      const addToMap = vi.fn();
      const geo: Geo = {
        json: sampleFeature,
        options: {
          style: { color: "#333" },
        },
      };

      const result = await loadGeoLayer(geo, addToMap);
      expect(result).toBeDefined();
      expect(addToMap).toHaveBeenCalledTimes(1);
    });

    it("handles inline GeoJSON exception gracefully", async () => {
      const addToMap = vi.fn();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockedGeoJSON = vi.mocked(L.geoJSON).mockImplementationOnce(() => {
        throw new Error("Invalid GeoJSON geometry");
      });

      const geo: Geo = {
        json: { invalid: "data" } as any,
      };

      const result = await loadGeoLayer(geo, addToMap);
      expect(result).toBeUndefined();
      expect(addToMap).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Failed to parse inline GeoJSON:", expect.any(Error));

      consoleSpy.mockRestore();
      mockedGeoJSON.mockRestore();
    });

    it("fetches external GeoJSON via url property", async () => {
      const addToMap = vi.fn();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleFeature,
      });

      const geo: Geo = {
        url: "/map/test.geojson",
        option: {
          style: { color: "#444" },
        },
      };

      const result = await loadGeoLayer(geo, addToMap, mockFetch as any);
      expect(mockFetch).toHaveBeenCalledWith("/map/test.geojson");
      expect(result).toBeDefined();
      expect(addToMap).toHaveBeenCalledTimes(1);
    });

    it("fetches external GeoJSON when json is a string URL", async () => {
      const addToMap = vi.fn();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleFeature,
      });

      const geo: Geo = {
        json: "/map/test-string-url.geojson",
      };

      const result = await loadGeoLayer(geo, addToMap, mockFetch as any);
      expect(mockFetch).toHaveBeenCalledWith("/map/test-string-url.geojson");
      expect(result).toBeDefined();
      expect(addToMap).toHaveBeenCalledTimes(1);
    });

    it("handles fetch 404/500 HTTP errors gracefully", async () => {
      const addToMap = vi.fn();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const geo: Geo = {
        url: "/map/nonexistent.geojson",
      };

      const result = await loadGeoLayer(geo, addToMap, mockFetch as any);
      expect(result).toBeUndefined();
      expect(addToMap).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("handles network fetch rejections gracefully", async () => {
      const addToMap = vi.fn();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection lost"));

      const geo: Geo = {
        url: "/map/offline.geojson",
      };

      const result = await loadGeoLayer(geo, addToMap, mockFetch as any);
      expect(result).toBeUndefined();
      expect(addToMap).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load GeoJSON from /map/offline.geojson:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("handles invalid JSON body gracefully", async () => {
      const addToMap = vi.fn();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token in JSON");
        },
      });

      const geo: Geo = {
        url: "/map/invalid.geojson",
      };

      const result = await loadGeoLayer(geo, addToMap, mockFetch as any);
      expect(result).toBeUndefined();
      expect(addToMap).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load GeoJSON from /map/invalid.geojson:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("handles null or undefined geo safely", async () => {
      const addToMap = vi.fn();
      const result = await loadGeoLayer(null as any, addToMap);
      expect(result).toBeUndefined();
      expect(addToMap).not.toHaveBeenCalled();
    });
  });

  describe("loadGeoLayers", () => {
    it("loads multiple layers (mixed inline and external)", async () => {
      const addToMap = vi.fn();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleFeature,
      });

      const geoList: Geo[] = [{ json: sampleFeature }, { url: "/map/external.geojson" }];

      await loadGeoLayers(geoList, addToMap, mockFetch as any);
      expect(addToMap).toHaveBeenCalledTimes(2);
    });

    it("handles null, undefined, or empty arrays safely", async () => {
      const addToMap = vi.fn();
      const mockFetch = vi.fn();

      await loadGeoLayers(null as any, addToMap, mockFetch as any);
      await loadGeoLayers([null as any, undefined as any], addToMap, mockFetch as any);
      expect(addToMap).not.toHaveBeenCalled();
    });
  });
});
