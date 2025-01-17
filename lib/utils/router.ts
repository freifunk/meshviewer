import Navigo from "navigo";
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

export const Router = function (language: ReturnType<typeof Language>) {
  let init = false;
  let objects: Objects = { nodeDict: [], links: [] };
  let targets: Target[] = [];
  let views: Views = {};
  let current = {
    lang: undefined, // like de or en
    view: undefined, // map or graph
    node: undefined, // Node ID
    link: undefined, // Two node IDs concatenated by -
    zoom: undefined,
    lat: undefined,
    lng: undefined,
  };
  let state = { lang: language.getLocale(), view: "map" };

  function resetView() {
    targets.forEach(function (target) {
      target.resetView();
    });
  }

  function gotoNode(node: { nodeId: NodeId }) {
    if (objects.nodeDict[node.nodeId]) {
      targets.forEach(function (target) {
        target.gotoNode(objects.nodeDict[node.nodeId], objects.nodeDict);
      });
    }
  }

  function gotoLink(linkData: { linkId: string }) {
    let link = objects.links.filter(function (value) {
      return value.id === linkData.linkId;
    });
    if (link) {
      targets.forEach(function (target) {
        target.gotoLink(link);
      });
    }
  }

  function view(data: { view: string }) {
    if (data.view in views) {
      views[data.view]();
      state.view = data.view;
      resetView();
    }
  }

  function customRoute(
    lang?: string,
    viewValue?: "map" | "graph" | string,
    node?: string,
    link?: string,
    zoom?: number | string,
    lat?: number | string,
    lng?: number | string,
  ) {
    current = {
      lang: lang,
      view: viewValue,
      node: node,
      link: link,
      zoom: zoom,
      lat: lat,
      lng: lng,
    };

    if (lang && lang !== state.lang && lang === language.getLocale(lang)) {
      location.reload();
    }

    if (!init || (viewValue && viewValue !== state.view)) {
      if (!viewValue) {
        viewValue = state.view;
      }
      view({ view: viewValue });
      init = true;
    }

    if (node) {
      gotoNode({ nodeId: node });
    } else if (link) {
      gotoLink({ linkId: link });
    } else if (lat) {
      targets.forEach(function (target) {
        target.gotoLocation({
          zoom: parseInt(current.zoom, 10),
          lat: parseFloat(current.lat),
          lng: parseFloat(current.lng),
        });
      });
    } else {
      resetView();
    }
  }

  let router = new Navigo(null, true, "#!");

  router
    .on(
      /^\/?#?!?\/(\w{2})?\/?(map|graph)?\/?([a-f\d]{12})?([a-f\d\-]{25})?\/?(?:(\d+)\/(-?[\d.]+)\/(-?[\d.]+))?$/,
      customRoute,
    )
    .on({
      "*": function () {
        router.fullUrl();
      },
    });

  router.generateLink = function generateLink(data?: {}, full?: boolean, deep?: boolean) {
    let result = "#!";

    if (full) {
      data = Object.assign({}, state, data);
    } else if (deep) {
      data = Object.assign({}, current, data);
    }

    for (let key in data) {
      if (!data.hasOwnProperty(key) || data[key] === undefined || data[key] === "") {
        continue;
      }
      result += "/" + data[key];
    }

    return result;
  };

  router.fullUrl = function fullUrl(data?: {}, e?: Event | false, deep?: boolean) {
    if (e) {
      e.preventDefault();
    }
    router.navigate(router.generateLink(data, !deep, deep), false);
  };

  router.getLang = function getLang() {
    let lang = location.hash.match(/^\/?#!?\/(\w{2})\//);
    if (lang) {
      state.lang = language.getLocale(lang[1]);
      return lang[1];
    }
    return null;
  };

  router.addTarget = function addTarget(target: Target) {
    targets.push(target);
  };

  router.removeTarget = function removeTarget(target: Target) {
    targets = targets.filter(function (t) {
      return target !== t;
    });
  };

  router.addView = function addView(key: string, view: () => any) {
    views[key] = view;
  };

  router.currentView = function currentView(): string | undefined {
    return current.view;
  };

  router.setData = function setData(data: Objects) {
    objects = data;
  };

  return router;
};
