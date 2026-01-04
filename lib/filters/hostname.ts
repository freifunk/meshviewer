import { _ } from "../utils/language.js";
import { Node } from "../utils/node.js";
import { CanRender } from "../container.js";
import { Filter } from "../datadistributor.js";

export const HostnameFilter = function (): CanRender & Filter {
  let refreshFunctions: (() => any)[] = [];
  let timer: ReturnType<typeof setTimeout>;
  let input = document.createElement("input");

  function refresh() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      refreshFunctions.forEach(function (f) {
        f();
      });
    }, 250);
  }

  function run(node: Node) {
    return node.hostname.toLowerCase().includes(input.value.toLowerCase());
  }

  function setRefresh(f: () => any) {
    refreshFunctions.push(f);
  }

  function render(el: HTMLElement) {
    input.type = "search";
    input.placeholder = _.t("sidebar.nodeFilter");
    input.setAttribute("aria-label", _.t("sidebar.nodeFilter"));
    input.addEventListener("input", refresh);
    el.classList.add("filter-node");
    el.classList.add("ion-filter");
    el.appendChild(input);
  }

  return {
    run,
    setRefresh,
    render,
  };
};
