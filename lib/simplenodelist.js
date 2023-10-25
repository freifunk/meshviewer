import moment from "moment";
import V from "snabbdom/dist/snabbdom-patch";

import * as helper from "./utils/helper";

export const SimpleNodelist = function (nodes, field, title) {
  var self = this;
  var el;
  var tbody;

  self.render = function render(d) {
    el = d;
  };

  self.setData = function setData(data) {
    var nodeList = data.nodes[nodes];

    if (nodeList.length === 0) {
      tbody = null;
      return;
    }

    if (!tbody) {
      var h2 = document.createElement("h2");
      h2.textContent = title;
      el.appendChild(h2);

      var table = document.createElement("table");
      table.classList.add("node-list");
      el.appendChild(table);

      tbody = document.createElement("tbody");
      tbody.last = V.h("tbody");
      table.appendChild(tbody);
    }

    var items = nodeList.map(function (node) {
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

      return V.h("tr", [V.h("td", td0Content), V.h("td", td1Content), V.h("td", moment(node[field]).from(data.now))]);
    });

    var tbodyNew = V.h("tbody", items);
    tbody = V.patch(tbody, tbodyNew);
  };

  return self;
};
