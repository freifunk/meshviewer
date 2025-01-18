import { Moment } from "moment";
import { h, VNode } from "snabbdom";
import { Map } from "leaflet";
import { _ } from "./language.js";
import { Node } from "./node.js";
import { LinkInfo, NodeInfo } from "../config_default.js";

export const get = function get(url: string) {
  return new Promise(function (resolve, reject) {
    let req = new XMLHttpRequest();
    req.open("GET", url);

    req.onload = function onload() {
      if (req.status === 200) {
        resolve(req.response);
      } else {
        reject(Error(req.statusText));
      }
    };

    req.onerror = function onerror() {
      reject(Error("Network Error"));
    };

    req.send();
  });
};

export const getJSON = function getJSON(url: string) {
  return get(url).then(JSON.parse);
};

export const sortByKey = function sortByKey(key: string, data: { [k: string]: Moment }[]) {
  return data.sort(function (a, b) {
    return b[key].unix() - a[key].unix();
  });
};

export const limit = function limit(
  key: string,
  moment: Moment,
  data: { [k: string]: { isAfter: (p: Moment) => boolean } }[],
) {
  return data.filter(function (entry) {
    return entry[key].isAfter(moment);
  });
};

export const sum = function sum(items: number[]) {
  return items.reduce(function (a, b) {
    return a + b;
  }, 0);
};

export const one = function one() {
  return 1;
};

export const dictGet = function dictGet(dict: { [x: string]: any }, keys: string[]) {
  let key = keys.shift();

  if (!(key in dict)) {
    return null;
  }

  if (keys.length === 0) {
    return dict[key];
  }

  return dictGet(dict[key], keys);
};

export const listReplace = function listReplace(template: string, subst: ReplaceMapping) {
  for (let key in subst) {
    if (subst.hasOwnProperty(key)) {
      let re = new RegExp(key, "g");
      template = template.replace(re, subst[key]);
    }
  }
  return template;
};

export const hasLocation = function hasLocation(data: Node | {}) {
  return "location" in data && Math.abs(data.location.latitude) < 90 && Math.abs(data.location.longitude) < 180;
};

export const hasUplink = function hasUplink(data: Node | {}) {
  if (!("neighbours" in data)) {
    return false;
  }
  let uplink = false;
  data.neighbours.forEach(function (l) {
    if (l.link.type === "vpn") {
      uplink = true;
    }
  });
  return uplink;
};

export const subtract = function subtract(a: Node[], b: Node[]) {
  let ids = {};

  b.forEach(function (d) {
    ids[d.node_id] = true;
  });

  return a.filter(function (d) {
    return !ids[d.node_id];
  });
};

/* Helpers working with links */

export const showDistance = function showDistance(data: { distance: number }) {
  if (isNaN(data.distance)) {
    return "";
  }

  return data.distance.toFixed(0) + " m";
};

export const showTq = function showTq(tq: number) {
  return (tq * 100).toFixed(0) + "%";
};

export function attributeEntry(children: VNode[], label: string, value: string | VNode) {
  if (value !== undefined) {
    if (typeof value !== "object") {
      value = h("td", value);
    }

    children.push(h("tr", [h("th", _.t(label)), value]));
  }
}

export function showStat(linkInfo: LinkInfo, subst: ReplaceMapping): HTMLDivElement {
  let content = h("img", {
    props: {
      src: listReplace(linkInfo.image, subst),
      width: linkInfo.width,
      height: linkInfo.height,
      alt: _.t("loading", { name: linkInfo.name }),
    },
  });

  if (linkInfo.href) {
    return h(
      "div",
      h(
        "a",
        {
          props: {
            href: listReplace(linkInfo.href, subst),
            target: "_blank",
            title: listReplace(linkInfo.title, subst),
          },
        },
        content,
      ),
    ) as unknown as HTMLDivElement;
  }
  return h("div", content) as unknown as HTMLDivElement;
}

export const showDevicePicture = function showDevicePicture(pictures: string, subst: ReplaceMapping) {
  if (!pictures) {
    return null;
  }

  return h("img", {
    props: { src: listReplace(pictures, subst), class: "hw-img" },
    on: {
      // hide non-existent images
      error: function (e: any) {
        e.target.style.display = "none";
      },
    },
  });
};

export const getTileBBox = function getTileBBox(size: Point, map: Map, tileSize: number, margin: number) {
  let tl = map.unproject([size.x - margin, size.y - margin]);
  let br = map.unproject([size.x + margin + tileSize, size.y + margin + tileSize]);

  return { minX: br.lat, minY: tl.lng, maxX: tl.lat, maxY: br.lng };
};

export const positionClients = function positionClients(
  ctx: CanvasRenderingContext2D,
  point: Point,
  startAngle: number,
  node: Node,
  startDistance: number,
) {
  if (node.clients === 0) {
    return;
  }

  let radius = 3;
  let a = 1.2;
  let mode = 0;
  let config = window.config;

  ctx.beginPath();
  ctx.fillStyle = config.client.wifi24;

  for (let orbit = 0, i = 0; i < node.clients; orbit++) {
    let distance = startDistance + orbit * 2 * radius * a;
    let n = Math.floor((Math.PI * distance) / (a * radius));
    let delta = node.clients - i;

    for (let j = 0; j < Math.min(delta, n); i++, j++) {
      if (mode !== 1 && i >= node.clients_wifi24 + node.clients_wifi5) {
        mode = 1;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = config.client.wifi5;
      } else if (mode === 0 && i >= node.clients_wifi24) {
        mode = 2;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = config.client.other;
      }
      let angle = ((2 * Math.PI) / n) * j;
      let x = point.x + distance * Math.cos(angle + startAngle);
      let y = point.y + distance * Math.sin(angle + startAngle);

      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
  }
  ctx.fill();
};

export const fullscreen = function fullscreen(btn: HTMLButtonElement) {
  if (!document.fullscreenElement && !document["webkitFullscreenElement"] && !document["mozFullScreenElement"]) {
    let fel = document.firstElementChild;
    let func = fel.requestFullscreen || fel["webkitRequestFullScreen"] || fel["mozRequestFullScreen"];
    func.call(fel);
    btn.classList.remove("ion-full-enter");
    btn.classList.add("ion-full-exit");
  } else {
    let func = document.exitFullscreen || document["webkitExitFullscreen"] || document["mozCancelFullScreen"];
    if (func) {
      func.call(document);
      btn.classList.remove("ion-full-exit");
      btn.classList.add("ion-full-enter");
    }
  }
};

export const escape = function escape(string: string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&#34;").replace(/'/g, "&#39;");
};
