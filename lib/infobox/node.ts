import { h, classModule, eventListenersModule, init, propsModule, styleModule, VNode } from "snabbdom";
import { _ } from "../utils/language.js";

import { SortTable } from "../sorttable.js";
import * as helper from "../utils/helper.js";
import nodef, { Neighbour, Node as NodeData, NodeId } from "../utils/node.js";
import { NodeInfo } from "../config_default.js";
import { createChartVNode } from "./chart.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";

// `config.nodeAttr.value` may be either a function or a string. When it is a
// string the renderer first looks for a `show<value>` helper in nodef and falls
// back to reading the attribute off the node itself. Both lookups are dynamic
// against a config-provided key, which is captured by these local types.
type NodeFieldValue = string | number | VNode | undefined;
type NodefShowers = Record<string, ((n: NodeData) => NodeFieldValue) | undefined>;
type NodeRecord = Record<string, NodeFieldValue>;

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

function showStatImg(nodeInfo: NodeInfo, node: NodeData): VNode {
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
              color: linkScale(
                ((helper.linkMetric(connecting.link.source_tq, connecting.link.source_tp) ?? 0) +
                  (helper.linkMetric(connecting.link.target_tq, connecting.link.target_tp) ?? 0)) /
                  2,
              ),
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
          helper.showBiDiLinkMetric(
            connecting.link.source_tq,
            connecting.link.source_tp,
            connecting.link.target_tq,
            connecting.link.target_tp,
          ),
        ),
      ]),
      h("td", helper.showDistance(connecting.link)),
    ]);
  }

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
        let am = helper.linkMetric(a.link.source_tq, a.link.source_tp);
        let bm = helper.linkMetric(b.link.source_tq, b.link.source_tp);
        return (am === undefined ? -Infinity : am) - (bm === undefined ? -Infinity : bm);
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

  const self = {
    render() {
      const containerChildren: (VNode | string)[] = [h("h2", node.hostname)];

      // Device picture
      const devicePictures = showDevicePictures(config.devicePictures, node);
      const devicePicturesContainerData = {
        props: {
          className: "hw-img-container",
        },
      };
      containerChildren.push(devicePictures ? h("div", devicePicturesContainerData, devicePictures) : h("div"));

      const attributeRows: (VNode | string)[] = [];

      let showDeprecation = false;
      let showEol = false;

      const showers: NodefShowers = nodef;
      const nodeRecord: NodeRecord = node as unknown as NodeRecord;

      config.nodeAttr.forEach(function (row) {
        let field: NodeFieldValue;
        if (typeof row.value === "function") {
          field = row.value(node, nodeDict);
        } else {
          const shower = showers[`show${row.value}`];
          field = shower ? shower(node) : nodeRecord[row.value];
        }

        // Check if device is in list of deprecated devices. If so, display the deprecation warning
        if (config.deprecation_enabled && row.name === "node.hardware" && typeof field === "string") {
          if (config.eol && config.eol.includes(field)) {
            showEol = true;
          } else if (config.deprecated && config.deprecated.includes(field)) {
            showDeprecation = true;
          }
        }

        if (field) {
          const cell: VNode = typeof field === "object" ? field : h("td", String(field));
          const rowCells: VNode[] = [];
          if (row.name !== undefined) {
            rowCells.push(h("th", _.t(row.name)));
          }
          rowCells.push(cell);
          attributeRows.push(h("tr", rowCells));
        }
      });
      attributeRows.push(h("tr", [h("th", _.t("node.gateway")), showGateway(node)]));
      const attributeTable = h("table", { props: { className: "attributes" } }, attributeRows);

      // Deprecation warning
      if (showEol) {
        containerChildren.push(
          h("div", { props: { className: "eol" } }, [
            h("div", {
              props: {
                innerHTML: config.eol_text || _.t("eol-text"),
              },
            }),
          ]),
        );
      } else if (showDeprecation) {
        containerChildren.push(
          h("div", { props: { className: "deprecated" } }, [
            h("div", {
              props: {
                innerHTML: config.deprecation_text || _.t("deprecation-text"),
              },
            }),
          ]),
        );
      }

      // Attributes
      containerChildren.push(attributeTable);

      // Neighbours
      containerChildren.push(h("h3", _.t("node.link", node.neighbours.length) + " (" + node.neighbours.length + ")"));
      if (node.neighbours.length > 0) {
        tableNeighbour.setData(node.neighbours);
        if (tableNeighbour.vnode) {
          containerChildren.push(tableNeighbour.vnode);
        }
      }

      // Images
      if (config.nodeInfos) {
        const img: VNode[] = [];
        config.nodeInfos.forEach(function (nodeInfo) {
          img.push(h("h4", nodeInfo.name));
          img.push(showStatImg(nodeInfo, node));
        });
        containerChildren.push(h("div", img));
      }

      // Charts
      if (config.nodeCharts.length) {
        const charts = config.nodeCharts.flatMap((chart) => [
          h("h4", chart.name),
          createChartVNode(chart, { node: node.node_id }),
        ]);
        containerChildren.push(h("div", charts));
      }

      const newContainer = h("div", containerChildren);
      containerVnode = patch(containerVnode ?? container, newContainer);
    },

    setData(data: ObjectsLinksAndNodes) {
      const fresh = data.nodeDict?.[node.node_id];
      if (fresh) {
        node = fresh;
      }
      self.render();
    },
  };

  return self;
}
