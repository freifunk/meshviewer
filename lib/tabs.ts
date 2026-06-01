import { _ } from "./utils/language.js";
import { CanRender } from "./container.js";

type TabLi = HTMLLIElement & { child: CanRender };

export const Tabs = function () {
  const tabs = document.createElement("ul");
  tabs.classList.add("tabs");

  const container = document.createElement("div");

  function gotoTab(li: TabLi) {
    for (const child of tabs.children) {
      child.classList.remove("visible");
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    li.classList.add("visible");

    const tab = document.createElement("div");
    tab.classList.add("tab");
    container.appendChild(tab);
    li.child.render(tab);
  }

  return {
    add(title: string, child: CanRender) {
      const li = document.createElement("li") as TabLi;
      li.textContent = _.t(title);
      li.addEventListener("click", function (this: HTMLElement) {
        gotoTab(this as TabLi);
      });
      li.child = child;
      tabs.appendChild(li);

      let anyVisible = false;

      for (const existing of tabs.children) {
        if (existing.classList.contains("visible")) {
          anyVisible = true;
          break;
        }
      }

      if (!anyVisible) {
        gotoTab(li);
      }
    },

    render(el: HTMLElement) {
      el.appendChild(tabs);
      el.appendChild(container);
    },
  };
};
