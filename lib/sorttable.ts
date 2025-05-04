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
  renderRow: (element: any, i: number, all: []) => any,
) {
  const self: {
    el: HTMLElement;
    setData: (data: any[]) => void;
  } = { el: undefined, setData: undefined };
  let data: any[];
  let sortReverse = false;
  self.el = document.createElement("table");

  let vnode: VNode = null;

  function sortTable(i: number) {
    sortReverse = i === sortIndex ? !sortReverse : false;
    sortIndex = i;

    updateView();
  }

  function sortTableHandler(i: number) {
    return function () {
      sortTable(i);
    };
  }

  function updateView() {
    let children = [];

    if (data.length !== 0) {
      let th = headings.map(function (row, i) {
        let name = _.t(row.name);
        let properties = {
          onclick: sortTableHandler(i),
          className: "sort-header",
          title: undefined,
        };

        if (row.class) {
          properties.className += " " + row.class;
          properties.title = name;
          name = "";
        }

        if (sortIndex === i) {
          properties.className += sortReverse ? " sort-up" : " sort-down";
        }

        return h("th", { props: properties }, name);
      });

      let links = data.slice(0).sort(headings[sortIndex].sort);

      if (headings[sortIndex].reverse ? !sortReverse : sortReverse) {
        links = links.reverse();
      }

      children.push(h("thead", h("tr", th)));
      children.push(h("tbody", links.map(renderRow)));
    }

    let elNew = h("table", children);
    vnode = patch(vnode ?? self.el, elNew);
  }

  self.setData = function setData(d: any[]) {
    data = d;
    updateView();
  };

  return self;
};
