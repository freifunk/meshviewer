import { describe, expect, it, vi } from "vitest";
import { Router } from "./router.js";

describe("Router.deepUrl", () => {
  it("navigates without adding an extra hash prefix", () => {
    const navigate = vi.fn();
    const fakeRouter = {
      currentState: {
        lang: "de",
        view: "map",
        node: undefined,
        link: undefined,
        zoom: undefined,
        lat: undefined,
        lng: undefined,
      },
      getParams() {
        return {};
      },
      navigate,
      paramsToUrl: Router.prototype.paramsToUrl,
      generateLink: Router.prototype.generateLink,
    };

    Router.prototype.deepUrl.call(fakeRouter, { view: "graph" });

    expect(navigate).toHaveBeenCalledWith("/de/graph");
  });
});
