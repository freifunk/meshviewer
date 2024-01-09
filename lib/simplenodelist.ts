import moment from "moment";
import { snabbdomBundle as V } from "snabbdom/snabbdom.bundle";

import { _ } from "./utils/language";
import * as helper from "./utils/helper";
import { ObjectsLinksAndNodes } from "./datadistributor";
import { Node } from "./utils/node";

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
      tbody.last = V.h("tbody");
      table.appendChild(tbody);
    }

    let items = nodeList.map(function (node: Node) {
      let router = window.router;
      let td0Content = "";
      if (helper.hasLocation(node)) {
        td0Content = V.h("span", { props: { className: "icon ion-location", title: _.t("location.location") } });
      }

      let td1Content = V.h(
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

      return V.h("tr", [V.h("td", td0Content), V.h("td", td1Content), V.h("td", moment(node[field]).from(data.now))]);
    });

    let tbodyNew = V.h("tbody", items);
    tbody = V.patch(tbody, tbodyNew);
  };

  return self;
};
