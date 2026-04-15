import { h } from "snabbdom";
import { _ } from "./utils/language.js";
import { Heading, SortTable } from "./sorttable.js";
import * as helper from "./utils/helper.js";
import { Link } from "./utils/node.js";
import { CanSetData, ObjectsLinksAndNodes } from "./datadistributor.js";
import { CanRender } from "./container.js";

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
      let am = helper.linkMetric(a.source_tq, a.source_tp);
      let bm = helper.linkMetric(b.source_tq, b.source_tp);
      let an = helper.linkMetric(a.target_tq, a.target_tp);
      let bn = helper.linkMetric(b.target_tq, b.target_tp);
      let aAvg = am === undefined && an === undefined ? -Infinity : ((am ?? 0) + (an ?? 0)) / 2;
      let bAvg = bm === undefined && bn === undefined ? -Infinity : ((bm ?? 0) + (bn ?? 0)) / 2;
      return aAvg - bAvg;
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
      h(
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

    return h("tr", [
      h(
        "td",
        h("span", {
          props: {
            className: "icon ion-" + (link.type.indexOf("wifi") === 0 ? "wifi" : "share-alt"),
            title: _.t(link.type),
          },
        }),
      ),
      h("td", td1Content),
      h(
        "td",
        {
          style: {
            color: linkScale(
              ((helper.linkMetric(link.source_tq, link.source_tp) ?? 0) +
                (helper.linkMetric(link.target_tq, link.target_tp) ?? 0)) /
                2,
            ),
          },
        },
        helper.showBiDiLinkMetric(link.source_tq, link.source_tp, link.target_tq, link.target_tp),
      ),
      h("td", helper.showDistance(link)),
    ]);
  }

  self.render = function render(d: HTMLElement) {
    let h2 = document.createElement("h2");
    h2.textContent = _.t("node.links");
    d.appendChild(h2);
    table.el.classList.add("link-list");
    d.appendChild(table.el);
  };

  self.setData = function setData(d: ObjectsLinksAndNodes) {
    table.setData(d.links);
  };

  return {
    setData: self.setData,
    render: self.render,
  };
};
