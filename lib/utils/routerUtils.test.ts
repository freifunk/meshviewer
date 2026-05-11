import { describe, expect, it } from "vitest";
import { matchMeshviewerRoute } from "./routerUtils.js";

describe("matchMeshviewerRoute", () => {
  it("matches numeric and dotted node routes", () => {
    expect(matchMeshviewerRoute("/de/map/1004")).toEqual({
      lang: "de",
      view: "map",
      node: "1004",
      link: undefined,
      zoom: undefined,
      lat: undefined,
      lng: undefined,
    });

    expect(matchMeshviewerRoute("/de/map/node.a03")).toEqual({
      lang: "de",
      view: "map",
      node: "node.a03",
      link: undefined,
      zoom: undefined,
      lat: undefined,
      lng: undefined,
    });
  });

  it("matches link and location routes", () => {
    expect(matchMeshviewerRoute("/de/map/1004-1005")).toEqual({
      lang: "de",
      view: "map",
      node: undefined,
      link: "1004-1005",
      zoom: undefined,
      lat: undefined,
      lng: undefined,
    });

    expect(matchMeshviewerRoute("/de/map/13/51.3397/12.3731")).toEqual({
      lang: "de",
      view: "map",
      node: undefined,
      link: undefined,
      zoom: "13",
      lat: "51.3397",
      lng: "12.3731",
    });
  });

  it("keeps legacy hex routes working and rejects dashed node ids", () => {
    expect(matchMeshviewerRoute("/de/map/021122334401?foo=bar")).toEqual({
      lang: "de",
      view: "map",
      node: "021122334401",
      link: undefined,
      zoom: undefined,
      lat: undefined,
      lng: undefined,
    });

    expect(matchMeshviewerRoute("/de/map/gw-west-02")).toBeNull();
  });
});
