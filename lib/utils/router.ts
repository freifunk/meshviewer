import Navigo, { Match } from "navigo";
import { Language } from "./language.js";
import { Link, Node, NodeId } from "./node.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";

export interface TargetLocation {
  lng: number;
  zoom: number;
  lat: number;
}

export interface Target {
  resetView(): void;
  gotoNode(node: Node, nodeDict: { [k: NodeId]: Node }): any;
  gotoLink(link: Link[]): any;
  gotoLocation(locationData: TargetLocation): any;
}

interface Views {
  [k: string]: () => any;
}

type RouteData = Record<string, string> | string[] | null;

function routeGroup(data: RouteData, index: number): string | undefined {
  if (data == null) {
    return undefined;
  }
  if (Array.isArray(data)) {
    return data[index];
  }
  return data[String(index)];
}

export class Router extends Navigo {
  init = false;
  objects: ObjectsLinksAndNodes = {
    nodes: { all: [], lost: [], new: [], offline: [], online: [] },
    links: [],
    nodeDict: {},
  };
  targets: Target[] = [];
  views: Views = {};
  currentState: {
    lang?: string;
    view?: string;
    node?: string;
    link?: string;
    zoom?: string;
    lat?: string;
    lng?: string;
  } = {};
  state: { lang: string | null; view: string } = { lang: null, view: "map" };
  language!: ReturnType<typeof Language>;

  constructor(language: ReturnType<typeof Language>) {
    super("/", { hash: true });
    this.language = language;
    this.state.lang = language.getLocale();
    this.initRoutes();
  }

  resetView() {
    this.targets.forEach(function (target) {
      target.resetView();
    });
  }

  gotoNode(node: { nodeId: NodeId }) {
    const dict = this.objects.nodeDict ?? {};
    const n = dict[node.nodeId];
    if (n) {
      this.targets.forEach((target) => {
        target.gotoNode(n, dict);
      });
    }
  }

  gotoLink(linkData: { linkId: string }) {
    const link = this.objects.links.filter(function (value) {
      return value.id === linkData.linkId;
    });
    if (link.length) {
      this.targets.forEach(function (target) {
        target.gotoLink(link);
      });
    }
  }

  view(data: { view: string }) {
    if (data.view in this.views) {
      this.views[data.view]();
      this.state.view = data.view;
      this.resetView();
    }
  }

  customRoute(match?: Match) {
    const d = match?.data as RouteData;
    const lang = routeGroup(d, 0);
    let viewValue: "map" | "graph" | string | undefined = routeGroup(d, 1);
    const node = routeGroup(d, 2);
    const link = routeGroup(d, 3);
    const zoom = routeGroup(d, 4);
    const lat = routeGroup(d, 5);
    const lng = routeGroup(d, 6);

    this.currentState = {
      lang,
      view: viewValue,
      node,
      link,
      zoom,
      lat,
      lng,
    };

    if (lang && lang !== this.state.lang && lang === this.language.getLocale(lang)) {
      console.debug("Language change reload");
      const prefix = match!.hashString.startsWith("/") ? "" : "/";
      location.hash = prefix + match!.hashString;
      location.reload();
    }

    if (!this.init || (viewValue && viewValue !== this.state.view)) {
      if (!viewValue) {
        viewValue = this.state.view;
      }
      this.view({ view: viewValue });
      this.init = true;
    }

    if (node) {
      this.gotoNode({ nodeId: node });
    } else if (link) {
      this.gotoLink({ linkId: link });
    } else if (lat) {
      this.targets.forEach((target) => {
        target.gotoLocation({
          zoom: parseInt(this.currentState.zoom ?? "0", 10),
          lat: parseFloat(this.currentState.lat ?? "0"),
          lng: parseFloat(this.currentState.lng ?? "0"),
        });
      });
    } else {
      this.resetView();
    }
  }

  initRoutes() {
    this.on(
      // Redirect legacy URL format
      /^\/?!(.*)?$/,
      (match?: Match) => {
        console.debug("fixing legacy url");
        const d = match?.data as RouteData;
        const first = Array.isArray(d) ? d[0] : d && typeof d === "object" ? Object.values(d)[0] : undefined;
        if (first !== undefined) {
          this.navigate(String(first));
        }
      },
    )
      .on(
        // lang, viewValue, node, link, zoom, lat, lon
        /^\/?(\w{2})?\/?(map|graph)?\/?([a-f\d]{12})?([a-f\d\-]{25})?\/?(?:(\d+)\/(-?[\d.]+)\/(-?[\d.]+))?(?:\?.*)?$/,
        (match?: Match) => {
          this.customRoute(match);
        },
      )
      // Default response
      .on(() => {
        console.debug("default route redirect");
        this.fullUrl();
      })
      // 404 response
      .notFound(() => {
        console.debug("notFound redirect");
        this.fullUrl();
      });
  }

  paramsToUrl(params: { [param: string]: string[] }) {
    const keys = Object.keys(params);
    if (!keys.length) {
      return "";
    }
    const qs = new URLSearchParams();
    keys.forEach(function (k) {
      qs.set(k, params[k].join(","));
    });
    return "?" + qs.toString();
  }

  generateLink(data?: Record<string, unknown>, full?: boolean) {
    let result = "";

    let merged: Record<string, unknown>;
    if (full) {
      merged = Object.assign({}, this.state, data);
    } else {
      result = "#";
      merged = Object.assign({}, this.currentState, data);
    }

    for (const key in merged) {
      if (!Object.prototype.hasOwnProperty.call(merged, key)) {
        continue;
      }
      const v = merged[key];
      if (v === undefined || v === "") {
        continue;
      }
      result += "/" + String(v);
    }

    const params = this.getParams();
    result += this.paramsToUrl(params);

    return result;
  }

  fullUrl(data?: Record<string, unknown>, e?: Event | false) {
    if (e) {
      e.preventDefault();
    }
    this.navigate(this.generateLink(data, true));
  }

  deepUrl(data?: Record<string, unknown>, e?: Event | false) {
    if (e) {
      e.preventDefault();
    }
    this.navigate(this.generateLink(data));
  }

  getLang() {
    const lang = location.hash.match(/^\/?#?\/(\w{2})\//);
    if (lang) {
      this.state.lang = this.language.getLocale(lang[1]);
      return lang[1];
    }
    return null;
  }

  // Parse query-like params from the location.hash (everything after '?')
  getParams(): { [param: string]: string[] } {
    const hash = location.hash || "";
    const [, queryString] = hash.split("?");
    const out: { [param: string]: string[] } = {};

    if (!queryString) {
      return out;
    }

    const params = new URLSearchParams(queryString);

    params.forEach(function (value, key) {
      const parts = value.split(",").filter(Boolean);

      if (!out[key]) {
        out[key] = parts;
      } else {
        out[key] = out[key].concat(parts);
      }
    });

    return out;
  }

  // Replace params portion in the current hash with provided params object.
  // If params is empty, the query portion will be removed.
  setParams(params: { [param: string]: string[] }) {
    const hash = location.hash || "";
    const base = hash.split("?")[0] || "";
    location.hash = base + this.paramsToUrl(params);
  }

  addTarget(target: Target) {
    this.targets.push(target);
  }
  removeTarget(target: Target) {
    this.targets = this.targets.filter(function (t) {
      return target !== t;
    });
  }

  addView(key: string, view: () => any) {
    this.views[key] = view;
  }

  currentView(): string | undefined {
    return this.currentState.view;
  }

  setData(data: ObjectsLinksAndNodes) {
    this.objects = data;
  }
}
