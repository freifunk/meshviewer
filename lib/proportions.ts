import * as d3Interpolate from "d3-interpolate";
import { Moment } from "moment";
import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";
import { DataDistributor, Filter, ObjectsLinksAndNodes } from "./datadistributor.js";
import { GenericNodeFilter } from "./filters/genericnode.js";
import * as helper from "./utils/helper.js";
import { _ } from "./utils/language.js";
import { Node } from "./utils/node.js";
import { compare } from "./utils/version.js";

type TableNode = {
  element: HTMLTableElement;
  vnode?: VNode;
};

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

export const Proportions = function (filterManager: ReturnType<typeof DataDistributor>) {
  const self = {
    setData: undefined,
    render: undefined,
    renderSingle: undefined,
  };
  let config = window.config;
  let scale = d3Interpolate.interpolate(config.forceGraph.tqFrom, config.forceGraph.tqTo);
  let time: Moment;

  let tables: Record<string, TableNode> = {};

  function count(nodes: Node[], key: string[], f?: (k: any) => any) {
    let dict = {};

    nodes.forEach(function (node) {
      let dictKey = helper.dictGet(node, key.slice(0));

      if (f !== undefined) {
        dictKey = f(dictKey);
      }

      if (dictKey === null) {
        return;
      }

      dict[dictKey] = 1 + (dictKey in dict ? dict[dictKey] : 0);
    });

    return Object.keys(dict).map(function (dictKey) {
      return [dictKey, dict[dictKey], key, f];
    });
  }

  function addFilter(filter: Filter) {
    return function () {
      filterManager.addFilter(filter);
      return false;
    };
  }

  function fillTable(name: string, table: TableNode | undefined, data: any[][]): TableNode {
    let tableNode: TableNode = table ?? {
      element: document.createElement("table"),
      vnode: undefined,
    };

    let max = Math.max.apply(
      Math,
      data.map(function (data) {
        return data[1];
      }),
    );

    let items = data.map(function (data) {
      let v = data[1] / max;

      let filter = GenericNodeFilter(_.t(name), data[2], data[0], data[3]);

      let a = h("a", { on: { click: addFilter(filter) } }, data[0]);

      let th = h("th", a);
      let td = h(
        "td",
        h(
          "span",
          {
            style: {
              width: "calc(25px + " + Math.round(v * 90) + "%)",
              backgroundColor: scale(v),
            },
          },
          data[1].toFixed(0),
        ),
      );

      return h("tr", [th, td]);
    });
    let tableNew = h("table", { props: { className: "proportion" } }, items);
    tableNode.vnode = patch(tableNode.vnode ?? tableNode.element, tableNew);
    return tableNode;
  }

  self.setData = function setData(data: ObjectsLinksAndNodes) {
    let nodes = data.nodes.all;
    time = data.timestamp;

    function hostnameOfNodeID(nodeid: string | null) {
      // nodeid is a mac address here
      let gateway = data.nodeDict[nodeid];
      if (gateway) {
        return gateway.hostname;
      }
      return null;
    }

    function sortVersionCountAndName(a, b) {
      // descending by count
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return compare(a[0], b[0]);
    }

    let gatewayDict = count(nodes, ["gateway"], hostnameOfNodeID);
    let gateway6Dict = count(nodes, ["gateway6"], hostnameOfNodeID);

    let statusDict = count(nodes, ["is_online"], function (d) {
      return d ? "online" : "offline";
    });
    let fwDict = count(nodes, ["firmware", "release"]);
    let baseDict = count(nodes, ["firmware", "base"]);
    let deprecationDict = count(nodes, ["model"], function (d) {
      if (config.deprecated && d && config.deprecated.includes(d)) return _.t("deprecation");
      if (config.eol && d && config.eol.includes(d)) return _.t("eol");
      return _.t("no");
    });
    let hwDict = count(nodes, ["model"]);
    let geoDict = count(nodes, ["location"], function (d) {
      return d && d.longitude && d.latitude ? _.t("yes") : _.t("no");
    });

    let autoDict = count(nodes, ["autoupdater"], function (d) {
      if (d.enabled) {
        return d.branch;
      }
      return _.t("node.deactivated");
    });

    let domainDict = count(nodes, ["domain"], function (d) {
      if (config.domainNames) {
        config.domainNames.some(function (t) {
          if (d === t.domain) {
            d = t.name;
            return true;
          }
        });
      }
      return d;
    });

    tables.status = fillTable(
      "node.status",
      tables.status,
      statusDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );

    tables.firmware = fillTable("node.firmware", tables.firmware, fwDict.sort(sortVersionCountAndName));

    tables.baseversion = fillTable("node.baseversion", tables.baseversion, baseDict.sort(sortVersionCountAndName));

    tables.deprecationStatus = fillTable(
      "node.deprecationStatus",
      tables.deprecationStatus,
      deprecationDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );

    tables.hardware = fillTable(
      "node.hardware",
      tables.hardware,
      hwDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );

    tables.visible = fillTable(
      "node.visible",
      tables.visible,
      geoDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );

    tables.update = fillTable(
      "node.update",
      tables.update,
      autoDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    tables.gateway = fillTable(
      "node.selectedGatewayIPv4",
      tables.gateway,
      gatewayDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    tables.gateway6 = fillTable(
      "node.selectedGatewayIPv6",
      tables.gateway6,
      gateway6Dict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    tables.domain = fillTable(
      "node.domain",
      tables.domain,
      domainDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
  };

  self.render = function render(el: HTMLElement) {
    self.renderSingle(el, "node.status", tables.status.element);
    self.renderSingle(el, "node.firmware", tables.firmware.element);
    self.renderSingle(el, "node.baseversion", tables.baseversion.element);
    self.renderSingle(el, "node.deprecationStatus", tables.deprecationStatus.element);
    self.renderSingle(el, "node.hardware", tables.hardware.element);
    self.renderSingle(el, "node.visible", tables.visible.element);
    self.renderSingle(el, "node.update", tables.update.element);
    self.renderSingle(el, "node.selectedGatewayIPv4", tables.gateway.element);
    self.renderSingle(el, "node.selectedGatewayIPv6", tables.gateway6.element);
    self.renderSingle(el, "node.domain", tables.domain.element);

    if (config.globalInfos) {
      let images = document.createElement("div");
      el.appendChild(images);
      let img = [];
      let subst = {
        "{TIME}": String(time.unix()),
        "{LOCALE}": _.locale(),
      };
      config.globalInfos.forEach(function (globalInfo) {
        img.push(h("h2", globalInfo.name));
        img.push(helper.showStat(globalInfo, subst));
      });
      patch(images, h("div", img));
    }
  };

  self.renderSingle = function renderSingle(el: HTMLElement, heading: string, table: HTMLTableElement) {
    if (table.children.length > 0) {
      let h2 = document.createElement("h2");
      h2.classList.add("proportion-header");
      h2.textContent = _.t(heading);
      h2.onclick = function onclick() {
        table.classList.toggle("hide");
      };
      el.appendChild(h2);
      el.appendChild(table);
    }
  };
  return self;
};
