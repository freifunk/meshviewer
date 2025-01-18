import { h, VNode } from "snabbdom";
import { _ } from "./utils/language.js";
import { Heading, SortTable } from "./sorttable.js";
import * as helper from "./utils/helper.js";
import { Node } from "./utils/node.js";
import { CanSetData, ObjectsLinksAndNodes } from "./datadistributor.js";
import { CanRender } from "./container.js";

function showUptime(uptime: number) {
  // 1000ms are 1 second and 60 second are 1min: 60 * 1000 =  60000
  let seconds = uptime / 60000;
  if (Math.abs(seconds) < 60) {
    return Math.round(seconds) + " m";
  }
  seconds /= 60;
  if (Math.abs(seconds) < 24) {
    return Math.round(seconds) + " h";
  }
  seconds /= 24;
  return Math.round(seconds) + " d";
}

let headings: Heading[] = [
  {
    name: "",
  },
  {
    name: "node.nodes",
    sort: function (a, b) {
      return a.hostname.localeCompare(b.hostname);
    },
    reverse: false,
  },
  {
    name: "node.uptime",
    class: "ion-time",
    sort: function (a, b) {
      return a.uptime - b.uptime;
    },
    reverse: true,
  },
  {
    name: "node.links",
    class: "ion-share-alt",
    sort: function (a, b) {
      return a.neighbours.length - b.neighbours.length;
    },
    reverse: true,
  },
  {
    name: "node.clients",
    class: "ion-people",
    sort: function (a, b) {
      return a.clients - b.clients;
    },
    reverse: true,
  },
];

export const Nodelist = function (): CanSetData & CanRender {
  let router = window.router;
  const self = {
    render: undefined,
    setData: undefined,
  };

  function renderRow(node: Node) {
    let td0Content: string | VNode = "";
    if (helper.hasLocation(node)) {
      td0Content = h("span", { props: { className: "icon ion-location", title: _.t("location.location") } });
    }

    let td1Content = h(
      "a",
      {
        props: {
          className: ["hostname", node.is_online ? "online" : "offline"].join(" "),
          href: router.generateLink({ node: node.node_id }),
        },
        on: {
          click: function (e: Event) {
            router.fullUrl({ node: node.node_id }, e);
          },
        },
      },
      node.hostname,
    );

    return h("tr", [
      h("td", td0Content),
      h("td", td1Content),
      h("td", showUptime(node.uptime)),
      h("td", node.neighbours.length),
      h("td", node.clients),
    ]);
  }

  let table = SortTable(headings, 1, renderRow);

  self.render = function render(d: HTMLElement) {
    let h2 = document.createElement("h2");
    h2.textContent = _.t("node.all");
    d.appendChild(h2);
    table.el.classList.add("node-list");
    d.appendChild(table.el);
  };

  self.setData = function setData(nodesData: ObjectsLinksAndNodes) {
    let nodesList = nodesData.nodes.all.map(function (node) {
      let nodeData = Object.create(node);
      if (node.is_online) {
        nodeData.uptime = nodesData.now.valueOf() - new Date(node.uptime).getTime();
      } else {
        nodeData.uptime = node.lastseen.valueOf() - nodesData.now.valueOf();
      }
      return nodeData;
    });

    table.setData(nodesList);
  };

  return {
    setData: self.setData,
    render: self.render,
  };
};
