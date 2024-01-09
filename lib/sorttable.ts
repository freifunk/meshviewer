import { snabbdomBundle as V } from "snabbdom/snabbdom.bundle";
import { _ } from "./utils/language";

export interface Heading {
  name: string;
  sort?: (a: any, b: any) => number;
  reverse?: Boolean;
  class?: string;
}

export const SortTable = function (
  headings: Heading[],
  sortIndex: number,
  renderRow: (element: any, i: number, all: []) => any,
) {
  const self = { el: undefined, setData: undefined };
  let data: any[];
  let sortReverse = false;
  self.el = document.createElement("table");

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

        return V.h("th", { props: properties }, name);
      });

      let links = data.slice(0).sort(headings[sortIndex].sort);

      if (headings[sortIndex].reverse ? !sortReverse : sortReverse) {
        links = links.reverse();
      }

      children.push(V.h("thead", V.h("tr", th)));
      children.push(V.h("tbody", links.map(renderRow)));
    }

    let elNew = V.h("table", children);
    self.el = V.patch(self.el, elNew);
  }

  self.setData = function setData(d: any[]) {
    data = d;
    updateView();
  };

  return self;
};
