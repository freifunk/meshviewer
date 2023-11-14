import V from "snabbdom/dist/snabbdom-patch";

import { SortTable } from "./sorttable";
import * as helper from "./utils/helper";

function linkName(link) {
  return (link.source ? link.source.hostname : link.source.id) + " – " + link.target.hostname;
}

var headings = [
  {
    name: "",
    sort: function (a, b) {
      return a.type.localeCompare(b.type);
    },
  },
  {
    name: "node.nodes",
    sort: function (a, b) {
      return linkName(a).localeCompare(linkName(b));
    },
    reverse: false,
  },
  {
    name: "node.tq",
    class: "ion-connection-bars",
    sort: function (a, b) {
      return (a.source_tq + a.target_tq) / 2 - (b.source_tq + b.target_tq) / 2;
    },
    reverse: true,
  },
  {
    name: "node.distance",
    class: "ion-arrow-resize",
    sort: function (a, b) {
      return (a.distance === undefined ? -1 : a.distance) - (b.distance === undefined ? -1 : b.distance);
    },
    reverse: true,
  },
];

export const Linklist = function (linkScale) {
  var table = new SortTable(headings, 3, renderRow);

  function renderRow(link) {
    var td1Content = [
      V.h(
        "a",
        {
          props: {
            href: router.generateLink({ link: link.id }),
          },
          on: {
            click: function (e) {
              router.fullUrl({ link: link.id }, e);
            },
          },
        },
        linkName(link),
      ),
    ];

    return V.h("tr", [
      V.h(
        "td",
        V.h("span", {
          props: {
            className: "icon ion-" + (link.type.indexOf("wifi") === 0 ? "wifi" : "share-alt"),
            title: _.t(link.type),
          },
        }),
      ),
      V.h("td", td1Content),
      V.h(
        "td",
        { style: { color: linkScale((link.source_tq + link.target_tq) / 2) } },
        helper.showTq(link.source_tq) + " - " + helper.showTq(link.target_tq),
      ),
      V.h("td", helper.showDistance(link)),
    ]);
  }

  this.render = function render(d) {
    var h2 = document.createElement("h2");
    h2.textContent = _.t("node.links");
    d.appendChild(h2);
    table.el.elm.classList.add("link-list");
    d.appendChild(table.el.elm);
  };

  this.setData = function setData(d) {
    table.setData(d.links);
  };
};
