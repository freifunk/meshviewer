import moment from "moment";
import * as L from "leaflet";

import { _ } from "./utils/language.js";
import { Router } from "./utils/router.js";
import { Gui } from "./gui.js";
import { Language } from "./utils/language.js";
import * as helper from "./utils/helper.js";
import { Link, Node } from "./utils/node.js";
import { ObjectsLinksAndNodes } from "./datadistributor.js";
import { resolveValidLinks } from "./mainDataUtils.js";

export const main = () => {
  function normalizeHash(hash: string) {
    if (!hash) {
      return "";
    }

    return hash.startsWith("#") ? hash : `#${hash}`;
  }

  function replaceHash(hash: string) {
    const nextHash = normalizeHash(hash);

    if (!nextHash || nextHash === window.location.hash) {
      return;
    }

    window.location.replace(nextHash);
  }

  function postHashToParent() {
    console.log("post: ", window.location.hash);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ hash: window.location.hash }, "*");
    }
  }

  function initEmbedSync() {
    if (window.parent === window) {
      return;
    }

    // Attach to Navigo's internal methods to post the hash to the parent whenever it changes
    type HistoryMethodName = "pushState" | "replaceState";
    function wrapHistoryMethod(method: HistoryMethodName) {
      const originalMethod = window.history[method].bind(window.history);

      window.history[method] = function (...args) {
        const result = originalMethod(...args);
        postHashToParent();
        return result;
      } as History[HistoryMethodName];
    }

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");

    window.addEventListener("hashchange", postHashToParent);
    window.addEventListener("message", function (event) {
      if (event && event.data && typeof event.data.hash === "string") {
        replaceHash(event.data.hash);
      }
    });
  }

  function handleData(data: { links: Link[]; nodes: Node[]; timestamp: string }[]) {
    const config = window.config;
    let timestamp = "";
    let nodes: Node[] = [];
    let links: Link[] = [];
    const nodeDict: Record<string, Node> = {};

    for (let i = 0; i < data.length; ++i) {
      nodes = nodes.concat(data[i].nodes);
      timestamp = data[i].timestamp;
      links = links.concat(data[i].links);
    }

    nodes.forEach(function (node) {
      node.firstseen = moment.utc(node.firstseen).local();
      node.lastseen = moment.utc(node.lastseen).local();
    });

    const age = moment().subtract(config.maxAge, "days");

    const online = nodes.filter(function (node) {
      return node.is_online;
    });
    const offline = nodes.filter(function (node) {
      return !node.is_online;
    });

    const newnodes = helper.limit("firstseen", age, helper.sortByKey("firstseen", online as any));
    const lostnodes = helper.limit("lastseen", age, helper.sortByKey("lastseen", offline as any));

    nodes.forEach(function (node) {
      node.neighbours = [];
      nodeDict[node.node_id] = node;
    });

    let validLinks = resolveValidLinks(links, nodeDict);

    validLinks.forEach(function (link) {
      link.id = [link.source.node_id, link.target.node_id].join("-");
      link.source.neighbours.push({ node: link.target, link: link });
      link.target.neighbours.push({ node: link.source, link: link });

      try {
        const latlngs: L.LatLng[] = [];
        latlngs.push(L.latLng(link.source.location.latitude, link.source.location.longitude));
        latlngs.push(L.latLng(link.target.location.latitude, link.target.location.longitude));
        (link as Link & { latlngs: L.LatLng[] }).latlngs = latlngs;

        link.distance = latlngs[0].distanceTo(latlngs[1]);
      } catch (e) {
        // ignore exception
      }
    });

    return {
      now: moment(),
      timestamp: moment.utc(timestamp).local(),
      nodes: {
        all: nodes,
        online: online,
        offline: offline,
        new: newnodes,
        lost: lostnodes,
      },
      links: validLinks,
      nodeDict: nodeDict,
    } as unknown as ObjectsLinksAndNodes;
  }

  const config = window.config;
  const language = Language();
  const router = (window.router = new Router(language));

  initEmbedSync();

  config.dataPath.forEach(function (_element, i) {
    config.dataPath[i] += "meshviewer.json";
  });

  language.init(router);

  function update() {
    return Promise.all(config.dataPath.map(helper.getJSON)).then(handleData);
  }

  update()
    .then(function (nodesData) {
      return new Promise(function (resolve, reject) {
        let count = 0;
        function waitForLanguage() {
          if (Object.keys(_.phrases ?? {}).length > 0) {
            resolve(nodesData);
          } else if (count > 500) {
            reject(new Error("translation not loaded after 10 seconds"));
          } else {
            setTimeout(waitForLanguage, 20);
          }
          count++;
        }
        waitForLanguage();
      });
    })
    .then(function (nodesData) {
      const data = nodesData as ObjectsLinksAndNodes;
      const gui = Gui(language);
      gui.setData(data);
      router.setData(data);
      router.resolve();
      postHashToParent();

      window.setInterval(function () {
        update().then(function (fresh) {
          const nd = fresh as ObjectsLinksAndNodes;
          gui.setData(nd);
          router.setData(nd);
        });
      }, 60000);
    })
    .catch(function (e: Error) {
      const loader = document.querySelector(".loader");
      if (loader) {
        loader.innerHTML +=
          e.message +
          '<br /><br /><button onclick="location.reload(true)" class="btn text" aria-label="Try to reload">Try to reload</button><br /> or report to your community';
      }
      console.warn(e);
    });
};
