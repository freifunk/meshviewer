import V from "snabbdom/dist/snabbdom-patch";

import { SortTable } from "../sorttable";
import * as helper from "../utils/helper";
import nodef from "../utils/node";

function showStatImg(nodeInfo, node) {
  var subst = {
    "{NODE_ID}": node.node_id,
    "{NODE_NAME}": node.hostname.replace(/[^a-z0-9\-]/gi, "_"),
    "{NODE_CUSTOM}": node.hostname.replace(config.node_custom, "_"),
    "{TIME}": node.lastseen.format("DDMMYYYYHmmss"),
    "{LOCALE}": _.locale(),
  };
  return helper.showStat(V, nodeInfo, subst);
}

function showDevicePictures(pictures, device) {
  if (!device.model) {
    return null;
  }
  var subst = {
    "{MODEL}": device.model,
    "{NODE_NAME}": device.hostname,
    "{MODEL_HASH}": device.model.split("").reduce(function (a, b) {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0),
    "{MODEL_NORMALIZED}": device.model
      .toLowerCase()
      .replace(/[^a-z0-9\.\-]+/gi, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, ""),
  };
  return helper.showDevicePicture(V, pictures, subst);
}

export function Node(el, node, linkScale, nodeDict) {
  function nodeLink(node) {
    return V.h(
      "a",
      {
        props: {
          className: node.is_online ? "online" : "offline",
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
  }

  function nodeIdLink(nodeId) {
    if (nodeDict[nodeId]) {
      return nodeLink(nodeDict[nodeId]);
    }
    return nodeId;
  }

  function showGateway(node) {
    var gatewayCols = [
      V.h("span", [nodeIdLink(node.gateway_nexthop), V.h("br"), _.t("node.nexthop")]),
      V.h("span", { props: { className: "ion-arrow-right-c" } }),
      V.h("span", [nodeIdLink(node.gateway), V.h("br"), "IPv4"]),
    ];

    if (node.gateway6 !== undefined) {
      gatewayCols.push(V.h("span", [nodeIdLink(node.gateway6), V.h("br"), "IPv6"]));
    }

    return V.h("td", { props: { className: "gateway" } }, gatewayCols);
  }

  function renderNeighbourRow(connecting) {
    var icons = [
      V.h("span", {
        props: {
          className: "icon ion-" + (connecting.link.type.indexOf("wifi") === 0 ? "wifi" : "share-alt"),
          title: _.t(connecting.link.type),
        },
      }),
    ];
    if (helper.hasLocation(connecting.node)) {
      icons.push(V.h("span", { props: { className: "ion-location", title: _.t("location.location") } }));
    }

    return V.h("tr", [
      V.h("td", icons),
      V.h("td", nodeLink(connecting.node)),
      V.h("td", connecting.node.clients),
      V.h("td", [
        V.h(
          "a",
          {
            style: {
              color: linkScale((connecting.link.source_tq + connecting.link.target_tq) / 2),
            },
            props: {
              title: connecting.link.source.hostname + " - " + connecting.link.target.hostname,
              href: router.generateLink({ link: connecting.link.id }),
            },
            on: {
              click: function (e) {
                router.fullUrl({ link: connecting.link.id }, e);
              },
            },
          },
          helper.showTq(connecting.link.source_tq) + " - " + helper.showTq(connecting.link.target_tq),
        ),
      ]),
      V.h("td", helper.showDistance(connecting.link)),
    ]);
  }

  var self = this;
  var header = document.createElement("h2");
  var devicePicture = document.createElement("div");
  var table = document.createElement("table");
  var images = document.createElement("div");
  var neighbours = document.createElement("h3");
  var headings = [
    {
      name: "",
      sort: function (a, b) {
        return a.link.type.localeCompare(b.link.type);
      },
    },
    {
      name: "node.nodes",
      sort: function (a, b) {
        return a.node.hostname.localeCompare(b.node.hostname);
      },
      reverse: false,
    },
    {
      name: "node.clients",
      class: "ion-people",
      sort: function (a, b) {
        return a.node.clients - b.node.clients;
      },
      reverse: true,
    },
    {
      name: "node.tq",
      class: "ion-connection-bars",
      sort: function (a, b) {
        return a.link.source_tq - b.link.source_tq;
      },
      reverse: true,
    },
    {
      name: "node.distance",
      class: "ion-arrow-resize",
      sort: function (a, b) {
        return (
          (a.link.distance === undefined ? -1 : a.link.distance) -
          (b.link.distance === undefined ? -1 : b.link.distance)
        );
      },
      reverse: true,
    },
  ];
  var tableNeighbour = new SortTable(headings, 1, renderNeighbourRow);

  // Prepare deprecation warning. At first not displayed, text follows later
  var deprecation = document.createElement("div");
  deprecation.setAttribute("class", "deprecated");
  deprecation.setAttribute("style", "display: none;");
  deprecation.innerHTML = "<div>" + (config.deprecation_text || _.t("deprecation-text")) + "</div>";

  var eol = document.createElement("div");
  eol.setAttribute("class", "eol");
  eol.setAttribute("style", "display: none;");
  eol.innerHTML = "<div>" + (config.eol_text || _.t("eol-text")) + "</div>";

  el.appendChild(header);
  el.appendChild(devicePicture);
  el.appendChild(deprecation);
  el.appendChild(eol);
  el.appendChild(table);
  el.appendChild(neighbours);
  el.appendChild(tableNeighbour.el);
  el.appendChild(images);

  self.render = function render() {
    V.patch(header, V.h("h2", node.hostname));

    var devicePictures = showDevicePictures(config.devicePictures, node);
    var devicePicturesContainerData = {
      attrs: {
        class: "hw-img-container",
      },
    };
    devicePicture = V.patch(
      devicePicture,
      devicePictures ? V.h("div", devicePicturesContainerData, devicePictures) : V.h("div"),
    );

    var children = [];

    config.nodeAttr.forEach(function (row) {
      var field = node[row.value];
      if (typeof row.value === "function") {
        field = row.value(node, nodeDict);
      } else if (nodef["show" + row.value] !== undefined) {
        field = nodef["show" + row.value](node);
      }
      // Check if device is in list of deprecated devices. If so, display the deprecation warning
      if (config.deprecation_enabled) {
        if (row.name === "node.hardware") {
          if (config.eol && field && config.eol.includes(field)) {
            eol.setAttribute("style", "display: block;");
          } else if (config.deprecated && field && config.deprecated.includes(field)) {
            deprecation.setAttribute("style", "display: block;");
          }
        }
      }

      if (field) {
        if (typeof field !== "object") {
          field = V.h("td", field);
        }
        children.push(V.h("tr", [row.name !== undefined ? V.h("th", _.t(row.name)) : null, field]));
      }
    });

    children.push(V.h("tr", [V.h("th", _.t("node.gateway")), showGateway(node)]));

    var elNew = V.h("table", children);
    table = V.patch(table, elNew);
    table.elm.classList.add("attributes");

    V.patch(neighbours, V.h("h3", _.t("node.link", node.neighbours.length) + " (" + node.neighbours.length + ")"));
    if (node.neighbours.length > 0) {
      tableNeighbour.setData(node.neighbours);
      tableNeighbour.el.elm.classList.add("node-links");
    }

    if (config.nodeInfos) {
      var img = [];
      config.nodeInfos.forEach(function (nodeInfo) {
        img.push(V.h("h4", nodeInfo.name));
        img.push(showStatImg(nodeInfo, node));
      });
      images = V.patch(images, V.h("div", img));
    }
  };

  self.setData = function setData(data) {
    if (data.nodeDict[node.node_id]) {
      node = data.nodeDict[node.node_id];
    }
    self.render();
  };
  return self;
}
