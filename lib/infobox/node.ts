import { h, classModule, eventListenersModule, init, propsModule, styleModule, VNode } from "snabbdom";
import { _ } from "../utils/language.js";

import { SortTable } from "../sorttable.js";
import * as helper from "../utils/helper.js";
import nodef, { Neighbour, Node as NodeData, NodeId } from "../utils/node.js";
import { NodeInfo } from "../config_default.js";

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

function showStatImg(nodeInfo: NodeInfo, node: NodeData): HTMLDivElement {
  let config = window.config;
  let subst = {
    "{NODE_ID}": node.node_id,
    "{NODE_NAME}": node.hostname.replace(/[^a-z0-9\-]/gi, "_"),
    "{NODE_CUSTOM}": node.hostname.replace(config.node_custom, "_"),
    "{TIME}": node.lastseen.format("DDMMYYYYHmmss"),
    "{LOCALE}": _.locale(),
  };
  return helper.showStat(nodeInfo, subst);
}

function showDevicePictures(pictures: string, device: NodeData) {
  if (!device.model) {
    return null;
  }
  let subst = {
    "{MODEL}": device.model,
    "{NODE_NAME}": device.hostname,
    "{MODEL_HASH}": device.model
      .split("")
      .reduce(function (a, b) {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0)
      .toString(),
    "{MODEL_NORMALIZED}": device.model
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/gi, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, ""),
  };
  return helper.showDevicePicture(pictures, subst);
}

export function Node(el: HTMLElement, node: NodeData, linkScale: (t: any) => any, nodeDict: { [k: NodeId]: NodeData }) {
  let config = window.config;
  let router = window.router;

  function nodeLink(node: NodeData) {
    return h(
      "a",
      {
        props: {
          className: node.is_online ? "online" : "offline",
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
  }

  function nodeIdLink(nodeId: NodeId) {
    if (nodeDict[nodeId]) {
      return nodeLink(nodeDict[nodeId]);
    }
    return nodeId;
  }

  function showGateway(node: NodeData) {
    let gatewayCols = [
      h("span", [nodeIdLink(node.gateway_nexthop), h("br"), _.t("node.nexthop")]),
      h("span", { props: { className: "ion-arrow-right-c" } }),
      h("span", [nodeIdLink(node.gateway), h("br"), "IPv4"]),
    ];

    if (node.gateway6 !== undefined) {
      gatewayCols.push(h("span", [nodeIdLink(node.gateway6), h("br"), "IPv6"]));
    }

    return h("td", { props: { className: "gateway" } }, gatewayCols);
  }

  function renderNeighbourRow(connecting: Neighbour) {
    let icons = [
      h("span", {
        props: {
          className: "icon ion-" + (connecting.link.type.indexOf("wifi") === 0 ? "wifi" : "share-alt"),
          title: _.t(connecting.link.type),
        },
      }),
    ];
    if (helper.hasLocation(connecting.node)) {
      icons.push(h("span", { props: { className: "ion-location", title: _.t("location.location") } }));
    }

    return h("tr", [
      h("td", icons),
      h("td", nodeLink(connecting.node)),
      h("td", connecting.node.clients),
      h("td", [
        h(
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
              click: function (e: Event) {
                router.fullUrl({ link: connecting.link.id }, e);
              },
            },
          },
          helper.showTq(connecting.link.source_tq) + " - " + helper.showTq(connecting.link.target_tq),
        ),
      ]),
      h("td", helper.showDistance(connecting.link)),
    ]);
  }

  const self = {
    render: undefined,
    setData: undefined,
  };

  let headings = [
    {
      name: "",
      sort: function (a: Neighbour, b: Neighbour) {
        return a.link.type.localeCompare(b.link.type);
      },
    },
    {
      name: "node.nodes",
      sort: function (a: Neighbour, b: Neighbour) {
        return a.node.hostname.localeCompare(b.node.hostname);
      },
      reverse: false,
    },
    {
      name: "node.clients",
      class: "ion-people",
      sort: function (a: Neighbour, b: Neighbour) {
        return a.node.clients - b.node.clients;
      },
      reverse: true,
    },
    {
      name: "node.tq",
      class: "ion-connection-bars",
      sort: function (a: Neighbour, b: Neighbour) {
        return a.link.source_tq - b.link.source_tq;
      },
      reverse: true,
    },
    {
      name: "node.distance",
      class: "ion-arrow-resize",
      sort: function (a: Neighbour, b: Neighbour) {
        return (
          (a.link.distance === undefined ? -1 : a.link.distance) -
          (b.link.distance === undefined ? -1 : b.link.distance)
        );
      },
      reverse: true,
    },
  ];

  let container = document.createElement("div");
  el.appendChild(container);
  let containerVnode: VNode | undefined;

  let tableNeighbour = SortTable(headings, 1, renderNeighbourRow, ["node-links"]);

  self.render = function render() {
    let newContainer = h("div", [h("h2", node.hostname)]);

    // Device picture
    let devicePictures: VNode = showDevicePictures(config.devicePictures, node);
    let devicePicturesContainerData = {
      props: {
        className: "hw-img-container",
      },
    };
    newContainer.children.push(devicePictures ? h("div", devicePicturesContainerData, devicePictures) : h("div"));

    let attributeTable = h("table", { props: { className: "attributes" } }, []);

    let showDeprecation = false;

    config.nodeAttr.forEach(function (row) {
      let field = node[String(row.value)];
      if (typeof row.value === "function") {
        field = row.value(node, nodeDict);
      } else if (nodef["show" + row.value] !== undefined) {
        field = nodef["show" + row.value](node);
      }
      // Check if device is in list of deprecated devices. If so, display the deprecation warning
      if (config.deprecation_enabled) {
        if (row.name === "node.hardware") {
          if (config.deprecated && field && config.deprecated.includes(field)) {
            showDeprecation = true;
          }
        }
      }

      if (field) {
        if (typeof field !== "object") {
          field = h("td", field);
        }
        attributeTable.children.push(h("tr", [row.name !== undefined ? h("th", _.t(row.name)) : null, field]));
      }
    });
    attributeTable.children.push(h("tr", [h("th", _.t("node.gateway")), showGateway(node)]));

    // Deprecation warning
    if (showDeprecation) {
      // Add deprecation warning to the container
      newContainer.children.push(
        h("div", { props: { className: "deprecated" } }, [h("div", config.deprecation_text || _.t("deprecation"))]),
      );
    }

    // Attributes
    newContainer.children.push(attributeTable);

    // // Neighbors
    newContainer.children.push(h("h3", _.t("node.link", node.neighbours.length) + " (" + node.neighbours.length + ")"));
    if (node.neighbours.length > 0) {
      tableNeighbour.setData(node.neighbours);
      newContainer.children.push(tableNeighbour.vnode);
    }

    // // Images
    if (config.nodeInfos) {
      let img = [];
      config.nodeInfos.forEach(function (nodeInfo) {
        img.push(h("h4", nodeInfo.name) as unknown as HTMLElement);
        img.push(showStatImg(nodeInfo, node));
      });
      newContainer.children.push(h("div", img));
    }

    containerVnode = patch(containerVnode ?? container, newContainer);
  };

  self.setData = function setData(data: { nodeDict: { [x: NodeId]: NodeData } }) {
    if (data.nodeDict[node.node_id]) {
      node = data.nodeDict[node.node_id];
    }
    self.render();
  };
  return self;
}
