import * as d3Interpolate from "d3-interpolate";
import { Moment } from "moment";
import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";
import { DataDistributor, Filter, GenericFilter, ObjectsLinksAndNodes } from "./datadistributor.js";
import { GenericNodeFilter } from "./filters/genericnode.js";
import * as helper from "./utils/helper.js";
import { _ } from "./utils/language.js";
import { Node } from "./utils/node.js";
import { compare } from "./utils/version.js";

type TableNode = {
  element: HTMLTableElement;
  vnode?: VNode;
};

type Modifier = (value: any, ctx?: ObjectsLinksAndNodes) => string;

type MappingEntry = {
  keys: string[];
  modifier?: Modifier;
};

const statusFieldMapping: Record<string, MappingEntry> = {
  "node.status": {
    keys: ["is_online"],
    modifier: function (d: any) {
      return d ? "online" : "offline";
    },
  },
  "node.firmware": {
    keys: ["firmware", "release"],
  },
  "node.baseversion": {
    keys: ["firmware", "base"],
  },
  "node.deprecationStatus": {
    keys: ["model"],
    modifier: function (d: any) {
      if (window.config.deprecated && d && window.config.deprecated.includes(d)) return _.t("deprecation");
      if (window.config.eol && d && window.config.eol.includes(d)) return _.t("eol");
      return _.t("no");
    },
  },
  "node.hardware": {
    keys: ["model"],
  },
  "node.visible": {
    keys: ["location"],
    modifier: function (d: any) {
      return d && d.longitude && d.latitude ? _.t("yes") : _.t("no");
    },
  },
  "node.update": {
    keys: ["autoupdater"],
    modifier: function (d: any) {
      if (d.enabled) {
        return d.branch;
      }
      return _.t("node.deactivated");
    },
  },
  "node.selectedGatewayIPv4": {
    keys: ["gateway"],
    modifier: function (nodeid: string | null, data: ObjectsLinksAndNodes) {
      let gateway = data.nodeDict[nodeid];
      if (gateway) {
        return gateway.hostname;
      }
      return null;
    },
  },
  "node.selectedGatewayIPv6": {
    keys: ["gateway6"],
    modifier: function (nodeid: string | null, data: ObjectsLinksAndNodes) {
      let gateway = data.nodeDict[nodeid];
      if (gateway) {
        return gateway.hostname;
      }
      return null;
    },
  },
  "node.domain": {
    keys: ["domain"],
    modifier: function (d: any) {
      if (window.config.domainNames) {
        window.config.domainNames.some(function (t) {
          if (d === t.domain) {
            d = t.name;
            return true;
          }
        });
      }
      return d;
    },
  },
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
  // flag set while we apply filters programmatically from the URL hash
  let appliedUrlFilters = false;

  function normalizeKey(s: string | null | undefined) {
    if (!s) return "";
    return String(s).replace(/\s+/g, " ").trim();
  }

  function count(nodes: Node[], key: string[], f?: (k: any, ctx?: any) => any, ctx?: any) {
    let dict = {};

    nodes.forEach(function (node) {
      let dictKey = helper.dictGet(node, key.slice(0));

      if (f !== undefined) {
        // pass optional context to modifier; modifier can accept (value) or (value, ctx)
        dictKey = f(dictKey, ctx);
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

  // Watch filter changes and sync the URL accordingly (but ignore when we are
  // programmatically applying filters from the hash).
  filterManager.watchFilters({
    filtersChanged: function (filters: GenericFilter[]) {
      const params: { [param: string]: string[] } = {};

      filters.forEach(function (f) {
        if (!f.getKey) return;

        const name = f.getName();
        const value = f.getValue();
        const negate = f.getNegate();

        // Prefix with "!" when negated
        const encoded = negate ? `!${value}` : value;

        if (!params[name]) {
          params[name] = [encoded];
        } else {
          params[name].push(encoded);
        }
      });

      if (appliedUrlFilters) {
        window.router.setParams(params);
      }
    },
  });

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

      let keys = data[2];
      let value = data[0];
      let modifierFunction = data[3];
      let filter = GenericNodeFilter(name, keys, value, modifierFunction);

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

    // helper to fetch mapping entries from statusFieldMapping
    function mapping(name: string) {
      return (statusFieldMapping as any)[name] || { keys: [], modifier: undefined };
    }

    function sortVersionCountAndName(a, b) {
      // descending by count
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return compare(a[0], b[0]);
    }
    function processMapping(name: string, sorter?: (a: any, b: any) => number, ctx?: any) {
      const m = mapping(name);
      const arr = count(nodes, m.keys, m.modifier, ctx);
      const sorted = sorter
        ? arr.sort(sorter)
        : arr.sort(function (a, b) {
            return b[1] - a[1];
          });
      tables[name] = fillTable(name, tables[name], sorted);
    }

    // process mappings in a concise way
    processMapping("node.status");
    processMapping("node.firmware", sortVersionCountAndName);
    processMapping("node.baseversion", sortVersionCountAndName);
    processMapping("node.deprecationStatus");
    processMapping("node.hardware");
    processMapping("node.visible");
    processMapping("node.update");
    processMapping("node.selectedGatewayIPv4", undefined, data);
    processMapping("node.selectedGatewayIPv6", undefined, data);
    processMapping("node.domain");

    // tables filled above via processMapping

    if (!appliedUrlFilters) {
      applyFiltersFromHash();
    }
  };

  function applyFiltersFromHash() {
    const params = window.router.getParams();
    const keys = Object.keys(params);
    appliedUrlFilters = true;
    if (keys.length === 0) return;

    for (const [param, values] of Object.entries(params)) {
      if (!statusFieldMapping[param]) {
        console.warn("unknown_filter_param", param);
        continue; // continue instead of return to process other params
      }

      const mapping = statusFieldMapping[param];

      values.forEach(function (encodedValue) {
        const negate = encodedValue.startsWith("!");
        if (negate) {
          encodedValue = encodedValue.slice(1);
        }

        let filter = GenericNodeFilter(param, mapping.keys, normalizeKey(encodedValue), mapping.modifier);
        if (negate) {
          filter.setNegate(true);
        }
        filterManager.addFilter(filter);
      });
    }
  }

  self.render = function render(el: HTMLElement) {
    self.renderSingle(el, "node.status");
    self.renderSingle(el, "node.firmware");
    self.renderSingle(el, "node.baseversion");
    self.renderSingle(el, "node.deprecationStatus");
    self.renderSingle(el, "node.hardware");
    self.renderSingle(el, "node.visible");
    self.renderSingle(el, "node.update");
    self.renderSingle(el, "node.selectedGatewayIPv4");
    self.renderSingle(el, "node.selectedGatewayIPv6");
    self.renderSingle(el, "node.domain");

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

  self.renderSingle = function renderSingle(el: HTMLElement, mappingName: string) {
    const tableNode = tables[mappingName];
    if (!tableNode || !tableNode.element ) {
      console.warn("wrong mapping name", mappingName);
      return;
    } 

    let h2 = document.createElement("h2");
    h2.classList.add("proportion-header");
    h2.textContent = _.t(mappingName);
    h2.onclick = function onclick() {
      tableNode.element.classList.toggle("hide");
    };
    el.appendChild(h2);
    el.appendChild(tableNode.element);
  };
  return self;
};
