import { _ } from "../utils/language.js";
import { CanFiltersChanged, DataDistributor, Filter } from "../datadistributor.js";
import { CanRender } from "../container.js";

export const FilterGui = function (distributor: ReturnType<typeof DataDistributor>): CanFiltersChanged & CanRender {
  let container = document.createElement("ul");
  container.classList.add("filters");
  let div = document.createElement("div");

  function render(el: HTMLElement) {
    el.appendChild(div);
  }

  function filtersChanged(filters: Filter[] & CanRender[]) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    filters.forEach(function (filter: Filter & CanRender) {
      let li = document.createElement("li");
      container.appendChild(li);
      filter.render(li);

      let button = document.createElement("button");
      button.classList.add("ion-close");
      button.setAttribute("aria-label", _.t("remove"));
      button.onclick = function onclick() {
        distributor.removeFilter(filter);
      };
      li.appendChild(button);
    });

    if (container.parentNode === div && filters.length === 0) {
      div.removeChild(container);
    } else if (filters.length > 0) {
      div.appendChild(container);
    }
  }

  return {
    render,
    filtersChanged,
  };
};
