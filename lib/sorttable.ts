import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";
import { _ } from "./utils/language.js";

export interface Heading<T = any> {
  name: string;
  sort?: (a: T, b: T) => number;
  reverse?: boolean;
  class?: string;
}

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

export const SortTable = function <T>(
  headings: Heading<T>[],
  sortIndex: number,
  renderRow: (element: T, i: number, all: T[]) => VNode,
  className: string[] = [],
) {
  let data: T[] = [];
  let sortReverse = false;
  let currentSortIndex = sortIndex;

  const self: {
    el: HTMLElement;
    vnode: VNode | null;
    setData: (data: T[]) => void;
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

      const heading = headings[currentSortIndex];
      // Falling back to undefined → Array.sort uses default lexicographic order, matching pre-TS6 behavior.
      let links = data.slice(0).sort(heading?.sort);

      if (heading?.reverse ? !sortReverse : sortReverse) {
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

  self.setData = function setData(d: T[]) {
    data = d;
    updateView();
  };

  return self;
};
