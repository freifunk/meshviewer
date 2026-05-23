import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Router.customRoute language change", () => {
  const hashSetter = vi.fn<(v: string) => void>();
  const reload = vi.fn<() => void>();

  beforeEach(() => {
    hashSetter.mockReset();
    reload.mockReset();
    vi.stubGlobal("location", {
      get hash() {
        return "";
      },
      set hash(v: string) {
        hashSetter(v);
      },
      reload,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rebuilds the hash from currentState when navigate omits the # prefix", () => {
    const fakeRouter = {
      state: { lang: "de", view: "map" },
      currentState: {},
      language: { getLocale: (l: string) => l },
      targets: [],
      init: true,
      objects: { nodes: { all: [], lost: [], new: [], offline: [], online: [] }, links: [], nodeDict: {} },
      view: vi.fn(),
      gotoNode: vi.fn(),
      gotoLink: vi.fn(),
      resetView: vi.fn(),
      getParams: () => ({}),
      paramsToUrl: Router.prototype.paramsToUrl,
      generateLink: Router.prototype.generateLink,
    };

    // Mimic what Navigo passes to the handler after deepUrl({lang: "en"})
    // navigates to "/en/map" — note hashString is "" because there is no "#".
    const match = {
      data: ["en", "map", undefined, undefined, undefined, undefined, undefined],
      hashString: "",
    };

    Router.prototype.customRoute.call(fakeRouter as never, match as never);

    expect(hashSetter).toHaveBeenCalledWith("/en/map");
    expect(reload).toHaveBeenCalled();
  });
});
