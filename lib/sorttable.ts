import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";
import { _ } from "./utils/language.js";

export interface Heading {
  name: string;
  sort?: (a: any, b: any) => number;
  reverse?: Boolean;
  class?: string;
}

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

export const SortTable = function (
  headings: Heading[],
  sortIndex: number,
  renderRow: (element: any, i: number, all: any[]) => any,
  className: string[] = [],
) {
  let data: any[] = [];
  let sortReverse = false;
  let currentSortIndex = sortIndex;

  const self: {
    el: HTMLElement;
    vnode: VNode | null;
    setData: (data: any[]) => void;
  } = {
    el: document.createElement("table"),
    vnode: null,
    setData: () => {},
  };

  function sortTable(i: number) {
    sortReverse = i === currentSortIndex ? !sortReverse : false;
    currentSortIndex = i;

    updateView();
  }

  function sortTableHandler(i: number) {
    return function () {
      sortTable(i);
    };
  }

  function updateView() {
    const children: VNode[] = [];

    if (data.length !== 0) {
      const th = headings.map(function (row, i) {
        let name = _.t(row.name);
        const properties: { onclick: () => void; className: string; title?: string } = {
          onclick: sortTableHandler(i),
          className: "sort-header",
        };

        if (row.class) {
          properties.className += " " + row.class;
          properties.title = name;
          name = "";
        }

        if (currentSortIndex === i) {
          properties.className += sortReverse ? " sort-up" : " sort-down";
        }

        return h("th", { props: properties }, name);
      });

      const sortFn = headings[currentSortIndex].sort ?? (() => 0);
      let links = data.slice(0).sort(sortFn);

      if (headings[currentSortIndex].reverse ? !sortReverse : sortReverse) {
        links = links.reverse();
      }

      children.push(h("thead", h("tr", th)));
      children.push(
        h(
          "tbody",
          links.map((row, idx, arr) => renderRow(row, idx, arr)),
        ),
      );
    }

    const elNew = h("table", { props: { className } }, children);
    self.vnode = patch(self.vnode ?? self.el, elNew);
  }

  self.setData = function setData(d: any[]) {
    data = d;
    updateView();
  };

  return self;
};
