import { snabbdomBundle as V } from "snabbdom/snabbdom.bundle";
import { _ } from "./utils/language";
import { Heading, SortTable } from "./sorttable";
import * as helper from "./utils/helper";
import { Link } from "./utils/node";
import { CanSetData, ObjectsLinksAndNodes } from "./datadistributor";
import { CanRender } from "./container";

function linkName(link: Link) {
  return (link.source ? link.source.hostname : link.id) + " – " + link.target.hostname;
}

let headings: Heading[] = [
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

export const Linklist = function (linkScale: (t: any) => any): CanRender & CanSetData {
  let router = window.router;
  let table = SortTable(headings, 3, renderRow);
  const self = {
    render: undefined,
    setData: undefined,
  };

  function renderRow(link: Link) {
    let td1Content = [
      V.h(
        "a",
        {
          props: {
            href: router.generateLink({ link: link.id }),
          },
          on: {
            click: function (e: Event) {
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

  self.render = function render(d: HTMLElement) {
    let h2 = document.createElement("h2");
    h2.textContent = _.t("node.links");
    d.appendChild(h2);
    table.el.elm.classList.add("link-list");
    d.appendChild(table.el.elm);
  };

  self.setData = function setData(d: ObjectsLinksAndNodes) {
    table.setData(d.links);
  };

  return {
    setData: self.setData,
    render: self.render,
  };
};
