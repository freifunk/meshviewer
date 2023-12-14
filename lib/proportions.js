import V from "snabbdom/dist/snabbdom-patch";
import * as d3Interpolate from "d3-interpolate";

import { GenericNodeFilter } from "./filters/genericnode";
import * as helper from "./utils/helper";
import { compare } from "./utils/version";

export const Proportions = function (filterManager) {
  var self = this;
  var scale = d3Interpolate.interpolate(config.forceGraph.tqFrom, config.forceGraph.tqTo);
  var time;

  var statusTable;
  var fwTable;
  var baseTable;
  var depTable;
  var hwTable;
  var geoTable;
  var autoTable;
  var gatewayTable;
  var gateway6Table;
  var domainTable;

  function count(nodes, key, f) {
    var dict = {};

    nodes.forEach(function (node) {
      var dictKey = helper.dictGet(node, key.slice(0));

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

  function addFilter(filter) {
    return function () {
      filterManager.addFilter(filter);
      return false;
    };
  }

  function fillTable(name, table, data) {
    if (!table) {
      table = document.createElement("table");
    }

    var max = Math.max.apply(
      Math,
      data.map(function (data) {
        return data[1];
      }),
    );

    var items = data.map(function (data) {
      var v = data[1] / max;

      var filter = new GenericNodeFilter(_.t(name), data[2], data[0], data[3]);

      var a = V.h("a", { on: { click: addFilter(filter) } }, data[0]);

      var th = V.h("th", a);
      var td = V.h(
        "td",
        V.h(
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

      return V.h("tr", [th, td]);
    });
    var tableNew = V.h("table", { props: { className: "proportion" } }, items);
    return V.patch(table, tableNew);
  }

  self.setData = function setData(data) {
    var onlineNodes = data.nodes.online;
    var nodes = onlineNodes.concat(data.nodes.lost);
    time = data.timestamp;

    function hostnameOfNodeID(nodeid) {
      var gateway = data.nodeDict[nodeid];
      if (gateway) {
        return gateway.hostname;
      }
      return null;
    }

    var gatewayDict = count(nodes, ["gateway"], hostnameOfNodeID);
    var gateway6Dict = count(nodes, ["gateway6"], hostnameOfNodeID);

    var statusDict = count(nodes, ["is_online"], function (d) {
      return d ? "online" : "offline";
    });
    var fwDict = count(nodes, ["firmware", "release"]);
    var baseDict = count(nodes, ["firmware", "base"]);
    var deprecationDict = count(nodes, ["model"], function (d) {
      if (config.deprecated && d && config.deprecated.includes(d)) return _.t("deprecation");

      if (config.eol && d && config.eol.includes(d)) return _.t("eol");

      return _.t("no");
    });
    var hwDict = count(nodes, ["model"]);
    var geoDict = count(nodes, ["location"], function (d) {
      return d && d.longitude && d.latitude ? _.t("yes") : _.t("no");
    });

    var autoDict = count(nodes, ["autoupdater"], function (d) {
      if (d.enabled) {
        return d.branch;
      }
      return _.t("node.deactivated");
    });

    var domainDict = count(nodes, ["domain"], function (d) {
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

    statusTable = fillTable(
      "node.status",
      statusTable,
      statusDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    fwTable = fillTable("node.firmware", fwTable, fwDict.sort(compare));
    baseTable = fillTable("node.baseversion", baseTable, baseDict.sort(compare));
    depTable = fillTable(
      "node.deprecationStatus",
      depTable,
      deprecationDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    hwTable = fillTable(
      "node.hardware",
      hwTable,
      hwDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    geoTable = fillTable(
      "node.visible",
      geoTable,
      geoDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    autoTable = fillTable(
      "node.update",
      autoTable,
      autoDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    gatewayTable = fillTable(
      "node.selectedGatewayIPv4",
      gatewayTable,
      gatewayDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    gateway6Table = fillTable(
      "node.selectedGatewayIPv6",
      gateway6Table,
      gateway6Dict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
    domainTable = fillTable(
      "node.domain",
      domainTable,
      domainDict.sort(function (a, b) {
        return b[1] - a[1];
      }),
    );
  };

  self.render = function render(el) {
    self.renderSingle(el, "node.status", statusTable);
    self.renderSingle(el, "node.firmware", fwTable);
    self.renderSingle(el, "node.baseversion", baseTable);
    self.renderSingle(el, "node.deprecationStatus", depTable);
    self.renderSingle(el, "node.hardware", hwTable);
    self.renderSingle(el, "node.visible", geoTable);
    self.renderSingle(el, "node.update", autoTable);
    self.renderSingle(el, "node.selectedGatewayIPv4", gatewayTable);
    self.renderSingle(el, "node.selectedGatewayIPv6", gateway6Table);
    self.renderSingle(el, "node.domain", domainTable);

    if (config.globalInfos) {
      var images = document.createElement("div");
      el.appendChild(images);
      var img = [];
      var subst = {
        "{TIME}": time,
        "{LOCALE}": _.locale(),
      };
      config.globalInfos.forEach(function (globalInfo) {
        img.push(V.h("h2", globalInfo.name));
        img.push(helper.showStat(V, globalInfo, subst));
      });
      V.patch(images, V.h("div", img));
    }
  };

  self.renderSingle = function renderSingle(el, heading, table) {
    if (table.children.length > 0) {
      var h2 = document.createElement("h2");
      h2.classList.add("proportion-header");
      h2.textContent = _.t(heading);
      h2.onclick = function onclick() {
        table.elm.classList.toggle("hide");
      };
      el.appendChild(h2);
      el.appendChild(table.elm);
    }
  };
  return self;
};
