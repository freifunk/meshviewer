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

const headings: Heading[] = [
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
  const router = window.router;
  const table = SortTable(headings, 3, renderRow);

  function renderRow(link: Link) {
    const td1Content = [
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
        { style: { color: linkScale((link.source_tq + link.target_tq) / 2) } },
        helper.showTq(link.source_tq) + " - " + helper.showTq(link.target_tq),
      ),
      h("td", helper.showDistance(link)),
    ]);
  }

  return {
    render(d: HTMLElement) {
      const h2 = document.createElement("h2");
      h2.textContent = _.t("node.links");
      d.appendChild(h2);
      table.el.classList.add("link-list");
      d.appendChild(table.el);
    },

    setData(d: ObjectsLinksAndNodes) {
      table.setData(d.links);
    },
  };
};
