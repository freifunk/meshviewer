import moment from "moment";
import * as L from "leaflet";

import { _ } from "./utils/language.js";
import { Router } from "./utils/router.js";
import { Gui } from "./gui.js";
import { Language } from "./utils/language.js";
import * as helper from "./utils/helper.js";
import { Link, Node } from "./utils/node.js";
import { ObjectsLinksAndNodes } from "./datadistributor.js";

export const main = () => {
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

    links.forEach(function (link) {
      const raw = link as Link & { source: string; target: string };
      link.source = nodeDict[raw.source];
      link.target = nodeDict[raw.target];

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
      links: links,
      nodeDict: nodeDict,
    } as unknown as ObjectsLinksAndNodes;
  }

  const config = window.config;
  const language = Language();
  const router = (window.router = new Router(language));

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
