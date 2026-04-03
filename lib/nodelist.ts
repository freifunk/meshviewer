import moment from "moment";
import { h, VNode } from "snabbdom";
import { _ } from "./utils/language.js";
import { Heading, SortTable } from "./sorttable.js";
import * as helper from "./utils/helper.js";
import { Node } from "./utils/node.js";
import { CanSetData, ObjectsLinksAndNodes } from "./datadistributor.js";
import { CanRender } from "./container.js";

function showUptime(uptime: number) {
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

const headings: Heading[] = [
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
  const router = window.router;
  const table = SortTable(headings, 1, renderRow);

  function renderRow(node: Node) {
    let td0Content: string | VNode = "";
    if (helper.hasLocation(node)) {
      td0Content = h("span", { props: { className: "icon ion-location", title: _.t("location.location") } });
    }

    const td1Content = h(
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

  return {
    render(d: HTMLElement) {
      const h2 = document.createElement("h2");
      h2.textContent = _.t("node.all");
      d.appendChild(h2);
      table.el.classList.add("node-list");
      d.appendChild(table.el);
    },

    setData(nodesData: ObjectsLinksAndNodes) {
      const now = nodesData.now ?? moment();
      const nodesList = nodesData.nodes.all.map(function (node) {
        const nodeData = Object.create(node);
        if (node.is_online) {
          nodeData.uptime = now.valueOf() - new Date(node.uptime).getTime();
        } else {
          nodeData.uptime = node.lastseen.valueOf() - now.valueOf();
        }
        return nodeData;
      });

      table.setData(nodesList);
    },
  };
};
