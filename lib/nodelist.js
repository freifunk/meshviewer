import V from "snabbdom/dist/snabbdom-patch";

import { SortTable } from "./sorttable";
import * as helper from "./utils/helper";

function showUptime(uptime) {
  // 1000ms are 1 second and 60 second are 1min: 60 * 1000 =  60000
  var seconds = uptime / 60000;
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

var headings = [
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

export const Nodelist = function () {
  function renderRow(node) {
    var td0Content = "";
    if (helper.hasLocation(node)) {
      td0Content = V.h("span", { props: { className: "icon ion-location", title: _.t("location.location") } });
    }

    var td1Content = V.h(
      "a",
      {
        props: {
          className: ["hostname", node.is_online ? "online" : "offline"].join(" "),
          href: router.generateLink({ node: node.node_id }),
        },
        on: {
          click: function (e) {
            router.fullUrl({ node: node.node_id }, e);
          },
        },
      },
      node.hostname,
    );

    return V.h("tr", [
      V.h("td", td0Content),
      V.h("td", td1Content),
      V.h("td", showUptime(node.uptime)),
      V.h("td", node.neighbours.length),
      V.h("td", node.clients),
    ]);
  }

  var table = new SortTable(headings, 1, renderRow);

  this.render = function render(d) {
    var h2 = document.createElement("h2");
    h2.textContent = _.t("node.all");
    d.appendChild(h2);
    table.el.elm.classList.add("node-list");
    d.appendChild(table.el.elm);
  };

  this.setData = function setData(nodesData) {
    var nodesList = nodesData.nodes.all.map(function (node) {
      var nodeData = Object.create(node);
      if (node.is_online) {
        nodeData.uptime = nodesData.now - new Date(node.uptime).getTime();
      } else {
        nodeData.uptime = node.lastseen - nodesData.now;
      }
      return nodeData;
    });

    table.setData(nodesList);
  };
};
