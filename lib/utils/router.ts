import Navigo, { Match } from "navigo";
import { Language } from "./language.js";
import { Link, NodeId } from "./node.js";
import { Moment } from "moment";

export interface Objects {
  nodeDict: NodeId[];
  links: Link[];
  nodes?: Node[];
  now?: Moment;
  timestamp?: Moment;
}

export interface TargetLocation {
  lng: number;
  zoom: number;
  lat: number;
}

export interface Target {
  resetView(): void;
  gotoNode(nodeId: NodeId, nodeIdList: NodeId[]): any;
  gotoLink(link: Link[]): any;
  gotoLocation(locationData: TargetLocation): any;
}

interface Views {
  [k: string]: () => any;
}

export class Router extends Navigo {
  init = false;
  objects: Objects = { nodeDict: [], links: [] };
  targets: Target[] = [];
  views: Views = {};
  currentState = {
    lang: undefined, // like de or en
    view: undefined, // map or graph
    node: undefined, // Node ID
    link: undefined, // Two node IDs concatenated by -
    zoom: undefined,
    lat: undefined,
    lng: undefined,
  };
  // optional URL query-like params parsed from the hash (after '?')
  // param -> string[]
  // Example: #/de/map?foo=a,b&bar=c -> { foo: ['a','b'], bar: ['c'] }
  currentStateParams: { [param: string]: string } | undefined = undefined;
  state = { lang: null, view: "map" };
  language = undefined;

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
    if (this.objects.nodeDict[node.nodeId]) {
      this.targets.forEach((target) => {
        target.gotoNode(this.objects.nodeDict[node.nodeId], this.objects.nodeDict);
      });
    }
  }

  gotoLink(linkData: { linkId: string }) {
    let link = this.objects.links.filter(function (value) {
      return value.id === linkData.linkId;
    });
    if (link) {
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
    let lang: string | undefined = match.data[0];
    let viewValue: "map" | "graph" | string | undefined = match.data[1];
    let node: string | undefined = match.data[2];
    let link: string | undefined = match.data[3];
    let zoom: number | string | undefined = match.data[4];
    let lat: number | string | undefined = match.data[5];
    let lng: number | string | undefined = match.data[6];

    this.currentState = {
      lang: lang,
      view: viewValue,
      node: node,
      link: link,
      zoom: zoom,
      lat: lat,
      lng: lng,
    };

    // parse and store query-like params (after '?') so other components can access them
    this.currentStateParams = match.params;
    console.log("currentStateParams", this.currentStateParams);

    if (lang && lang !== this.state.lang && lang === this.language.getLocale(lang)) {
      console.debug("Language change reload");
      location.hash = "/" + match.hashString;
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
      console.log("currentStateParamsNode", this.currentStateParams);
    } else if (link) {
      this.gotoLink({ linkId: link });
      console.log("currentStateParamsLink", this.currentStateParams);
    } else if (lat) {
      this.targets.forEach((target) => {
        target.gotoLocation({
          zoom: parseInt(this.currentState.zoom, 10),
          lat: parseFloat(this.currentState.lat),
          lng: parseFloat(this.currentState.lng),
        });
      });
    } else {
      console.log("currentStateParamsRESET", this.currentStateParams);
      this.resetView();
    }
  }

  initRoutes() {
    this.on(
      // Redirect legacy URL format
      /^\/?!(.*)?$/,
      (match?: Match) => {
        console.debug("fixing legacy url");
        this.navigate(match.data[0]);
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

  generateLink(data?: {}, full?: boolean) {
    let result = "";

    if (full) {
      data = Object.assign({}, this.state, data);
    } else {
      result = "#";
      data = Object.assign({}, this.currentState, data);
    }

    for (let key in data) {
      if (!data.hasOwnProperty(key) || data[key] === undefined || data[key] === "") {
        continue;
      }
      result += "/" + data[key];
    }

    // if params were provided in data or come from state/currentState, append them as query string
    // params should be an object mapping param -> string[]
    // console.log("parsing params",this.getParams());

    return result;
  }

  fullUrl(data?: {}, e?: Event | false) {
    if (e) {
      e.preventDefault();
    }
    this.navigate(this.generateLink(data, true));
  }

  deepUrl(data?: {}, e?: Event | false) {
    if (e) {
      e.preventDefault();
    }
    this.navigate(this.generateLink(data));
  }

  getLang() {
    let lang = location.hash.match(/^\/?#?\/(\w{2})\//);
    if (lang) {
      this.state.lang = this.language.getLocale(lang[1]);
      return lang[1];
    }
    return null;
  }

  // Parse query-like params from the location.hash (everything after '?')
  getParams(): { [param: string]: string[] } {
    const hash = location.hash || "";
    const idx = hash.indexOf("?");
    if (idx === -1) return {};
    const qs = hash.slice(idx + 1);
    const params = new URLSearchParams(qs);
    const out: { [param: string]: string[] } = {};
    params.forEach(function (value, key) {
      out[key] = value.split(",").filter(Boolean);
    });
    return out;
  }

  // Replace params portion in the current hash with provided params object.
  // If params is empty, the query portion will be removed.
  setParams(params: { [param: string]: string[] }) {
    const hash = location.hash || "";
    const base = hash.split("?")[0] || "";
    const keys = Object.keys(params || {});
    if (!keys.length) {
      location.hash = base;
      return;
    }
    const qs = new URLSearchParams();
    keys.forEach(function (k) {
      qs.set(k, params[k].join(","));
    });
    location.hash = base + "?" + qs.toString();
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

  setData(data: Objects) {
    this.objects = data;
  }
}
