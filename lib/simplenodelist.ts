import moment from "moment";
import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";

import { _ } from "./utils/language.js";
import * as helper from "./utils/helper.js";
import { ObjectsLinksAndNodes } from "./datadistributor.js";
import { Node } from "./utils/node.js";

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

export const SimpleNodelist = function (nodesState: string, field: string, title: string) {
  const self = {
    render: undefined,
    setData: undefined,
  };
  let el: HTMLElement;
  let tbody: HTMLTableSectionElement;

  self.render = function render(d: HTMLElement) {
    el = d;
  };

  self.setData = function setData(data: ObjectsLinksAndNodes) {
    let nodeList = data.nodes[nodesState];

    if (nodeList.length === 0) {
      tbody = null;
      return;
    }

    if (!tbody) {
      let h2 = document.createElement("h2");
      h2.textContent = title;
      el.appendChild(h2);

      let table = document.createElement("table");
      table.classList.add("node-list");
      el.appendChild(table);

      tbody = document.createElement("tbody");
      // @ts-ignore
      tbody.last = h("tbody");
      table.appendChild(tbody);
    }

    let items = nodeList.map(function (node: Node) {
      let router = window.router;
      let td0Content: null | VNode = null;
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

      return h("tr", [h("td", td0Content), h("td", td1Content), h("td", moment(node[field]).from(data.now))]);
    });

    let tbodyNew = h("tbody", items);
    patch(tbody, tbodyNew);
  };

  return self;
};
