import moment from "moment";
import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";

import { _ } from "./utils/language.js";
import * as helper from "./utils/helper.js";
import { NodesByState, ObjectsLinksAndNodes } from "./datadistributor.js";
import { Node } from "./utils/node.js";

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

export const SimpleNodelist = function (nodesState: string, field: string, title: string) {
  let listContainer: VNode = h("div");

  return {
    render(d: HTMLElement) {
      const containerEl = document.createElement("div");
      d.appendChild(containerEl);
      listContainer = patch(containerEl, listContainer);
    },

    setData(data: ObjectsLinksAndNodes) {
      const key = nodesState as keyof NodesByState;
      const nodeList = data.nodes[key];

      const newContainer = h("div");

      if (nodeList.length > 0) {
        const items = nodeList.map(function (node: Node) {
          const router = window.router;
          let td0Content: null | VNode = null;
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

          const raw = node as unknown as Record<string, moment.MomentInput>;
          return h("tr", [h("td", td0Content), h("td", td1Content), h("td", moment(raw[field]).from(data.now))]);
        });

        newContainer.children = [
          h("h2", title),
          h(
            "table",
            {
              props: { className: "node-list" },
            },
            h("tbody", items),
          ),
        ];
      }

      listContainer = patch(listContainer, newContainer);
    },
  };
};
